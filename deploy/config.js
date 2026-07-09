import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

// Shared helpers for the deploy toolkit. This is the ONLY JS that runs — from a
// developer machine, never in production. It provisions and updates the hosted
// Managed Agents deployment; the agent itself then runs entirely on Anthropic's
// side (MCP + agent toolset + skills + memory), so no process stays up.

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const PLATFORM_DIR = join(ROOT, 'platform');
export const SKILLS_DIR = join(PLATFORM_DIR, 'skills');
export const SYSTEM_PROMPT_FILE = join(PLATFORM_DIR, 'system-prompt.md');
export const STATE_FILE = join(ROOT, 'deploy', '.deploy-state.json');

// Resource names — resources are created once and reused by name across deploys.
export const NAMES = {
  agent: 'wake-acquisition-agent',
  environment: 'wake-acquisition-env',
  vault: 'wake-acquisition-vault',
  deployment: 'wake-acquisition-run',
  reviewStore: 'wake-review',
  stateStore: 'wake-state',
};

export const MODEL = () => process.env.CLAUDE_MODEL || 'claude-opus-4-8';
export const SILLAGE_MCP_URL = () => process.env.SILLAGE_MCP_URL || 'https://api.getsillage.com/api/mcp/v2';
export const FULLENRICH_MCP_URL = () => process.env.FULLENRICH_MCP_URL || 'https://mcp.fullenrich.com/mcp';
export const HUBSPOT_API_HOST = 'api.hubapi.com';

export const SCHEDULE = () => ({
  type: 'cron',
  expression: process.env.WAKE_CRON || '0 7 * * 1-5', // weekday mornings
  timezone: process.env.WAKE_TZ || 'Europe/Paris',
});

// The single instruction that starts each scheduled run. The doctrine lives in
// the system prompt + skills; this just says "go".
export const KICKOFF =
  "Run today's acquisition pass. You have no pre-built roster: discover fresh " +
  'buying signals yourself via the Sillage MCP tools, triage per your skills, check ' +
  'HubSpot before pursuing any account or drafting to any contact, enrich the chosen ' +
  'contact via the FullEnrich MCP tools, and write each proposal — or each guardrail ' +
  'block — to the wake-review memory store. Read wake-state first and skip any lead you ' +
  'already handled; record what you process. Never send anything; a human approves from ' +
  'the review store. Finish with a one-paragraph run summary in wake-review.';

// ─── env ────────────────────────────────────────────────────────────────────
// Minimal .env loader (no dependency). Existing process.env wins.
export function loadEnv() {
  const path = join(ROOT, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, raw] = m;
    if (process.env[k] !== undefined) continue;
    process.env[k] = raw.replace(/^["']|["']$/g, '');
  }
}

export function createClient() {
  // The SDK attaches the managed-agents / skills beta headers per beta resource.
  return new Anthropic();
}

// ─── skill discovery + change detection ───────────────────────────────────────
function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

// A skill = a directory under platform/skills/ containing a SKILL.md. Its hash
// covers every file's relative path + contents, so any edit changes the hash
// and only changed skills get re-uploaded (a new version) on deploy.
export function discoverSkills() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((name) => existsSync(join(SKILLS_DIR, name, 'SKILL.md')))
    .sort()
    .map((name) => {
      const dir = join(SKILLS_DIR, name);
      const files = listFiles(dir).sort();
      const hash = createHash('sha256');
      for (const f of files) {
        hash.update(relative(dir, f));
        hash.update('\0');
        hash.update(readFileSync(f));
        hash.update('\0');
      }
      return { name, dir, files, hash: hash.digest('hex').slice(0, 16) };
    });
}

// ─── state lockfile (gitignored) ──────────────────────────────────────────────
// Records the resolved resource ids + per-skill {id, hash} so re-runs are
// idempotent and run-once.js / inbox.js can find the deployment + stores.
export function readState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : { skills: {} };
}
export function writeState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// ─── misc ─────────────────────────────────────────────────────────────────────
export async function findByName(lister, name) {
  const res = await lister({ limit: 100 });
  const items = res?.data ?? res ?? [];
  // Most resources expose `name`; vaults use `display_name`. Match either.
  return items.find((x) => (x.name ?? x.display_name) === name) ?? null;
}

export const c = {
  reset: '[0m',
  bold: '[1m',
  dim: '[2m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
  blue: '[34m',
};
export const log = {
  created: (s) => console.log(`${c.green}created${c.reset} ${s}`),
  reused: (s) => console.log(`${c.dim}reuse  ${c.reset} ${s}`),
  updated: (s) => console.log(`${c.green}updated${c.reset} ${s}`),
  plan: (s) => console.log(`${c.yellow}would  ${c.reset} ${s}`),
  info: (s) => console.log(`${c.dim}${s}${c.reset}`),
  head: (s) => console.log(`\n${c.bold}${s}${c.reset}`),
};
