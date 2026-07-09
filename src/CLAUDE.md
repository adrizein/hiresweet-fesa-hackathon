# src/ — the Wake backbone

All backbone code. Two entry points, two run modes, one store, one gate:

| Entry point | Run mode | What it drives |
|---|---|---|
| `cli.js` | `npm start` / `npm run inbox` / `npm run status` / `npm run reset` | Local, deterministic: runs `signals/` → `processing/` → `actions/` in-process. |
| `platform/run.js` | `npm run platform:run` | Hosted: tiers 1-2 run locally as above, but tier 3 (route/enrich/craft) is handed to a Claude Managed Agent session. |

## Layout

```
backbone/    pipeline, store, registry, gate, llm, env, tool clients — shared engine, changes rarely
signals/     tier 1 strategies — collect(ctx) → { companies, people, signals }
processing/  tier 2 processors — process(ctx), numeric prefix = execution order
actions/     tier 3 planners  — plan(ctx) → [action] (local run mode only)
platform/    Claude Managed Agents variant of tier 3 — setup, session runtime, host tools
cli.js       local entry point
```

Each directory has its own `CLAUDE.md`. Read it before editing files in it.

## The contract that ties it together

`ctx` (built once in `cli.js` / `platform/run.js`) is passed to every strategy:
`store`, `clients.sillage`, `clients.fullenrich`, `llm`, `config`, `log`. A
strategy is a plain file, default-exporting `{ name, description, <method> }`,
auto-discovered by `backbone/registry.js` — dropping a file in `signals/`,
`processing/` or `actions/` is the entire integration step, no registration
needed elsewhere.

Both run modes converge on the same two invariants:
- **Planners propose, the gate disposes.** Every action — whether drafted by a
  local planner or proposed by the hosted agent's `propose_action` tool —
  passes `backbone/gate.js` before it can reach the inbox. Fail-closed: a
  crashing or inapplicable check blocks the action, it never lets it through.
- **Nothing is ever sent automatically.** The inbox is draft-only; a human
  approves or rejects from `data/actions.json` (or the CLI printout).
