---
name: signal-to-draft
description: Run one end-to-end pass of the acquisition pipeline using only MCP calls (no code) — pull Sillage signals, cluster them by account, pick the buyer persona, enrich a verified work email with FullEnrich, and produce a draft outreach email with a full pipeline trace and guardrail notes. Use when the user asks for a manual signal→enrich→draft run, a pipeline dry run, or fresh demo material.
---

# Signal → Enrich → Draft (single manual pass)

Run the whole acquisition chain yourself through MCP tools. No code, no server.
The deliverable is: a pipeline trace, one verified contact, one draft email, and
explicit guardrail notes. **Never send anything — draft-only, always.**

If the user names a target account or persona in the arguments, honor it;
otherwise pick the account with the strongest corroborated signal cluster.

## Step 0 — Load every MCP tool in ONE ToolSearch call

Batch all of these in a single `select:` query (one call, comma-separated):

- `mcp__sillage__sillage_v2_get_setup_state`
- `mcp__sillage__sillage_v2_list_signals`
- `mcp__sillage__sillage_v2_get_signal`
- `mcp__sillage__sillage_v2_get_lead`
- `mcp__sillage__sillage_v2_get_company`
- `mcp__fullenrich__get_credits`
- `mcp__fullenrich__search_people`
- `mcp__fullenrich__enrich_search_contact`
- `mcp__fullenrich__get_enrichment_results`

## Step 1 — Workspace state + credit budget (parallel)

Call `sillage_v2_get_setup_state` and `fullenrich get_credits` **in parallel**.

- Record the starting credit balance — you will report exact consumption at the end.
- If `checklist.accounts` is blocked, there is **no top-account list and no power
  map**, so the do-not-contact check cannot run. Do not silently skip it: flag it
  in the final guardrail notes as a fail-closed gap the real engine must enforce.

## Step 2 — Pull signals and cluster by account

Call `sillage_v2_list_signals` (page_size 25 is enough for one pass).

- Group detections by `company_id`. Count signal occurrences, distinct keywords,
  and the date span. Many signals on one account within a few weeks = a
  corroborated wave, which is a much stronger story than any single detection.
- Prefer the account with the densest cluster. Summarize the cluster in one
  sentence (e.g. "24 job-posting detections, all sales/GTM keywords, June 18–30").
- If a detection carries a non-null `lead_id`, fetch it with `sillage_v2_get_lead`
  — that person is already tied to the signal and may short-circuit Step 4.

## Step 3 — Company context

Call `sillage_v2_get_company` with the chosen `company_id`. You need: name,
domain, size, industry, HQ city, and the activity summary (feeds the draft).

## Step 4 — Pick the buyer and find them with FullEnrich

Decide the persona from the signal type, not from habit:

- Hiring wave → the talent/recruiting lead who owns those specific roles
  (e.g. sales hiring wave → "Lead Talent - Business & GTM", not a generic CHRO).
- Funding, champion move, competitor engagement → the relevant revenue leader.

Call `fullenrich search_people` with `current_company_names` (exact_match) plus
title filters like `[{"value": "Talent"}, {"value": "Recruiting"}, {"value": "People"}]`,
limit 10.

**Known gotcha:** the response is often too large for context and gets saved to
a file. Read it with jq, never raw:

```
jq -r '.people[] | [.id, .full_name, .employment.current.title,
  .employment.current.seniority, .location.city] | @tsv' "$FILE"
```

Pick the person whose title maps most tightly onto the signal. Pull their work
history too (`.employment.all`) — past companies are personalization gold.
Skip candidates with truncated/anonymized names (e.g. "Ursula P.") — the data
is unreliable.

## Step 5 — Enrich one contact (async)

1. State the credit cost before launching: **1 email enrichment ≈ 1 credit**.
2. Call `enrich_search_contact` with `person_ids` (exact_match on the id from
   Step 4), `fields: ["contact.work_emails"]`, `limit: 1`.
3. This is async and typically takes **30–120 seconds**. Poll
   `get_enrichment_results` with the returned `enrichment_id`. Wait between
   polls with a background `sleep` (foreground sleep is blocked in this
   harness), then poll again on the completion notification.
4. Only accept an email whose status is `DELIVERABLE`. If the best result is
   `CATCH_ALL`, `UNKNOWN`, or missing, say so and stop at a "no-send" verdict —
   that is the gate doing its job, not a failure of the pass.

## Step 6 — Draft the email (Claude is the brain)

Rules for the draft:

- **Language of the target**: French person in France + French job postings →
  write in French. Keep your commentary to the user in English.
- **Every claim traceable**: only cite facts present in the signal data
  (role titles, cities, dates) or the enriched profile (past companies, team).
  Nothing invented, no fake urgency, no real client names.
- Short (< 150 words), value-first, one honest CTA, and an easy out
  ("if the timing is wrong, tell me").
- Personalize with the target's own history (e.g. "you lived this at PayFit
  and Mirakl") — that is the line that earns the reply.

## Step 7 — Report

End with, in this order:

1. **Pipeline trace** — signal cluster → company → chosen target → verified
   email, with the exact credit cost (re-check `get_credits` and diff).
2. **The draft email**, clearly marked as draft-only.
3. **Guardrail notes** — what was checked (email deliverability, claim
   traceability, draft-only) and what could not be checked (e.g. no power map
   → no do-not-contact filter), stated fail-closed.

Do not write any files or code during this pass unless the user asks — the
whole point is proving the chain works through raw MCP orchestration.
