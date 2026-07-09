# Data contract, block A <-> blocks B+C

> This file is meant to be copied into the submission repo as-is, alongside `data/`. Public-safe: no real names, no real PII, no secrets.

This is THE contract between block A (account sourcing, Sillage) and blocks B+C (activation UI: org chart, brief, draft). Whoever fills a field owns its correctness; nobody else edits it without the owner's sign-off.

## `accounts.json`

An array of Account objects.

### Fields block A fills (sourcing, verdict)

- `id`, `name`, `domain`, `url`, `size`, `location`, `stage`, plain account identity fields.
- `signals[]`, array of `{ type, detail, detected_at, source }`. One entry per detected buying signal (funding round, hiring wave, new CTO, new talent lead, champion move, etc).
- `verdict`, `{ tier, why }`. `tier` is one of `GO`, `EXPLORE`, `SKIP`, `HUMAN`. `why` is the one-line reason shown in the accounts list and in the account banner.

### Fields blocks B+C fill (activation)

- `investors[]`, array of `{ name, type, round, is_client_portfolio, note }`. One entry per known investor. `is_client_portfolio` (bool) flags a fund that is also invested in one of our active clients, the strongest kind of warm path.
- `connections[]`, array of `{ entity, kind, relation, strength, detail }`. `kind` is one of `fund`, `client`, `person`, `community`. `strength` is one of `forte`, `moyenne`, `faible`. Any known relationship path into the account that is not already covered by `investors[]`.
- `people[]`, array of `{ name, role, email, phone, linkedin_url, highlighted, contact_status, pitch, brief, draft }`.
  - `highlighted` (bool): this person is the right entry point for THIS signal, not a general seniority ranking.
  - `contact_status`: one of `never`, `contacted`, `client`.
  - `pitch`: one call-ready sentence: the company, the person, why I am calling.
  - `brief`: `{ why, limits, angle, social_proof[] }`. Why this person, the limits of the approach, the angle to use, and a list of named, traceable social proof points.
  - `draft`: string, or `null`.

### Semantics that must hold

- `draft` MUST be `null` on every person of any account whose `verdict.tier` is not `GO`. The gate is enforced in the data itself, not only in the UI: never hand-write a non-null draft on an `EXPLORE`, `SKIP`, or `HUMAN` account.
- `HUMAN` means a human must arbitrate before any outreach (protected account, open deal, ambiguous signal). The UI blocks drafting on it; the data must never contradict that by carrying a draft.

## `integrations.json`

An array of `{ id, name, category, status, description, detail? }`. `status` is `connected` or `available`. Fully mocked in V1: the UI toggle only writes to `localStorage`, there is no real OAuth flow behind it. HubSpot shows as `connected` because a server-side token exists in `app/.env`; that token is never exposed to the front, the mocked status is just illustrative.

## Content rules for any new mocked account

Copied from the outreach copy kill-list, summarized for this dataset:

- No empty compliments, no generic market lessons directed at the prospect.
- Every social proof entry must be traceable to a named source level (a category of deal, a fund, a client relationship), never a vague claim.
- No candidate-pool volume numbers of any kind.
- Never lead an opening line with the success-fee pricing model.
- Max 150 words per `draft`.
- If `contact_status` is `contacted`, the `draft` must honestly reference the past exchange, never contradict it.
- Never name an ex-candidate to their employer.
- Never name a competitor of the prospect in a draft.

## Public-safe rule

Every company name, person name, and fund name in this file must be fictional and checked against real companies and real people before it is committed. No real PII, no API keys, ever, in this file or any file in `data/`.
