'use strict';

/**
 * Normalizes an arbitrary inbound signal payload (e.g. from Sillage) into the
 * canonical Signal envelope described in contracts/signal.schema.json.
 *
 * The exact shape of the upstream API is not fully known ahead of the event,
 * so every field lookup is defensive: it tries several plausible field names
 * and falls back gracefully instead of throwing.
 */

const TYPE_KEYWORDS = [
  {
    type: 'champion_move',
    keywords: ['champion', 'moved to', 'joined', 'new role', 'now at', 'promotion', 'promoted']
  },
  {
    type: 'job_change',
    keywords: ['job change', 'left', 'departure', 'new position', 'changed jobs', 'switched companies']
  },
  {
    type: 'hiring_wave',
    keywords: ['hiring', 'open roles', 'job posting', 'headcount', 'recruiting', 'is hiring']
  },
  {
    type: 'funding_round',
    keywords: ['raised', 'funding', 'series a', 'series b', 'series c', 'seed round', 'investment']
  },
  {
    type: 'competitor_engagement',
    keywords: ['competitor', 'evaluating', 'trial', 'switched from', 'churned from', 'using a competitor']
  }
];

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function pick(obj, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let cursor = obj;
    let ok = true;
    for (const part of parts) {
      if (cursor && typeof cursor === 'object' && part in cursor) {
        cursor = cursor[part];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && cursor !== undefined && cursor !== null && cursor !== '') return cursor;
  }
  return null;
}

function inferType(explicitType, detailText) {
  const allowed = TYPE_KEYWORDS.map((entry) => entry.type);
  if (typeof explicitType === 'string') {
    const normalized = explicitType.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (allowed.includes(normalized)) return normalized;
  }

  const haystack = (detailText || '').toLowerCase();
  if (haystack) {
    for (const entry of TYPE_KEYWORDS) {
      if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
        return entry.type;
      }
    }
  }

  return 'other';
}

function generateId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `sig_${ts}_${rand}`;
}

function normalizeSignal(payload) {
  const body = payload && typeof payload === 'object' ? payload : {};

  const companyName = pick(body, [
    'company.name',
    'company_name',
    'companyName',
    'account.name',
    'organization.name',
    'org_name'
  ]);

  const companyDomain = pick(body, [
    'company.domain',
    'company_domain',
    'companyDomain',
    'domain',
    'account.domain',
    'organization.domain'
  ]);

  const firstname = pick(body, [
    'person.firstname',
    'person.first_name',
    'person.firstName',
    'contact.firstname',
    'contact.first_name',
    'firstname',
    'first_name'
  ]);

  const lastname = pick(body, [
    'person.lastname',
    'person.last_name',
    'person.lastName',
    'contact.lastname',
    'contact.last_name',
    'lastname',
    'last_name'
  ]);

  const title = pick(body, [
    'person.title',
    'person.job_title',
    'person.jobTitle',
    'contact.title',
    'title',
    'job_title'
  ]);

  const linkedinUrl = pick(body, [
    'person.linkedin_url',
    'person.linkedinUrl',
    'person.linkedin',
    'contact.linkedin_url',
    'linkedin_url',
    'linkedinUrl'
  ]);

  const detail = firstDefined(
    pick(body, ['detail', 'description', 'summary', 'message', 'text', 'reason']),
    ''
  );

  const explicitType = pick(body, ['type', 'signal_type', 'signalType', 'category', 'event_type']);
  const type = inferType(explicitType, detail || pick(body, ['title', 'headline']));

  const detectedAt = firstDefined(
    pick(body, ['detected_at', 'detectedAt', 'timestamp', 'occurred_at', 'date', 'created_at']),
    new Date().toISOString()
  );

  return {
    id: generateId(),
    type,
    company: {
      name: companyName,
      domain: companyDomain
    },
    person: {
      firstname,
      lastname,
      title,
      linkedin_url: linkedinUrl
    },
    detail: detail || '',
    detected_at: detectedAt,
    source: firstDefined(pick(body, ['source']), 'sillage'),
    raw: body
  };
}

module.exports = { normalizeSignal };
