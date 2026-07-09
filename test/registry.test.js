import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverStrategies } from '../src/backbone/registry.js';

test('discovers strategies in filename order, skipping _ files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wake-registry-'));
  writeFileSync(join(dir, '20-b.js'), 'export default { name: "b", collect: async () => ({}) };');
  writeFileSync(join(dir, '10-a.js'), 'export default { name: "a", collect: async () => ({}) };');
  writeFileSync(join(dir, '_scratch.js'), 'export default { totally: "broken" };');
  writeFileSync(join(dir, 'notes.md'), 'not a module');

  const strategies = await discoverStrategies(dir, 'collect');
  assert.deepEqual(
    strategies.map((s) => s.name),
    ['a', 'b'],
  );
});

test('a malformed strategy fails loudly at discovery time', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wake-registry-'));
  writeFileSync(join(dir, 'bad.js'), 'export default { name: "bad" };'); // missing collect()
  await assert.rejects(() => discoverStrategies(dir, 'collect'), /default export must be/);
});
