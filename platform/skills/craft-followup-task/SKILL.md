---
name: craft-followup-task
description: Draft a CRM follow-up task for a lead — a reminder for the rep to nurture an outreach or to work a promising account you couldn't email yet. Use as the activation when there's no verified email, or as a nudge attached to a proposed email.
---

# Follow-up task

Not every qualified lead ends in an email this run. A follow-up task is the right activation when the account cleared the HubSpot guard and is worth pursuing, but you can't send a good email yet (no verified email, only a decision-maker you shouldn't cold-email directly, or a contact already in a thread per HubSpot's `notes_last_contacted`).

This is still **draft only** — a task written to `wake-review` for a human to act on. You never write to HubSpot.

## Write it

- **One concrete next step**, not a vague "follow up". Name who, what, and when:
  - *"Reconnect with Jane Doe (Head of Talent, Acme) about their 4 open backend roles — she was contacted 3 weeks ago per HubSpot, so relaunch on the existing thread rather than cold."*
  - *"Work Acme (hiring wave: 4 backend + 2 AE roles). No verified email found for the hiring lead yet — find the right stakeholder before reaching out."*
- Cite the signal **id(s)** that justify it.
- Suggest a sensible horizon (e.g. "in 3 business days" / "this week").

## Hard rules

- Grounded only in observed facts. No invented names/numbers, no placeholders, no square brackets, no candidate PII.
- Run `gate-qa` before writing the proposal to `wake-review`.
