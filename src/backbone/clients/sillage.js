import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Sillage client — two feeds behind one seam:
//
//  - fetchSignals(type): the committed demo fixtures (fictional accounts,
//    power-map flags, the guardrail story). Always available.
//  - fetchDetections(): LIVE workspace detections from the V2 API.
//    Confirmed endpoints (probed with the workspace key):
//      GET {base}/companies/{id}   -> company enrichment        [confirmed]
//      GET {base}/leads/{id}       -> person behind a signal    [confirmed]
//      GET {base}/agents           -> workspace agents          [confirmed]
//      GET {base}/persona          -> workspace persona         [confirmed]
//    The detections LIST route is not published yet — its path comes from the
//    on-site onboarding. Until then set SILLAGE_SIGNALS_PATH when known, and
//    fetchDetections() falls back to data/sillage/detections.json — a dump of
//    real detections exported through the Sillage MCP (same schema).
const DEFAULT_BASE = 'https://api.getsillage.com/api/v2';

export function createSillageClient({ fixturesDir, dataDir }) {
  const apiKey = process.env.SILLAGE_API_KEY;
  const baseUrl = (process.env.SILLAGE_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const signalsPath = process.env.SILLAGE_SIGNALS_PATH || 'signals';
  const live = Boolean(apiKey);
  const companyCache = new Map();

  async function apiGet(path) {
    const response = await fetch(`${baseUrl}/${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      const error = new Error(`Sillage API GET /${path} failed: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  function readDump() {
    const dumpPath = join(dataDir, 'sillage', 'detections.json');
    if (!existsSync(dumpPath)) return null;
    return JSON.parse(readFileSync(dumpPath, 'utf8'));
  }

  return {
    name: 'sillage',
    mode: live ? 'live' : 'fixtures',

    // Demo fixtures (fictional, committed) — powers the guardrail story.
    async fetchSignals(type) {
      const all = JSON.parse(
        readFileSync(join(fixturesDir, 'sillage', 'signals.json'), 'utf8'),
      );
      return type ? all.filter((s) => s.type === type) : all;
    },

    // Live workspace detections + a resolved { companyId -> company } map.
    // Source order: live REST list route (when its path is known), then the
    // MCP-exported dump. Companies resolve via live REST with dump fallback.
    async fetchDetections({ log = () => {} } = {}) {
      const dump = readDump();
      let detections = null;
      let source = null;

      if (live) {
        try {
          const page = await apiGet(`${signalsPath}?page_size=100`);
          detections = page.data ?? [];
          source = `live GET /${signalsPath}`;
        } catch (error) {
          log(`sillage: detections list route not reachable (${error.message})`);
        }
      }
      if (!detections && dump) {
        detections = dump.detections ?? [];
        source = `local dump (exported ${dump.exportedAt})`;
      }
      if (!detections) {
        log('sillage: no live detections — set SILLAGE_API_KEY or export a dump to data/sillage/detections.json');
        return { detections: [], companies: {}, source: 'none' };
      }

      const companies = {};
      const ids = [...new Set(detections.map((d) => d.company_id).filter(Boolean))];
      for (const id of ids) {
        companies[id] = await this.fetchCompany(id, { dump, log });
      }
      return { detections, companies, source };
    },

    // Company enrichment: live REST (confirmed route) -> dump -> placeholder.
    async fetchCompany(companyId, { dump = readDump(), log = () => {} } = {}) {
      if (companyCache.has(companyId)) return companyCache.get(companyId);
      let company = null;
      if (live) {
        try {
          company = (await apiGet(`companies/${companyId}`)).data;
        } catch (error) {
          log(`sillage: company ${companyId} lookup failed (${error.message})`);
        }
      }
      if (!company) company = dump?.companies?.[String(companyId)] ?? null;
      if (!company) company = { name: `Sillage company ${companyId}`, domain: null, location: null };
      companyCache.set(companyId, company);
      return company;
    },

    // Person behind a signal (confirmed route). Null when unresolvable.
    async fetchLead(leadId) {
      if (!live || !leadId) return null;
      try {
        return (await apiGet(`leads/${leadId}`)).data;
      } catch {
        return null;
      }
    },
  };
}
