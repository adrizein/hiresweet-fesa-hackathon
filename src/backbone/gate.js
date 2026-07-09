// Fail-closed QA gate. Every action a planner proposes goes through these
// checks before it can reach the inbox; if a check fails — or crashes — the
// action is blocked. Planners are deliberately naive ("planners propose, the
// gate disposes"): guardrails live here, at the architecture level, so no
// strategy can bypass them. Nothing is ever sent automatically either way —
// a human approves from the inbox.

const PLACEHOLDER_PATTERN = /\[[^\]]{0,80}\]|\{\{|\bTODO\b|\bTBD\b|\bXXX\b|lorem ipsum/i;

export const checks = [
  {
    name: 'do-not-contact',
    run(action, { store }) {
      const company = action.companyId ? store.get('companies', action.companyId) : null;
      const person = action.targetPersonId ? store.get('people', action.targetPersonId) : null;
      if (company?.flags?.includes('do_not_contact')) {
        return { passed: false, reason: `${company.name} is on the do-not-contact list` };
      }
      if (person?.flags?.includes('do_not_contact')) {
        return { passed: false, reason: `${person.name} is on the do-not-contact list` };
      }
      return { passed: true };
    },
  },
  {
    name: 'protected-account',
    run(action, { store }) {
      const company = action.companyId ? store.get('companies', action.companyId) : null;
      if (company?.flags?.includes('protected')) {
        return { passed: false, reason: `${company.name} is a protected account — route to a human` };
      }
      return { passed: true };
    },
  },
  {
    name: 'evidence-required',
    run(action, { store }) {
      const ids = action.evidenceSignalIds ?? [];
      if (ids.length === 0) {
        return { passed: false, reason: 'no signal cited as evidence for this action' };
      }
      const missing = ids.filter((id) => !store.get('signals', id));
      if (missing.length > 0) {
        return { passed: false, reason: `cited signals not found in the store: ${missing.join(', ')}` };
      }
      return { passed: true };
    },
  },
  {
    name: 'verified-contact',
    appliesTo: (action) => action.channel === 'email',
    run(action, { store }) {
      const person = action.targetPersonId ? store.get('people', action.targetPersonId) : null;
      if (!person) {
        return { passed: false, reason: 'email action has no target person' };
      }
      if (!person.email || person.emailStatus !== 'verified') {
        return { passed: false, reason: `${person.name} has no verified email — enrich before emailing` };
      }
      return { passed: true };
    },
  },
  {
    name: 'existing-client-required',
    appliesTo: (action) => action.channel === 'slack',
    run(action, { store }) {
      const company = action.companyId ? store.get('companies', action.companyId) : null;
      if (!company?.flags?.includes('existing_client')) {
        return {
          passed: false,
          reason: `${company?.name ?? action.companyId} is not a confirmed existing client — the voice-note channel is expansion-only, never cold outreach`,
        };
      }
      return { passed: true };
    },
  },
  {
    name: 'verified-phone',
    appliesTo: (action) => action.channel === 'slack',
    run(action, { store }) {
      const person = action.targetPersonId ? store.get('people', action.targetPersonId) : null;
      if (!person) {
        return { passed: false, reason: 'voice-note action has no target person' };
      }
      if (!person.phone) {
        return { passed: false, reason: `${person.name} has no verified phone number on file — a human needs it to forward the voice note on WhatsApp` };
      }
      return { passed: true };
    },
  },
  {
    name: 'no-placeholders',
    appliesTo: (action) =>
      Boolean(action.payload?.subject || action.payload?.body || action.payload?.message),
    run(action) {
      const text = [action.payload.subject, action.payload.body, action.payload.message]
        .filter(Boolean)
        .join('\n');
      const hit = text.match(PLACEHOLDER_PATTERN);
      if (hit) {
        return { passed: false, reason: `draft contains unresolved placeholder text ("${hit[0]}")` };
      }
      return { passed: true };
    },
  },
  {
    name: 'candidate-anonymity',
    appliesTo: (action) => Array.isArray(action.payload?.candidates),
    run(action) {
      for (const candidate of action.payload.candidates) {
        if (!candidate.handle || candidate.name || candidate.email || candidate.phone) {
          return {
            passed: false,
            reason: 'candidate references must stay anonymized (handle + headline only, no PII)',
          };
        }
      }
      return { passed: true };
    },
  },
];

export async function runGate(action, ctx, checkList = checks) {
  const results = [];
  for (const check of checkList) {
    if (check.appliesTo && !check.appliesTo(action)) continue;
    let result;
    try {
      result = await check.run(action, ctx);
    } catch (error) {
      result = { passed: false, reason: `check crashed: ${error.message}` };
    }
    results.push({ name: check.name, passed: result.passed, ...(result.reason ? { reason: result.reason } : {}) });
  }
  // Fail closed: an action with zero applicable checks does NOT pass.
  const passed = results.length > 0 && results.every((r) => r.passed);
  return { passed, results };
}
