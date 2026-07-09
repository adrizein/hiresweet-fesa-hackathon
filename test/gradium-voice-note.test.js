import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../src/backbone/store.js';
import strategy from '../src/actions/40-gradium-voice-note.js';

function fakeGradium() {
  return {
    async textToVoiceNote(script) {
      return { audioUrl: `fixtures://test/${script.length}.mp3`, durationSeconds: 12, voice: 'fixtures' };
    },
  };
}

function baseCtx() {
  const store = createStore(mkdtempSync(join(tmpdir(), 'wake-gradium-')));
  return {
    store,
    clients: { gradium: fakeGradium() },
    llm: { enabled: false },
    log: () => {},
  };
}

function seedClient(store, { flags = ['existing_client'], phone = '+33 6 00 00 00 00' } = {}) {
  store.upsert('companies', { id: 'co-kelmora', name: 'Kelmora', location: 'Paris', flags, openRoles: [] });
  store.upsert('people', {
    id: 'p-sofia',
    companyId: 'co-kelmora',
    kind: 'contact',
    name: 'Sofia Marchetti',
    role: 'Head of Engineering',
    powerRole: 'champion',
    phone,
    flags: [],
  });
  store.upsert('signals', {
    id: 'sig-hiring-kelmora',
    type: 'hiring_wave',
    companyId: 'co-kelmora',
    summary: 'Kelmora opened 2 role(s): Backend Engineer, Senior Account Executive',
    confidence: 0.6,
  });
}

test('produces a voice_note action for an existing client with a hiring signal and a verified phone', async () => {
  const ctx = baseCtx();
  seedClient(ctx.store);
  const actions = await strategy.plan(ctx);
  assert.equal(actions.length, 1);
  const action = actions[0];
  assert.equal(action.kind, 'voice_note');
  assert.equal(action.channel, 'slack');
  assert.equal(action.companyId, 'co-kelmora');
  assert.equal(action.targetPersonId, 'p-sofia');
  assert.deepEqual(action.evidenceSignalIds, ['sig-hiring-kelmora']);
  assert.match(action.payload.message, /Sofia/);
  assert.ok(action.payload.audioUrl);
});

test('skips a company that is not flagged as an existing client', async () => {
  const ctx = baseCtx();
  seedClient(ctx.store, { flags: [] });
  const actions = await strategy.plan(ctx);
  assert.equal(actions.length, 0);
});

test('skips a do-not-contact or protected existing client', async () => {
  const ctx = baseCtx();
  seedClient(ctx.store, { flags: ['existing_client', 'do_not_contact'] });
  const actions = await strategy.plan(ctx);
  assert.equal(actions.length, 0);
});

test('skips when the primary contact has no verified phone yet', async () => {
  const ctx = baseCtx();
  seedClient(ctx.store, { phone: null });
  const actions = await strategy.plan(ctx);
  assert.equal(actions.length, 0);
});

test('skips a client with no hiring-type signal', async () => {
  const ctx = baseCtx();
  seedClient(ctx.store);
  // overwrite the signal with a non-hiring type
  ctx.store.upsert('signals', { id: 'sig-hiring-kelmora', type: 'champion_move' });
  const actions = await strategy.plan(ctx);
  assert.equal(actions.length, 0);
});

test('includes anonymized candidate matches in the payload when present', async () => {
  const ctx = baseCtx();
  seedClient(ctx.store);
  ctx.store.upsert('candidates', { id: 'cand-1', handle: 'CAND-1', headline: 'Backend Engineer — 5 yrs' });
  ctx.store.upsert('matches', { id: 'match-1', companyId: 'co-kelmora', candidateId: 'cand-1', score: 75 });
  const actions = await strategy.plan(ctx);
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0].payload.candidates, [{ handle: 'CAND-1', headline: 'Backend Engineer — 5 yrs' }]);
});
