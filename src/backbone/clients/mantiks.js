import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Mantiks client — same seam pattern as sillage.js: a confirmed key activates
// live mode, but the exact REST base/path were not available this session
// (no API docs, no MCP access — only the key). Rather than guess a URL that
// would fail silently in the demo, this client stays on fixtures until
// MANTIKS_API_BASE / MANTIKS_SIGNALS_PATH are set from Mantiks' own API
// reference (same discipline as SILLAGE_SIGNALS_PATH below).
const DEFAULT_BASE = 'https://api.mantiks.io/v1'; // UNCONFIRMED — placeholder, do not trust in prod

export function createMantiksClient({ fixturesDir }) {
  const apiKey = process.env.MANTIKS_API_KEY;
  const baseUrl = (process.env.MANTIKS_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const signalsPath = process.env.MANTIKS_SIGNALS_PATH; // unset until confirmed
  const live = Boolean(apiKey);

  async function apiGet(path) {
    const response = await fetch(`${baseUrl}/${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      const error = new Error(`Mantiks API GET /${path} failed: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  return {
    name: 'mantiks',
    // 'live-untested' rather than 'live': the key is real, the endpoint path
    // is not confirmed yet, so calls are attempted but expected to fail until
    // MANTIKS_SIGNALS_PATH is set — the strategy falls back to fixtures either way.
    mode: live ? (signalsPath ? 'live' : 'live-untested') : 'fixtures',

    // Fictional, committed demo data (public-safe) — always available.
    async fetchSignals(type) {
      const all = JSON.parse(readFileSync(join(fixturesDir, 'mantiks', 'signals.json'), 'utf8'));
      return type ? all.filter((s) => s.type === type) : all;
    },

    // Live hiring/job-change signals. Returns null (not []) when the live
    // route isn't reachable, so the caller can tell "tried and failed" apart
    // from "nothing found".
    async fetchLiveSignals({ log = () => {} } = {}) {
      if (!live || !signalsPath) return null;
      try {
        const page = await apiGet(`${signalsPath}?page_size=100`);
        return page.data ?? page.results ?? [];
      } catch (error) {
        log(`mantiks: live signals not reachable (${error.message}) — set MANTIKS_API_BASE/MANTIKS_SIGNALS_PATH once confirmed`);
        return null;
      }
    },
  };
}
