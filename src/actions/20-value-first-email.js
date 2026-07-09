import { matchesForCompany } from '../backbone/selectors.js';

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['subject', 'body'],
  additionalProperties: false,
};

const EMAIL_SYSTEM_PROMPT =
  'You write short, honest, value-first B2B outreach emails for HireSweet, a tech-recruitment ' +
  'marketplace. Lead with what we observed (the signals) and with the anonymized candidate ' +
  'profiles that fit their open roles — give value before asking for anything. Under 120 words. ' +
  'Use only the provided facts and candidate handles; never invent names or numbers. ' +
  'No square brackets, no placeholders.';

function fallbackDraft(company, contact, signalSummaries, candidates) {
  const firstName = contact.name.split(' ')[0];
  const lines = [
    `Hi ${firstName},`,
    '',
    `We noticed: ${signalSummaries.join('; ')}.`,
  ];
  if (candidates.length > 0) {
    lines.push('', 'Anonymized profiles from our marketplace that fit what you are hiring for:');
    for (const c of candidates) lines.push(`- ${c.handle}: ${c.headline}`);
  }
  lines.push(
    '',
    'If useful, we can share full profiles and availability this week — no commitment.',
    '',
    'Best,',
    'The HireSweet team',
  );
  return {
    subject: `${company.name} × HireSweet — help on your current hiring push`,
    body: lines.join('\n'),
  };
}

// Tier 3, the cold-ish path: for good leads without a warm route, draft an
// email that leads with anonymized candidate matches — value first, ask
// second. Deliberately naive about guardrails: the gate decides.
export default {
  name: 'value-first-email',
  description: 'Outreach email leading with anonymized candidate profiles that match their open roles',

  async plan(ctx) {
    const { store, llm, log } = ctx;
    const actions = [];

    for (const lead of store.all('leads')) {
      if (lead.score < 50) continue;
      // The warm-intro planner already covered this lead — warmest path wins.
      const hasWarmPath = store
        .all('actions')
        .some((a) => a.leadId === lead.id && a.kind === 'intro_request');
      if (hasWarmPath) continue;

      const company = store.get('companies', lead.companyId);
      const contact = lead.contactId ? store.get('people', lead.contactId) : null;
      if (!company || !contact) continue;

      const signalSummaries = lead.signalIds
        .map((id) => store.get('signals', id)?.summary)
        .filter(Boolean);
      const candidates = matchesForCompany(store, company.id)
        .slice(0, 2)
        .map((m) => {
          const c = store.get('candidates', m.candidateId);
          return { handle: c.handle, headline: c.headline };
        });

      let draft = null;
      if (llm.enabled) {
        try {
          draft = await llm.completeJSON({
            system: EMAIL_SYSTEM_PROMPT,
            prompt: JSON.stringify({
              company: { name: company.name, location: company.location },
              contact: { name: contact.name, role: contact.role },
              signals: signalSummaries,
              candidates,
            }),
            schema: DRAFT_SCHEMA,
            maxTokens: 600,
          });
        } catch (error) {
          log(`value-first-email: Claude draft failed for ${company.name} (${error.message}), using template`);
        }
      }
      if (!draft) draft = fallbackDraft(company, contact, signalSummaries, candidates);

      actions.push({
        id: `act-email-${lead.companyId}`,
        kind: 'outreach_email',
        channel: 'email',
        leadId: lead.id,
        companyId: lead.companyId,
        targetPersonId: contact.id,
        evidenceSignalIds: lead.signalIds,
        payload: { subject: draft.subject, body: draft.body, candidates },
      });
    }
    return actions;
  },
};
