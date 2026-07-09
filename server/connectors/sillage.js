// Sillage connector.
// Bloc A currently pushes accounts through POST /api/leads on this server;
// this connector becomes the pull alternative once the Sillage base URL
// and signal schema are confirmed (given at the on-site onboarding).
//
// Real mode requires BOTH SILLAGE_API_KEY and SILLAGE_API_BASE. Missing
// either falls back to an empty array, so this module never throws on a
// missing key/base and never makes a real network call in tests.

/** True when both the Sillage API key and base URL are present and non-empty. */
export function isConfigured() {
  return Boolean(
    process.env.SILLAGE_API_KEY &&
      process.env.SILLAGE_API_KEY.trim() !== '' &&
      process.env.SILLAGE_API_BASE &&
      process.env.SILLAGE_API_BASE.trim() !== ''
  );
}

/**
 * Pull the current list of signals from Sillage. Returns [] when the key
 * or base URL is not configured (mock mode has nothing to fabricate here,
 * signals are not something we can invent).
 */
export async function fetchSignals() {
  if (!isConfigured()) {
    return [];
  }

  const base = process.env.SILLAGE_API_BASE.replace(/\/+$/, '');

  const response = await fetch(`${base}/signals`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.SILLAGE_API_KEY}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Sillage: failed to fetch signals (${response.status}): ${text}`);
  }

  return response.json();
}
