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

    // Real employer behind a LinkedIn URL — used by companyVerification.js to
    // check that two people in an interaction work at different companies,
    // instead of trusting their LinkedIn headline text (see src/signals/
    // 50-post-engagement.js for why: a headline naming no company at all
    // turned out, once checked here, to belong to an employee of the exact
    // company she appeared to be engaging with from the outside).
    // Returns a domain string, or null when unresolved (fail-closed: the
    // caller must treat null as "cannot verify", never as "assume distinct").
    // Live path is unconfirmed this session (MCP-only access) — TODO(Kubilay):
    // confirm the real REST path before trusting `live` mode in production.
    async resolvePersonCompanyDomain(linkedinUrl) {
      if (live) {
        try {
          const response = await fetch(`${BASE_URL}/people/search`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_linkedin_urls: [{ value: linkedinUrl, exact_match: true }], limit: 1 }),
          });
          if (response.ok) {
            const json = await response.json();
            const domain = json?.people?.[0]?.employment?.current?.company?.domain;
            if (domain) return domain;
          }
        } catch {
          // fall through to fixtures below
        }
      }
      const map = JSON.parse(
        readFileSync(join(fixturesDir, 'fullenrich', 'companyByPerson.json'), 'utf8'),
      );
      return map[linkedinUrl] ?? null;
    },
  };
}
