---
name: signal-champion-move
description: Detect a champion move — someone HireSweet already has a relationship with landing at a new company — from Sillage signals. Use during triage; a champion plus a hiring wave on the same account is the warmest lead there is.
---

# Champion-move signal

A champion move is a person the workspace tracks as a **champion** (a past relationship, an advocate) changing jobs and landing somewhere new. It's warm by construction: there's already trust to trade on, so outreach converts far better than cold.

## Find it (Sillage MCP, read-only)

- `sillage_v2_list_signals` — look for job-change / people-move signal types on tracked stakeholders.
- `sillage_v2_get_lead` — the person behind the signal: their new company, role, and stakeholder classification (champion / decision_maker / influencer).
- `sillage_v2_get_company` / `sillage_v2_enrich_company` — the new company's size, stage, domain.
- `sillage_v2_list_watchlists` / `sillage_v2_list_watchlist_entities` / `sillage_v2_get_persona` — confirm the person is a real tracked champion and the new account fits the ICP.

## Qualify

Conviction is higher when:
- The mover is genuinely classified **champion** (or decision_maker), not a random contact.
- Their **new company fits the persona** (builds a tech/AI product, likely to hire).
- The move is recent, and ideally the new company **also shows a hiring wave** — a champion who just landed somewhere that's scaling is the single strongest lead the agent can produce. Call that convergence out explicitly.

Skip: a mover who isn't a real champion, or who landed at a company that fails the persona (agency / ESN / recruitment competitor / not hiring).

## Hand off

Capture the champion's name + new company + **domain**, the move evidence, and the signal **ids**. Run the HubSpot guard (`hubspot-crm`) on the new company. The route is usually the champion themselves (or, through them, the hiring decision maker). The angle is the relationship: *"congrats on the new role — last time we worked together we did X; now that you're scaling the team at Y, here's how we can help."* Keep it honest — only claim shared history that is real.
