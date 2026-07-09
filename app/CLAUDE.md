# Account Intelligence Tool, app CLAUDE.md

> This file is meant to be copied into the submission repo as-is, alongside the rest of `app/`. Public-safe: no real names, no real PII, no secrets.

## What this is

Account Intelligence Tool V1, a mocked front for blocks B+C of the Agentic GTM hackathon build. Journey: accounts list -> account view (org chart with highlighted targets) -> person brief -> draft, with a fail-closed gate that visibly blocks drafting on accounts with a `HUMAN` verdict.

## Run it

```
cd app
python3 -m http.server 8642
```

Open `http://127.0.0.1:8642/`. `fetch()` requires an HTTP server; opening `index.html` directly via `file://` will not load the data. No build step, no dependencies, no backend in V1.

## Files

- `index.html`, base CSS and page layout.
- `app.js`, hash routing and rendering (list, account, brief, integrations), vanilla JS.
- `agent.js`, the Agent tab: the orchestration layer that sits on top of every tool. Natural-language command bar (mocked intent parser), raw-lead intake that runs the whole pipeline (Sillage -> FullEnrich -> mapping -> brief, simulated), outreach strategy planning (`planSequence()`, deterministic mock of the future Claude layer) and a simulated email-only autopilot run. The real Claude layer replaces `planSequence()` and the parser without touching the UI.
- `sequence.js` + `sequence.css`, the per-contact outreach strategy page: an n8n-style editable workflow (multi-channel nodes, conditional branches, per-step editing, simulated run).
- `data/accounts.json`, the shared data contract between block A (sourcing) and blocks B+C (activation). See `data/CLAUDE.md` for the full schema.
- `data/integrations.json`, mocked integrations panel data.
- `theme-hiresweet.css` (optional), brand theme overriding the `:root` CSS variables. See `THEME-NOTES.md`.
- `.env`, secrets for the future backend proxy. Gitignored, never committed, never read by the front (the front only fetches `data/*.json`).

## Architecture notes

- Hash routes: `#/` (list), `#/agent` (orchestration agent), `#/integrations`, `#/account/:id` (account view), `#/account/:id/person/:idx` (brief panel open), `#/account/:id/person/:idx/draft` (draft shown, survives a page reload since it lives in the URL), `#/account/:id/person/:idx/sequence` (per-contact outreach workflow page).
- All dynamic text is passed through `esc()` before being injected via `innerHTML` (XSS guard). Never bypass this when adding new render paths.
- Org chart levels are inferred from role text, not from an explicit field: `CEO` -> level 0, `CTO`/`VP`/`Head`/`Director`/`COO`/`CFO` -> level 1, anything else -> level 2.

## Guardrails, non negotiable

- **Public-safe data only.** Every company, person, and fund name in any mocked data must be fictional and checked against real companies before it is committed.
- **Draft-only.** The draft button only ever displays text to review. There is no send path in this app, mocked or real.
- **Fail-closed gate, human-sovereign override.** The gate blocks the AGENT by default: on a `HUMAN` verdict the draft button is disabled with the reason shown, and the autopilot refuses to start on its own. But the gate is a checkpoint, not an absolute wall: a HUMAN can always explicitly override it (the launch button turns into "launch despite N warnings" and the override is logged in the run journal). Autonomy is blocked, the human stays sovereign. Never soften the default block itself to unblock a demo account, add a new mocked account instead.

## Next layers, in order (only after V1 is frozen)

1. A minimal Express proxy to hold API keys server-side (the front never sees them).
2. Real Claude draft generation, run on `person.brief` and passed through the same gate.
3. Real FullEnrich people enrichment, filling `people[]` instead of hand-written mock data.
4. Real Sillage account injection (block A), replacing at least one mocked account with a real one.

The final submission must show all three sponsors (Anthropic, FullEnrich, Sillage) live, not mocked. V1 is the skeleton, not the deliverable.

## Testing

No test runner in V1. Manually walk the full journey in a browser: list -> account -> person -> draft, on both a `GO` account and the `HUMAN` account. Check the browser console for errors. Confirm the `HUMAN` account's draft button stays disabled with a visible reason, and that other accounts produce a draft on click.
