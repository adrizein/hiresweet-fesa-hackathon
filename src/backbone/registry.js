import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Strategy discovery: a strategy is a plain JS file that default-exports an
// object with a `name` and the tier method (collect / process / plan).
// Adding a strategy = dropping a file in the tier folder. Files load in
// alphabetical order, so a numeric prefix (10-, 20-, ...) pins execution
// order where it matters. Files starting with `_` are ignored (scratch/wip).
export async function discoverStrategies(dir, method) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
    .sort();

  const strategies = [];
  for (const f of files) {
    const path = join(dir, f);
    const mod = await import(pathToFileURL(path).href);
    const strategy = mod.default;
    if (!strategy || typeof strategy.name !== 'string' || typeof strategy[method] !== 'function') {
      throw new Error(`${path}: default export must be an object with { name, ${method}() }`);
    }
    strategies.push(strategy);
  }
  return strategies;
}
