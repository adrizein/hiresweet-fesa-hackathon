# src/processing/ — tier 2: processing

Contract: `async process(ctx)` — read/write the store directly, no return
value. Runs in **file order** (numeric prefix), sequentially, unlike tier 1's
parallel signals — later steps depend on earlier ones having written the
store.

| File | Step | Depends on |
|---|---|---|
| `10-corroborate.js` | Scores signal convergence per company: counts distinct signal types, sets `company.corroboration.converges = true` when ≥2 independent types hit the same account. Several independent signals beat one loud one. | tier 1 output |
| `20-enrich-contacts.js` | FullEnrich the primary contact of companies that have signals — **economically aware**: checks `clients.fullenrich.getCredits()` first, respects `config.enrichBudget` (per-run cap), spends on the most-corroborated accounts first, and skips `do_not_contact`/`protected` companies outright (never wastes a credit on an account we can't touch anyway). | `10-corroborate` (for spend ordering) |
| `30-score-leads.js` | Turns companies-with-signals into scored `leads` (0-100 + rationale). Claude scores via structured output (`llm.completeJSON`) when a key is present; falls back to a deterministic heuristic otherwise (same shape, so downstream code never branches on which path scored it). Deliberately does **not** pass `flags` (do-not-contact/protected) into the scoring prompt — policy is the gate's job, not the scorer's; keeping them separate means a blocked account still surfaces as a real score plus a visible gate block, not a silently deflated score. | `10-corroborate` |
| `40-match-candidates.js` | The HireSweet-specific edge: matches anonymized marketplace candidates (`fixtures/candidates.json`) against each company's open-role tags. These matches become the value-first hook in outreach copy. Candidates stay anonymized end to end — never resolve to name/email here. | none (reads `companies` directly) |

## Adding a processor

One file, default export `{ name, description, async process(ctx) }`, numeric
prefix to place it in the sequence. `ctx` gives you `store`, `clients`, `llm`,
`config`, `log` — see `backbone/CLAUDE.md` and `backbone/selectors.js` for the
shared read helpers (`signalsForCompany`, `pickPrimaryContact`, etc.) before
writing a new one.
