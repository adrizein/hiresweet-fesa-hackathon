# src/actions/ — tier 3: local planners

Contract: `async plan(ctx) → [action]`. An action needs `id`, `kind`,
`channel`, `companyId`, `evidenceSignalIds`, `payload` — the gate rejects
anything without evidence. Planners are **deliberately naive about
guardrails**: they propose freely, `backbone/pipeline.js` runs every draft
through `backbone/gate.js` right after — "planners propose, the gate
disposes." Don't add do-not-contact/protected checks inside a planner; that
logic belongs in the gate, once, not duplicated per planner.

This tier only runs in **local mode** (`npm start`). On the Claude Managed
Agents path (`npm run platform:run`), the hosted agent replaces these planners
— it decides routing/enrichment/copy itself and calls `propose_action`
instead. See `../platform/CLAUDE.md`.

Runs in file order, and order encodes the routing decision:

| File | Role | Runs when |
|---|---|---|
| `10-warm-intro.js` | **The routing decision.** Score ≥60 lead + a strong relationship (`fixtures/relationships.json`, `strength ≥ 0.7`) to the target → ask the connector for an intro instead of going cold. Warm beats cold, always checked first. | score ≥ 60 and a strong relationship exists |
| `20-value-first-email.js` | No warm path → cold-ish email that leads with up to 2 anonymized candidate matches (`matchesForCompany`) before any ask. Skips leads `10-warm-intro` already covered this run (checks `store.all('actions')` for an existing `intro_request` on the same lead). | score ≥ 50 and no warm-intro action already exists for the lead |
| `30-followup-task.js` | Runs last on purpose — reads what the earlier two planners just proposed this run and drafts a CRM follow-up task (3-business-day nudge) for every `intro_request`/`outreach_email` that is `proposed` or `approved`. | after any outreach action exists |

Both `10-` and `20-` follow the same pattern: Claude drafts via `llm.complete`/
`completeJSON` when enabled, with a deterministic template fallback
(`fallbackMessage`/`fallbackDraft`) so the pipeline always produces something,
key or not.

## Adding a planner

One file, default export `{ name, description, async plan(ctx) }`. Future
activation modules (a Gamma one-pager, a Gradium voice note) are just another
planner here with their own `kind`/`channel` — see root `CLAUDE.md` for why
those aren't built yet.
