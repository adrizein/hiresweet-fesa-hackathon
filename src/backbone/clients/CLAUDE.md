# src/backbone/clients/ — Sillage & FullEnrich REST seams

One client per sponsor data tool. Every processor/signal talks to these, never
to `fetch()` directly — that's the seam that lets the whole pipeline run
offline on fixtures when a key is missing.

Both clients expose `mode: 'live' | 'fixtures'` (true when their API key env
var is set) so `cli.js`/`platform/run.js` can print it in the startup banner.

## `sillage.js`

Two feeds behind one client:
- `fetchSignals(type)` — the committed demo fixtures (`fixtures/sillage/signals.json`), fictional accounts carrying the guardrail story (do-not-contact, protected). Always available, powers `src/signals/10-hiring-wave.js` and `20-champion-move.js`.
- `fetchDetections()` — LIVE workspace detections from the real Sillage V2 API. Confirmed routes (probed with the workspace key): `GET /companies/{id}`, `GET /leads/{id}`, `GET /agents`, `GET /persona`. The detections LIST route path isn't published — set `SILLAGE_SIGNALS_PATH` once known; until then it falls back to `data/sillage/detections.json`, a dump exported through the Sillage MCP (`list_signals`). Powers `src/signals/30-job-posting-keywords.js`.
- `fetchCompany(id)` — live REST → local dump → placeholder object, in that order. Cached in-process.
- `fetchLead(id)` — live REST only (`GET /leads/{id}`), returns `null` if unreachable or not live.

Base URL: `SILLAGE_API_BASE`, defaults to `https://api.getsillage.com/api/v2`.

## `fullenrich.js`

- `getCredits()` — wired for live use: `GET /account/credits` → `{ balance }`. Returns a fixture value (`5000`) when not live.
- `enrichPerson(person)` — **still fixture-backed even in live mode.** Reads `fixtures/fullenrich/enrichments.json` keyed by person id. The real async bulk flow (`POST /contact/enrich/bulk` to start, poll to completion) is a TODO — if you pick this up, keep the same return shape: `{ email, emailStatus, phone, source }` or `null`.

Base URL: `https://app.fullenrich.com/api/v2`, `Authorization: Bearer <key>`.

## If you touch these

- Never let a missing key throw — `live` must gate every network call, with a fixture/dump fallback underneath. That's what keeps `npm start` runnable with zero configuration.
- Any new confirmed endpoint: update the comment header in the relevant file (it's the source of truth for what's actually been verified against the live API, separate from the sponsor docs).
