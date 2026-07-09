# Wake, Agentic GTM Hackathon (working title)

> Read this file at the start of every Claude Code session on this repo.
> `src/*` and `platform/` each have their own `CLAUDE.md` with component-level detail —
> read the one for the directory you're touching before changing its code.

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

Two run modes, same guardrails, same store:

1. **Local backbone** — `npm start` (`src/cli.js`). Three deterministic tiers
   (`src/signals/` → `src/processing/` → `src/actions/`) run in-process; Claude
   is called per-strategy for scoring/drafting (`src/backbone/llm.js`), with a
   heuristic fallback whenever `ANTHROPIC_API_KEY` is absent. Full detail: **README.md**.
2. **Claude Managed Agents** — `npm run platform:setup` then `npm run platform:run`
   (`src/platform/`). Same tier-3 decision (route / enrich / craft), but hosted:
   Anthropic runs the agent loop, the agent calls Sillage + FullEnrich itself as
   MCP servers, and proposes activations through host-side custom tools whose
   handlers run in *our* process. Full detail: **docs/CLAUDE-PLATFORM.md**.

Don't duplicate the architecture write-up here — read those two docs (and the
`CLAUDE.md` in the directory you're editing) before changing pipeline code.

```
tiers 1-2 (local, deterministic)         tier 3: EITHER local planners (src/actions)
signals ─▶ processing ─▶ store ─roster─▶          OR a hosted Claude agent (src/platform)
                                          │
                                          ▼
                     fail-closed gate (src/backbone/gate.js, host-side, always)
                                          │
                                          ▼
                          inbox (human approves or rejects — nothing auto-sends)
```

Sponsor tools, as actually wired today:

- **Sillage** (`SILLAGE_API_KEY`) — fixtures by default; live V2 REST once
  keyed (`src/backbone/clients/sillage.js`). Feeds `src/signals/*`. On the
  platform path it is *also* handed to the hosted agent directly as an MCP
  server (`SILLAGE_MCP_URL`).
- **FullEnrich** (`FULLENRICH_API_KEY`) — live credits check is wired
  (`/account/credits`); person enrichment still reads the fixture map pending
  the async bulk flow (`POST /contact/enrich/bulk` + poll — TODO, tagged in
  `src/backbone/clients/fullenrich.js`). Feeds `src/processing/20-enrich-contacts.js`,
  budget-aware. On the platform path the hosted agent calls FullEnrich MCP
  itself and writes verified contacts back via the `record_enrichment` host tool.
- **Claude** (`ANTHROPIC_API_KEY`) — scores leads and drafts copy locally, or
  runs the entire tier-3 decision as a hosted Managed Agent. Model defaults to
  `claude-opus-4-8` (override with `CLAUDE_MODEL`).
- **HubSpot** (`HUBSPOT_TOKEN`) — not wired into the backbone yet (see the
  `adrizein/hubspot-mcp` branch for in-progress work).
- **Gamma / Gradium** — **not implemented.** Still just placeholder env vars in
  `.env.example`. Would be new `src/actions/*` planners (Gamma → an `asset`
  step; Gradium → a `voice` step) if picked up — see README's "Adding a
  strategy" section for the contract.

## Deep-usage, already implemented (criteria 2 & 3)

- Multi-signal corroboration per account before anything spends credits or
  drafts copy (`src/processing/10-corroborate.js`).
- Power-map role routing: champion > decision_maker > anyone, do-not-contact
  people/companies filtered out before a contact is even picked
  (`src/backbone/selectors.js` → `pickPrimaryContact`).
- Do-not-contact / protected-account hard blocks enforced at the gate, not in
  a strategy — no planner and no hosted-agent tool call can bypass them
  (`src/backbone/gate.js`).
- Sillage → FullEnrich chaining the moment a contact is identified
  (`src/processing/20-enrich-contacts.js`, or `record_enrichment` on the
  platform path).
