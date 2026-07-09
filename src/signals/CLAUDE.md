# src/signals/ — tier 1: signal mapping

Contract: `async collect(ctx) → { companies, people, signals }`. Every strategy
runs in parallel (`Promise.allSettled` in `backbone/pipeline.js`) and results
merge into the store by `id` — so two strategies firing on the same account
naturally corroborate each other (a hiring wave *and* a champion move on the
same company both land on that company's record). A strategy that throws is
isolated and logged; it never kills the run.

Each person record should carry a power-map role (`powerRole`: `champion` /
`decision_maker` / `influencer`) and `flags` (e.g. `do_not_contact`,
`protected`) where known — that's what `backbone/selectors.js` and the gate
key off downstream.

| File | Signal | Mode |
|---|---|---|
| `10-hiring-wave.js` | Companies opening several tech/AE roles at once. | Fixtures (`fixtures/sillage/signals.json`). |
| `20-champion-move.js` | People we know (champions) landing at new companies — the strongest lead type when it lands on the same account as a hiring wave. | Fixtures. |
| `30-job-posting-keywords.js` | Real Sillage workspace detections (`jobPostingKeywordDetection`, agent "Postes SALES ouverts"): groups postings per account, infers role tags from title, resolves company enrichment live. | **Live** once `SILLAGE_API_KEY` (or `data/sillage/detections.json` dump) is set; contributes nothing otherwise — degrades gracefully. |

## Adding a signal strategy

One file, numeric prefix if order matters (it usually doesn't at this tier —
they run in parallel), default export:

```js
export default {
  name: 'sillage:funding-round',
  description: 'Companies that just raised (Sillage funding_round signals)',
  async collect({ clients }) {
    const raw = await clients.sillage.fetchSignals('funding_round');
    return { companies: [], people: [], signals: [] }; // map raw → records
  },
};
```

Call `clients.sillage`, never `fetch()` directly — see `backbone/clients/CLAUDE.md`.
