// FullEnrich connector, REST v2, base https://app.fullenrich.com/api/v2.
// Bulk enrichment is async: POST to start a batch, GET to poll until finished.
// Falls back to a deterministic mock when FULLENRICH_API_KEY is absent, so
// this module never throws on a missing key and never makes a real network
// call in tests.

const BASE = 'https://app.fullenrich.com/api/v2';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

/** True when the FullEnrich API key is present and non-empty. */
export function isConfigured() {
  return Boolean(process.env.FULLENRICH_API_KEY && process.env.FULLENRICH_API_KEY.trim() !== '');
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.FULLENRICH_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/** Split a full name into a best-effort firstname/lastname pair. */
function splitName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: '', lastname: '' };
  if (parts.length === 1) return { firstname: parts[0], lastname: '' };
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') };
}

/** Derive a plausible company slug (domain root, or company name) for the mock email. */
function mockDomain({ domain, company }) {
  if (domain && domain.trim() !== '') return domain.trim().toLowerCase();
  if (company && company.trim() !== '') {
    return `${company.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')}.io`;
  }
  return 'example.io';
}

function mockEnrichPerson({ name, domain, company }) {
  const { firstname, lastname } = splitName(name);
  const first = firstname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const last = lastname.toLowerCase().replace(/[^a-z0-9]/g, '');
  const local = last ? `${first}.${last}` : first || 'contact';
  const email = `${local}@${mockDomain({ domain, company })}`;

  return { email, phone: null, verified: false, source: 'mock' };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start a bulk enrichment for a single person and poll until finished.
 * Returns { email, phone, verified: true, source: 'fullenrich' } with null
 * fields when no match is found. Throws on HTTP errors or polling timeout.
 */
export async function enrichPerson({ name, domain, company, linkedin_url }) {
  if (!isConfigured()) {
    return mockEnrichPerson({ name, domain, company });
  }

  const { firstname, lastname } = splitName(name);

  const startBody = {
    name: 'account-intel',
    datas: [
      {
        firstname,
        lastname,
        domain: domain || undefined,
        company_name: company || undefined,
        linkedin_url: linkedin_url || undefined,
      },
    ],
  };

  const startResponse = await fetch(`${BASE}/contact/enrich/bulk`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(startBody),
    signal: AbortSignal.timeout(15000),
  });

  if (!startResponse.ok) {
    const text = await startResponse.text().catch(() => '');
    throw new Error(`FullEnrich: failed to start bulk enrichment (${startResponse.status}): ${text}`);
  }

  const startPayload = await startResponse.json();
  const enrichmentId = startPayload?.enrichment_id || startPayload?.id;

  if (!enrichmentId) {
    throw new Error('FullEnrich: bulk enrichment response did not include an id');
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const pollResponse = await fetch(`${BASE}/contact/enrich/bulk/${enrichmentId}`, {
      method: 'GET',
      headers: authHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!pollResponse.ok) {
      const text = await pollResponse.text().catch(() => '');
      throw new Error(`FullEnrich: failed to poll bulk enrichment (${pollResponse.status}): ${text}`);
    }

    const pollPayload = await pollResponse.json();

    if (pollPayload?.status === 'finished' || pollPayload?.status === 'FINISHED') {
      const results = pollPayload?.datas || pollPayload?.results || [];
      const first = results[0] || {};

      const emails = first.emails || first.contact?.emails || [];
      const phones = first.phones || first.contact?.phones || [];

      const bestEmail = emails[0]?.email || emails[0] || null;
      const bestPhone = phones[0]?.phone || phones[0] || null;

      return {
        email: bestEmail,
        phone: bestPhone,
        verified: true,
        source: 'fullenrich',
      };
    }
  }

  throw new Error('FullEnrich: bulk enrichment polling timed out after 60s');
}

/** Return the account's remaining FullEnrich credits, or a mock stub. */
export async function getCredits() {
  if (!isConfigured()) {
    return { credits: null, source: 'mock' };
  }

  const response = await fetch(`${BASE}/account/credits`, {
    method: 'GET',
    headers: authHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`FullEnrich: failed to fetch credits (${response.status}): ${text}`);
  }

  return response.json();
}
