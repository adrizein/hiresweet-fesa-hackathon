import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../src/backbone/store.js';

function freshStore() {
  return createStore(mkdtempSync(join(tmpdir(), 'wake-store-')));
}

test('upsert inserts then shallow-merges on the same id', () => {
  const store = freshStore();
  store.upsert('companies', { id: 'co-1', name: 'Acme', location: 'Paris' });
  store.upsert('companies', { id: 'co-1', score: 80 });
  const company = store.get('companies', 'co-1');
  assert.equal(company.name, 'Acme');
  assert.equal(company.score, 80);
  assert.equal(store.all('companies').length, 1);
});

test('state survives a store re-open (persisted to disk)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wake-store-'));
  createStore(dir).upsert('leads', { id: 'lead-1', score: 42 });
  const reopened = createStore(dir);
  assert.equal(reopened.get('leads', 'lead-1').score, 42);
});

test('unknown collection throws', () => {
  const store = freshStore();
  assert.throws(() => store.upsert('nonsense', { id: 'x' }), /unknown collection/);
  assert.throws(() => store.all('nonsense'), /unknown collection/);
});

test('upsert without an id throws', () => {
  const store = freshStore();
  assert.throws(() => store.upsert('companies', { name: 'No Id Inc' }), /needs a string id/);
});

test('reset clears every collection', () => {
  const store = freshStore();
  store.upsert('companies', { id: 'co-1' });
  store.upsert('signals', { id: 'sig-1' });
  store.reset();
  assert.deepEqual(
    Object.values(store.summary()),
    store.collections.map(() => 0),
  );
});
