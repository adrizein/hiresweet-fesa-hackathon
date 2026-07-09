# platform/ — the hosted agent's brain (prompt text, no code)

Everything here is prompt text that runs on Claude Managed Agents. No JS. Editing
these files and re-running `npm run deploy` is how you change what the agent does.

| Path | Role |
|---|---|
| `system-prompt.md` | The agent's top-level doctrine — thin on purpose. Who it is, the six-step flow (triage → guard → route → enrich → craft → propose), the two memory stores, "read-only Sillage/HubSpot", "no send capability, only write drafts to wake-review". Deployed as the agent's `system`. |
| `skills/*/SKILL.md` | The strategies — one skill per concern, loaded on demand. This is where the specifics live so they're independently editable. See `skills/CLAUDE.md`. |

## How it maps to the deployment

`deploy/deploy.js` reads `system-prompt.md` as the agent's system prompt and
uploads each `skills/<name>/` as a versioned Skill attached to the agent (pinned
`latest`). The agent also gets the built-in agent toolset (bash/curl/file/web)
and the Sillage + FullEnrich MCP servers. No custom tools — that's deliberate
(custom tools would force a host-side process; see `docs/CLAUDE-PLATFORM.md`).

## If you touch this directory

- Keep the system prompt thin; push specifics into a skill so they can be tuned
  without touching the spine.
- The system prompt and the `gate-qa` skill together are the guardrail. Changing
  either changes what the agent will refuse — review carefully.
- After editing, `npm run deploy` (or `npm run deploy:dry` first). Only changed
  files re-upload; the next scheduled run uses them.
