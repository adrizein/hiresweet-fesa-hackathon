# Wake, Agentic GTM Hackathon (working title)

> Read this file at the start of every Claude Code session on this repo.
> `platform/`, `platform/skills/`, and `deploy/` each have their own `CLAUDE.md` —
> read the one for the directory you're touching before changing it.

## What this project is

One-day build for the **Agentic GTM Hackathon** (Anthropic x FullEnrich x Sillage), Station F, 2026-07-09. Team: HireSweet (5 people). We compete on **Track 1: Acquisition** (an agent that finds new customers: right people, outreach they reply to, pipeline).

**The agent, in one sentence:** from a weak buying signal (Sillage), find the warmest human path to a hard-to-reach target, enrich it deeply (FullEnrich), and produce the right activation (an intro, a value-first message, a real-world touch), with guardrails so signal noise never becomes garbage outreach.

**Why HireSweet has an edge here:** we are a tech-recruitment marketplace with years of placements and relationships. The hard part of GTM is not writing an email, it is knowing *who connects to whom* and *not contacting the wrong people*. That relationship graph plus those guardrails are what turn a generic signal-to-email chain into something only we can build.

## Hard rules (from the organizers, non-negotiable)

- **Use all three: Anthropic (Claude) + FullEnrich + Sillage.** Missing one = ineligible.
- **All product code is committed during the event.** (This repo was created this morning, so we are clear: keep building here.)
- **Judged on 4 equal criteria, 25 points each:**
  1. Business impact / problem relevance
  2. Depth of AI and workflow use (Anthropic)
  3. Depth of external data use (FullEnrich and Sillage)
  4. Presentation quality
- **Deliverable:** a 2-minute demo, the link to this repo, a short description.
- Other open-source libs / APIs allowed if credited. Never use data without consent.

## What the scoring means for how we build

- **Criterion 3 is the one most teams underplay.** "One signal in, one email out" scores low. Go deep: compose several Sillage signals, filter via the power map, chain signal to enrichment, let the agent budget its own credits. The agent must *reason with the data*, not just relay it.
- **Criterion 2** rewards genuine agentic orchestration: a routing decision, a graph walk, guardrails, multi-signal corroboration. Not a linear script.
- **Criterion 1** is where "genuinely useful to a real GTM team" wins. Keep it grounded in a real revenue use case.
- **Criterion 4** is won by making the invisible visible: a real signal firing, a record appearing, a guardrail visibly refusing a bad action, a non-engineer operating it.

## What's actually built

Wake runs **entirely on Claude Managed Agents** (platform.claude.com). There is
**no production JS** — the only code in this repo is a local deploy toolkit
(`deploy/`) you run from a dev machine. Everything else is prompt text (a system
prompt + Skills) that runs on Anthropic's infrastructure. Full detail:
**docs/CLAUDE-PLATFORM.md**; don't duplicate the architecture write-up here.

```
     deploy/deploy.js (local, dev machine only)
        provisions/updates ↓ (idempotent)
   ┌─────────────────────────────────────────────────────────┐
   │  Managed Agent (Anthropic-hosted)                        │
   │   system prompt + Skills (platform/skills/*/SKILL.md)    │
   │   tools: agent toolset (bash/curl) + Sillage & FullEnrich│
   │          MCP servers                                     │
   │   memory: wake-state (dedup), wake-review (the outbox)   │
   └─────────────────────────────────────────────────────────┘
        started by ↓ a cron Deployment (autonomous, no listener)
   run → discover Sillage signals → HubSpot guard (curl) → FullEnrich
       → draft → write proposal / BLOCK to wake-review (never sends)
        reviewed by ↓
     deploy/inbox.js  → a human approves and sends by hand
```

Sponsor tools, as wired:

- **Sillage** (`SILLAGE_API_KEY`) — attached to the hosted agent as a remote MCP
  server (`SILLAGE_MCP_URL`, default `https://api.getsillage.com/api/mcp/v2`).
  The agent calls it directly (read-only) to find and qualify signals. The MCP
  endpoint needs **OAuth** (the API key is not accepted as a bearer) — authorized
  once via `npm run mcp-auth`, stored as an auto-refreshing vault credential.
- **FullEnrich** (`FULLENRICH_API_KEY`) — remote MCP server (`FULLENRICH_MCP_URL`),
  same OAuth-via-`mcp-auth` wiring as Sillage. The agent enriches a chosen contact
  itself, credit-budgeted per the `enrichment` skill.
- **Claude** (`ANTHROPIC_API_KEY`) — *is* the agent. Model `claude-opus-4-8`
  (override `CLAUDE_MODEL`). Used at deploy time to create/update resources.
- **HubSpot** (`HUBSPOT_TOKEN`) — the CRM source of truth for "is this account
  already ours". The agent reads it live with `curl`/`jq` (read-only) guided by
  the `hubspot-crm` skill. HubSpot has no remote MCP, so it is NOT an MCP server;
  the token is wired into the vault as an `environment_variable` credential,
  injected into the agent's request to `api.hubapi.com` at egress (the agent
  never sees the raw token).
- **Gamma / Gradium** — not implemented. Would become additional Skills if picked up.

## The guardrail

