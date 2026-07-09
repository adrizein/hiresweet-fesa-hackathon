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
      return { ...(await response.json()), mode: 'live' };
    },

    // Returns { email, emailStatus, phone } or null when nothing was found.
    async enrichPerson(person) {
      if (live) {
        // TODO(Kubilay): wire the async bulk flow — POST /contact/enrich/bulk
        // to start, then poll the enrichment id until done.
        throw new Error('FullEnrich live enrichment not wired yet — fixtures only');
      }
      const map = JSON.parse(
        readFileSync(join(fixturesDir, 'fullenrich', 'enrichments.json'), 'utf8'),
      );
      return map[person.id] ?? null;
    },
  };
}
