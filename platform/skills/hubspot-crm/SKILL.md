---
name: hubspot-crm
description: Read-only HubSpot CRM lookups via curl/jq — check whether a company is already a customer or owned, and whether a contact has opted out or been contacted before. Use before pursuing any account and before drafting to any contact.
---

# HubSpot CRM lookups (read-only)

HubSpot is HireSweet's CRM and the source of truth for "is this account already ours". You reach it directly with `curl` in Bash. The private-app token is injected into your outbound request as `$HUBSPOT_TOKEN` — **use it only in the `Authorization` header of calls to `api.hubapi.com`, and never print it, echo it, or write it to a file or to memory.**

**Read-only. Never POST/PATCH/DELETE to create or change HubSpot data** — only the search endpoints below, which read.

Property names below are confirmed against this portal (companies: `name`, `domain`, `hubspot_owner_id`, `lifecyclestage`; contacts: `email`, `hubspot_owner_id`, `lifecyclestage`, `hs_email_optout`, `notes_last_contacted`).

## Is this company already ours? (search by domain)

```bash
curl -s --max-time 20 -X POST "https://api.hubapi.com/crm/v3/objects/companies/search" \
  -H "Authorization: Bearer $HUBSPOT_TOKEN" -H "Content-Type: application/json" \
  -d '{"filterGroups":[{"filters":[{"propertyName":"domain","operator":"EQ","value":"acme.com"}]}],
       "properties":["name","domain","hubspot_owner_id","lifecyclestage"],"limit":1}' \
| jq '.results[0].properties // "not-in-hubspot"'
```

Normalize the domain first: strip `https://`, `www.`, any path — lowercase (`https://www.Acme.com/careers` → `acme.com`).

Interpret:
- `not-in-hubspot` (no result) → a genuine new prospect. Fine to pursue.
- `hubspot_owner_id` set → **already owned by a rep. Do not contact — BLOCK** (route to that human).
- `lifecyclestage` in `customer`, `opportunity` (or your portal's paying/deal stages) → **already a customer/deal. BLOCK.**
- Otherwise (`lead`, `subscriber`, empty) → clear to pursue.

## Has this contact opted out / been contacted? (search by email)

```bash
curl -s --max-time 20 -X POST "https://api.hubapi.com/crm/v3/objects/contacts/search" \
  -H "Authorization: Bearer $HUBSPOT_TOKEN" -H "Content-Type: application/json" \
  -d '{"filterGroups":[{"filters":[{"propertyName":"email","operator":"EQ","value":"jane@acme.com"}]}],
       "properties":["email","hubspot_owner_id","lifecyclestage","hs_email_optout","notes_last_contacted"],"limit":1}' \
| jq '.results[0].properties // "not-in-hubspot"'
```

Interpret:
- `hs_email_optout` is `true` → **hard block. Never email an opted-out contact.**
- `hubspot_owner_id` set → owned by a rep → **BLOCK**, route to that human.
- `notes_last_contacted` recent → advisory only: reference the existing thread rather than opening cold. Not a hard block.
- `not-in-hubspot` → new contact, fine to pursue (still enrich + gate as usual).

## On any HubSpot error

If a call fails (non-200, timeout, empty body that isn't a clean "no result"), you **cannot confirm the account is safe** — treat it as a block, not a green light. Write a BLOCKED note to `wake-review` saying HubSpot could not be verified, and move on. Never assume "no result found" when the call actually errored.
