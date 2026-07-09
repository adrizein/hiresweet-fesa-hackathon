# Wake on Claude Managed Agents

Wake runs entirely on **Claude Managed Agents** (Anthropic's hosted-agent product
on platform.claude.com). There is **no production server and no runtime JS** —
the only code in this repo is a local deploy toolkit (`deploy/`). Everything the
agent does is driven by prompt text (a system prompt + Skills) executing on
Anthropic's infrastructure, started by a cron deployment, with no external
process attached.

## Architecture

```
  deploy/deploy.js  (local, dev machine, idempotent)
     creates/updates ↓
  ┌──────────────────────────────────────────────────────────────┐
  │ Environment   cloud sandbox, unrestricted egress              │
  │ Vault         Sillage + FullEnrich MCP OAuth creds            │
  │               (deploy/mcp-auth.js); HUBSPOT_TOKEN env-var cred │
  │ Skills        platform/skills/*/SKILL.md  (versioned)         │
  │ Memory        wake-state (dedup) · wake-review (the outbox)   │
  │ Agent         system prompt + agent toolset + Sillage &       │
  │               FullEnrich MCP (auto-allow) + skills (NO custom) │
  │ Deployment    cron schedule + kickoff + vault + memory stores │
  └──────────────────────────────────────────────────────────────┘
     cron fires ↓ (autonomous — nothing attached, no listener)
  Session runs on Anthropic's side:
     read wake-state → Sillage MCP (signals) → HubSpot guard (curl)
     → FullEnrich MCP (enrich) → draft → gate-qa → write proposal
       or BLOCK to wake-review → record in wake-state
     (never sends — no send capability)
     reviewed by ↓
  deploy/inbox.js  →  a human approves and sends by hand
```

Why no custom tools? Custom tools are the only Managed Agents feature that forces
a host-side process (their calls stream out to be answered by *your* code). With
none, a scheduled session runs to completion entirely on Anthropic's side. Wake
uses **no custom tools** — only the built-in agent toolset (bash, file tools,
web) + MCP + skills + memory. That's what makes "no production JS" possible.

## The pieces

| Piece | Where |
|---|---|
| Doctrine (agent system prompt) | `platform/system-prompt.md` |
| Strategies (signals, enrichment, craft, guard, gate) | `platform/skills/*/SKILL.md` |
| The deploy toolkit | `deploy/{config,deploy,mcp-auth,run-once,inbox}.js` |
| Resolved resource ids (gitignored) | `deploy/.deploy-state.json` |

## Sponsor tools

- **Sillage + FullEnrich** attach as remote MCP servers (`SILLAGE_MCP_URL`,
  `FULLENRICH_MCP_URL`). The agent calls them itself (read-only). **Both require
  OAuth** — their REST API keys are *not* accepted as bearer tokens. So they're
  wired into the vault as auto-refreshing `mcp_oauth` credentials minted by
  `deploy/mcp-auth.js` (a one-time browser authorize per server; Anthropic then
  refreshes the token for every run). The MCP toolsets are set to `always_allow`
  so tool calls run without a human approving each one — the default `always_ask`
  would hang an autonomous cron session forever.
- **HubSpot** has no remote MCP (only a local stdio package), so it is **not** an
  MCP server. The agent reads HubSpot's REST API directly with `curl`/`jq`
  (read-only) guided by the `hubspot-crm` skill. `HUBSPOT_TOKEN` is a vault
  `environment_variable` credential scoped to `api.hubapi.com`, substituted into
  the request at egress — the agent's shell only ever sees an opaque placeholder,
  and the token never touches this repo.

## The guardrail

Two mechanisms keep bad outreach out:

1. **No send capability.** The agent has no tool that sends. Its only output is a
   draft in `wake-review`; a human approves and sends. Draft-only by construction.
2. **The `gate-qa` skill** runs a fail-closed checklist before any proposal —
   evidence cited, verified email, no placeholders, no candidate PII, and a **live
   HubSpot check** (customer / owned / opted-out → refuse). On any failure the agent
   writes a visible `BLOCKED` note instead of a proposal, grounded in real live CRM
   data queried that run. On a HubSpot lookup error it fails closed (block, don't
   guess), so a bad token or outage never lets a bad action through.

## Run it

Prereqs: an Anthropic key with Managed Agents enabled, plus `SILLAGE_API_KEY`,
`FULLENRICH_API_KEY`, `HUBSPOT_TOKEN` in `.env`.

```
cp .env.example .env       # fill the four keys
npm install
npm run deploy:dry         # preview what will be created/updated
npm run deploy             # apply (idempotent; safe to re-run)
npm run mcp-auth           # ONE-TIME: authorize Sillage + FullEnrich MCP in the browser
npm run run-once           # fire a run now; prints a platform.claude.com session link
npm run inbox              # review the agent's proposals + blocks
```

`npm run mcp-auth` opens a browser tab per server (Sillage, then FullEnrich);
click "Authorize" and it stores an auto-refreshing OAuth credential in the vault.
You only run it on first setup, or if a grant is later revoked (watch for the
`vault_credential.refresh_failed` webhook).

The deploy is idempotent — resources are reused by name. Editing a `SKILL.md` or
`platform/system-prompt.md` and re-running `npm run deploy` versions the change;
the next scheduled run picks it up (skills are pinned to `latest`).

## Notes / gotchas (several learned the hard way — keep them)

- Model is `claude-opus-4-8` (override `CLAUDE_MODEL`).
- Schedule defaults to weekday 07:00 Europe/Paris (`WAKE_CRON` / `WAKE_TZ`).
- **MCP servers need OAuth, not the REST keys.** Sillage/FullEnrich reject their
  own API keys as bearer tokens (401); wiring them as `static_bearer` silently
  drops the server from the session. Use `deploy/mcp-auth.js` → `mcp_oauth`
  credentials. `deploy.js` reports which MCP creds are missing/wrong.
- **MCP toolsets must be `always_allow`.** They default to `always_ask`, which
  pauses the session on every tool call for a human approval that never comes in
  an autonomous run — the session just hangs `idle` at `requires_action`.
  `deploy.js` sets `default_config.permission_policy = always_allow` on both.
- **`agents.update` requires the current `version`** (optimistic concurrency);
  `deploy.js` passes it, so re-deploys don't 400 once the agent exists.
- Vaults are keyed differently from other resources: the create field is
  `display_name`, not `name` (deploy's `findByName` handles both).
- `deploy/.deploy-state.json` (gitignored) holds the resolved resource ids +
  per-skill content hashes. Delete it only if you want deploy to re-discover /
  recreate resources by name.
- On any HubSpot lookup error the `gate-qa`/`hubspot-crm` skills fail **closed**
  (treat "can't verify" as a block), so a bad token or outage never lets a bad
  action through — it just blocks everything until fixed.
- A known soft spot: with no host store, `gate-qa`'s "evidence cited" check trusts
  that the cited Sillage signal ids are real (the agent is told to cite only ids
  it actually retrieved). Bounded by the human-approval step.

## Verified end to end (2026-07-09)

A live `run-once` completed the full loop autonomously: pulled real signals
across all 7 Sillage agents, triaged to one high-conviction lead (a Head-of-Sales
promotion at a Paris B2B SaaS), ran the live HubSpot guard, and **blocked** it —
the account was already a rep-owned `opportunity` in HubSpot — writing an
explained `BLOCKED` note instead of drafting. All three sponsors exercised live
in one session (Sillage MCP signals + company/lead lookups, FullEnrich MCP
`get_credits`, HubSpot via curl), plus memory dedup. The guardrail refused to
manufacture outreach where there was no honest trigger, which is the point.
