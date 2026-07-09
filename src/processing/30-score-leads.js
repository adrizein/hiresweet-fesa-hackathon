import {
  contactsForCompany,
  pickPrimaryContact,
  signalsForCompany,
} from '../backbone/selectors.js';

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer' },
    rationale: { type: 'string' },
  },
  required: ['score', 'rationale'],
  additionalProperties: false,
};

const SCORING_SYSTEM_PROMPT =
  'You score B2B leads for HireSweet, a tech-recruitment marketplace. ' +
  'High scores (out of 100) go to companies actively hiring tech or sales roles in France, ' +
  'with a champion or decision maker identified, and several independent signals converging. ' +
  'Weak, single, or stale signals score low. Return a score and a one-sentence rationale ' +
  'grounded only in the provided data — never invent facts.';

// Deterministic fallback so the pipeline runs (and tests pass) without a key.
function heuristicScore(company, signals, contacts) {
  let score = 0;
  const reasons = [];
  const base = Math.min(
    45,
    Math.round(signals.reduce((sum, s) => sum + (s.confidence ?? 0.5) * 30, 0)),
  );
  score += base;
  reasons.push(`${signals.length} signal(s) worth ${base} pts`);
  if (company.corroboration?.converges) {
    score += 20;
    reasons.push('independent signal types converge (+20)');
  }
  if (contacts.some((c) => c.powerRole === 'champion')) {
    score += 15;
    reasons.push('a champion is in place (+15)');
  } else if (contacts.some((c) => c.powerRole === 'decision_maker')) {
    score += 10;
    reasons.push('decision maker identified (+10)');
  }
  if ((company.location ?? '').toLowerCase().includes('paris')) {
    score += 10;
    reasons.push('Paris-based (+10)');
  }
  if ((company.openRoles ?? []).length > 0) {
    score += 10;
    reasons.push(`${company.openRoles.length} open role(s) we can serve (+10)`);
  }
  return { score: Math.min(100, score), rationale: reasons.join('; ') };
}

// Tier 2, step 3: turn companies-with-signals into scored leads. Claude
// reasons over the full dossier when a key is present; the heuristic keeps
// everything running without one.
export default {
  name: 'score-leads',
  description: 'Score companies with signals into leads (Claude when available, deterministic fallback)',

  async process(ctx) {
    const { store, llm, log } = ctx;
    let claudeScored = 0;

    for (const company of store.all('companies')) {
      const signals = signalsForCompany(store, company.id);
      if (signals.length === 0) continue;
      const contacts = contactsForCompany(store, company.id);

      let scored = null;
      let scoredBy = 'heuristic';
      if (llm.enabled) {
        try {
          scored = await llm.completeJSON({
            system: SCORING_SYSTEM_PROMPT,
            prompt: JSON.stringify({
              // Deliberately no `flags` here: scoring measures opportunity,
              // policy (do-not-contact, protected) is the gate's job — flags
              // in the dossier make Claude bury flagged accounts silently
              // instead of the gate blocking them visibly.
              company: {
                name: company.name,
                location: company.location,
                openRoles: (company.openRoles ?? []).map((r) => r.title),
                corroboration: company.corroboration,
              },
              signals: signals.map((s) => ({
                type: s.type,
                summary: s.summary,
                evidence: s.evidence,
                confidence: s.confidence,
                observedAt: s.observedAt,
              })),
              contacts: contacts.map((c) => ({ role: c.role, powerRole: c.powerRole })),
            }),
            schema: SCORE_SCHEMA,
          });
          if (scored) {
            scoredBy = 'claude';
            claudeScored += 1;
          }
        } catch (error) {
          log(`score-leads: Claude scoring failed for ${company.name} (${error.message}), using heuristic`);
        }
      }
      if (!scored) scored = heuristicScore(company, signals, contacts);

      const leadId = `lead-${company.id}`;
      const existing = store.get('leads', leadId);
      store.upsert('leads', {
        id: leadId,
        companyId: company.id,
        contactId: pickPrimaryContact(store, company.id)?.id ?? null,
        score: scored.score,
        rationale: scored.rationale,
        signalIds: signals.map((s) => s.id),
        scoredBy,
        status: existing?.status ?? 'open',
      });
    }

    const total = store.all('leads').length;
    log(`score-leads: ${total} lead(s) scored (${claudeScored} by Claude, ${total - claudeScored} by heuristic)`);
  },
};
