import { runGate } from './gate.js';

// Statuses a human set from the inbox — re-runs must never overwrite them.
const HUMAN_DECIDED = new Set(['approved', 'rejected', 'done']);

// The backbone: three tiers, one pass.
//   1. signals     — strategies fan out in parallel, results merge into the store
//   2. processing  — processors run in order (corroborate, enrich, score, match, ...)
//   3. actions     — planners propose, every draft goes through the fail-closed gate
// A failing strategy is isolated and recorded on the run; it never kills the pass.
export async function runPipeline(
  ctx,
  { signals = [], processors = [], planners = [], stages = ['signals', 'processing', 'actions'] },
) {
  const { store, log } = ctx;
  const run = {
    id: `run-${Date.now()}`,
    startedAt: new Date().toISOString(),
    stages: {},
    errors: [],
  };

  if (stages.includes('signals')) {
    const counts = { strategies: signals.length, companies: 0, people: 0, signals: 0 };
    const settled = await Promise.allSettled(signals.map((s) => s.collect(ctx)));
    settled.forEach((outcome, i) => {
      const strategy = signals[i];
      if (outcome.status === 'rejected') {
        const message = String(outcome.reason?.message ?? outcome.reason);
        run.errors.push({ stage: 'signals', strategy: strategy.name, error: message });
        log(`signal strategy ${strategy.name} failed: ${message}`);
        return;
      }
      const { companies = [], people = [], signals: found = [] } = outcome.value ?? {};
      for (const company of companies) store.upsert('companies', company);
      for (const person of people) store.upsert('people', person);
      for (const signal of found) store.upsert('signals', { ...signal, strategy: strategy.name });
      counts.companies += companies.length;
      counts.people += people.length;
      counts.signals += found.length;
    });
    run.stages.signals = counts;
  }

  if (stages.includes('processing')) {
    const counts = { processors: processors.length, completed: 0 };
    for (const processor of processors) {
      try {
        await processor.process(ctx);
        counts.completed += 1;
      } catch (error) {
        run.errors.push({ stage: 'processing', strategy: processor.name, error: error.message });
        log(`processor ${processor.name} failed: ${error.message}`);
      }
    }
    run.stages.processing = counts;
  }

  if (stages.includes('actions')) {
    const counts = { planners: planners.length, proposed: 0, blocked: 0, skipped: 0 };
    for (const planner of planners) {
      let drafts;
      try {
        drafts = (await planner.plan(ctx)) ?? [];
      } catch (error) {
        run.errors.push({ stage: 'actions', strategy: planner.name, error: error.message });
        log(`planner ${planner.name} failed: ${error.message}`);
        continue;
      }
      for (const draft of drafts) {
        const existing = store.get('actions', draft.id);
        if (existing && HUMAN_DECIDED.has(existing.status)) {
          counts.skipped += 1;
          continue;
        }
        const gate = await runGate(draft, ctx);
        const status = gate.passed ? 'proposed' : 'blocked';
        store.upsert('actions', {
          ...draft,
          planner: planner.name,
          status,
          gate,
          updatedAt: new Date().toISOString(),
        });
        counts[status] += 1;
      }
    }
    run.stages.actions = counts;
  }

  run.finishedAt = new Date().toISOString();
  store.upsert('runs', run);
  return run;
}
