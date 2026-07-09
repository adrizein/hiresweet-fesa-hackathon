#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from '../backbone/env.js';
import { createStore } from '../backbone/store.js';
import { createLlm } from '../backbone/llm.js';
import { discoverStrategies } from '../backbone/registry.js';
import { runPipeline } from '../backbone/pipeline.js';
import { createSillageClient } from '../backbone/clients/sillage.js';
import { createFullEnrichClient } from '../backbone/clients/fullenrich.js';
import { createHostTools } from './gate-tool.js';
import { TOOL_RECORD_ENRICHMENT, TOOL_PROPOSE_ACTION } from './agent-config.js';

// The data plane: one Managed Agents SESSION per run.
//
// Tiers 1-2 (signals, processing) stay deterministic — adrizein's strategies
// populate the store. Tier 3 (route / enrich / craft) is what moves onto the
// Claude platform: we hand the whole roster to the hosted Agent, Anthropic runs
// the loop, the Agent calls Sillage + FullEnrich MCP itself and proposes gated
// actions through our host tools. If the platform isn't wired (no key / no
// agent id), we fall back to the local planners so the demo always runs.

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const GREEN = '[32m';
const RED = '[31m';
const YELLOW = '[33m';
const BLUE = '[34m';
const BOLD = '[1m';
const DIM = '[2m';
const RESET = '[0m';

const SESSION_DEADLINE_MS = 5 * 60 * 1000;

function buildContext() {
  loadEnv(ROOT);
  const fixturesDir = join(ROOT, 'fixtures');
  const dataDir = join(ROOT, 'data');
  return {
    store: createStore(dataDir),
    llm: createLlm(),
    clients: {
      sillage: createSillageClient({ fixturesDir, dataDir }),
      fullenrich: createFullEnrichClient({ fixturesDir }),
    },
    config: { fixturesDir, enrichBudget: 5 },
    log: (message) => console.log(`${DIM}  · ${message}${RESET}`),
  };
}

async function prepareData(ctx) {
  const [signals, processors] = await Promise.all([
    discoverStrategies(join(ROOT, 'src', 'signals'), 'collect'),
    discoverStrategies(join(ROOT, 'src', 'processing'), 'process'),
  ]);
  await runPipeline(ctx, { signals, processors, stages: ['signals', 'processing'] });
  console.log(
    `${BOLD}Data${RESET}   ${ctx.store.all('companies').length} companies, ` +
      `${ctx.store.all('signals').length} signals, ${ctx.store.all('leads').length} leads ready`,
  );
}

async function runLocalFallback(ctx, reason) {
  console.log(`${YELLOW}Managed Agents not wired (${reason}) — running local planners instead.${RESET}`);
  const planners = await discoverStrategies(join(ROOT, 'src', 'actions'), 'plan');
  await runPipeline(ctx, { planners, stages: ['actions'] });
}

async function runManagedAgentSession(ctx) {
  const client = new Anthropic();
  const host = createHostTools(ctx);
  const agentId = process.env.WAKE_AGENT_ID;
  const environmentId = process.env.WAKE_ENVIRONMENT_ID;

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    ...(process.env.WAKE_VAULT_ID ? { vault_ids: [process.env.WAKE_VAULT_ID] } : {}),
    title: `Wake acquisition run ${new Date().toISOString()}`,
  });

  const workspace = process.env.ANTHROPIC_WORKSPACE_SLUG || 'default';
  console.log(`${BOLD}Session${RESET} ${session.id}`);
  console.log(
    `${DIM}  watch live: https://platform.claude.com/workspaces/${workspace}/sessions/${session.id}${RESET}`,
  );

  // Stream-first, then send the kickoff (see the platform steering rules).
  const stream = await client.beta.sessions.events.stream(session.id);
  const kickoff =
    "Here is today's roster of tracked accounts (companies with power-map flags, " +
    'people with roles, the Sillage signals, and pre-scored leads). Process it per your ' +
    'doctrine — triage, route to the warmest path, enrich the contacts you intend to reach ' +
    'via FullEnrich, and propose gated activations. Roster:\n```json\n' +
    JSON.stringify(host.powerMap(), null, 2) +
    '\n```';
  await client.beta.sessions.events.send(session.id, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: kickoff }] }],
  });

  const startedAt = Date.now();
  for await (const event of stream) {
    if (Date.now() - startedAt > SESSION_DEADLINE_MS) {
      console.log(`${YELLOW}  · session deadline reached, wrapping up${RESET}`);
      break;
    }

    switch (event.type) {
      case 'agent.message': {
        const text = (event.content ?? [])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('');
        if (text.trim()) console.log(`${DIM}  claude: ${text.trim()}${RESET}`);
        break;
      }
      case 'agent.mcp_tool_use':
        console.log(`${BLUE}  → MCP ${event.server_name ?? ''}.${event.name ?? 'tool'}${RESET}`);
        break;
      case 'agent.custom_tool_use': {
        const label = event.name === TOOL_PROPOSE_ACTION ? 'propose_action' : event.name;
        console.log(`${BLUE}  → tool ${label}${RESET}`);
        const result = await host.handle(event.name, event.input ?? {});
        const colour = result.is_error ? RED : DIM;
        console.log(`${colour}    ${result.text.replace(/\n/g, '\n    ')}${RESET}`);
        await client.beta.sessions.events.send(session.id, {
          events: [
            {
              type: 'user.custom_tool_result',
              custom_tool_use_id: event.id,
              content: [{ type: 'text', text: result.text }],
              is_error: Boolean(result.is_error),
            },
          ],
        });
        break;
      }
      case 'session.error':
        console.log(`${YELLOW}  · session error: ${event.error?.message ?? 'unknown'}${RESET}`);
        break;
      case 'session.status_terminated':
        console.log(`${DIM}  · session terminated${RESET}`);
        return { session, host };
      case 'session.status_idle':
        if (event.stop_reason?.type === 'requires_action') break; // we're answering a tool
        return { session, host }; // end_turn / retries_exhausted — done
      default:
        break;
    }
  }
  return { session, host };
}

