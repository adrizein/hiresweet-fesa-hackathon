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
| `SILLAGE_API_KEY` | Sillage goes live: real workspace detections + company/lead enrichment (base defaults to `https://api.getsillage.com/api/v2`) |
| `SILLAGE_SIGNALS_PATH` | The detections LIST route once the onboarding doc gives it; until then the live strategy reads `data/sillage/detections.json` (MCP export) |
| `FULLENRICH_API_KEY` | FullEnrich credits check goes live (`/account/credits` → `{balance}`); bulk enrichment TODO(Kubilay) in `src/backbone/clients/fullenrich.js` |
| `MANTIKS_API_KEY` | Second, independent hiring-signal source (job changes + job-board scans) — corroborates Sillage on the same company. REST base/path unconfirmed this session (no API docs available); set `MANTIKS_API_BASE`/`MANTIKS_SIGNALS_PATH` once known, fixtures until then |
| `GRADIUM_API_KEY` / `GRADIUM_VOICE_ID` | Text-to-voice-note for the client-expansion channel (`src/actions/40-gradium-voice-note.js`). Base/path unconfirmed this session (no API docs); falls back to a deterministic local placeholder |
| `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` | Dispatches an **approved** voice-note action for real via `node src/cli.js send <action-id>`: posts the script + audio link to Slack, a human forwards it to the client's WhatsApp. Never called by the pipeline itself |
| `WHATSAPP_API_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Parked: direct Meta WhatsApp Cloud API, not wired into `send` (Slack is). See "WhatsApp connector — what's missing" below |

State lives in `data/*.json` (gitignored) — open the files mid-demo to watch records appear.

**Live Sillage wiring** — confirmed V2 endpoints (probed with the workspace key): `GET /companies/{id}`,
`GET /leads/{id}`, `GET /agents`, `GET /watchlists`, `GET /persona` under `https://api.getsillage.com/api/v2`.
The `sillage:job-posting-keywords` strategy ingests real `jobPostingKeywordDetection` items (workspace agent
"Postes SALES ouverts"), groups them per account, dedupes postings, resolves company enrichment live, and
emits corroborable signals. To refresh the local detections dump before the list route is known, export via
the Sillage MCP (`list_signals`) into `data/sillage/detections.json` as
`{ exportedAt, detections: [...], companies: { "<id>": {...} } }`.

**`sillage:post-engagement`** (`src/signals/50-post-engagement.js`) — likes/comments on our tracked
accounts' own LinkedIn posts. Every interaction is checked through `src/backbone/companyVerification.js`
before it becomes a signal: it never trusts a LinkedIn headline (one tested candidate's headline named no
employer at all and turned out, once resolved through FullEnrich, to be a colleague of the person she
appeared to engage with from outside) and is fail-closed — an unresolved affiliation blocks the interaction
rather than assuming it's cross-company. Only a verified different-company interaction becomes a lead, named
after the *outside* party. Same mechanism is reusable by any future strategy that touches an interaction
between two people.

**`mantiks:hiring`** (`src/signals/40-mantiks-hiring.js`, `src/backbone/clients/mantiks.js`) — a second,
independent hiring-signal source (job changes + job-board scans). A company corroborated by both Mantiks
and Sillage is a stronger lead than either alone (see `10-corroborate`). Same fixtures-until-confirmed
discipline as Sillage's detections route: the key alone does not flip to full live mode, since the REST
base/path weren't available this session — see `MANTIKS_API_KEY` above.

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
- `20-value-first-email` — no warm path, cold prospect → email that leads with anonymized candidate profiles (value first); skips `existing_client` companies, since those get the dedicated channel below
- `30-followup-task` — draft CRM follow-up for every outreach that passed the gate
- `40-gradium-voice-note` — **client-expansion channel**: a hiring-type signal (`hiring_wave` / `job_posting_keyword` / `mantiks_job_posting`) on a company flagged `existing_client` becomes a short (~30s) Claude-drafted script, turned into audio by Gradium (`src/backbone/clients/gradium.js`), proposed as a voice-note draft (channel `slack` — see below for why). Gated on two checks a cold-outreach planner doesn't need: `existing-client-required` (never on a cold prospect) and `verified-phone` (never without a number on file to forward it to) — see `docs/gradium-voice-note-plan.md` for the full design.

Future activation modules (Gamma one-pagers, ...) are just more planners with their own
`kind`/`channel` — drop a file in `src/actions/`.

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
| `existing-client-required` | slack (voice-note) channel on a company not flagged `existing_client` — never cold outreach on this channel |
| `verified-phone` | slack (voice-note) channel without a phone number on file for the human to forward it to |

On the fixtures, the run produces 5 proposed actions (1 intro request, 1 value-first email,
2 follow-up tasks, 1 Gradium voice note to the existing client Kelmora) and visibly blocks
Astrelle (do-not-contact client) and Fluxline (protected partner) — the memorable moment of
the pitch, by construction.

### Human approval and dispatch (`approve` / `send`)

Every other planner is draft-only by construction: nothing leaves the store without a human
action. The Gradium voice note is the first channel with a real dispatch path, so it gets an
explicit two-step CLI flow instead of a silent side effect:

```sh
node src/cli.js approve act-voicenote-co-kelmora   # records the human decision (proposed -> approved)
node src/cli.js send act-voicenote-co-kelmora      # posts for real to Slack via src/backbone/clients/slack.js
```

`send` refuses anything not already `approved`, and only handles the `slack` channel. It posts the
script + audio link into a Slack channel (`SLACK_CHANNEL_ID`) with the contact's name and phone
number — **a human forwards it to the client's WhatsApp themselves**, which is why the Slack
message always states who to forward it to and on what number. The pipeline itself never calls
`slack.js` or `whatsapp.js` — only these two explicit, human-triggered commands do.

Delivery is Slack rather than a direct WhatsApp send because Slack needs no extra business
onboarding — the connector is `chat.postMessage` with a bot token. `src/backbone/clients/whatsapp.js`
is kept, parked, for the direct path once the gaps below are resolved.

#### WhatsApp connector — what's missing before a direct send can go live

- **Meta Business setup**: a Meta Business App + a verified WhatsApp Business Account + a
  registered sender phone number → gives `WHATSAPP_PHONE_NUMBER_ID` and a system-user access
  token (`WHATSAPP_API_TOKEN`). None of this exists yet for HireSweet in this session.
- **Reachable audio**: Gradium's fixtures mode returns a `fixtures://...` placeholder URL, which
  Meta's servers cannot fetch. Live mode needs Gradium to return a real, publicly-fetchable
  audio URL (or the client needs to upload raw bytes instead of a link) before a direct send can
  work end to end.
- **24h session / template question (unverified)**: WhatsApp normally requires a pre-approved
  message *template* for a business-initiated message outside an open 24h customer-service
  window, and it's unconfirmed whether a template can carry freeform audio the way an in-session
  message can. This needs checking against Meta's current docs before a real send, not assumed.
- **Recipient consent**: the existing client must have opted in to WhatsApp contact — not
  modeled anywhere in the store yet (no `whatsapp_opt_in` flag). Add one before wiring this to
  real client phone numbers, direct or via the current Slack hand-off.

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
