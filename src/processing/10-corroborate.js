import { signalsForCompany } from '../backbone/selectors.js';

// Tier 2, step 1: multi-signal corroboration. Several independent signal
// types on the same account beat any single signal — score the convergence
// before anything downstream spends credits or drafts copy.
export default {
  name: 'corroborate',
  description: 'Score signal convergence per company (independent signal types beat one loud signal)',

  async process(ctx) {
    const { store, log } = ctx;
    let scored = 0;
    for (const company of store.all('companies')) {
      const signals = signalsForCompany(store, company.id);
      if (signals.length === 0) continue;
      const distinctTypes = [...new Set(signals.map((s) => s.type))];
      store.upsert('companies', {
        id: company.id,
        corroboration: {
          signalCount: signals.length,
          distinctTypes,
          converges: distinctTypes.length >= 2,
        },
      });
      scored += 1;
    }
    log(`corroborate: ${scored} companies scored for signal convergence`);
  },
};
