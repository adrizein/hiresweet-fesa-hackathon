// Integration tests: boot the real Express app on an ephemeral port and hit it
// with fetch. All connectors run in mock mode (keys deleted below) and the
// store writes to a temp dir, never to the repo's data/.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.ACCOUNT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'account-intel-api-'));
for (const key of ['FULLENRICH_API_KEY', 'ANTHROPIC_API_KEY', 'HUBSPOT_TOKEN', 'SILLAGE_API_KEY', 'SILLAGE_API_BASE']) {
  delete process.env[key];
}

const { createApp } = await import('../index.js');

let server;
let base;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test('GET /api/health reports ok and mock connectors', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.connectors, { sillage: false, fullenrich: false, hubspot: false, claude: false });
});

test('GET /api/accounts serves the 5 seeded fixture accounts', async () => {
  const res = await fetch(`${base}/api/accounts`);
  assert.equal(res.status, 200);
  const accounts = await res.json();
  assert.equal(accounts.length, 5);
  assert.ok(accounts.some((a) => a.id === 'acct_corvex'));
});

test('GET /api/accounts/:id returns one account, 404 on unknown', async () => {
  const res = await fetch(`${base}/api/accounts/acct_lumengrid`);
  assert.equal(res.status, 200);
  const account = await res.json();
  assert.equal(account.name, 'Lumen Grid');

  const missing = await fetch(`${base}/api/accounts/acct_nope`);
  assert.equal(missing.status, 404);
});

test('POST /api/leads upserts a valid account and rejects an invalid one', async () => {
  const payload = [
    {
      id: 'acct_testco',
      name: 'Test Co',
      domain: 'testco.dev',
      verdict: { tier: 'GO', why: 'hiring wave + fit, contact the CTO' },
      signals: [{ type: 'hiring_wave', detail: '3 engineering roles open' }],
    },
    { name: 'No Id Inc', verdict: { tier: 'GO', why: 'x' } },
  ];
  const res = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.accepted, 1);
  assert.equal(body.created, 1);
  assert.equal(body.rejected.length, 1);
  assert.equal(body.rejected[0].index, 1);
  assert.ok(body.rejected[0].errors.length > 0);

  const accounts = await (await fetch(`${base}/api/accounts`)).json();
  assert.equal(accounts.length, 6);
  const testco = accounts.find((a) => a.id === 'acct_testco');
  assert.deepEqual(testco.people, []);
});

test('POST /api/leads re-push without people preserves enriched people', async () => {
  const repush = {
    id: 'acct_lumengrid',
    name: 'Lumen Grid',
    domain: 'lumengrid.io',
    verdict: { tier: 'GO', why: 'refreshed signal, same account' },
    signals: [{ type: 'funding_round', detail: 'Series A confirmed' }],
  };
  const res = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(repush),
  });
  const body = await res.json();
  assert.equal(body.updated, 1);

  const account = await (await fetch(`${base}/api/accounts/acct_lumengrid`)).json();
  assert.ok(account.people.length >= 2, 'people from the fixture must survive a Bloc A refresh');
});

test('POST /api/leads with an empty body is a 400', async () => {
  const res = await fetch(`${base}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([]),
  });
  assert.equal(res.status, 400);
});

test('POST /api/enrich/:accountId fills missing coordinates (mock mode)', async () => {
  const res = await fetch(`${base}/api/enrich/acct_aperture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person: 'Julie Fontaine' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.enriched.length, 1);
  assert.equal(body.enriched[0].source, 'mock');
  const julie = body.account.people.find((p) => p.name === 'Julie Fontaine');
  assert.ok(julie.email, 'email must be filled by enrichment');
  assert.equal(julie.enrichment.source, 'mock');
});

test('POST /api/draft is blocked on the HUMAN tier account (Corvex guard)', async () => {
  const res = await fetch(`${base}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: 'acct_corvex', person: 'Elias Nord' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.blocked, true);
  assert.ok(body.reason.length > 0);
});

test('POST /api/draft drafts a cold email for a clean GO person', async () => {
  const res = await fetch(`${base}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: 'acct_baseline', person: 'Sara Kellerman' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.blocked, false);
  assert.equal(body.mode, 'cold');
  assert.equal(body.source, 'mock');
  assert.ok(body.draft.subject.length > 0);
  assert.ok(body.draft.body.split(/\s+/).length <= 150, 'kill-list: under 150 words');
});

test('POST /api/draft switches to followup mode for an already-contacted person', async () => {
  const res = await fetch(`${base}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: 'acct_northwind', person: 'Tom Weber' }),
  });
  const body = await res.json();
  assert.equal(body.blocked, false);
  assert.equal(body.mode, 'followup');
});

test('POST /api/draft 400s without params and 404s on unknowns', async () => {
  const bad = await fetch(`${base}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(bad.status, 400);

  const missing = await fetch(`${base}/api/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: 'acct_nope', person: 'Nobody' }),
  });
  assert.equal(missing.status, 404);
});
