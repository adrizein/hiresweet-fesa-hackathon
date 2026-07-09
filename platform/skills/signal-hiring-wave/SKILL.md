---
name: signal-hiring-wave
description: Detect and qualify a hiring wave — a company opening several tech or sales roles at once — from Sillage signals. Use during triage to find accounts scaling their team, HireSweet's strongest buying trigger.
---

# Hiring-wave signal

A hiring wave is a company opening **several** engineering / product / sales roles in a short window. For a tech-recruitment marketplace this is the strongest buying trigger: they need to hire fast, and quality matters more than CV volume.

## Find it (Sillage MCP, read-only)

- `sillage_v2_list_signals` — pull recent signals; look for job-update / job-posting / hiring signal types clustered on one company.
- `sillage_v2_get_signal` — expand a promising signal for its evidence and dates.
- `sillage_v2_get_company` / `sillage_v2_enrich_company` — company size, stage, location, domain (you need the **domain** for the HubSpot guard and the FullEnrich lookup).
- `sillage_v2_get_persona` — the workspace's ICP, to sanity-check fit.

## Qualify (what makes it worth acting on)

Conviction is higher when:
- **Several roles**, not one — 3+ open tech/sales roles, or a burst within ~2 weeks.
- Roles are **tech/product/sales** (backend, data/ML, fullstack, AE/SDR), the profiles HireSweet places.
- The company matches the persona: builds a software/AI product (not an agency, ESN, or a recruitment firm — that's a competitor), needs rare profiles fast, France-relevant.
- It **corroborates** another signal on the same account (a champion move, a funding round, competitor engagement). Convergence beats one loud signal — say so in your proposal.

Skip: a single stale posting, a backfill, a non-tech role, or a company that fails the persona.

## Hand off

Once qualified, capture: company name + **domain**, the specific roles observed, the evidence, and the signal **ids** (you must cite these later). Then run the HubSpot guard (`hubspot-crm`), route to the best stakeholder, and enrich. The value-first angle for this signal is *"we saw you're opening N roles in X — here's how we'd help you fill them fast."*
