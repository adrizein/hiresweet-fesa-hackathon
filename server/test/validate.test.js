import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateAccount, normalizeAccount, TIERS, CONTACT_STATUSES } from '../lib/validate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const fixturesPath = path.join(repoRoot, 'fixtures', 'accounts.example.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

test('valid fixture accounts pass validation', () => {
  assert.equal(fixtures.length, 5, 'expected 5 accounts in the fixture');

  for (const account of fixtures) {
    const result = validateAccount(account);
    assert.equal(result.ok, true, `expected ${account.id} to be valid, got errors: ${result.errors.join(', ')}`);
    assert.deepEqual(result.errors, []);
  }
});

test('missing id fails validation', () => {
  const account = { ...fixtures[0] };
  delete account.id;

  const result = validateAccount(account);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.startsWith('id:')));
});

test('bad tier fails validation', () => {
  const account = { ...fixtures[0], verdict: { ...fixtures[0].verdict, tier: 'MAYBE' } };

  const result = validateAccount(account);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('verdict.tier')));
  assert.ok(TIERS.includes('GO')); // sanity check on the exported constant
});

test('bad contact_status fails validation', () => {
  const account = {
    ...fixtures[0],
    people: [{ ...fixtures[0].people[0], contact_status: 'ghosted' }],
  };

  const result = validateAccount(account);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('contact_status')));
  assert.ok(CONTACT_STATUSES.includes('never')); // sanity check on the exported constant
});

test('extra unknown fields pass validation', () => {
  const account = {
    ...fixtures[0],
    some_future_field: 'anything',
    people: [{ ...fixtures[0].people[0], some_extra_flag: true }],
  };

  const result = validateAccount(account);
  assert.equal(result.ok, true, `unexpected errors: ${result.errors.join(', ')}`);
});

test('non-object or null input fails validation', () => {
  assert.equal(validateAccount(null).ok, false);
  assert.equal(validateAccount('not an object').ok, false);
  assert.equal(validateAccount(42).ok, false);
});

test('normalizeAccount fills defaults', () => {
  const minimal = {
    id: 'acct_minimal',
    name: 'Minimal Co',
    verdict: { tier: 'EXPLORE', why: 'test' },
  };

  const normalized = normalizeAccount(minimal);
  assert.deepEqual(normalized.signals, []);
  assert.deepEqual(normalized.people, []);

  const withPeople = {
    id: 'acct_people',
    name: 'People Co',
    verdict: { tier: 'GO', why: 'test' },
    people: [{ name: 'Someone' }],
  };

  const normalizedPeople = normalizeAccount(withPeople);
  assert.equal(normalizedPeople.people[0].contact_status, 'never');
  assert.equal(normalizedPeople.people[0].highlighted, false);
  assert.deepEqual(normalizedPeople.people[0].brief, { why: '', limits: '', angle: '', social_proof: [] });

  const withPartialBrief = {
    id: 'acct_brief',
    name: 'Brief Co',
    verdict: { tier: 'GO', why: 'test' },
    people: [{ name: 'Someone', highlighted: true, brief: { why: 'custom reason' } }],
  };

  const normalizedBrief = normalizeAccount(withPartialBrief);
  assert.equal(normalizedBrief.people[0].highlighted, true);
  assert.deepEqual(normalizedBrief.people[0].brief, {
    why: 'custom reason',
    limits: '',
    angle: '',
    social_proof: [],
  });
});