- Credit-aware enrichment: checks `FullEnrich.getCredits()` and respects a
  per-run budget (`config.enrichBudget`) before spending.
- The HireSweet-specific edge: anonymized marketplace candidates matched to
  each company's open roles as the value-first hook in outreach
  (`src/processing/40-match-candidates.js`).

## Two workstreams in this repo — know which one you're in

This file and the `src/` tree describe the **Wake backbone**: a CLI pipeline
(signal → processing → gated action → inbox), runnable locally or on Claude
Managed Agents. There is a **second, parallel effort** in this same repo — the
"Account Intelligence Tool" (an org-chart UI: account list → org chart →
person brief → one-click draft) — specified in `docs/SPECS.md`, `docs/PLAN.md`,
`docs/FRONT-BRIEF.md` and `criteria/lead-criteria.md`, built on other branches
(`front`, `backend-server`, `lead`). Those docs note in their own text that the
CLI/inbox product "no longer matches" their direction (pivot toward the
org-chart view). The two efforts share fixtures/conventions but are not the
same product — if you're picking up this repo cold, confirm with the captain
(Léo) which one is being demoed before assuming this backbone is it.

## Team and ownership

Scope is arbitrated by the captain to avoid a twelve-headed monster. Each person owns a module; the captain decides what ships.

- **Léo** captain / head of product: arbitrates scope, owns coherence of the whole.
- **Adrien** user and pragmatic anchor: carries the real revenue use case, owns the engine that runs — this backbone (`src/`, `platform/`) is his module.
- **Mathieu** vision, the activation / warm-path "high notes", jury and sponsor relations, co-pitch.
- **Kubilay** data pipeline: FullEnrich (chaining, credit budgeting), demo accounts.
- **Valériane** copy quality and presentation: demo script, deck, the LinkedIn side challenge.

## Stack (as built)

Node (ESM, `>=20`) + `@anthropic-ai/sdk`, zero other runtime dependencies,
`node:test` for tests. No web server and no UI on this branch — the backbone
is CLI-only (`src/cli.js`, and `src/platform/run.js` for the hosted variant),
state and inbox printed straight to the terminal / `data/*.json`. (The org-chart
UI mentioned above is a separate, unrelated front end — see the workstream
note.)

## Conventions

- Code and comments in English.
- **Secrets live in `.env`, never committed.** `.gitignore` covers `.env`, `data/`, `node_modules/`. `.env.example` is the template.
- **PUBLIC repo (confirmed):** this repo WILL be public. No confidential data, no real client names, no candidate PII, no API keys, ever.
- **Guardrails doctrine:** the agent must refuse to act on protected accounts or unverifiable claims. Draft-only. A human approves.
- Keep the demo data realistic but fictional or consented.

## Definition of done (by 17:30) — status on this backbone

- ✅ A real signal enters and the chain runs end to end into the inbox (`npm start` on fixtures, or live via `SILLAGE_API_KEY`).
- ✅ Real tool calls from all three: Sillage (live V2 REST), FullEnrich (live credits check), Claude (scoring + drafting) — see README's "Live Sillage wiring".
- ✅ A non-engineer can operate the demo: `npm start` / `npm run inbox` print a plain-language inbox; on the platform path there's also a `platform.claude.com` session link to watch live.
- ✅ A guardrail visibly blocks a bad action: the fixtures always produce a `do-not-contact` block (Astrelle) and a `protected-account` block (Fluxline) — see README's gate table.
- ⚠️ FullEnrich *person* enrichment is still fixture-backed live (bulk async flow not wired — see "What's actually built" above); the credits check is the live sponsor call today.

## Working with Claude Code here

- Multiple people in parallel: one short-lived branch per module, the captain merges.
- Start every session by reading this file, then the `CLAUDE.md` in whichever directory you're about to touch. Ask the captain before expanding scope.
- Test-first where it matters (the gate, the routing logic — see `test/`). Keep state in files, not in chat.
