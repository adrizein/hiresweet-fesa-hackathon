// Replay the demo signals against the running webhook.
// Usage: npm start (in one terminal), then: npm run demo
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

const signals = JSON.parse(await readFile(join(__dirname, '..', 'seeds', 'demo-signals.json'), 'utf8'));

for (const sig of signals) {
  const res = await fetch(`${BASE}/webhook/sillage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sig),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`${sig.company.name.padEnd(20)} -> ${res.status} ${JSON.stringify(body)}`);
}

await new Promise((r) => setTimeout(r, 1200));
const opps = await (await fetch(`${BASE}/api/opportunities`)).json();
console.log(`\n${opps.length} opportunities in the inbox:`);
for (const o of opps) {
  console.log(`  ${o.company.name.padEnd(20)} triage=${o.triage?.verdict} route=${o.route?.route} status=${o.status}`);
}
console.log(`\nOpen the inbox: ${BASE}/`);
