#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './backbone/env.js';
import { createStore } from './backbone/store.js';
import { discoverStrategies } from './backbone/registry.js';
import { runPipeline } from './backbone/pipeline.js';
import { createLlm } from './backbone/llm.js';
import { createSillageClient } from './backbone/clients/sillage.js';
import { createFullEnrichClient } from './backbone/clients/fullenrich.js';
import { createMantiksClient } from './backbone/clients/mantiks.js';
import { createGradiumClient } from './backbone/clients/gradium.js';
import { createWhatsAppClient } from './backbone/clients/whatsapp.js'; // parked, see README — not wired into send
import { createSlackClient } from './backbone/clients/slack.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STAGES = ['signals', 'processing', 'actions'];

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const BOLD = '\u001b[1m';
const DIM = '\u001b[2m';
const RESET = '\u001b[0m';

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
      mantiks: createMantiksClient({ fixturesDir }),
      gradium: createGradiumClient(),
      whatsapp: createWhatsAppClient(),
      slack: createSlackClient(),
    },
    config: { fixturesDir, enrichBudget: 5 },
    log: (message) => console.log(`${DIM}  · ${message}${RESET}`),
  };
}

async function commandRun(stageArg) {
  if (stageArg && !STAGES.includes(stageArg)) {
    console.error(`unknown stage "${stageArg}" (expected one of: ${STAGES.join(', ')})`);
    process.exit(1);
  }
  const ctx = buildContext();
  const stages = stageArg ? [stageArg] : STAGES;

  console.log(`${BOLD}Wake backbone${RESET} — running ${stages.join(' → ')}`);
  console.log(
    `${DIM}  · brain: ${ctx.llm.enabled ? `Claude (${ctx.llm.model})` : 'heuristics (no ANTHROPIC_API_KEY)'}` +
      ` | sillage: ${ctx.clients.sillage.mode} | fullenrich: ${ctx.clients.fullenrich.mode} | mantiks: ${ctx.clients.mantiks.mode}` +
      ` | gradium: ${ctx.clients.gradium.mode} | slack: ${ctx.clients.slack.mode}${RESET}`,
  );

  const [signals, processors, planners] = await Promise.all([
    discoverStrategies(join(ROOT, 'src', 'signals'), 'collect'),
    discoverStrategies(join(ROOT, 'src', 'processing'), 'process'),
    discoverStrategies(join(ROOT, 'src', 'actions'), 'plan'),
  ]);

  const run = await runPipeline(ctx, { signals, processors, planners, stages });

  console.log('');
  if (run.stages.signals) {
    const s = run.stages.signals;
    console.log(
      `${BOLD}Signals${RESET}     ${s.strategies} strategies → ${s.signals} signals, ` +
        `${ctx.store.all('companies').length} companies, ${ctx.store.all('people').length} people`,
    );
  }
  if (run.stages.processing) {
    const p = run.stages.processing;
    console.log(
      `${BOLD}Processing${RESET}  ${p.completed}/${p.processors} processors → ${ctx.store.all('leads').length} leads, ${ctx.store.all('matches').length} candidate matches`,
    );
  }
  if (run.stages.actions) {
    const a = run.stages.actions;
    console.log(
      `${BOLD}Actions${RESET}     ${a.planners} planners → ${GREEN}${a.proposed} proposed${RESET}, ${RED}${a.blocked} blocked${RESET}` +
        (a.skipped ? `, ${a.skipped} left to human decisions` : ''),
    );
  }
  for (const error of run.errors) {
    console.log(`${YELLOW}⚠ ${error.stage}/${error.strategy}: ${error.error}${RESET}`);
  }
  console.log('');
  printInbox(ctx.store);
}

