# Backbone on Claude Platform (Managed Agents)

The deterministic backbone (`src/backbone`, `src/signals`, `src/processing`,
`src/actions`) still runs as before via `npm start`. This document covers the
variant that runs the **judgment + activation** tier on **Claude Managed
Agents** — Anthropic's hosted-agent product on `platform.claude.com`.

## What changes

Before, our code drove everything and Claude only wrote text. Now Claude is the
actual orchestrator: we hand it a persisted **Agent** and Anthropic runs the
agent loop. The Agent calls **Sillage** and **FullEnrich** itself (as MCP
servers) and proposes activations through **host-side custom tools** whose
handlers run in *our* process — so the guardrails can't be bypassed.

```
  tiers 1-2 (local, deterministic)        tier 3 (Claude Managed Agents, hosted)
  signals ─▶ processing ─▶ store  ──roster──▶  Agent loop (Anthropic-run)
                                                 ├─ Sillage MCP   (corroborate)
                                                 ├─ FullEnrich MCP (enrich)
                                                 ├─ record_enrichment  ─┐ host tools:
                                                 └─ propose_action ─────┤ OUR process,
                                                                        ▼ OUR store + gate
                                             fail-closed gate ─▶ inbox (human approves)
```

| Piece | Where |
|---|---|
| Agent definition (model, doctrine, MCP servers, tools) | `src/platform/agent-config.js` + `platform/*.yaml` |
| Doctrine (system prompt, single source of truth) | `platform/system-prompt.md` |
| One-time control-plane setup (Environment, Vault, Agent) | `src/platform/setup.js` |
| Host-side guardrails (gate + enrichment write-back) | `src/platform/gate-tool.js` (reuses `src/backbone/gate.js`) |
| Session runtime (one Session per run) | `src/platform/run.js` |

The gate lives host-side on purpose: the do-not-contact list, protected
accounts, evidence and verified-email checks run against **our** store, so no
MCP data and no model output can get a bad action past them. Claude proposes,
the gate disposes.

## Run it

1. **Prereqs.** Anthropic key with the Managed Agents beta enabled, plus the
   Sillage / FullEnrich MCP endpoint URLs from onboarding.
   ```
   cp .env.example .env       # fill ANTHROPIC_API_KEY, SILLAGE_MCP_URL, FULLENRICH_MCP_URL,
                              # SILLAGE_API_KEY, FULLENRICH_API_KEY
   npm install
   ```
2. **Setup (once).** Creates the Environment, Vault (+ MCP credentials) and Agent.
   ```
   npm run platform:setup      # prints WAKE_ENVIRONMENT_ID / WAKE_VAULT_ID / WAKE_AGENT_ID
   ```
   Paste those three ids into `.env`. Re-run with `--update` after editing the
   doctrine or tools to push a new Agent version.
3. **Run.** Prepares the roster locally, then opens a hosted Session.
   ```
   npm run platform:run        # prints a platform.claude.com link to watch it live
   ```

`ant` CLI is the alternative control plane — apply `platform/*.yaml` with
`ant beta:agents create` / `ant beta:environments create` (see the comments in
those files).

## Graceful degradation

`npm run platform:run` always produces an inbox:

- **No `ANTHROPIC_API_KEY`, or setup not run** → it falls back to the local
  planners (`src/actions`), so the demo works offline.
- **Session error** → same fallback, with a warning.
- **No `SILLAGE_MCP_URL` / `FULLENRICH_MCP_URL`** → the Agent is created without
  those MCP servers and reasons over the roster alone. Invalid MCP credentials
  don't block session creation (they surface as `session.error` and retry), so a
  wrong token never dead-ends the demo.

## Notes / gotchas

- Model is `claude-opus-4-8` (override with `CLAUDE_MODEL`).
- MCP auth tokens are **not** always the same as REST API keys. `setup.js` wires
  the REST keys as `static_bearer` MCP credentials as a best-effort; if an MCP
  server needs OAuth instead, swap the credential in the vault — session creation
  still succeeds either way.
- The Agent is created **once** and reused by name; don't create one per run.
