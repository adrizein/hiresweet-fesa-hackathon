import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../src/backbone/store.js';
import { runPipeline } from '../src/backbone/pipeline.js';

function makeCtx() {
  const store = createStore(mkdtempSync(join(tmpdir(), 'wake-pipeline-')));
  return { store, llm: { enabled: false }, clients: {}, config: {}, log: () => {} };
}

const source = {
  name: 'test-source',
  async collect() {
    return {
      companies: [
        { id: 'co-good', name: 'Goodco', flags: [] },
        { id: 'co-banned', name: 'Bannedco', flags: ['do_not_contact'] },
      ],
      people: [
        {
          id: 'p-jane',
          companyId: 'co-good',
          kind: 'contact',
          name: 'Jane',
          email: 'jane@goodco.example',
          emailStatus: 'verified',
        },
      ],
      signals: [
        { id: 'sig-1', type: 'hiring_wave', companyId: 'co-good', summary: 'hiring', confidence: 0.9 },
      ],
    };
  },
};

const processor = {
  name: 'test-processor',
  async process({ store }) {
    store.upsert('leads', { id: 'lead-co-good', companyId: 'co-good', score: 80, signalIds: ['sig-1'] });
  },
};

const planner = {
  name: 'test-planner',
  async plan() {
    const payload = { subject: 'Hello', body: 'A clean draft.' };
    return [
      {
        id: 'act-good',
        kind: 'outreach_email',
        channel: 'email',
        companyId: 'co-good',
        targetPersonId: 'p-jane',
        evidenceSignalIds: ['sig-1'],
        payload,
      },
      {
        id: 'act-banned',
        kind: 'outreach_email',
        channel: 'email',
        companyId: 'co-banned',
        targetPersonId: 'p-jane',
        evidenceSignalIds: ['sig-1'],
        payload,
      },
    ];
  },
};

test('end to end: signals merge, processors run, the gate splits actions', async () => {
  const ctx = makeCtx();
  const run = await runPipeline(ctx, {
    signals: [source],
    processors: [processor],
    planners: [planner],
  });

  assert.equal(run.stages.signals.signals, 1);
  assert.equal(run.stages.signals.companies, 2);
  // signals get stamped with the strategy that found them
  assert.equal(ctx.store.get('signals', 'sig-1').strategy, 'test-source');
  assert.equal(ctx.store.get('leads', 'lead-co-good').score, 80);
  assert.equal(ctx.store.get('actions', 'act-good').status, 'proposed');
  const blocked = ctx.store.get('actions', 'act-banned');
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.gate.passed, false);
  assert.equal(run.stages.actions.proposed, 1);
  assert.equal(run.stages.actions.blocked, 1);
});

test('a failing strategy is isolated and recorded, the run continues', async () => {
  const ctx = makeCtx();
  const broken = {
    name: 'broken-source',
    async collect() {
      throw new Error('boom');
    },
  };
  const run = await runPipeline(ctx, {
    signals: [source, broken],
    processors: [processor],
    planners: [planner],
  });
  assert.equal(run.errors.length, 1);
  assert.equal(run.errors[0].strategy, 'broken-source');
  // the healthy strategy still delivered
  assert.equal(run.stages.signals.signals, 1);
  assert.equal(ctx.store.get('actions', 'act-good').status, 'proposed');
});

test('re-runs never overwrite a human decision', async () => {
  const ctx = makeCtx();
  const plan = { signals: [source], processors: [processor], planners: [planner] };
  await runPipeline(ctx, plan);

  // a human approves from the inbox
  ctx.store.upsert('actions', { id: 'act-good', status: 'approved' });

  const rerun = await runPipeline(ctx, plan);
  assert.equal(ctx.store.get('actions', 'act-good').status, 'approved');
  assert.equal(rerun.stages.actions.skipped, 1);
});

test('stages can run in isolation', async () => {
  const ctx = makeCtx();
  const run = await runPipeline(ctx, {
    signals: [source],
    processors: [processor],
    planners: [planner],
    stages: ['signals'],
  });
  assert.ok(run.stages.signals);
  assert.equal(run.stages.processing, undefined);
  assert.equal(ctx.store.all('actions').length, 0);
});
