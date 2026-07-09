# Backend, Account Intelligence Tool

Express server that stores the accounts, exposes the data contract to the front, and wraps the external tools (FullEnrich, Claude, HubSpot, Sillage) behind a tiny API. Built to be collision-free with the front: nobody else writes in `server/`, and the front only touches the API through the contract below.

## Quickstart

```bash
cd server
npm install
npm start          # http://localhost:3000 (PORT in .env to change)
npm test           # node:test, no network, no real data touched
```

Secrets live in the repo-root `.env` (see `.env.example`, never committed). The server loads it at boot. **Every connector works without keys**: it falls back to a deterministic mock tagged `"source": "mock"`, so the whole flow is demoable offline. Add a key in `.env` and the same endpoint goes real, no code change.

## The data contract

One source of truth: an account is shaped exactly like the entries of `fixtures/accounts.example.json` (documented field by field in `docs/FRONT-BRIEF.md`). Persistence is `data/accounts.json` (gitignored), seeded from the fixture on first run.

```
{ id, name, domain, url, size, location, stage,
  signals: [{ type, detail, detected_at, source }],
  verdict: { tier: "GO|EXPLORE|SKIP|HUMAN", why },
  people: [{ name, role, email, phone, linkedin_url, highlighted, contact_status: "never|contacted|client",
             brief: { why, limits, angle, social_proof[] } }] }
```

Required to be accepted: `id`, `name`, `verdict.tier` (one of the 4 tiers), `verdict.why`. Everything else is optional and type-checked. Unknown extra fields are allowed (additive contract).

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | `{ ok, connectors: { sillage, fullenrich, hubspot, claude } }` (true = real key present) |
| GET | `/api/accounts` | The full account list (same schema as the fixture). The front swaps its fixture fetch for this URL. |
| GET | `/api/accounts/:id` | One account, 404 if unknown. |
| POST | `/api/leads` | Input point for Bloc A. Body = one account or an array. Valid entries are upserted, invalid ones reported. |
| POST | `/api/enrich/:accountId` | FullEnrich. Body `{ "person": "Name" }` for one person, empty body = everyone missing an email. |
| POST | `/api/draft` | Body `{ "account_id": "...", "person": "Name" }`. Runs the gate first, then drafts with Claude. |
| POST | `/api/agents/sync` | Bridge with the agent backbone (`src/`). Body `{ "direction": "push" \| "pull" \| "both" }` (default both). Push feeds app accounts into the agent's power map (HUMAN tier becomes the `protected` flag, client contacts become `do_not_contact`), pull surfaces agent-found companies and scored leads as accounts in the app. |

### POST /api/leads (for Bloc A: push accounts, never open app.js)

```bash
curl -X POST http://localhost:3000/api/leads \
  -H 'Content-Type: application/json' \
  -d '[{
    "id": "acct_example",
    "name": "Example Co",
    "domain": "example.dev",
    "verdict": { "tier": "GO", "why": "hiring wave + fit, contact the CTO" },
    "signals": [{ "type": "hiring_wave", "detail": "3 engineering roles open this month", "source": "sillage" }]
  }]'
```

Response: `{ "accepted": 1, "created": 1, "updated": 0, "rejected": [] }`. Rejected entries come back with their index and the exact validation errors, nothing is silently dropped.

Upsert rules: match by `id`, then by `domain`. A re-push **without** `people` keeps the existing enriched `people` (Bloc A refreshes never wipe Bloc B's work).

### POST /api/draft (the gate is the point)

The gate runs before any drafting and is fail-closed:

- `verdict.tier` HUMAN or SKIP: blocked.
- person `contact_status: "client"`: blocked, route to the account owner.
- person `contact_status: "contacted"`: allowed, but in `followup` mode (reply on the existing thread, never re-cold).
- anything malformed: blocked.

A blocked draft is a 200 with `{ "blocked": true, "reason": "..." }` so the front renders the refusal (that is the demo's guard moment, e.g. Corvex Systems).

## Layout

```
server/
  index.js            Express app (createApp exported for tests) + static app/ + /fixtures
  routes/api.js       the endpoints above
  lib/env.js          .env loader (no dependency)
  lib/store.js        data/accounts.json persistence, seeding, upsert
  lib/validate.js     contract validation + normalization
  lib/gate.js         fail-closed guard (criteria/lead-criteria.md section 3 and 7)
  connectors/         fullenrich.js, claude.js, hubspot.js (read-only), sillage.js
  test/               node:test suites (unit + integration), all offline
```

## Integration order (from the handoff)

1. This server as the proxy: keys stay server-side, the front never sees them. Done.
2. Real Claude draft behind the gate: add `ANTHROPIC_API_KEY` to `.env`.
3. Real FullEnrich: add `FULLENRICH_API_KEY` (bulk API is async, the connector polls).
4. Real Sillage: needs `SILLAGE_API_KEY` + `SILLAGE_API_BASE` from the onboarding; until then Bloc A pushes through `POST /api/leads`.
