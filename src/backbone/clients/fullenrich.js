import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'https://app.fullenrich.com/api/v2';

// FullEnrich client. Credits check is wired for live use; person enrichment
// runs on fixtures until the async bulk flow is implemented (POST to start,
// GET to poll). Processors only talk to this seam.
export function createFullEnrichClient({ fixturesDir }) {
  const apiKey = process.env.FULLENRICH_API_KEY;
  const live = Boolean(apiKey);

  return {
    name: 'fullenrich',
    mode: live ? 'live' : 'fixtures',

    async getCredits() {
      if (!live) return { credits: 5000, mode: 'fixtures' };
      const response = await fetch(`${BASE_URL}/account/credits`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        throw new Error(`FullEnrich credits check failed: HTTP ${response.status}`);
      }
      // Live response shape (verified): { "balance": 6957.25 }
      const json = await response.json();
      return { credits: json.balance ?? json.credits ?? null, mode: 'live' };
    },

    // Returns { email, emailStatus, phone, source } or null when nothing was
    // found. Live bulk enrichment is not wired yet (TODO(Kubilay): async flow
    // — POST /contact/enrich/bulk to start, poll the enrichment id until
    // done); until then live mode falls back to the fixture map so the
    // pipeline keeps running end to end.
    async enrichPerson(person) {
      const map = JSON.parse(
        readFileSync(join(fixturesDir, 'fullenrich', 'enrichments.json'), 'utf8'),
      );
      const hit = map[person.id];
      if (!hit) return null;
      return { ...hit, source: live ? 'fixtures — live bulk flow TODO' : 'fixtures' };
    },
  };
}