function printInbox(store) {
  const actions = store.all('actions');
  if (actions.length === 0) {
    console.log('Inbox is empty — run the pipeline first.');
    return;
  }
  const groups = {
    proposed: actions.filter((a) => a.status === 'proposed'),
    blocked: actions.filter((a) => a.status === 'blocked'),
    decided: actions.filter((a) => ['approved', 'rejected', 'done'].includes(a.status)),
  };

  console.log(`${BOLD}Inbox${RESET} — a human approves or rejects, nothing is ever auto-sent`);
  for (const action of groups.proposed) {
    const company = store.get('companies', action.companyId);
    const target = action.targetPersonId ? store.get('people', action.targetPersonId) : null;
    console.log(
      `${GREEN}  ✓ proposed${RESET} ${action.kind} → ${company?.name ?? action.companyId}` +
        (target ? ` (${target.name})` : '') +
        ` ${DIM}via ${action.planner}${RESET}`,
    );
    const preview = action.payload?.subject ?? action.payload?.task ?? action.payload?.message;
    if (preview) console.log(`${DIM}      ${preview}${RESET}`);
  }
  for (const action of groups.blocked) {
    const company = store.get('companies', action.companyId);
    console.log(
      `${RED}  ✗ blocked ${RESET} ${action.kind} → ${company?.name ?? action.companyId} ${DIM}via ${action.planner}${RESET}`,
    );
    for (const check of action.gate?.results ?? []) {
      if (!check.passed) console.log(`${RED}      ${check.name}: ${check.reason}${RESET}`);
    }
  }
  for (const action of groups.decided) {
    const company = store.get('companies', action.companyId);
    console.log(`${DIM}  • ${action.status} ${action.kind} → ${company?.name ?? action.companyId}${RESET}`);
  }
}

function commandStatus() {
  const ctx = buildContext();
  const summary = ctx.store.summary();
  console.log(`${BOLD}Store${RESET} (${ctx.store.dir})`);
  for (const [collection, count] of Object.entries(summary)) {
    console.log(`  ${collection.padEnd(12)} ${count}`);
  }
  const runs = ctx.store.all('runs');
  const last = runs[runs.length - 1];
  if (last) {
    console.log(`${BOLD}Last run${RESET} ${last.id} finished ${last.finishedAt} (${last.errors.length} error(s))`);
  }
}

function commandReset() {
  const ctx = buildContext();
  ctx.store.reset();
  console.log('data/ cleared — next run starts from a blank store.');
}

// New workflow: targeted accounts that are hiring, sourced purely from
// Sillage job-posting-keyword detections (sillage:job-posting-keywords in
// src/signals/30-job-posting-keywords.js) — companies carrying a
// `sillageCompanyId` are real live detections, not fixtures from the other
// strategies. Run `npm start -- --stage signals` first (or a full run) so the
// store is populated, then this exports the clean JSON.
function commandHiringTargets() {
  const ctx = buildContext();
  const companies = ctx.store
    .all('companies')
    .filter((c) => c.sillageCompanyId != null)
    .map((c) => ({
      name: c.name,
      domain: c.domain,
      location: c.location,
      sillageCompanyId: c.sillageCompanyId,
      openRoles: (c.openRoles ?? []).map((r) => ({ title: r.title, tags: r.tags ?? [], url: r.url ?? null })),
      roleCount: (c.openRoles ?? []).length,
      source: 'sillage:job-posting-keywords',
    }))
    .sort((a, b) => b.roleCount - a.roleCount);

  const outPath = join(ctx.store.dir, 'hiring-targets.json');
  writeFileSync(outPath, JSON.stringify(companies, null, 2));

  console.log(`${BOLD}Hiring targets${RESET} — ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'} with open roles (Sillage job postings)`);
  for (const c of companies) {
    console.log(`  ${GREEN}${c.name}${RESET} (${c.domain}, ${c.location ?? 'location unknown'}) — ${c.roleCount} open role(s)`);
  }
  console.log(`${DIM}\nWritten to ${outPath}${RESET}`);
}

