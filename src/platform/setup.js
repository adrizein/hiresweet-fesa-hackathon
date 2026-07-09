#!/usr/bin/env node
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { loadEnv } from '../backbone/env.js';
import {
  AGENT_NAME,
  ENVIRONMENT_NAME,
  VAULT_NAME,
  buildAgentParams,
  buildMcpServers,
} from './agent-config.js';

// One-time control-plane setup: create (or reuse) the Environment, the Vault
// with MCP credentials, and the versioned Agent. Store the printed ids in .env;
// run.js (the data plane) then just opens sessions against them.
//
//   node src/platform/setup.js           # create/reuse, print ids
//   node src/platform/setup.js --update   # push a new agent version from config
//
// Prefer this via the `ant` CLI + platform/*.yaml in a real workflow; this SDK
// script is the programmatic equivalent and keeps everyone on one `npm run`.

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const BOLD = '[1m';
const DIM = '[2m';
const GREEN = '[32m';
const RESET = '[0m';

async function findByName(lister, name) {
  const res = await lister({ limit: 100 });
  const items = res?.data ?? res ?? [];
  return items.find((x) => x.name === name) ?? null;
}

async function main() {
  loadEnv(ROOT);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required to create Managed Agents resources.');
    process.exit(1);
  }
  const update = process.argv.includes('--update');
  const client = new Anthropic();
  const mcpServers = buildMcpServers();

  // 1. Environment (cloud container, unrestricted egress so it can reach the
  //    MCP servers). Reused by name across runs.
  let environment = await findByName((o) => client.beta.environments.list(o), ENVIRONMENT_NAME);
  if (!environment) {
    environment = await client.beta.environments.create({
      name: ENVIRONMENT_NAME,
      config: { type: 'cloud', networking: { type: 'unrestricted' } },
    });
    console.log(`${GREEN}created${RESET} environment ${environment.id}`);
  } else {
    console.log(`${DIM}reuse${RESET}   environment ${environment.id}`);
  }

  // 2. Vault + MCP credentials. Static bearer tokens keyed by MCP server URL —
  //    Anthropic injects them at egress; the sandbox never sees them. Invalid
  //    creds do NOT block session creation (they surface as session.error and
  //    retry), so the demo runs even if an MCP endpoint needs a different token.
  let vault = await findByName((o) => client.beta.vaults.list(o), VAULT_NAME);
  if (!vault) {
    vault = await client.beta.vaults.create({ name: VAULT_NAME });
    console.log(`${GREEN}created${RESET} vault ${vault.id}`);
  } else {
    console.log(`${DIM}reuse${RESET}   vault ${vault.id}`);
  }

  const credentialPlan = [
    { url: process.env.SILLAGE_MCP_URL, token: process.env.SILLAGE_API_KEY, label: 'sillage' },
    { url: process.env.FULLENRICH_MCP_URL, token: process.env.FULLENRICH_API_KEY, label: 'fullenrich' },
  ].filter((c) => c.url && c.token);

  if (credentialPlan.length > 0) {
    const existing = (await client.beta.vaults.credentials.list(vault.id))?.data ?? [];
    const have = new Set(existing.map((c) => c.auth?.mcp_server_url).filter(Boolean));
    for (const cred of credentialPlan) {
      if (have.has(cred.url)) {
        console.log(`${DIM}reuse${RESET}   credential ${cred.label}`);
        continue;
      }
      await client.beta.vaults.credentials.create(vault.id, {
        display_name: `${cred.label} MCP`,
        auth: { type: 'static_bearer', mcp_server_url: cred.url, token: cred.token },
      });
      console.log(`${GREEN}created${RESET} credential ${cred.label}`);
    }
  }

  // 3. Agent (persisted, versioned). Reuse by name; --update bumps the version.
  const params = buildAgentParams();
  let agent = await findByName((o) => client.beta.agents.list(o), AGENT_NAME);
  if (!agent) {
    agent = await client.beta.agents.create(params);
    console.log(`${GREEN}created${RESET} agent ${agent.id} (v${agent.version})`);
  } else if (update) {
    agent = await client.beta.agents.update(agent.id, params);
    console.log(`${GREEN}updated${RESET} agent ${agent.id} (v${agent.version})`);
  } else {
    console.log(`${DIM}reuse${RESET}   agent ${agent.id} (v${agent.version}) ${DIM}— use --update to push config${RESET}`);
  }

  console.log('');
  console.log(`${BOLD}Add these to your .env:${RESET}`);
  console.log(`WAKE_ENVIRONMENT_ID=${environment.id}`);
  console.log(`WAKE_VAULT_ID=${vault.id}`);
  console.log(`WAKE_AGENT_ID=${agent.id}`);
  if (mcpServers.length === 0) {
    console.log('');
    console.log(
      `${DIM}note: no SILLAGE_MCP_URL / FULLENRICH_MCP_URL set — the agent runs without live MCP data.${RESET}`,
    );
  }
}

main().catch((error) => {
  console.error(`setup failed: ${error.message}`);
  process.exit(1);
});
