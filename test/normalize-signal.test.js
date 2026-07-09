'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeSignal } = require('../lib/normalize-signal');

test('normalizes a nested "camelCase-ish" payload shape', () => {
  const payload = {
    company: { name: 'Acme Corp', domain: 'acme.io' },
    person: {
      firstname: 'Jane',
      lastname: 'Doe',
      title: 'VP Sales',
      linkedin_url: 'https://linkedin.com/in/janedoe'
    },
    detail: 'Jane just joined Acme Corp as VP Sales, a champion move worth tracking.',
    detected_at: '2026-07-01T10:00:00.000Z',
    source: 'sillage'
  };

  const signal = normalizeSignal(payload);

  assert.match(signal.id, /^sig_/);
  assert.equal(signal.type, 'champion_move');
  assert.equal(signal.company.name, 'Acme Corp');
  assert.equal(signal.company.domain, 'acme.io');
  assert.equal(signal.person.firstname, 'Jane');
  assert.equal(signal.person.lastname, 'Doe');
  assert.equal(signal.person.title, 'VP Sales');
  assert.equal(signal.person.linkedin_url, 'https://linkedin.com/in/janedoe');
  assert.equal(signal.detected_at, '2026-07-01T10:00:00.000Z');
  assert.equal(signal.source, 'sillage');
  assert.deepEqual(signal.raw, payload);
});

test('normalizes a flat snake_case payload shape', () => {
  const payload = {
    company_name: 'Beta LLC',
    company_domain: 'beta.com',
    first_name: 'John',
    last_name: 'Smith',
    job_title: 'Head of Growth',
    linkedin_url: 'https://linkedin.com/in/johnsmith',
    description: 'Beta LLC just raised a Series B funding round.',
    timestamp: '2026-06-15T08:30:00.000Z'
  };

  const signal = normalizeSignal(payload);

  assert.equal(signal.type, 'funding_round');
  assert.equal(signal.company.name, 'Beta LLC');
  assert.equal(signal.company.domain, 'beta.com');
  assert.equal(signal.person.firstname, 'John');
  assert.equal(signal.person.lastname, 'Smith');
  assert.equal(signal.person.title, 'Head of Growth');
  assert.equal(signal.detected_at, '2026-06-15T08:30:00.000Z');
});

test('falls back to "other" type and safe defaults for an unknown minimal payload', () => {
  const payload = {
    account: { name: 'Gamma Inc' },
    message: 'Something happened at Gamma Inc, unclear what.'
  };

  const signal = normalizeSignal(payload);

  assert.equal(signal.type, 'other');
  assert.equal(signal.company.name, 'Gamma Inc');
  assert.equal(signal.company.domain, null);
  assert.equal(signal.person.firstname, null);
  assert.equal(signal.person.lastname, null);
  assert.equal(signal.person.title, null);
  assert.equal(signal.person.linkedin_url, null);
  assert.equal(signal.detail, 'Something happened at Gamma Inc, unclear what.');
  assert.equal(signal.source, 'sillage');
  assert.ok(signal.detected_at);
  assert.match(signal.id, /^sig_/);
});

test('handles a completely empty payload without throwing', () => {
  const signal = normalizeSignal({});

  assert.equal(signal.type, 'other');
  assert.equal(signal.company.name, null);
  assert.equal(signal.company.domain, null);
  assert.equal(signal.detail, '');
  assert.deepEqual(signal.raw, {});
});
