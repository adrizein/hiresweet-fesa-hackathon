---
name: enrichment
description: Get a verified work email/phone for a chosen contact via FullEnrich MCP, economically — check credits, cap spend, and enrich only contacts you actually intend to reach. Use after routing, before crafting an email.
---

# Contact enrichment (FullEnrich MCP)

FullEnrich returns verified emails and phones. Credits cost money, so be economical: enrich **only** a contact you have already chosen to act on, and only after the HubSpot guard cleared the account.

## Budget first

- Check the balance before a batch (`get_credits`). Note it in your reasoning.
- **Cap spend to ~5 enrichments per run.** If more leads qualify, take the highest-conviction first (most corroborated signals, clearest persona fit) and leave the rest for the next run.
- Never enrich a contact on an account the HubSpot guard blocked, or a do-not-contact — that's a wasted credit.

## Enrich the chosen contact

- `search_people` — find the exact person (name + company/domain) if you only have a name from Sillage.
- `enrich_search_contact` / `enrich_bulk` — start enrichment for the chosen contact(s). Enrichment is **asynchronous**.
- `get_enrichment_results` — poll for the result; when status is "running", wait a moment before polling again.

## Use the result

- You need a **verified** email for an email activation. If the result is unverified or empty, do **not** email that contact — either pick another stakeholder and enrich them, or downgrade the activation to a follow-up task, or block the lead. The `gate-qa` checklist enforces this.
- Capture the verified email (and phone if present) and the fact that it's FullEnrich-verified — you'll cite that in the proposal.
- Never invent or guess an email. No verified email, no email draft.
