// Tiny .env loader, no dependency on dotenv.
// Parses KEY=value lines from the repo-root .env file (if present) and
// merges them into process.env without overriding already-set keys.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the repo root (parent of server/).
 * This file lives at <repoRoot>/server/lib/env.js.
 */
export function repoRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url)); // <repoRoot>/server/lib
  return path.resolve(here, '..', '..');
}

/**
 * Parse a single .env-style line into a [key, value] pair, or null if the
 * line is blank / a comment / malformed.
 */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const eq = trimmed.indexOf('=');
  if (eq === -1) return null;

  const key = trimmed.slice(0, eq).trim();
  if (!key) return null;

  let value = trimmed.slice(eq + 1).trim();

  // Strip matching surrounding quotes, if any.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

/**
 * Load the repo-root .env file (if it exists) into process.env.
 * Existing process.env keys are never overridden.
 * Returns process.env for convenience.
 */
export function loadEnv() {
  const envPath = path.join(repoRoot(), '.env');

  if (!fs.existsSync(envPath)) {
    return process.env;
  }

  const contents = fs.readFileSync(envPath, 'utf8');

  for (const line of contents.split('\n')) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const [key, value] = parsed;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return process.env;
}
