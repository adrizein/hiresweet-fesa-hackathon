import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.ACCOUNT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'account-intel-sync-'));

const { loadAccounts, getAccount } = await import('../lib/store.js');
const { pushAccountsToBackbone, pullBackboneToAccounts } = await import('../lib/backbone-sync.js');
const { createStore } = await import('../../src/backbone/store.js');

test('push: app accounts land in the backbone with gate parity', async () => {
  await loadAccounts(); // seeds the 5 fixture accounts
  const counts = await pushAccountsToBackbone();
  assert.equal(counts.companies, 5);

  const store = createStore(process.env.ACCOUNT_DATA_DIR);
  const corvex = store.get('companies', 'acct_corvex');
  assert.ok(corvex.flags.includes('protected'), 'HUMAN tier must map to protected flag');
  const elias = store.all('people').find((p) => p.name === 'Elias Nord');
  assert.ok(elias.flags.includes('do_not_contact'), 'client contact must map to do_not_contact');
});

test('pull: backbone companies show up as accounts in the app', async () => {
  const store = createStore(process.env.ACCOUNT_DATA_DIR);
  store.upsert('companies', { id: 'acct_agentfound', name: 'Agent Found SAS', domain: 'agentfound.fr' });
  store.upsert('leads', { id: 'lead_1', companyId: 'acct_agentfound', score: 87, reason: 'hiring wave + champion' });
  store.upsert('people', {
    id: 'acct_agentfound:jane-doe', companyId: 'acct_agentfound', name: 'Jane Doe',
    role: 'CTO', powerRole: 'decision_maker', flags: [], email: null,
  });

  await pullBackboneToAccounts();
  const account = await getAccount('acct_agentfound');
  assert.equal(account.verdict.tier, 'GO');
  assert.equal(account.verdict.why, 'hiring wave + champion');
  assert.equal(account.people[0].highlighted, true);
  assert.equal(account.people[0].contact_status, 'never');
});
