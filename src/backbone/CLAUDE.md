# src/backbone/ — the shared engine

The part that does not change when someone adds a strategy. If you're adding a
signal/processor/planner, you almost certainly don't need to touch this
directory — go to `src/signals/`, `src/processing/` or `src/actions/` instead.

| File | Role |
|---|---|
| `store.js` | File-backed store: one JSON file per collection under `data/` (gitignored). `get`/`all`/`upsert`/`reset`/`summary`. `upsert` shallow-merges onto an existing record by `id`, so re-runs update in place instead of duplicating. State lives in files, not in chat — open `data/*.json` mid-demo to watch records appear. |
| `pipeline.js` | `runPipeline(ctx, { signals, processors, planners, stages })` — runs the three tiers in order. Signal strategies run in parallel (`Promise.allSettled`, merge into the store); processors run in file order; every planner draft goes through `runGate` before being stored as `proposed`/`blocked`. A failing strategy is isolated and recorded on the run (`run.errors`); it never kills the pass. Statuses a human already set (`approved`/`rejected`/`done`) are never overwritten by a re-run. |
| `registry.js` | Strategy discovery: reads a tier folder, imports every `.js` file (alphabetical, so numeric prefixes pin order), requires a default export `{ name, <method>() }`. Files starting with `_` are ignored (scratch/wip). This is the entire "drop a file to add a strategy" mechanism. |
| `gate.js` | The fail-closed QA gate — **the** guardrail. `checks[]` (`do-not-contact`, `protected-account`, `evidence-required`, `verified-contact`, `no-placeholders`, `candidate-anonymity`), each with `appliesTo`/`run`. `runGate` fails closed: zero applicable checks does not mean pass. Edit this file with care and a test (`test/gate.test.js`) — it is the guardrail the whole pitch depends on, and it is shared by both run modes (the platform's `record_enrichment`/`propose_action` host tools reuse it directly). |
| `selectors.js` | Shared read helpers over the store (`signalsForCompany`, `contactsForCompany`, `pickPrimaryContact`, `matchesForCompany`). `pickPrimaryContact` is where champion > decision_maker > anyone ranking and do-not-contact filtering happen — the routing logic in one place. |
| `llm.js` | Wraps `@anthropic-ai/sdk`. `enabled` is false without `ANTHROPIC_API_KEY`. `complete()` / `completeJSON()` (structured output via `output_config.format.json_schema`) both return `null` when disabled — every caller MUST have a deterministic fallback, so the pipeline runs offline for any teammate without a key. |
| `env.js` | Minimal `.env` loader, no dependency. Existing `process.env` values win over the file. |
| `clients/` | REST clients for Sillage and FullEnrich — see `clients/CLAUDE.md`. |

## Conventions specific to this directory

- No strategy-specific logic here — if code only matters to one signal/processor/planner, it belongs in that file, not here.
- Anything that reads or writes `data/*.json` goes through `store.js`, never a raw `fs` call elsewhere.
- Changes to `gate.js` checks affect both run modes at once (local planners and the hosted agent's host tools in `src/platform/gate-tool.js` both call `runGate`). Run `test/gate.test.js` after touching it.
