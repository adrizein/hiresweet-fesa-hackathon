# deploy/ — the local deploy toolkit (the only JS in the repo)

Run from a developer machine, never in production. These scripts provision and
update the hosted Managed Agents deployment; once deployed, the agent runs
entirely on Anthropic's side and none of this code stays up.

| File | Role |
|---|---|
| `config.js` | Shared: minimal `.env` loader, the Anthropic client, resource names, model/MCP-URL/schedule defaults, the kickoff message, skill discovery + content hashing, and the gitignored state lockfile (`.deploy-state.json`). No side effects on import. |
| `deploy.js` | `npm run deploy` — idempotent upsert of every resource in order: environment → vault + credentials → skills → memory stores → agent → cron deployment. `--dry-run` (`npm run deploy:dry`) prints the plan and mutates nothing. Writes resolved ids to the state lockfile. |
| `run-once.js` | `npm run run-once` — fires the deployment immediately (`deployments.run`) and prints the `platform.claude.com` session link. The agent then runs autonomously; nothing needs to stay open. |
| `inbox.js` | `npm run inbox` — reads the `wake-review` memory store via the API and renders each proposal + BLOCK for a human. The review surface; nothing is auto-sent. |

## How idempotency works

- Environment / vault / memory stores / agent / deployment are reused **by name**
  (see `NAMES` in `config.js`); re-running create-or-updates them.
- Credentials are matched by MCP URL (bearer) or secret name (env var) and skipped
  if present.
- Skills are tracked in `.deploy-state.json` by a content hash: an unchanged skill
  is skipped, a changed one gets a new version, a new one is created. The agent
  pins every skill to `latest`, so a new version is live on the next run.
- If you delete `.deploy-state.json`, deploy re-discovers resources by name but
  will create fresh skills (it can't match those by name) — harmless duplicates.

## If you touch this directory

- This is the ONLY place production behavior is expressed in code, and even here
  it's just provisioning — the agent's behavior is prompt text under `platform/`.
- Never log or persist secrets. `HUBSPOT_TOKEN` goes straight into a vault
  `environment_variable` credential and nowhere else; MCP keys become `static_bearer`
  credentials. The token never reaches the agent's view of the sandbox.
- SDK surface used (all `client.beta.*`, SDK 0.110.0): `environments`, `vaults` +
  `vaults.credentials`, `skills` + `skills.versions`, `memoryStores` +
  `memoryStores.memories`, `agents`, `deployments`. See the memory
  `managed-agents-platform-primitives` for the confirmed shapes.
