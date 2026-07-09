---
name: signal-job-postings
description: Detect and qualify job-posting keyword signals from Sillage — specific open roles (e.g. sales/tech positions) matched on tracked accounts. Use during triage to spot a concrete, current hiring need on a named company.
---

# Job-posting keyword signal

A job-posting keyword signal is one detection = one (posting, keyword) hit on a tracked account — a concrete, current open role rather than a vague "they might be hiring". These are precise and demoable: a real posting you can name.

## Find it (Sillage MCP, read-only)

- `sillage_v2_list_signals` — pull job-posting / keyword-detection signal types.
- `sillage_v2_get_signal` — the posting detail: title, keyword matched, date.
- `sillage_v2_get_company` — resolve the company and its **domain**.
- `sillage_v2_get_signal_playbook` — if present, the workspace's guidance for acting on this signal type.

## Qualify

- **Group postings per company.** Several postings on one account is a hiring wave — treat it as the stronger `signal-hiring-wave` case and cite all the ids.
- Keep only **tech/product/sales** roles (the profiles HireSweet places). Drop ops/finance/non-target roles.
- Dedupe: the same role detected twice is one opportunity, not two.
- Confirm persona fit (`sillage_v2_get_persona`) — a software/AI product company that hires rare profiles, not an agency/ESN/recruitment competitor.

Skip: a single non-target posting, a stale detection, or a company that fails the persona.

## Hand off

Capture the company + **domain**, the specific role title(s), the evidence, and the signal **ids**. Run the HubSpot guard (`hubspot-crm`), route to the hiring stakeholder, enrich. The angle is the named role: *"saw you're hiring a <role> — that's exactly the profile we place; here's how we'd move on it."* Only name roles that actually appear in the detections.
