import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// File-backed store: one JSON file per collection under data/ (gitignored).
// State lives in files, not in chat — anyone can inspect data/*.json mid-demo.
const COLLECTIONS = [
  'companies',
  'people',
  'candidates',
  'signals',
  'leads',
  'matches',
  'actions',
  'runs',
];

export function createStore(dir) {
  mkdirSync(dir, { recursive: true });
  const cache = {};

  const file = (collection) => join(dir, `${collection}.json`);

  function table(collection) {
    if (!COLLECTIONS.includes(collection)) {
      throw new Error(
        `unknown collection "${collection}" (expected one of: ${COLLECTIONS.join(', ')})`,
      );
    }
    if (!cache[collection]) {
      cache[collection] = existsSync(file(collection))
        ? JSON.parse(readFileSync(file(collection), 'utf8'))
        : {};
    }
    return cache[collection];
  }

  function persist(collection) {
    writeFileSync(file(collection), JSON.stringify(cache[collection], null, 2));
  }

  return {
    dir,
    collections: COLLECTIONS,

    get(collection, id) {
      return table(collection)[id] ?? null;
    },

    all(collection) {
      return Object.values(table(collection));
    },

    // Shallow merge onto any existing entity with the same id, so re-runs
    // update records instead of duplicating them.
    upsert(collection, entity) {
      if (!entity || typeof entity.id !== 'string' || entity.id.length === 0) {
        throw new Error(`upsert into "${collection}": entity needs a string id`);
      }
      const existing = table(collection)[entity.id];
      const merged = existing ? { ...existing, ...entity } : { ...entity };
      cache[collection][entity.id] = merged;
      persist(collection);
      return merged;
    },

    reset() {
      for (const collection of COLLECTIONS) {
        table(collection);
        cache[collection] = {};
        persist(collection);
      }
    },

    summary() {
      return Object.fromEntries(COLLECTIONS.map((c) => [c, this.all(c).length]));
    },
  };
}
