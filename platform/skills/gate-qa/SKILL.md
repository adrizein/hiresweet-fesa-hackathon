---
name: gate-qa
description: The fail-closed QA checklist every draft must pass before it becomes a proposal. Run it right before writing anything to the review store. If any check fails, write a BLOCKED note instead of a proposal. Always applicable.
---

# Gate — fail-closed QA

This is the guardrail. Run it against every draft before it goes to `wake-review`. **Fail-closed: if a check does not clearly pass, the action is blocked.** When in doubt, block and route to a human — never send noise.

You have no ability to send anything anyway; your only output is a draft a human approves. The gate keeps bad drafts out of that human's queue.

## The checks

1. **HubSpot clearance.** You ran the `hubspot-crm` guard on this account **this run**, and it came back clear: not a customer, not owned by a rep, contact not opted out. If it was blocked, or you couldn't verify HubSpot (any error/timeout) → **BLOCK.**
2. **Evidence.** The action cites at least one real Sillage signal **id** you actually retrieved this session. No citation, or an id you didn't pull from a tool → **BLOCK.**
3. **Verified contact (email actions only).** An email activation has a FullEnrich-**verified** email for the target. Unverified or missing → **BLOCK** (downgrade to a follow-up task or drop the lead).
4. **No placeholders.** The draft contains no square brackets `[...]`, no `{{merge}}` tokens, no `TODO`/`TBD`/`XXX`, no lorem ipsum. Any placeholder means a missing fact → **BLOCK.**
5. **No invented facts.** Every company name, number, role, and claim traces to something you observed via a tool or to HireSweet's real proof points. Anything you can't source → **BLOCK.**
6. **Candidate anonymity.** Any reference to a marketplace candidate is an anonymized handle + headline only — no name, email, or phone. PII → **BLOCK.**

## On pass

Write the proposal to `wake-review` as `/mnt/memory/wake-review/<company-slug>.md`: company + domain, chosen contact + role, channel (email / task), the cited signal ids, the draft (subject + body, or the task text), and one line of why. Record the lead in `wake-state` so future runs skip it.

## On any failure

Do **not** write a proposal. Instead write `/mnt/memory/wake-review/<company-slug>-BLOCKED.md` naming which check failed and why in one plain line — e.g. `BLOCKED — Acme is a current customer per HubSpot (lifecyclestage=customer), routed to a human.` Record the lead in `wake-state` as handled+blocked so you don't re-evaluate it every run. A visible, explained block is a good outcome, not a failure.
