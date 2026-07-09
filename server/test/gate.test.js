import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { gate } from '../lib/gate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const fixturesPath = path.join(repoRoot, 'fixtures', 'accounts.example.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

function findAccount(id) {
  const account = fixtures.find((a) => a.id === id);
  assert.ok(account, `expected fixture account ${id} to exist`);
  return account;
}

function findPerson(account, name) {
  const person = account.people.find((p) => p.name === name);
  assert.ok(person, `expected ${account.id} to have a person named ${name}`);
  return person;
}

test('Corvex Systems (HUMAN tier) blocks the client contact', () => {
  const corvex = findAccount('acct_corvex');
  const elias = findPerson(corvex, 'Elias Nord');

  assert.equal(elias.contact_status, 'client');

  const result = gate(corvex, elias);
  assert.equal(result.allowed, false);
  assert.equal(result.mode, null);
  assert.match(result.reason, /route the signal to the account owner/);
});

test('person with contact_status client is blocked even outside the HUMAN account', () => {
  const northwind = findAccount('acct_northwind');
  const clientPerson = { name: 'Some Client Contact', contact_status: 'client' };

  const result = gate(northwind, clientPerson);
  assert.equal(result.allowed, false);
  assert.equal(result.mode, null);
  assert.match(result.reason, /route to the human who owns the relationship/);
});

test('Northwind / Tom Weber (contacted) is allowed as a followup, never re-cold', () => {
  const northwind = findAccount('acct_northwind');
  const tom = findPerson(northwind, 'Tom Weber');

  assert.equal(tom.contact_status, 'contacted');

  const result = gate(northwind, tom);
  assert.equal(result.allowed, true);
  assert.equal(result.mode, 'followup');
  assert.match(result.reason, /never re-cold/);
});

test('clean GO account with a never-contacted person is allowed cold', () => {
  const lumengrid = findAccount('acct_lumengrid');
  const marco = findPerson(lumengrid, 'Marco Reyes');

  assert.equal(lumengrid.verdict.tier, 'GO');
  assert.equal(marco.contact_status, 'never');

  const result = gate(lumengrid, marco);
  assert.equal(result.allowed, true);
  assert.equal(result.mode, 'cold');
});

test('missing person is blocked (fail-closed)', () => {
  const lumengrid = findAccount('acct_lumengrid');

  const result = gate(lumengrid, null);
  assert.equal(result.allowed, false);
  assert.equal(result.mode, null);
  assert.match(result.reason, /fail-closed/);
});

test('missing account is blocked (fail-closed)', () => {
  const someone = { name: 'Nobody', contact_status: 'never' };

  const result = gate(null, someone);
  assert.equal(result.allowed, false);
  assert.equal(result.mode, null);
  assert.match(result.reason, /fail-closed/);
});

test('missing account.verdict is blocked (fail-closed)', () => {
  const someone = { name: 'Nobody', contact_status: 'never' };

  const result = gate({ id: 'acct_no_verdict', name: 'No Verdict Co' }, someone);
  assert.equal(result.allowed, false);
  assert.match(result.reason, /fail-closed/);
});

test('SKIP tier account is blocked with the violated filter in the reason', () => {
  const skipAccount = {
    id: 'acct_skip_demo',
    name: 'Skip Demo Co',
    verdict: { tier: 'SKIP', why: 'agence de recrutement, competiteur direct' },
  };
  const someone = { name: 'Someone', contact_status: 'never' };

  const result = gate(skipAccount, someone);
  assert.equal(result.allowed, false);
  assert.equal(result.mode, null);
  assert.match(result.reason, /competiteur direct/);
});

test('person tagged do_not_contact is blocked even on a GO account', () => {
  const lumengrid = findAccount('acct_lumengrid');
  const flagged = { name: 'Flagged Person', contact_status: 'never', do_not_contact: true };

  const result = gate(lumengrid, flagged);
  assert.equal(result.allowed, false);
  assert.equal(result.mode, null);
  assert.match(result.reason, /do-not-contact/);
});
