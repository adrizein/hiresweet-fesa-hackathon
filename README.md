# hiresweet-fesa-hackathon
Full Enrich / Sillage / Anthropic Hackathon for Hiresweet

## Wake — the backbone

The three-tier agentic backbone for the Wake GTM agent (Track 1: Acquisition).

```
1. SIGNAL MAPPING          2. PROCESSING                    3. ACTIONS
   src/signals/               src/processing/                  src/actions/
   ┌──────────────┐           ┌────────────────────┐           ┌───────────────────┐
   │ hiring-wave  │──┐        │ 10 corroborate     │           │ 10 warm-intro     │──┐
   │ champion-move│──┼──────▶ │ 20 enrich-contacts │ ────────▶ │ 20 value-first    │──┼─▶ GATE ─▶ inbox
   │ + drop a file│──┘        │ 30 score-leads     │           │ 30 followup-task  │──┘  (fail-
   └──────────────┘  merge    │ 40 match-candidates│           │ + drop a file     │     closed)
        Sillage               └────────────────────┘           └───────────────────┘
                                FullEnrich + Claude               Claude drafts
```

Every tier is **pluggable**: a strategy is one file dropped in the tier folder, auto-discovered
at startup. The pipeline merges signal strategies in parallel, runs processors in filename
order, then gates every action a planner proposes. **Planners propose, the gate disposes** —
guardrails live in the backbone, not in the strategies, so no module can bypass them. Nothing
is ever sent: a human approves from the inbox.

### Quickstart

```sh
npm install
npm start          # run the full pipeline on the committed fixtures
npm run inbox      # see proposed / blocked actions
npm test           # gate, pipeline, registry, store tests
npm run reset      # wipe data/ and start fresh
```

Works with **zero configuration**: without API keys the brain falls back to deterministic
heuristics and both data clients run on the committed fixtures (`fixtures/`, realistic but
fictional). With keys in `.env` (see `.env.example`):

| Variable | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | Claude scores leads and drafts outreach (model: `CLAUDE_MODEL`, default `claude-opus-4-8`) |
| `SILLAGE_API_KEY` + `SILLAGE_API_BASE` | Sillage client switches to live mode (endpoint TODO in `src/backbone/clients/sillage.js`) |
| `FULLENRICH_API_KEY` | FullEnrich credits check goes live (bulk enrichment TODO in `src/backbone/clients/fullenrich.js`) |

State lives in `data/*.json` (gitignored) — open the files mid-demo to watch records appear.

### The three tiers

**1. Signal mapping (`src/signals/`)** — strategies emit `{ companies, people, signals }`.
They run in parallel and merge into the store by id, so two strategies firing on the same
account corroborate each other (Novapay gets a hiring wave *and* a champion move). Each person
carries a power-map role (`champion` / `decision_maker`) and flags (`do_not_contact`).

**2. Processing (`src/processing/`)** — ordered by numeric prefix:
- `10-corroborate` — multi-signal convergence per company (several independent signal types beat one loud one)
- `20-enrich-contacts` — FullEnrich the primary contact, **budget-aware**: checks credits first, respects a per-run budget, never spends a credit on a do-not-contact or protected account
- `30-score-leads` — Claude reasons over the full dossier (structured output), deterministic heuristic fallback
- `40-match-candidates` — the HireSweet edge: anonymized marketplace candidates matched to each company's open roles

**3. Actions (`src/actions/`)** — planners propose, ordered so routing wins:
- `10-warm-intro` — the routing decision: strong relationship path → ask the connector, never go cold
- `20-value-first-email` — no warm path → email that leads with anonymized candidate profiles (value first)
- `30-followup-task` — draft CRM follow-up for every outreach that passed the gate

Future activation modules (Gamma one-pagers, Gradium voice notes) are just more planners with
their own `kind`/`channel` — drop a file in `src/actions/`.

### The gate (fail-closed)

Every action passes `src/backbone/gate.js` before reaching the inbox. If a check fails —
or crashes — the action is **blocked**, visibly, with the reason:

| Check | Blocks when |
|---|---|
| `do-not-contact` | target company or person is on the power-map DNC list |
| `protected-account` | company is flagged protected → route to a human |
| `evidence-required` | the action cites no signal, or a signal that does not exist |
| `verified-contact` | email channel without a FullEnrich-verified address |
| `no-placeholders` | draft contains `[...]`, `{{`, TODO-style leftovers |
| `candidate-anonymity` | a candidate reference carries PII instead of a handle |

On the fixtures, the run produces 2 proposed outreaches + 2 follow-up tasks, and visibly
blocks Astrelle (do-not-contact client) and Fluxline (protected partner) — the memorable
moment of the pitch, by construction.

### Adding a strategy (any tier)

One file, default export, done — the registry picks it up on the next run:

```js
// src/signals/30-funding-round.js
export default {
  name: 'sillage:funding-round',
  description: 'Companies that just raised (Sillage funding_round signals)',
  async collect({ clients }) {
    const raw = await clients.sillage.fetchSignals('funding_round');
    return { companies: [], people: [], signals: [] }; // map raw → records
  },
};
```

Contracts per tier (enforced by `src/backbone/registry.js`):
- signals: `collect(ctx) → { companies, people, signals }`
- processing: `process(ctx)` — read/write the store; numeric prefix = execution order
- actions: `plan(ctx) → [action]` — an action needs `id`, `kind`, `channel`, `companyId`,
  `evidenceSignalIds`, `payload` (the gate rejects anything without evidence)

`ctx` gives every strategy: `store`, `clients.sillage`, `clients.fullenrich`, `llm`
(Claude with `.complete()` / `.completeJSON()`, always null-safe without a key), `config`, `log`.

### Layout

```
src/backbone/   pipeline, store, registry, gate, llm, tool clients — the part that does not change
src/signals/    tier 1 strategies (grow this)
src/processing/ tier 2 processors (ordered)
src/actions/    tier 3 planners (grow this)
fixtures/       committed, fictional demo data (public-safe)
data/           runtime state, one JSON per collection (gitignored)
test/           node:test suites for gate, pipeline, registry, store
```