// A human decision, recorded explicitly — never inferred, never automatic.
// Only a 'proposed' action can be approved (a blocked one must be fixed
// upstream, not force-approved).
function commandApprove(id) {
  if (!id) {
    console.error('usage: node src/cli.js approve <action-id>');
    process.exit(1);
  }
  const ctx = buildContext();
  const action = ctx.store.get('actions', id);
  if (!action) {
    console.error(`no action with id "${id}"`);
    process.exit(1);
  }
  if (action.status !== 'proposed') {
    console.error(`action "${id}" is "${action.status}", not "proposed" — nothing to approve`);
    process.exit(1);
  }
  ctx.store.upsert('actions', { id, status: 'approved', approvedAt: new Date().toISOString() });
  console.log(`${GREEN}✓ approved${RESET} ${action.kind} → ${id} (run "send ${id}" to actually dispatch it)`);
}

// The one command that can cause a real side effect (a WhatsApp message
// landing on a real phone). Requires an explicit prior "approve" — this
// command will not approve on your behalf.
async function commandSend(id) {
  if (!id) {
    console.error('usage: node src/cli.js send <action-id>');
    process.exit(1);
  }
  const ctx = buildContext();
  const action = ctx.store.get('actions', id);
  if (!action) {
    console.error(`no action with id "${id}"`);
    process.exit(1);
  }
  if (action.status !== 'approved') {
    console.error(`action "${id}" is "${action.status}", not "approved" — run "approve ${id}" first`);
    process.exit(1);
  }
  if (action.channel !== 'slack') {
    console.error(`send is only wired for the slack channel right now (got "${action.channel}")`);
    process.exit(1);
  }
  const company = ctx.store.get('companies', action.companyId);
  const person = ctx.store.get('people', action.targetPersonId);
  const result = await ctx.clients.slack.postVoiceNote({
    company: company?.name ?? action.companyId,
    contact: { name: person?.name, phone: person?.phone },
    message: action.payload?.message,
    audioUrl: action.payload?.audioUrl,
    durationSeconds: action.payload?.durationSeconds,
  });
  if (result.posted) {
    ctx.store.upsert('actions', {
      id,
      status: 'done',
      sentAt: new Date().toISOString(),
      slackTs: result.ts,
    });
    console.log(`${GREEN}✓ posted${RESET} to Slack — forward to ${person?.name} (${person?.phone ?? 'no phone on file'}) on WhatsApp yourself`);
  } else {
    console.log(`${RED}✗ not posted${RESET} (${ctx.clients.slack.mode} mode): ${result.reason}`);
  }
}

function usage() {
  console.log(`Usage: node src/cli.js <command>

Commands:
  run [--stage signals|processing|actions]  run the pipeline (default: all three tiers)
  inbox                                     show proposed / blocked / decided actions
  approve <action-id>                       record a human decision: proposed -> approved (never automatic)
  send <action-id>                          post an approved voice note to Slack for real (requires approve first; a human forwards it to WhatsApp)
  status                                    store counts and last run
  hiring-targets                            export targeted accounts hiring (Sillage job postings) to data/hiring-targets.json
  reset                                     clear data/ (fixtures are untouched)
`);
}

const [, , command = 'run', ...rest] = process.argv;
const stageFlagIndex = rest.indexOf('--stage');
const stageArg = stageFlagIndex >= 0 ? rest[stageFlagIndex + 1] : null;

switch (command) {
  case 'run':
    await commandRun(stageArg);
    break;
  case 'inbox':
    printInbox(buildContext().store);
    break;
  case 'approve':
    commandApprove(rest[0]);
    break;
  case 'send':
    await commandSend(rest[0]);
    break;
  case 'status':
    commandStatus();
    break;
  case 'reset':
    commandReset();
    break;
  case 'hiring-targets':
    commandHiringTargets();
    break;
  default:
    usage();
    process.exit(command === 'help' ? 0 : 1);
}
