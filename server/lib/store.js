// JSON persistence for accounts. Zero infra by design (hackathon decision):
// data lives in a local JSON file, gitignored, seeded from the public fixture.

import fs from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './env.js';

/**
 * Directory where accounts.json lives. Overridable via ACCOUNT_DATA_DIR
 * (used by tests to avoid touching real data).
 */
function dataDir() {
  return process.env.ACCOUNT_DATA_DIR || path.join(repoRoot(), 'data');
}

/** Absolute path of the accounts data file. */
export function dataFilePath() {
  return path.join(dataDir(), 'accounts.json');
}

function fixturesFilePath() {
  return path.join(repoRoot(), 'fixtures', 'accounts.example.json');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDataDir() {
  await fs.mkdir(dataDir(), { recursive: true });
}

/**
 * Load accounts from the data file. If the data file does not exist yet,
 * seed it by copying fixtures/accounts.example.json (or an empty array if
 * that fixture is also missing), then return the parsed array.
 */
export async function loadAccounts() {
  const filePath = dataFilePath();

  if (!(await fileExists(filePath))) {
    await ensureDataDir();

    let seed = [];
    if (await fileExists(fixturesFilePath())) {
      const raw = await fs.readFile(fixturesFilePath(), 'utf8');
      seed = JSON.parse(raw);
    }

    await saveAccounts(seed);
    return seed;
  }

  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Atomically write the accounts array to the data file.
 */
export async function saveAccounts(accounts) {
  await ensureDataDir();

  const filePath = dataFilePath();
  const tmpPath = `${filePath}.tmp`;

  await fs.writeFile(tmpPath, JSON.stringify(accounts, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

/** Return the account with the given id, or null if not found. */
export async function getAccount(id) {
  const accounts = await loadAccounts();
  return accounts.find((account) => account.id === id) || null;
}

function hasDomain(account) {
  return typeof account.domain === 'string' && account.domain.trim() !== '';
}

function sameDomain(a, b) {
  return hasDomain(a) && hasDomain(b) && a.domain.toLowerCase() === b.domain.toLowerCase();
}

function hasPeople(account) {
  return Array.isArray(account.people) && account.people.length > 0;
}

function findMatchIndex(existing, incoming) {
  const byId = existing.findIndex((account) => account.id === incoming.id);
  if (byId !== -1) return byId;

  const byDomain = existing.findIndex((account) => sameDomain(account, incoming));
  if (byDomain !== -1) return byDomain;

  return -1;
}

/**
 * Upsert a list of incoming accounts into the store.
 * - Match by id, else by domain (case-insensitive).
 * - Replace matched entries wholesale, EXCEPT: if the incoming account has
 *   no people (or an empty list) while the existing one has people, keep
 *   the existing people (Bloc A must not wipe Bloc B's enrichment work).
 * - Non-matched incoming accounts are appended as new.
 * - Persist once at the end.
 */
export async function upsertAccounts(list) {
  const existing = await loadAccounts();

  let created = 0;
  let updated = 0;

  for (const incoming of list) {
    const matchIndex = findMatchIndex(existing, incoming);

    if (matchIndex === -1) {
      existing.push(incoming);
      created += 1;
      continue;
    }

    const current = existing[matchIndex];
    const merged = { ...incoming };

    if (!hasPeople(incoming) && hasPeople(current)) {
      merged.people = current.people;
    }

    existing[matchIndex] = merged;
    updated += 1;
  }

  await saveAccounts(existing);

  return { created, updated, accounts: existing };
}
