// Account Intelligence Tool — backend entrypoint.
// Serves the accounts contract (GET /api/accounts), accepts leads from Bloc A
// (POST /api/leads), enriches people (FullEnrich) and drafts outreach behind
// a fail-closed gate (Claude). Static front is served from <repoRoot>/app when
// that directory exists.

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv, repoRoot } from './lib/env.js';
import { apiRouter } from './routes/api.js';

export function createApp() {
  loadEnv();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Permissive CORS so the front can be served by any static server during the
  // hackathon (same-origin once app/ exists, but this costs nothing).
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use('/api', apiRouter());

  // Static: the front lives in <repoRoot>/app (built by the front session).
  // Fixtures stay reachable so the front's static fallback keeps working.
  const root = repoRoot();
  const appDir = path.join(root, 'app');
  app.use('/fixtures', express.static(path.join(root, 'fixtures')));
  if (fs.existsSync(appDir)) {
    app.use('/', express.static(appDir));
  } else {
    app.get('/', (req, res) => {
      res.json({
        name: 'account-intel-server',
        hint: 'Front not built yet (no app/ directory). API lives under /api. See server/README.md.',
      });
    });
  }

  // Central error handler: connector or store failures surface as JSON.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 502).json({ error: err.message || 'internal error' });
  });

  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`account-intel-server listening on http://localhost:${port}`);
  });
}
