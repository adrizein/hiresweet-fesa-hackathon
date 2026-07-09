// Shared read helpers over the store, used by processors and planners.

const POWER_RANK = { champion: 3, decision_maker: 2, influencer: 1 };

export function signalsForCompany(store, companyId) {
  return store.all('signals').filter((s) => s.companyId === companyId);
}

export function contactsForCompany(store, companyId) {
  return store.all('people').filter((p) => p.companyId === companyId && p.kind === 'contact');
}

// Best person to talk to: champion > decision maker > anyone, never someone
// on the do-not-contact list.
export function pickPrimaryContact(store, companyId) {
  const contacts = contactsForCompany(store, companyId).filter(
    (p) => !(p.flags ?? []).includes('do_not_contact'),
  );
  contacts.sort((a, b) => (POWER_RANK[b.powerRole] ?? 0) - (POWER_RANK[a.powerRole] ?? 0));
  return contacts[0] ?? null;
}

export function matchesForCompany(store, companyId) {
  return store
    .all('matches')
    .filter((m) => m.companyId === companyId)
    .sort((a, b) => b.score - a.score);
}
