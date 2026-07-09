// HubSpot connector. READ-ONLY for this MVP (decision from the day plan):
// the only usage is contact history / dedup before drafting outreach, never
// a write. Falls back to a null-filled mock when HUBSPOT_TOKEN is absent,
// so this module never throws on a missing key and never makes a real
// network call in tests.

const SEARCH_URL = 'https://api.hubapi.com/crm/v3/objects/contacts/search';

/** True when the HubSpot token is present and non-empty. */
export function isConfigured() {
  return Boolean(process.env.HUBSPOT_TOKEN && process.env.HUBSPOT_TOKEN.trim() !== '');
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function buildFilters({ email, name }) {
  if (email) {
    return [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }];
  }

  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstname = parts[0] || '';
    const lastname = parts.slice(1).join(' ');

    const groups = [];
    if (firstname) {
      groups.push({ filters: [{ propertyName: 'firstname', operator: 'EQ', value: firstname }] });
    }
    if (lastname) {
      groups.push({ filters: [{ propertyName: 'lastname', operator: 'EQ', value: lastname }] });
    }

    return groups.length > 0 ? groups : [];
  }

  return [];
}

function mockStatus() {
  // null means "unknown, do not overwrite what the fixture already says".
  return { contact_status: null, last_contacted_at: null, owner: null, source: 'mock' };
}

/**
 * Look up a contact's history/dedup status by email (preferred) or name.
 * Real mode: CRM search API, read-only. Mock mode: nulls (unknown).
 */
export async function getContactStatus({ email, name, domain }) {
  if (!isConfigured()) {
    return mockStatus();
  }

  const filterGroups = buildFilters({ email, name });

  const body = {
    filterGroups,
    properties: [
      'email',
      'firstname',
      'lastname',
      'lifecyclestage',
      'notes_last_contacted',
      'lastmodifieddate',
      'hubspot_owner_id',
    ],
    limit: 1,
  };

  // domain is accepted for future company-level dedup but not yet part of
  // the contact search filter (contacts search API filters on contact
  // properties, not associated company domain).
  void domain;

  const response = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HubSpot: contact search failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const contact = payload?.results?.[0];

  if (!contact) {
    return { contact_status: 'never', last_contacted_at: null, owner: null, source: 'hubspot' };
  }

  const props = contact.properties || {};
  const isClient = (props.lifecyclestage || '').toLowerCase() === 'customer';

  return {
    contact_status: isClient ? 'client' : 'contacted',
    last_contacted_at: props.notes_last_contacted || props.lastmodifieddate || null,
    owner: props.hubspot_owner_id || null,
    source: 'hubspot',
  };
}
