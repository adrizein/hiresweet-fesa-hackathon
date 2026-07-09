---
name: craft-value-first-email
description: Draft a short, honest, value-first outreach email grounded in the observed signal and verified contact data. Use after enrichment when the account cleared the HubSpot guard and you have a verified email.
---

# Value-first outreach email

The goal is an email a rep is proud to send and a prospect actually replies to. Lead with what you observed and with value; ask for little.

## Preconditions (else don't draft an email)

- Account cleared the HubSpot guard (`hubspot-crm`): not a customer, not owned, contact not opted out.
- You have a **FullEnrich-verified** email for the chosen contact (`enrichment` skill).
- You have at least one real Sillage signal **id** to cite as the reason to reach out now.

## Write it

- **Under ~120 words.** Short beats thorough.
- **Open with the specific signal** — what changed, why now ("saw you're opening 4 backend roles this month", "congrats on the move to X"). This is the value/relevance; it proves you're not mass-mailing.
- **One honest offer**, low-commitment: how HireSweet helps this exact situation. You may use HireSweet's real proof points where they fit — 60-75% candidate response rate (vs ~20% cold), 1150+ placements, first profiles in ~5 days, ~3-week time-to-hire, 15% on success / €0 if no hire / 4-month guarantee. Never invent a number or claim a "pool size".
- **One clear, small ask** ("worth a 15-min call?" / "want two relevant profiles this week?").
- Plain text. A subject line + body.

## Hard rules

- Ground every claim in the observed facts and verified data only. No invented names, numbers, or companies.
- **No placeholders, no square brackets, no `{{merge}}` tokens, no TODO/TBD.** If you'd need a placeholder, you're missing a fact — go get it or drop the lead.
- **No candidate PII.** If you reference marketplace candidates at all, use an anonymized handle + headline only (e.g. "a senior backend engineer, 7 yrs, ex-scaleup") — never a name, email, or phone.
- Then run `gate-qa` before writing the proposal to `wake-review`.
