# platform/ — Claude Managed Agents control-plane definitions

Not code — the declarative definitions for the hosted agent. Two ways to
apply them: `src/platform/setup.js` (the canonical path, `npm run
platform:setup`) reads `system-prompt.md` and rebuilds the equivalent of the
YAML here from `src/platform/agent-config.js`; the YAML files are the `ant`
CLI alternative for a version-controlled/CI workflow. **Keep both in sync by
hand** — `agent-config.js` doesn't read the YAML, it's a parallel
representation of the same agent, documented in each file's header comment.

| File | Role |
|---|---|
| `system-prompt.md` | The doctrine — single source of truth for the agent's system prompt, read directly by `agent-config.js` (`SYSTEM_PROMPT`) and referenced by `acquisition-agent.agent.yaml` (`system: "@./platform/system-prompt.md"`). Encodes the six-step process in order: TRIAGE (skip weak/single/stale signals, never touch `do_not_contact`/`protected`) → ROUTE (warmest path, champion > decision_maker) → ENRICH (FullEnrich, call `record_enrichment` before an email can pass the gate) → CORROBORATE (optional extra Sillage detail) → CRAFT (grounded only in provided facts, anonymized candidate handles, no PII) → PROPOSE (`propose_action`, cite evidence, never argue with a `passed:false` gate result). |
| `acquisition-agent.agent.yaml` | The agent as `ant beta:agents create/update` input: model, system prompt reference, MCP servers (`sillage`, `fullenrich`, URLs from env), and the two host-side custom tool schemas (`record_enrichment`, `propose_action`) — must match `src/platform/agent-config.js`'s `CUSTOM_TOOLS` exactly. MCP auth is deliberately **not** here — it lives in a vault attached at session-create time, never in a checked-in file. |
| `acquisition.environment.yaml` | The cloud Environment as `ant beta:environments create` input: unrestricted networking so the hosted sandbox can reach the Sillage/FullEnrich MCP endpoints. Reused across agents by name. |

## If you touch this directory

- Edit `system-prompt.md` for doctrine changes — it's read live by both paths, no duplication to keep in sync there.
- If you change `acquisition-agent.agent.yaml`'s `tools`/`mcp_servers`, mirror the change in `src/platform/agent-config.js` (and vice versa) — nothing enforces they match automatically.
- Changing either doesn't affect a running agent until you push a new version: `npm run platform:setup -- --update`, or the equivalent `ant beta:agents update` (see the comment header in the YAML).
