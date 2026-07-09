// Fail-closed guard before any draft. Rules from criteria/lead-criteria.md
// §3 (guards, never contact cold, route to a human) and §7 (verdict tiers).
// Anything missing or malformed is blocked: the gate fails closed, never open.

/**
 * @param {object} account
 * @param {object} person
 * @returns {{ allowed: boolean, mode: 'cold'|'followup'|null, reason: string }}
 */
export function gate(account, person) {
  if (!account || !account.verdict || !person) {
    return {
      allowed: false,
      mode: null,
      reason: 'fail-closed: missing account, verdict, or person data, cannot verify guards, no draft',
    };
  }

  if (account.verdict.tier === 'HUMAN') {
    return {
      allowed: false,
      mode: null,
      reason: 'guard: active relationship or protected account, route the signal to the account owner (no cold outreach)',
    };
  }

  if (account.verdict.tier === 'SKIP') {
    return {
      allowed: false,
      mode: null,
      reason: `guard: hard filter violated, ${account.verdict.why || 'account skipped'}`,
    };
  }

  if (person.contact_status === 'client') {
    return {
      allowed: false,
      mode: null,
      reason: 'guard: active client relationship, route to the human who owns the relationship (no cold outreach)',
    };
  }

  if (person.do_not_contact === true) {
    return {
      allowed: false,
      mode: null,
      reason: 'guard: person tagged do-not-contact, no draft',
    };
  }

  if (person.contact_status === 'contacted') {
    return {
      allowed: true,
      mode: 'followup',
      reason: 'contacted < 30 days: reply on the existing thread with the new signal, never re-cold',
    };
  }

  return {
    allowed: true,
    mode: 'cold',
    reason: 'no guard triggered',
  };
}
