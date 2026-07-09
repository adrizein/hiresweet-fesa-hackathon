import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Sillage client. Runs on committed fixtures until the live V2 API is wired
// (base URL + signal schema come from the on-site onboarding). Signal
// strategies only talk to this seam, so swapping fixtures for live calls
// changes nothing upstream.
export function createSillageClient({ fixturesDir }) {
  const apiKey = process.env.SILLAGE_API_KEY;
  const baseUrl = process.env.SILLAGE_API_BASE;
  const live = Boolean(apiKey && baseUrl);

  return {
    name: 'sillage',
    mode: live ? 'live' : 'fixtures',

    async fetchSignals(type) {
      if (live) {
        // TODO: wire the V2 endpoint once onboarding gives us the path and
        // response schema, then map it to the fixture shape below.
        throw new Error(
          'Sillage live mode not wired yet — implement fetchSignals against SILLAGE_API_BASE',
        );
      }
      const all = JSON.parse(
        readFileSync(join(fixturesDir, 'sillage', 'signals.json'), 'utf8'),
      );
      return type ? all.filter((s) => s.type === type) : all;
    },
  };
}