Two mechanisms keep bad outreach out:

1. **No send capability.** The agent can read Sillage / FullEnrich / HubSpot and
   draft, but the only place its work goes is the `wake-review` memory store; a
   human approves and sends by hand.
2. **The `gate-qa` skill** runs a fail-closed checklist against every draft
   (evidence cited, verified email, no placeholders, no PII, and a **live HubSpot
   do-not-contact / customer / owned / opt-out check**). On any failure it writes a
   visible `BLOCKED` note instead of a proposal — the memorable demo moment,
   grounded in real live CRM data.

## Deep-usage (criteria 2 & 3), as designed into the skills

- Multi-signal corroboration before acting (`signal-*` skills reward convergence).
- Read-only power-map routing via Sillage's own persona/stakeholder data.
- Live HubSpot guard as a hard block, re-checked every run (`gate-qa` + `hubspot-crm`).
- Sillage → FullEnrich chaining the moment a contact is chosen (`enrichment`).
- Credit-aware enrichment (check credits, cap spend) in the `enrichment` skill.
- Persistence/dedup across nightly runs via the `wake-state` memory store.

## Two workstreams in this repo — know which one you're in

This file, `platform/`, and `deploy/` describe **Wake**: the acquisition agent
on Claude Managed Agents (signal → guard → enrich → draft → review). There is a
**second, parallel effort** in this same repo — the "Account Intelligence Tool"
(an org-chart UI: account list → org chart → person brief → one-click draft) —
specified in `docs/SPECS.md`, `docs/PLAN.md`, `docs/FRONT-BRIEF.md` and
`criteria/lead-criteria.md`, built on other branches (`front`, `backend-server`,
`lead`), and it still references `fixtures/accounts.example.json`. That's why
`fixtures/` is left in place even though Wake no longer reads it. The two efforts
are not the same product — if you're picking up this repo cold, confirm with the
captain (Léo) which one is being demoed before assuming this agent is it.

## Team and ownership

Scope is arbitrated by the captain to avoid a twelve-headed monster. Each person owns a module; the captain decides what ships.

- **Léo** captain / head of product: arbitrates scope, owns coherence of the whole.
- **Adrien** user and pragmatic anchor: carries the real revenue use case, owns the engine that runs — the Managed Agents deployment (`platform/`, `deploy/`) is his module.
- **Mathieu** vision, the activation / warm-path "high notes", jury and sponsor relations, co-pitch.
- **Kubilay** data pipeline: FullEnrich (chaining, credit budgeting), demo accounts.
- **Valériane** copy quality and presentation: demo script, deck, the LinkedIn side challenge.

## Stack (as built)

Node (ESM, `>=20`) + `@anthropic-ai/sdk`, zero other runtime dependencies — but
that JS is **deploy-only** (`deploy/*.js`, run from a dev machine). Production is
100% hosted: a system prompt + Skills (markdown) running on Claude Managed Agents,
with two memory stores and a cron deployment. No server, no UI, no runtime
process on our side.

Everyday commands: `npm run deploy:dry` (preview), `npm run deploy` (apply),
`npm run mcp-auth` (one-time: browser-authorize Sillage + FullEnrich MCP),
`npm run run-once` (fire a run now), `npm run inbox` (review proposals/blocks).
Verified end to end on 2026-07-09 — see `docs/CLAUDE-PLATFORM.md`.

## Conventions

- Code and comments in English. Skills are plain prompt text a non-engineer can edit.
- **Secrets live in `.env`, never committed.** `.gitignore` covers `.env`, `data/`, `deploy/.deploy-state.json`, `node_modules/`. `.env.example` is the template.
- **PUBLIC repo (confirmed):** this repo WILL be public. No confidential data, no real client names, no candidate PII, no API keys, ever.
- **HubSpot response data never touches the repo** — no fixtures, no example docs, no committed cache. Live CRM data lives only in the hosted memory stores and the transient sandbox. (Note: with the agent reading HubSpot directly, that data does transit Anthropic's infrastructure during a run — an accepted trade-off, see `docs/CLAUDE-PLATFORM.md`.)
- **Guardrails doctrine:** the agent refuses to act on customer/owned/opted-out accounts or unverifiable claims, and has no send capability. Draft-only. A human approves.

## Definition of done (by 17:30)

- A cron deployment runs the agent autonomously; a manual run fires with `npm run run-once`.
- Real tool use from all three, visible in the session transcript: Sillage MCP, FullEnrich MCP, HubSpot via curl.
- A non-engineer can operate it: `npm run inbox` prints proposals + blocks in plain language.
- A guardrail visibly blocks a bad action: a live HubSpot customer/owned/opted-out account produces a `BLOCKED` note (the memorable moment).
- Strategies are updatable by editing a `platform/skills/*/SKILL.md` and re-running `npm run deploy`.

## Working with Claude Code here

- Multiple people in parallel: one short-lived branch per module, the captain merges.
- Start every session by reading this file, then the `CLAUDE.md` in whichever directory you're about to touch. Ask the captain before expanding scope.
- To change agent behavior, edit the system prompt or a skill (prompt text) — not code. Re-run `npm run deploy` to push it; the next scheduled run picks it up.
