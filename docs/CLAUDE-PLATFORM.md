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
  │ Vault         Sillage + FullEnrich MCP bearer creds;          │
  │               HUBSPOT_TOKEN as an env-var credential          │
  │ Skills        platform/skills/*/SKILL.md  (versioned)         │
  │ Memory        wake-state (dedup) · wake-review (the outbox)   │
  │ Agent         system prompt + agent toolset + Sillage &       │
  │               FullEnrich MCP + all skills   (NO custom tools) │
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
| The deploy toolkit | `deploy/{config,deploy,run-once,inbox}.js` |
| Resolved resource ids (gitignored) | `deploy/.deploy-state.json` |

## Sponsor tools

- **Sillage + FullEnrich** attach as remote MCP servers (`SILLAGE_MCP_URL`,
  `FULLENRICH_MCP_URL`). The agent calls them itself (read-only). Their API keys
  are wired into the vault as `static_bearer` MCP credentials, injected at egress.
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
npm run run-once           # fire a run now; prints a platform.claude.com session link
npm run inbox              # review the agent's proposals + blocks
```

The deploy is idempotent — resources are reused by name. Editing a `SKILL.md` or
`platform/system-prompt.md` and re-running `npm run deploy` versions the change;
the next scheduled run picks it up (skills are pinned to `latest`).

## Notes / gotchas

- Model is `claude-opus-4-8` (override `CLAUDE_MODEL`).
- Schedule defaults to weekday 07:00 Europe/Paris (`WAKE_CRON` / `WAKE_TZ`).
- `deploy/.deploy-state.json` (gitignored) holds the resolved resource ids +
  per-skill content hashes. Delete it only if you want deploy to re-discover /
  recreate resources by name.
- On any HubSpot lookup error the `gate-qa`/`hubspot-crm` skills fail **closed**
  (treat "can't verify" as a block), so a bad token or outage never lets a bad
  action through — it just blocks everything until fixed.
- A known soft spot: with no host store, `gate-qa`'s "evidence cited" check trusts
  that the cited Sillage signal ids are real (the agent is told to cite only ids
  it actually retrieved). Bounded by the human-approval step.
