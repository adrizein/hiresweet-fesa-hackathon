#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { toFile } from '@anthropic-ai/sdk';
import {
  FULLENRICH_MCP_URL,
  HUBSPOT_API_HOST,
  KICKOFF,
  MODEL,
  NAMES,
  SCHEDULE,
  SILLAGE_MCP_URL,
  SYSTEM_PROMPT_FILE,
  createClient,
  discoverSkills,
  findByName,
  loadEnv,
  log,
  readState,
  writeState,
  c,
} from './config.js';

// The deploy script. Idempotent, re-runnable, local-only. Provisions/updates
// the whole hosted deployment: environment, vault + credentials, skills,
// memory stores, agent, and the scheduled deployment. Editing a SKILL.md or the
// system prompt and re-running this is the entire "update strategies" workflow —
// changed skills get a new version, and the agent (pinned to `latest`) picks it
// up on its next scheduled run.
//
//   node deploy/deploy.js            # create/update everything
//   node deploy/deploy.js --dry-run   # print what would change, mutate nothing

const APPLY = !process.argv.includes('--dry-run');

async function skillUploadables(skill) {
  return Promise.all(
    skill.files.map((f) => toFile(readFileSync(f), `${skill.name}/${relative(skill.dir, f)}`)),
  );
}

async function main() {
  loadEnv();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required (in .env) to deploy.');
    process.exit(1);
  }
  const client = createClient();
  const state = readState();
  state.skills ??= {};
  if (!APPLY) log.info('DRY RUN — no resources will be created or changed.\n');

  // 1. Environment — cloud sandbox, unrestricted egress so it can reach the
  //    Sillage/FullEnrich MCP servers and api.hubapi.com.
  log.head('Environment');
  let environment = await findByName((o) => client.beta.environments.list(o), NAMES.environment);
  if (environment) log.reused(`environment ${environment.id}`);
  else if (!APPLY) log.plan(`create environment "${NAMES.environment}"`);
  else {
    environment = await client.beta.environments.create({
      name: NAMES.environment,
      config: { type: 'cloud', networking: { type: 'unrestricted' } },
    });
    log.created(`environment ${environment.id}`);
  }

  // 2. Vault + credentials. Sillage/FullEnrich MCP require OAuth (their REST API
  //    keys are NOT accepted as bearer tokens), so their credentials are minted
  //    separately by `node deploy/mcp-auth.js` (a one-time browser authorize) and
  //    stored as auto-refreshing mcp_oauth credentials. Here we only manage the
  //    HubSpot environment_variable credential: $HUBSPOT_TOKEN is injected into the
  //    agent's outbound request to api.hubapi.com at egress — the agent shell never
  //    sees the raw token, and the token never touches this repo.
  log.head('Vault + credentials');
  let vault = await findByName((o) => client.beta.vaults.list(o), NAMES.vault);
  if (vault) log.reused(`vault ${vault.id}`);
  else if (!APPLY) log.plan(`create vault "${NAMES.vault}"`);
  else {
    vault = await client.beta.vaults.create({ display_name: NAMES.vault });
    log.created(`vault ${vault.id}`);
  }

  if (vault) {
    const existing = (await client.beta.vaults.credentials.list(vault.id))?.data ?? [];
    const byUrl = new Map(existing.filter((x) => x.auth?.mcp_server_url).map((x) => [x.auth.mcp_server_url, x.auth.type]));
    const haveSecret = new Set(existing.map((x) => x.auth?.secret_name).filter(Boolean));

    // MCP OAuth credentials are minted by deploy/mcp-auth.js, not here. Report status.
    for (const [label, url] of [
      ['sillage', SILLAGE_MCP_URL()],
      ['fullenrich', FULLENRICH_MCP_URL()],
    ]) {
      const type = byUrl.get(url);
      if (type === 'mcp_oauth') log.reused(`credential ${label} (mcp oauth)`);
      else if (type) log.info(`${label} credential is "${type}" — run \`node deploy/mcp-auth.js ${label}\` (OAuth required)`);
      else log.info(`no ${label} MCP credential yet — run \`node deploy/mcp-auth.js ${label}\` to authorize`);
    }

    if (process.env.HUBSPOT_TOKEN) {
      if (haveSecret.has('HUBSPOT_TOKEN')) log.reused('credential HUBSPOT_TOKEN (env var)');
      else if (!APPLY) log.plan('create HUBSPOT_TOKEN environment_variable credential');
      else {
        await client.beta.vaults.credentials.create(vault.id, {
          display_name: 'HubSpot API token',
          auth: {
            type: 'environment_variable',
            secret_name: 'HUBSPOT_TOKEN',
            secret_value: process.env.HUBSPOT_TOKEN,
            networking: { type: 'limited', allowed_hosts: [HUBSPOT_API_HOST] },
            injection_location: { header: true },
          },
        });
        log.created('credential HUBSPOT_TOKEN (env var)');
      }
    } else {
      log.info('no HUBSPOT_TOKEN set — the HubSpot guard will not work until it is.');
    }
  }

  // 3. Skills — the strategies, as versioned prompt bundles. Only changed skills
  //    re-upload (a new version); `latest` pins mean the agent gets them next run.
  log.head('Skills');
  const skills = discoverSkills();
  if (skills.length === 0) log.info('no skills found under platform/skills/');
  for (const skill of skills) {
    const prev = state.skills[skill.name];
    if (prev?.id && prev.hash === skill.hash) {
      log.reused(`skill ${skill.name} (${prev.id}) unchanged`);
      continue;
    }
    if (!APPLY) {
      log.plan(prev?.id ? `new version of skill ${skill.name}` : `create skill ${skill.name}`);
      continue;
    }
    const files = await skillUploadables(skill);
    if (prev?.id) {
      const v = await client.beta.skills.versions.create(prev.id, { files });
      state.skills[skill.name] = { id: prev.id, hash: skill.hash };
      log.updated(`skill ${skill.name} → version ${v.version ?? v.id ?? 'new'}`);
    } else {
      const s = await client.beta.skills.create({ files });
      state.skills[skill.name] = { id: s.id, hash: skill.hash };
      log.created(`skill ${skill.name} (${s.id})`);
    }
    writeState(state);
  }

  // 4. Memory stores — wake-review (the outbox/inbox) and wake-state (dedup).
  log.head('Memory stores');
  const storeSpecs = [
    {
      key: 'reviewStore',
      name: NAMES.reviewStore,
      description:
        'Wake outbox: one markdown file per lead — a proposed activation, or a BLOCKED note when the guardrail refused. Nothing is auto-sent; a human approves from here.',
    },
    {
      key: 'stateStore',
      name: NAMES.stateStore,
      description:
        'Wake state: which companies/contacts were already processed or blocked, so scheduled runs do not repeat leads. Read first, record after each lead.',
    },
  ];
  state.stores ??= {};
  for (const spec of storeSpecs) {
    let store = await findByName((o) => client.beta.memoryStores.list(o), spec.name);
    if (store) {
      log.reused(`memory store ${spec.name} (${store.id})`);
    } else if (!APPLY) {
      log.plan(`create memory store ${spec.name}`);
    } else {
      store = await client.beta.memoryStores.create({ name: spec.name, description: spec.description });
      log.created(`memory store ${spec.name} (${store.id})`);
    }
    if (store) state.stores[spec.key] = store.id;
  }
  writeState(state);

  // 5. Agent — model + system prompt + toolset + the two MCP servers + all skills.
  //    NO custom tools (that's what would force a host-side process).
  log.head('Agent');
  const system = readFileSync(SYSTEM_PROMPT_FILE, 'utf8');
  const mcpServers = [
    { type: 'url', name: 'sillage', url: SILLAGE_MCP_URL() },
    { type: 'url', name: 'fullenrich', url: FULLENRICH_MCP_URL() },
  ];
  const agentParams = {
    name: NAMES.agent,
    model: MODEL(),
    system,
    mcp_servers: mcpServers,
    tools: [
      { type: 'agent_toolset_20260401' },
      { type: 'mcp_toolset', mcp_server_name: 'sillage' },
      { type: 'mcp_toolset', mcp_server_name: 'fullenrich' },
    ],
    skills: skills
      .map((s) => state.skills[s.name]?.id)
      .filter(Boolean)
      .map((id) => ({ type: 'custom', skill_id: id, version: 'latest' })),
  };
  let agent = await findByName((o) => client.beta.agents.list(o), NAMES.agent);
  if (!APPLY) {
    log.plan(agent ? `update agent ${agent.id} (${agentParams.skills.length} skills)` : `create agent "${NAMES.agent}"`);
  } else if (agent) {
    // update requires the current version (optimistic concurrency).
    agent = await client.beta.agents.update(agent.id, { ...agentParams, version: agent.version });
    log.updated(`agent ${agent.id} (v${agent.version}, ${agentParams.skills.length} skills)`);
  } else {
    agent = await client.beta.agents.create(agentParams);
    log.created(`agent ${agent.id} (v${agent.version}, ${agentParams.skills.length} skills)`);
  }
  if (agent) state.agentId = agent.id;
  if (environment) state.environmentId = environment.id;
  if (vault) state.vaultId = vault.id;
  writeState(state);

  // 6. Deployment — the cron schedule that starts a session autonomously, with
  //    the vault (creds) and the two memory stores attached.
  log.head('Deployment (cron)');
  if (!APPLY) {
    log.plan(
      `create/update deployment "${NAMES.deployment}" @ ${SCHEDULE().expression} ${SCHEDULE().timezone}`,
    );
    log.info('\nDry run complete — re-run without --dry-run to apply.');
    return;
  }
  const resources = [
    {
      type: 'memory_store',
      memory_store_id: state.stores.reviewStore,
      access: 'read_write',
      instructions: 'Your outbox: write every proposal and every guardrail block here, one file per lead.',
    },
    {
      type: 'memory_store',
      memory_store_id: state.stores.stateStore,
      access: 'read_write',
      instructions: 'Read first and skip any lead already handled; record each lead you process.',
    },
  ];
  const deploymentParams = {
    name: NAMES.deployment,
    agent: agent.id,
    environment_id: environment.id,
    initial_events: [{ type: 'user.message', content: [{ type: 'text', text: KICKOFF }] }],
    schedule: SCHEDULE(),
    resources,
    vault_ids: vault ? [vault.id] : [],
  };
  let deployment = await findByName((o) => client.beta.deployments.list(o), NAMES.deployment);
  if (deployment) {
    deployment = await client.beta.deployments.update(deployment.id, deploymentParams);
    log.updated(`deployment ${deployment.id}`);
  } else {
    deployment = await client.beta.deployments.create(deploymentParams);
    log.created(`deployment ${deployment.id}`);
  }
  state.deploymentId = deployment.id;
  writeState(state);

  const upcoming = deployment.schedule?.upcoming_runs_at ?? [];
  console.log('');
  log.info(`next runs: ${upcoming.slice(0, 3).join(', ') || '(none scheduled)'}`);
  console.log(
    `${c.green}${c.bold}Deployed.${c.reset} Trigger a run now with ${c.bold}node deploy/run-once.js${c.reset}, ` +
      `review with ${c.bold}node deploy/inbox.js${c.reset}.`,
  );
}

main().catch((error) => {
  console.error(`\n${c.red}deploy failed:${c.reset} ${error.message}`);
  if (process.env.DEBUG) console.error(error);
  process.exit(1);
});
