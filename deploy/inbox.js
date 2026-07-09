#!/usr/bin/env node
import { NAMES, c, createClient, findByName, loadEnv, readState } from './config.js';

// Dev helper: the human inbox. Reads the wake-review memory store through the
// API and renders each proposal and each guardrail block for a person to
// approve and send by hand. Nothing here is ever auto-sent.
//
//   node deploy/inbox.js

async function main() {
  loadEnv();
  const client = createClient();
  const state = readState();

  let storeId = state.stores?.reviewStore;
  if (!storeId) {
    const store = await findByName((o) => client.beta.memoryStores.list(o), NAMES.reviewStore);
    storeId = store?.id;
  }
  if (!storeId) {
    console.error('No wake-review store found. Run `node deploy/deploy.js` first.');
    process.exit(1);
  }

  const page = await client.beta.memoryStores.memories.list(storeId, { path_prefix: '/' });
  const memories = (page.data ?? []).filter((m) => m.type === 'memory');
  if (memories.length === 0) {
    console.log(`${c.dim}Inbox empty — no proposals yet. Trigger a run with node deploy/run-once.js.${c.reset}`);
    return;
  }

  const blocked = memories.filter((m) => /blocked/i.test(m.path));
  const proposals = memories.filter((m) => !/blocked/i.test(m.path) && !/_run-summary/i.test(m.path));
  const summaries = memories.filter((m) => /_run-summary/i.test(m.path));

  console.log(
    `${c.bold}Wake inbox${c.reset} — ${c.green}${proposals.length} proposed${c.reset}, ` +
      `${c.red}${blocked.length} blocked${c.reset} ${c.dim}(a human approves; nothing is auto-sent)${c.reset}`,
  );

  async function render(m, color, tag) {
    const full = await client.beta.memoryStores.memories.retrieve(m.id, { memory_store_id: storeId });
    console.log(`\n${color}${tag}${c.reset} ${c.bold}${m.path}${c.reset}`);
    console.log((full.content ?? '').trim().replace(/^/gm, '  '));
  }

  for (const m of proposals) await render(m, c.green, '✓ proposed');
  for (const m of blocked) await render(m, c.red, '✗ blocked ');
  for (const m of summaries) await render(m, c.blue, 'ℹ summary ');
}

main().catch((error) => {
  console.error(`${c.red}inbox failed:${c.reset} ${error.message}`);
  process.exit(1);
});
