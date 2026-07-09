# test/ — node:test suites

`npm test` (`node --test`). No test framework beyond Node's built-in
`node:test`/`node:assert/strict` — keep it that way, no new test dependency.

| File | Covers |
|---|---|
| `gate.test.js` | `backbone/gate.js` — the most important suite in the repo, since the gate is the guardrail every pitch demo depends on. Seeds a store with a clean company, a `do_not_contact` one, a `protected` one, a verified contact and an unverified one, then asserts each check blocks/passes as expected. Add a case here before changing any check in `gate.js`. |
| `pipeline.test.js` | `backbone/pipeline.js` — signals merging in parallel, processors running in order, a failing strategy being isolated instead of killing the run, human-decided action statuses (`approved`/`rejected`/`done`) surviving a re-run. |
| `registry.test.js` | `backbone/registry.js` — strategy discovery: alphabetical/numeric-prefix ordering, `_`-prefixed files ignored, a bad default export throwing with a clear message. |
| `store.test.js` | `backbone/store.js` — `get`/`all`/`upsert` (shallow-merge-by-id semantics), `reset`, `summary`, unknown-collection errors. |
| `job-posting-keywords.test.js` | `signals/30-job-posting-keywords.js` — the live-Sillage strategy, exercised against a fake `clients.sillage` (`fetchDetections` stub) rather than the real API, covering the detection→signal mapping and role-tag inference. |

## Conventions

- Tests seed their own throwaway store via `mkdtempSync(tmpdir())` (see `gate.test.js`) — never point a test at the repo's real `data/` directory.
- No network calls in tests: fake the `clients.sillage`/`clients.fullenrich` shape rather than hitting the real APIs (see `job-posting-keywords.test.js`'s `fakeSillage`).
- New strategy or gate check → new test here in the same PR, not after.