function printInbox(store) {
  const actions = store.all('actions');
  console.log('');
  console.log(`${BOLD}Inbox${RESET} — a human approves or rejects, nothing is ever auto-sent`);
  if (actions.length === 0) {
    console.log(`${DIM}  (empty)${RESET}`);
    return;
  }
  for (const a of actions.filter((x) => x.status === 'proposed')) {
    const company = store.get('companies', a.companyId);
    const target = a.targetPersonId ? store.get('people', a.targetPersonId) : null;
    console.log(
      `${GREEN}  ✓ proposed${RESET} ${a.kind} → ${company?.name ?? a.companyId}` +
        (target ? ` (${target.name})` : ''),
    );
    const preview = a.payload?.subject ?? a.payload?.task ?? a.payload?.message;
    if (preview) console.log(`${DIM}      ${preview}${RESET}`);
  }
  for (const a of actions.filter((x) => x.status === 'blocked')) {
    const company = store.get('companies', a.companyId);
    console.log(`${RED}  ✗ blocked ${RESET} ${a.kind} → ${company?.name ?? a.companyId}`);
    for (const check of a.gate?.results ?? []) {
      if (!check.passed) console.log(`${RED}      ${check.name}: ${check.reason}${RESET}`);
    }
  }
}

async function main() {
  const ctx = buildContext();
  console.log(
    `${BOLD}Wake — backbone on Claude Managed Agents${RESET}\n` +
      `${DIM}  brain: ${ctx.llm.enabled ? 'Claude (hosted agent)' : 'no ANTHROPIC_API_KEY'}` +
      ` | sillage: ${ctx.clients.sillage.mode} | fullenrich: ${ctx.clients.fullenrich.mode}${RESET}`,
  );

  await prepareData(ctx);

  const ready = process.env.ANTHROPIC_API_KEY && process.env.WAKE_AGENT_ID && process.env.WAKE_ENVIRONMENT_ID;
  if (!ready) {
    const reason = !process.env.ANTHROPIC_API_KEY
      ? 'no ANTHROPIC_API_KEY'
      : 'run `npm run platform:setup` and set WAKE_AGENT_ID / WAKE_ENVIRONMENT_ID';
    await runLocalFallback(ctx, reason);
    printInbox(ctx.store);
    return;
  }

  try {
    const { host } = await runManagedAgentSession(ctx);
    console.log(
      `\n${BOLD}Agent done${RESET} — ${GREEN}${host.counts.proposed} proposed${RESET}, ` +
        `${RED}${host.counts.blocked} blocked${RESET}, ${host.counts.enriched} enriched` +
        (host.counts.skipped ? `, ${host.counts.skipped} left to a human` : ''),
    );
  } catch (error) {
    console.log(`${YELLOW}session failed (${error.message}) — falling back to local planners${RESET}`);
    await runLocalFallback(ctx, 'session error');
  }
  printInbox(ctx.store);
}

main().catch((error) => {
  console.error(`run failed: ${error.message}`);
  process.exit(1);
});
