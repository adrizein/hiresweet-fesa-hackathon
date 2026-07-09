# src/platform/ — Claude Managed Agents runtime

The hosted variant of tier 3. Instead of `src/actions/*` planners deciding
routing/enrichment/copy in-process, we hand a persisted **Agent** to Anthropic
and it runs the loop: calls Sillage + FullEnrich itself as MCP servers, then
proposes activations through host-side custom tools that run in *our*
process — so the guardrails can't be bypassed no matter what the model or MCP
data says. Full narrative: `docs/CLAUDE-PLATFORM.md`. Don't duplicate that
write-up here — this file is the file-by-file map.

Not a separate product: tiers 1-2 (`src/signals/`, `src/processing/`) still
run locally first to build the roster; only tier 3 moves to the hosted agent.

| File | Role |
|---|---|
| `agent-config.js` | The agent definition as data: model (`claude-opus-4-8` default), reads `platform/system-prompt.md` as the system prompt, builds the MCP server list from `SILLAGE_MCP_URL`/`FULLENRICH_MCP_URL` (only included when set), and defines the two host-side custom tools (`record_enrichment`, `propose_action`) with their JSON schemas. `buildAgentParams()` is the full body for `client.beta.agents.create()`. Names exported here (`AGENT_NAME`, `TOOL_RECORD_ENRICHMENT`, `TOOL_PROPOSE_ACTION`, ...) are the contract shared with `setup.js`, `run.js` and `gate-tool.js` — keep them as the single source, don't hardcode the strings elsewhere. |
| `setup.js` | One-time control-plane setup (`npm run platform:setup`). Creates-or-reuses (by name) the Environment (cloud sandbox, unrestricted egress so it can reach the MCP servers), the Vault (+ `static_bearer` MCP credentials from the REST API keys, best-effort), and the Agent (versioned; `--update` pushes a new version from `agent-config.js`). Prints the three ids to paste into `.env`. This is the SDK-programmatic equivalent of applying `../../platform/*.yaml` via the `ant` CLI. |
| `run.js` | The data plane — one Managed Agents **session** per run (`npm run platform:run`). Builds the roster locally (tiers 1-2), opens `client.beta.sessions.create()`, streams events: logs `agent.mcp_tool_use` (Sillage/FullEnrich calls happen agent-side, transparently), and for `agent.custom_tool_use` dispatches to `gate-tool.js` and sends the result back as `user.custom_tool_result`. **Graceful degradation is load-bearing here**: no `ANTHROPIC_API_KEY` / no agent+environment ids / a session error all fall back to the local planners (`src/actions/`, via `runLocalFallback`), so the demo never dead-ends. |
| `gate-tool.js` | Host-side handlers for the two custom tools, run in *our* process against *our* store. `recordEnrichment` writes a verified contact back to `people`. `proposeAction` builds the draft and runs `runGate` (the exact same `backbone/gate.js` the local planners use) — `passed` → `proposed` into the inbox, otherwise `blocked` with the reasons handed back to the model to fix or abandon. Also builds `powerMap()`, the roster snapshot sent to the agent at kickoff (ids + power-map flags + evidence only — the agent can only act within accounts we control and must cite real signal ids). |

## If you touch this directory

- Tool **names** and **schemas** are defined once in `agent-config.js` — if you add a host tool, add it there, then add its handler in `gate-tool.js`, then route it in `run.js`'s `agent.custom_tool_use` case. All three must agree.
- Never let the model bypass the gate: any new custom tool that writes to the store must call `runGate` (via `backbone/gate.js`) before anything reaches `proposed`.
- After editing `agent-config.js` or `platform/system-prompt.md`, run `npm run platform:setup -- --update` to push a new agent version — the Agent is created once and reused by name, it does not pick up local file changes automatically.
