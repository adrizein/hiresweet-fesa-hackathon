import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../src/backbone/store.js';
import { runGate } from '../src/backbone/gate.js';

function seededCtx() {
  const store = createStore(mkdtempSync(join(tmpdir(), 'wake-gate-')));
  store.upsert('companies', { id: 'co-clean', name: 'Cleanco', flags: [] });
  store.upsert('companies', { id: 'co-banned', name: 'Bannedco', flags: ['do_not_contact'] });
  store.upsert('companies', { id: 'co-shield', name: 'Shieldco', flags: ['protected'] });
  store.upsert('people', {
    id: 'p-ok',
    companyId: 'co-clean',
    kind: 'contact',
    name: 'Jane Doe',
    email: 'jane@cleanco.example',
    emailStatus: 'verified',
    flags: [],
  });
  store.upsert('people', {
    id: 'p-unverified',
    companyId: 'co-clean',
    kind: 'contact',
    name: 'John Roe',
    flags: [],
  });
  store.upsert('signals', { id: 'sig-1', companyId: 'co-clean', type: 'hiring_wave' });
  store.upsert('companies', { id: 'co-client', name: 'Clientco', flags: ['existing_client'] });
  store.upsert('people', {
    id: 'p-client-contact',
    companyId: 'co-client',
    kind: 'contact',
    name: 'Sam Client',
    phone: '+33 6 00 00 00 00',
    flags: [],
  });
  store.upsert('people', {
    id: 'p-no-phone',
    companyId: 'co-client',
    kind: 'contact',
    name: 'No Phone',
    flags: [],
  });
  store.upsert('signals', { id: 'sig-2', companyId: 'co-client', type: 'hiring_wave' });
  return { store };
}

function cleanAction(overrides = {}) {
  return {
    id: 'act-test',
    kind: 'outreach_email',
    channel: 'email',
    companyId: 'co-clean',
    targetPersonId: 'p-ok',
    evidenceSignalIds: ['sig-1'],
    payload: { subject: 'Hello', body: 'A clean, specific draft.' },
    ...overrides,
  };
}

test('a clean action passes every applicable check', async () => {
  const gate = await runGate(cleanAction(), seededCtx());
  assert.equal(gate.passed, true);
  assert.ok(gate.results.length >= 4);
});

test('do-not-contact company blocks the action', async () => {
  const gate = await runGate(cleanAction({ companyId: 'co-banned' }), seededCtx());
  assert.equal(gate.passed, false);
  const check = gate.results.find((r) => r.name === 'do-not-contact');
  assert.equal(check.passed, false);
  assert.match(check.reason, /do-not-contact/);
});

test('protected account blocks and asks to route to a human', async () => {
  const gate = await runGate(cleanAction({ companyId: 'co-shield' }), seededCtx());
  assert.equal(gate.passed, false);
  const check = gate.results.find((r) => r.name === 'protected-account');
  assert.match(check.reason, /route to a human/);
});

test('an action without cited evidence is blocked', async () => {
  const gate = await runGate(cleanAction({ evidenceSignalIds: [] }), seededCtx());
  assert.equal(gate.passed, false);
  assert.equal(gate.results.find((r) => r.name === 'evidence-required').passed, false);
});

test('citing a signal that does not exist is blocked', async () => {
  const gate = await runGate(cleanAction({ evidenceSignalIds: ['sig-ghost'] }), seededCtx());
  assert.equal(gate.passed, false);
});

test('an email to an unverified contact is blocked', async () => {
  const gate = await runGate(cleanAction({ targetPersonId: 'p-unverified' }), seededCtx());
  assert.equal(gate.passed, false);
  assert.equal(gate.results.find((r) => r.name === 'verified-contact').passed, false);
});

test('verified-contact does not apply to non-email channels', async () => {
  const gate = await runGate(
    cleanAction({ channel: 'internal', targetPersonId: 'p-unverified', payload: { message: 'Intro please.' } }),
    seededCtx(),
  );
  assert.equal(gate.passed, true);
  assert.equal(gate.results.some((r) => r.name === 'verified-contact'), false);
});

test('placeholder text in a draft is blocked', async () => {
  const gate = await runGate(
    cleanAction({ payload: { subject: 'Hello', body: 'Dear [FIRST NAME], we love your work.' } }),
    seededCtx(),
  );
  assert.equal(gate.passed, false);
  assert.equal(gate.results.find((r) => r.name === 'no-placeholders').passed, false);
});

test('candidate references with PII are blocked', async () => {
  const gate = await runGate(
    cleanAction({
      payload: {
        subject: 'Hello',
        body: 'Profiles below.',
        candidates: [{ handle: 'CAND-1', name: 'Real Person' }],
      },
    }),
    seededCtx(),
  );
  assert.equal(gate.passed, false);
  assert.equal(gate.results.find((r) => r.name === 'candidate-anonymity').passed, false);
});

test('a slack voice note to an existing client with a verified phone passes', async () => {
  const gate = await runGate(
    cleanAction({
      kind: 'voice_note',
      channel: 'slack',
      companyId: 'co-client',
      targetPersonId: 'p-client-contact',
      payload: { message: 'A clean, specific script.' },
    }),
    seededCtx(),
  );
  assert.equal(gate.passed, true);
});

test('a slack voice note to a non-client company is blocked', async () => {
  const gate = await runGate(
    cleanAction({
      kind: 'voice_note',
      channel: 'slack',
      companyId: 'co-clean',
      targetPersonId: 'p-ok',
      payload: { message: 'A clean, specific script.' },
    }),
    seededCtx(),
  );
  assert.equal(gate.passed, false);
  const check = gate.results.find((r) => r.name === 'existing-client-required');
  assert.equal(check.passed, false);
  assert.match(check.reason, /not a confirmed existing client/);
});

test('a slack voice note without a verified phone is blocked', async () => {
  const gate = await runGate(
    cleanAction({
      kind: 'voice_note',
      channel: 'slack',
      companyId: 'co-client',
      targetPersonId: 'p-no-phone',
      evidenceSignalIds: ['sig-2'],
      payload: { message: 'A clean, specific script.' },
    }),
    seededCtx(),
  );
  assert.equal(gate.passed, false);
  const check = gate.results.find((r) => r.name === 'verified-phone');
  assert.equal(check.passed, false);
  assert.match(check.reason, /no verified phone number/);
});

test('existing-client-required and verified-phone do not apply to non-slack channels', async () => {
  const gate = await runGate(cleanAction(), seededCtx());
  assert.equal(gate.results.some((r) => r.name === 'existing-client-required'), false);
  assert.equal(gate.results.some((r) => r.name === 'verified-phone'), false);
});

test('fail closed: a crashing check blocks the action', async () => {
  const crashing = [
    {
      name: 'exploding-check',
      run() {
        throw new Error('kaboom');
      },
    },
  ];
  const gate = await runGate(cleanAction(), seededCtx(), crashing);
  assert.equal(gate.passed, false);
  assert.match(gate.results[0].reason, /check crashed: kaboom/);
});

test('fail closed: zero applicable checks does not pass', async () => {
  const gate = await runGate(cleanAction(), seededCtx(), []);
  assert.equal(gate.passed, false);
});
