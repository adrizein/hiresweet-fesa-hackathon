# hiresweet-fesa-hackathon

Full Enrich / Sillage / Anthropic Hackathon for HireSweet — **Track 1: Acquisition**.

## Wake — the acquisition agent

From a weak buying signal, find the right person, check they're fair game, enrich
a verified contact, and draft outreach a rep can approve — with a guardrail that
refuses to touch accounts that are already ours.

Wake runs **entirely on Claude Managed Agents** (platform.claude.com). There is
**no production server and no runtime code** — just a system prompt + Skills
(prompt text) running on Anthropic's infrastructure, started by a cron
deployment. The only code in this repo is a local deploy toolkit.

```
  deploy/deploy.js  (local, dev machine)
     provisions ↓
  Managed Agent (Anthropic-hosted):
     system prompt + Skills
     + Sillage & FullEnrich MCP  + HubSpot via curl (guardrail)
     + memory: wake-state (dedup), wake-review (outbox)
     started by a cron Deployment (autonomous)
        ↓ each run
     Sillage signals → HubSpot guard → FullEnrich → draft
        → proposal / BLOCK into wake-review   (never sends)
        ↓
  deploy/inbox.js  → a human approves and sends
```

### Quickstart

```sh
cp .env.example .env      # fill ANTHROPIC_API_KEY, SILLAGE_API_KEY, FULLENRICH_API_KEY, HUBSPOT_TOKEN
npm install
npm run deploy:dry        # preview
npm run deploy            # create/update the hosted deployment (idempotent)
npm run run-once          # fire a run now → prints a platform.claude.com session link
npm run inbox             # review the agent's proposals + guardrail blocks
```

### How it uses the three sponsors

- **Sillage** (MCP) — the signal source; the agent finds and qualifies buying
  signals itself, read-only, guided by the `signal-*` skills.
- **FullEnrich** (MCP) — verified emails/phones; the agent enriches the chosen
  contact, credit-budgeted (`enrichment` skill).
- **Anthropic** — Claude *is* the agent (Managed Agents), orchestrating the whole
  run and drafting the copy.

Plus **HubSpot** as the CRM source of truth for the guardrail: the agent reads it
live with `curl` (read-only) to block accounts that are already customers, owned,
or opted out (`hubspot-crm` + `gate-qa` skills).

### Updating strategies

Signal and action strategies are **Skills** — plain markdown under
`platform/skills/*/SKILL.md`. Edit one (or drop in a new one), run `npm run deploy`,
and the next scheduled run uses it. No code, no redeploy of infrastructure.

### The guardrail

The agent has **no send capability** — its only output is a draft in the
`wake-review` store that a human approves. The `gate-qa` skill runs a fail-closed
checklist (evidence, verified email, no placeholders, no PII, and a live HubSpot
customer/owned/opt-out check) and writes a visible `BLOCKED` note on any failure.
See `docs/CLAUDE-PLATFORM.md` for the full architecture and the guardrail
trade-off (doctrinal, not host-enforced).

### Layout

```
platform/system-prompt.md   the agent's doctrine (prompt text)
platform/skills/*/SKILL.md   the strategies (Skills — edit these)
deploy/                      the local deploy toolkit (the only JS)
docs/CLAUDE-PLATFORM.md      full architecture + run guide
```

> A separate, parallel effort in this repo (the "Account Intelligence Tool"
> org-chart UI, on the `front`/`lead` branches) still uses `fixtures/` — that's
> why it's kept. See `CLAUDE.md` for the two-workstream note.
