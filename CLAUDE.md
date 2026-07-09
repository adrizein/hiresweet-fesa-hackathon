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

## Tools in the architecture

Two sides, one brain. Data tools feed the agent; activation tools are how it acts. **Sillage and FullEnrich do not send. Gamma and Gradium do not decide. Claude is the orchestrator in the middle.**

```
        DATA IN                          BRAIN                        ACTIVATION OUT
  Sillage   (signal + power map) --\                          /--> Gmail / HubSpot  (text draft)
                                     >--> Claude (Anthropic) --+--> Gamma            (visual asset)
  FullEnrich (verified contact) ---/     triage, route,       \--> Gradium          (voice note)
                                         gate, orchestrate
```

**Tiering (so we do not build a twelve-headed monster):**
- **Core loop (must-have):** Sillage -> Claude -> FullEnrich -> Gmail/HubSpot. This alone satisfies the "use all three sponsors" rule (Sillage + FullEnrich + Anthropic) and the acquisition track.
- **Activation high-notes (optional modules, win the side challenges):** Gamma (best-use-of-Gamma) and Gradium (best-use-of-Gradium). Add them once the core loop runs. They turn "the agent drafts an email" into "the agent produces a multi-modal, personalized activation", which is the memorable part of the demo.

### Data in

- **Sillage** (`SILLAGE_API_KEY`): the signal source. Champion moves, hiring waves, competitor engagement, funding rounds, job changes, plus a power map of stakeholders (decision maker / champion / do-not-contact) over up to ~20 tracked accounts per workspace. MCP and V2 API. Base URL / endpoints / signal schema come from the 9:00 onboarding.
  - **Plugs into:** `triage` (is this signal worth acting on?) and `route` (the power map tells us who the real stakeholders and do-not-contacts are).
  - **Deep use:** filter signals by power-map role, corroborate several signal types on one account before acting.
- **FullEnrich** (`FULLENRICH_API_KEY`, or MCP via OAuth): verified emails + phones + people/company data. REST v2 base `https://app.fullenrich.com/api/v2`, auth `Authorization: Bearer <key>`. Bulk enrichment is async (POST to start, GET to poll). Check `/account/credits` before large batches.
  - **Plugs into:** `enrich` (the target, and the connector when routing a warm intro).
  - **Deep use:** company lookup -> people search cascade; reverse-email to disambiguate; budget credits before a batch.

### Brain

- **Claude (Anthropic)** (`ANTHROPIC_API_KEY`): the orchestrator. All the depth lives here: the routing decision, the guardrails, the copy drafting, the composition of every tool. This is what makes it an agent and not a Zapier chain.
  - **Plugs into:** `triage`, `route`, `craft`, `gate`.

### Activation out

- **Gmail / HubSpot** (`HUBSPOT_TOKEN`): the text channel. Claude drafts an email into Gmail and/or creates a HubSpot task. **Never auto-send. A human approves.**
  - **Plugs into:** `publish`.
- **Gamma** (`GAMMA_API_KEY`): generates polished visual assets (presentations, documents, one-pagers, micro-sites). Auth header `X-API-KEY` (not Bearer), account Pro/Ultra/Teams/Business. Async: `POST /v1.0/generations` (params: `inputText`, `format`, `numCards`, `textMode`, `exportAs`) returns a `generationId`; poll `GET /v1.0/generations/{id}` every ~5s until completed; response gives `gammaUrl` + `exportUrl` (pdf) + credits used/remaining. `GET /themes` lists themes. Base URL per developers.gamma.app.
  - **Plugs into:** the activation layer (a new `asset` step, or inside `craft`). When the route calls for value-first outreach, the agent generates a **personalized one-pager or deck for the target** (for a hiring signal: "here is how we would staff your team", branded) and the email links to it. Also use it to auto-generate our own pitch deck.
  - **Deep use / why it wins:** the deck is generated FROM the enriched signal (company + role + why-now), so no two prospects get the same asset. That is a genuine "best use of Gamma", not a static template.
- **Gradium** (`GRADIUM_API_KEY`): voice AI, ultra low latency (text-to-speech, speech-to-text, voice cloning). The "phone" leg of multi-channel outreach (Track 1 explicitly lists email, LinkedIn, phone).
  - **Plugs into:** the activation layer (a new `voice` output inside `craft`). Renders a **personalized voice note / voicemail** from the drafted copy (optionally in a cloned voice), or reads the 30-second call brief aloud to the rep before they dial.
  - **Guardrail:** consent-gated, never place an automated call without consent. Default = a voice note the human chooses to send, or a briefing for the rep. This keeps it on the right side of the Code of Conduct while still winning "best use of Gradium".

## The pipeline (working direction, arbitrated by the captain)

```
signal
  -> triage        is it worth acting on? guards (protected account -> route to a human)
  -> route         warmest path: warm_intro (ask a connector) > warm_direct (shared history) > cold
  -> enrich        FullEnrich on the target, and on the connector when routing an intro
  -> proof/value   a specific, honest reason to reach out (or something of value to send)
  -> craft         multi-modal activation: email + LinkedIn + a 30s call brief,
                   optional Gamma asset (personalized one-pager/deck) + Gradium voice note
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
