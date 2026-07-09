# Wake, Agentic GTM Hackathon (working title)

> Read this file at the start of every Claude Code session on this repo.

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

## The three building blocks and how they wire together

Sillage does not send. FullEnrich does not send. **Claude is the orchestrator.**

```
Sillage (signal)  ->  Claude (triage, route, decide, draft, gate)  ->  Gmail draft / HubSpot task
        \                        |
         \----> FullEnrich (enrich the connector AND the target) ----/
```

- **Sillage** (`SILLAGE_API_KEY` in `.env`): signal source (champion moves, hiring waves, competitor engagement, funding rounds, job changes) + a power map of stakeholders (decision maker / champion / do-not-contact) + up to ~20 tracked accounts per workspace. Available as MCP and V2 API. The base URL, endpoints and signal schema come from the on-site onboarding: fill them in here once you have them.
- **FullEnrich** (`FULLENRICH_API_KEY` in `.env`, or MCP via OAuth): verified emails + phones + people/company data. REST v2 base `https://app.fullenrich.com/api/v2`, auth `Authorization: Bearer <key>`. Bulk enrichment is async (POST to start, GET to poll). Check `/account/credits` before large batches.
- **Claude (Anthropic)**: the brain. All the depth lives here: the routing decision, the guardrails, the drafting, the orchestration of the two data tools.
- **Send / CRM**: Claude drafts into Gmail or creates HubSpot tasks. **Never auto-send.** A human approves.

## The pipeline (working direction, arbitrated by the captain)

```
signal
  -> triage        is it worth acting on? guards (protected account -> route to a human)
  -> route         warmest path: warm_intro (ask a connector) > warm_direct (shared history) > cold
  -> enrich        FullEnrich on the target, and on the connector when routing an intro
  -> proof/value   a specific, honest reason to reach out (or something of value to send)
  -> craft         a short, multi-channel outreach (email + LinkedIn + a 30s call brief)
  -> gate          fail-closed QA: if it does not explicitly pass, it is blocked, never sent
  -> inbox         a human approves or rejects in one click
  -> CRM           draft only, plus a follow-up task
```

The "route" step (choosing a warm path before writing any copy) and the "gate" step (refusing to send bad outreach) are the two things that make this an agent, not a mail merge. Protect them.

## Deep-usage ideas (to score criteria 2 and 3)

- Filter every Sillage signal through the power map: act only when a real stakeholder (champion / decision maker) is involved.
- Corroborate: run several Sillage signal types on the same account and score convergence before acting.
- Chain Sillage -> FullEnrich the moment a person is identified (this is the clearest way to score both tools together).
- Use the do-not-contact list from the power map as a hard blocking filter.
- Budget: check FullEnrich credits before sizing a batch (an economically-aware agent).

## Team and ownership

Scope is arbitrated by the captain to avoid a twelve-headed monster. Each person owns a module; the captain decides what ships.

- **Léo** captain / head of product: arbitrates scope, owns coherence of the whole.
- **Adrien** user and pragmatic anchor: carries the real revenue use case, owns the engine that runs.
- **Mathieu** vision, the activation / warm-path "high notes", jury and sponsor relations, co-pitch.
- **Kubilay** data pipeline: FullEnrich (chaining, credit budgeting), demo accounts.
- **Valériane** copy quality and presentation: demo script, deck, the LinkedIn side challenge.

## Suggested stack (not mandatory, captain decides)

Node + Express, a single-file vanilla HTML/CSS/JS inbox (no build step), `node:test`. Simple enough that everyone can run it, fast enough to ship in a day. Swap freely if the captain prefers pure MCP orchestration with no custom server.

## Conventions

- Code and comments in English.
- **Secrets live in `.env`, never committed.** `.gitignore` covers `.env`, `data/`, `node_modules/`. `.env.example` is the template.
- **Public-safe repo:** this repo may be made public at submission. No confidential data, no real client names, no candidate PII, no API keys, ever.
- **Guardrails doctrine:** the agent must refuse to act on protected accounts or unverifiable claims. Draft-only. A human approves.
- Keep the demo data realistic but fictional or consented.

## Definition of done (by 17:30)

- A real signal enters and the chain runs end to end into the inbox.
- Real tool calls from all three: Sillage + FullEnrich + Claude, visible in the flow.
- A non-engineer can operate the demo.
- A guardrail visibly blocks a bad action (the memorable moment of the pitch).

## Working with Claude Code here

- Multiple people in parallel: one short-lived branch per module, the captain merges.
- Start every session by reading this file. Ask the captain before expanding scope.
- Test-first where it matters (the gate, the routing logic). Keep state in files, not in chat.
