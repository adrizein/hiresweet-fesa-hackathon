import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Point the store at a fresh temp directory BEFORE importing store.js, so we
// never touch the real data/ directory during tests.
process.env.ACCOUNT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'account-intel-store-test-'));

const { loadAccounts, saveAccounts, getAccount, upsertAccounts, dataFilePath } = await import('../lib/store.js');

test('seeding from fixtures works', async () => {
  const accounts = await loadAccounts();
  assert.equal(accounts.length, 5, 'expected the fixture to seed 5 accounts');
  assert.ok(fs.existsSync(dataFilePath()), 'expected accounts.json to exist after seeding');
});

test('atomic file exists after save', async () => {
  const accounts = await loadAccounts();
  await saveAccounts(accounts);

  assert.ok(fs.existsSync(dataFilePath()));
  assert.ok(!fs.existsSync(`${dataFilePath()}.tmp`), 'tmp file should be renamed away, not left behind');
});

test('upsert by id updates an existing account', async () => {
  const before = await getAccount('acct_lumengrid');
  assert.ok(before, 'expected acct_lumengrid to exist from the seed');

  const { updated, created } = await upsertAccounts([
    { ...before, name: 'Lumen Grid Renamed' },
  ]);

  assert.equal(updated, 1);
  assert.equal(created, 0);

  const after = await getAccount('acct_lumengrid');
  assert.equal(after.name, 'Lumen Grid Renamed');
});

test('upsert with a new id creates a new account', async () => {
  const accountsBefore = await loadAccounts();
  const countBefore = accountsBefore.length;

  const { created, updated } = await upsertAccounts([
    {
      id: 'acct_brand_new',
      name: 'Brand New Co',
      domain: 'brandnew.example',
      verdict: { tier: 'EXPLORE', why: 'test account' },
      people: [],
    },
  ]);

  assert.equal(created, 1);
  assert.equal(updated, 0);

  const accountsAfter = await loadAccounts();
  assert.equal(accountsAfter.length, countBefore + 1);

  const fetched = await getAccount('acct_brand_new');
  assert.ok(fetched);
  assert.equal(fetched.name, 'Brand New Co');
});

test('upsert without people preserves existing people', async () => {
  const before = await getAccount('acct_baseline');
  assert.ok(before.people.length > 0, 'expected acct_baseline to have people from the seed');

  await upsertAccounts([
    {
      id: 'acct_baseline',
      name: before.name,
      domain: before.domain,
      verdict: before.verdict,
      // No people array at all, Bloc A style refresh.
    },
  ]);

  const after = await getAccount('acct_baseline');
  assert.deepEqual(after.people, before.people, 'expected people to be preserved, not wiped');
});

test('upsert with an empty people array preserves existing people', async () => {
  const before = await getAccount('acct_northwind');
  assert.ok(before.people.length > 0);

  await upsertAccounts([
    {
      id: 'acct_northwind',
      name: before.name,
      domain: before.domain,
      verdict: before.verdict,
      people: [],
    },
  ]);

  const after = await getAccount('acct_northwind');
  assert.deepEqual(after.people, before.people);
});

test('upsert by domain matches when id differs', async () => {
  const before = await getAccount('acct_aperture');
  assert.ok(before);
  assert.ok(before.domain);

  const { updated, created } = await upsertAccounts([
    {
      id: 'some_other_id_from_sillage',
      name: 'Aperture Labs (refreshed)',
      domain: before.domain.toUpperCase(), // case-insensitive match
      verdict: before.verdict,
      people: before.people,
    },
  ]);

  assert.equal(updated, 1);
  assert.equal(created, 0);

  // The original id-keyed entry should now carry the refreshed name, since
  // domain matching replaced that same array slot.
  const stillById = await getAccount('acct_aperture');
  assert.equal(stillById, null, 'expected the old id to be gone, replaced in place by the domain match');

  const byNewId = await getAccount('some_other_id_from_sillage');
  assert.ok(byNewId);
  assert.equal(byNewId.name, 'Aperture Labs (refreshed)');
});
