'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { runPipeline, OPPORTUNITIES_FILE, DATA_DIR } = require('../lib/pipeline');
const { normalizeSignal } = require('../lib/normalize-signal');

function resetOpportunitiesFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(OPPORTUNITIES_FILE)) {
    fs.unlinkSync(OPPORTUNITIES_FILE);
  }
}

function makeSignal(overrides = {}) {
  return normalizeSignal({
    company: { name: 'Acme Corp', domain: 'acme.io' },
    person: { firstname: 'Jane', lastname: 'Doe', title: 'VP Sales' },
    detail: 'Jane just joined Acme Corp, a champion move.',
    ...overrides
  });
}

test('pipeline runs end-to-end with default stub deps and writes an opportunity', async () => {
  resetOpportunitiesFile();
  const signal = makeSignal();

  const opportunity = await runPipeline(signal);

  assert.match(opportunity.id, /^opp_/);
  assert.equal(opportunity.signal.id, signal.id);
  assert.equal(opportunity.signal.type, signal.type);
  assert.equal(opportunity.signal.detected_at, signal.detected_at);
  assert.equal(opportunity.company.name, 'Acme Corp');
  assert.equal(opportunity.triage.verdict, 'T2');
  assert.equal(opportunity.route.route, 'cold');
  assert.equal(opportunity.gate.ok, true);
  assert.equal(opportunity.status, 'pending');
  assert.equal(opportunity.sequence.length, 3);

  const persisted = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf8'));
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].id, opportunity.id);
});

test('default route finds a warm path from warm-paths.json and downgrades to cold otherwise', async () => {
  resetOpportunitiesFile();
  const os = require('os');
  const path = require('path');
  const warmFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wake-test-')), 'warm-paths.json');
  fs.writeFileSync(warmFile, JSON.stringify([
    { match: 'acme.io', route: 'warm_intro', via: 'Sam Connector (Seed Fund)', evidence: 'common investor with our client Beta Corp' }
  ]), 'utf8');
  process.env.WAKE_WARM_PATHS = warmFile;
  try {
    const warm = await runPipeline(makeSignal());
    assert.equal(warm.route.route, 'warm_intro');
    assert.equal(warm.route.via, 'Sam Connector (Seed Fund)');
    assert.match(warm.route.reasons[0], /warm path found/);

    const cold = await runPipeline(makeSignal({ company: { name: 'Stranger Co', domain: 'stranger.io' } }));
    assert.equal(cold.route.route, 'cold');
    assert.equal(cold.route.via, null);
  } finally {
    delete process.env.WAKE_WARM_PATHS;
  }
});

test('default triage flags protected accounts as T1 and the default gate blocks them', async () => {
  resetOpportunitiesFile();
  const os = require('os');
  const path = require('path');
  const protectedFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wake-test-')), 'protected-accounts.json');
  fs.writeFileSync(protectedFile, JSON.stringify(['activeclient.io']), 'utf8');
  process.env.WAKE_PROTECTED_ACCOUNTS = protectedFile;
  try {
    const signal = makeSignal({ company: { name: 'Active Client', domain: 'activeclient.io' } });

    const opportunity = await runPipeline(signal);

    assert.equal(opportunity.triage.verdict, 'T1');
    assert.equal(opportunity.gate.ok, false);
    assert.equal(opportunity.status, 'blocked');
    assert.match(opportunity.gate.reasons[0], /only T2 may be sequenced/);
  } finally {
    delete process.env.WAKE_PROTECTED_ACCOUNTS;
  }
});

test('pipeline short-circuits to status "blocked" when the gate returns ok:false', async () => {
  resetOpportunitiesFile();
  const signal = makeSignal({ company: { name: 'Blocked Co' } });

  const opportunity = await runPipeline(signal, {
    gate: async () => ({ ok: false, reasons: ['adversarial check failed: no verifiable proof'] })
  });

  assert.equal(opportunity.gate.ok, false);
  assert.equal(opportunity.status, 'blocked');
  assert.deepEqual(opportunity.gate.reasons, ['adversarial check failed: no verifiable proof']);

  const persisted = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf8'));
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].status, 'blocked');
});

test('pipeline honors custom injected deps for every step', async () => {
  resetOpportunitiesFile();
  const signal = makeSignal();
  const calls = [];

  const opportunity = await runPipeline(signal, {
    triage: async (s) => {
      calls.push('triage');
      return { verdict: 'T2', reasons: ['custom triage stub'] };
    },
    route: async (s, triage) => {
      calls.push('route');
      return { route: 'warm_intro', via: 'Jane Connector (Fund X)', evidence: 'co-investor in two of our clients', reasons: ['custom route stub'] };
    },
    enrich: async (s) => {
      calls.push('enrich');
      return { firstname: 'Jane', lastname: 'Doe', title: 'VP Sales', linkedin_url: null, email: 'jane@acme.io', phone: null };
    },
    proof: async (s) => {
      calls.push('proof');
      return { narrative: 'Placed a VP Sales at a similar company in 3 weeks.', source: 'test-proof-engine' };
    },
    craft: async (s, proof) => {
      calls.push('craft');
      return [{ step: 1, subject: 'Hi', body: `mentions: ${proof.narrative}` }];
    },
    gate: async (draft) => {
      calls.push('gate');
      return { ok: true, reasons: ['custom gate passed'] };
    },
    publish: async (opp) => {
      calls.push('publish');
      return opp;
    }
  });

  assert.deepEqual(calls, ['triage', 'route', 'enrich', 'proof', 'craft', 'gate', 'publish']);
  assert.equal(opportunity.triage.verdict, 'T2');
  assert.equal(opportunity.route.route, 'warm_intro');
  assert.equal(opportunity.route.via, 'Jane Connector (Fund X)');
  assert.equal(opportunity.contact.email, 'jane@acme.io');
  assert.equal(opportunity.proof.source, 'test-proof-engine');
  assert.match(opportunity.sequence[0].body, /Placed a VP Sales/);
  assert.equal(opportunity.status, 'pending');
});
