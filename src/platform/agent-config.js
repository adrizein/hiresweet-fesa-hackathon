// Claude Managed Agents — the agent definition (control plane).
//
// This is the whole point of "backbone sur Claude Platform": instead of our
// code driving a tool-use loop, we hand Claude a persisted, versioned Agent and
// Anthropic runs the loop. The Agent gets:
//   - Sillage + FullEnrich as MCP servers (data in, called autonomously)
//   - two host-side custom tools (record_enrichment, propose_action) whose
//     handlers run in OUR process against OUR store — so the do-not-contact
//     list, the protected accounts and the fail-closed gate can never be
//     bypassed by the model, no matter what the MCP data says.
//
// The system prompt lives in platform/system-prompt.md — one source of truth
// shared with platform/acquisition-agent.agent.yaml (the `ant` CLI form). The
// names below are the contract between setup.js (creates the agent) and run.js
// (drives the session).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLATFORM_DIR = join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), 'platform');

export const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';
export const AGENT_NAME = 'wake-acquisition-agent';
export const ENVIRONMENT_NAME = 'wake-acquisition-env';
export const VAULT_NAME = 'wake-acquisition-vault';

// Tool names — shared with the runtime handlers in gate-tool.js.
export const TOOL_RECORD_ENRICHMENT = 'record_enrichment';
export const TOOL_PROPOSE_ACTION = 'propose_action';

export const SYSTEM_PROMPT = readFileSync(join(PLATFORM_DIR, 'system-prompt.md'), 'utf8');

// FullEnrich / Sillage MCP servers, only when their endpoint URLs are set.
// (Auth for these lives in a vault, attached at session-create time.)
export function buildMcpServers(env = process.env) {
  const servers = [];
  if (env.SILLAGE_MCP_URL) {
    servers.push({ type: 'url', name: 'sillage', url: env.SILLAGE_MCP_URL });
  }
  if (env.FULLENRICH_MCP_URL) {
    servers.push({ type: 'url', name: 'fullenrich', url: env.FULLENRICH_MCP_URL });
  }
  return servers;
}

// Host-side custom tools. Handlers live in gate-tool.js; these are the schemas
// the Agent is created with. Custom tools are executed by us, not Anthropic —
// which is exactly why the gate can't be bypassed.
export const CUSTOM_TOOLS = [
  {
    type: 'custom',
    name: TOOL_RECORD_ENRICHMENT,
    description:
      'Write a verified contact (from FullEnrich) back to the operator store so an email action can pass the gate. Call this after enriching a contact you intend to email.',
    input_schema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'id of the person in the provided roster' },
        email: { type: 'string', description: 'verified email address' },
        emailStatus: {
          type: 'string',
          enum: ['verified', 'unverified'],
          description: 'FullEnrich verification status; must be "verified" for the email gate to pass',
        },
        phone: { type: 'string', description: 'optional verified phone' },
        source: { type: 'string', description: 'where it came from, e.g. "fullenrich mcp"' },
      },
      required: ['personId', 'email', 'emailStatus', 'source'],
    },
  },
  {
    type: 'custom',
    name: TOOL_PROPOSE_ACTION,
    description:
      'Propose one activation (draft only — never sent). Runs the operator fail-closed gate and returns whether it passed and, if not, why. Retry with a fixed draft or abandon the lead.',
    input_schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['intro_request', 'outreach_email', 'followup_task'],
          description: 'the kind of activation',
        },
        channel: {
          type: 'string',
          enum: ['email', 'linkedin', 'task'],
          description: 'delivery channel; "email" requires a recorded verified email',
        },
        companyId: { type: 'string', description: 'id of the company in the roster' },
        targetPersonId: { type: 'string', description: 'id of the person to reach (or the connector for an intro)' },
        evidenceSignalIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'ids of the signals that justify this action (at least one, must exist in the roster)',
        },
        payload: {
          type: 'object',
          description: 'the draft content',
          properties: {
            subject: { type: 'string' },
            body: { type: 'string' },
            message: { type: 'string', description: 'for linkedin / intro asks' },
            task: { type: 'string', description: 'for a follow-up task' },
          },
        },
        reason: { type: 'string', description: 'one line: why this lead, this person, this angle' },
      },
      required: ['kind', 'channel', 'companyId', 'evidenceSignalIds', 'payload'],
    },
  },
];

// The full body for client.beta.agents.create(...).
export function buildAgentParams(env = process.env) {
  const mcpServers = buildMcpServers(env);
  const tools = [
    { type: 'agent_toolset_20260401' },
    ...mcpServers.map((s) => ({ type: 'mcp_toolset', mcp_server_name: s.name })),
    ...CUSTOM_TOOLS,
  ];
  return {
    name: AGENT_NAME,
    model: MODEL,
    system: SYSTEM_PROMPT,
    ...(mcpServers.length > 0 ? { mcp_servers: mcpServers } : {}),
    tools,
  };
}
