# platform/skills/ — the strategies, as Skills

Each subdirectory is a **Skill**: a `SKILL.md` (plain markdown, YAML frontmatter
with `name` + `description`) that the hosted agent loads on demand when relevant.
This is the "update strategies by editing txt prompts" layer — a non-engineer can
edit a skill and `npm run deploy` pushes it.

| Skill | Job |
|---|---|
| `hubspot-crm` | Read-only HubSpot lookups via `curl`/`jq` — is this company already a customer / owned, is this contact opted out. The guardrail's data source. |
| `signal-hiring-wave` | Find + qualify a company opening several tech/sales roles at once (Sillage MCP). |
| `signal-champion-move` | Find + qualify a tracked champion landing at a new company (Sillage MCP). |
| `signal-job-postings` | Find + qualify job-posting keyword detections — concrete named open roles (Sillage MCP). |
| `enrichment` | Get a verified email/phone via FullEnrich MCP, credit-budgeted. |
| `craft-value-first-email` | Draft a short, honest, signal-led outreach email. |
| `craft-followup-task` | Draft a CRM follow-up task when an email isn't the right move. |
| `gate-qa` | The fail-closed checklist every draft must pass; writes a visible BLOCK on failure. |

## Adding or changing a strategy

- New strategy = new `platform/skills/<name>/SKILL.md`, then `npm run deploy`. The
  deploy discovers it, uploads it, and attaches it to the agent.
- Frontmatter `name` should match the directory. The `description` is what the
  agent uses to decide when the skill is relevant — make it specific ("Use when…").
- Skills are versioned: editing a `SKILL.md` and re-deploying mints a new version;
  the agent (pinned `latest`) picks it up next scheduled run. Max 20 skills/agent.
- Keep each skill focused on one concern. Cross-reference behavior lives in the
  system prompt (the six-step flow) — skills fill in the "how".

## Conventions

- Read-only against Sillage and HubSpot — never instruct a mutating call.
- Never print or persist `$HUBSPOT_TOKEN`. No real prospect data hard-coded here
  (this repo is public) — skills describe *how* to fetch data live, they don't
  contain it.
- Ground everything in observed/verified facts: no placeholders, no invented
  numbers, no candidate PII (anonymized handle + headline only).
