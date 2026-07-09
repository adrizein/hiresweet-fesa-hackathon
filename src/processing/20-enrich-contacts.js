import { pickPrimaryContact, signalsForCompany } from '../backbone/selectors.js';

const UNTOUCHABLE = ['do_not_contact', 'protected'];

// Tier 2, step 2: FullEnrich the primary contact of active companies —
// economically aware. Checks the credit balance first, respects a per-run
// budget, and never spends a credit on an account we are not allowed to
// contact anyway.
export default {
  name: 'enrich-contacts',
  description: 'FullEnrich the primary contact of active companies, within a credit budget',

  async process(ctx) {
    const { store, clients, config, log } = ctx;
    const budget = config.enrichBudget ?? 5;
    const credits = await clients.fullenrich.getCredits();
    log(`fullenrich: ${credits.credits} credits available (${credits.mode}), budget this run: ${budget}`);

    // Most-corroborated accounts first — spend where conviction is highest.
    const companies = store
      .all('companies')
      .filter((c) => signalsForCompany(store, c.id).length > 0)
      .filter((c) => !(c.flags ?? []).some((f) => UNTOUCHABLE.includes(f)))
      .sort(
        (a, b) => (b.corroboration?.signalCount ?? 0) - (a.corroboration?.signalCount ?? 0),
      );

    let spent = 0;
    let enriched = 0;
    for (const company of companies) {
      if (spent >= budget) {
        log('fullenrich: per-run budget reached, stopping');
        break;
      }
      const contact = pickPrimaryContact(store, company.id);
      if (!contact || contact.emailStatus === 'verified') continue;
      const enrichment = await clients.fullenrich.enrichPerson(contact);
      spent += 1;
      if (enrichment) {
        store.upsert('people', {
          id: contact.id,
          ...enrichment,
          enrichedBy: `fullenrich (${credits.mode})`,
        });
        enriched += 1;
      }
    }
    log(`fullenrich: enriched ${enriched} contact(s), spent ${spent} credit(s)`);
  },
};
