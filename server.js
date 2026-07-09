'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');

const { normalizeSignal } = require('./lib/normalize-signal');
const { runPipeline, readOpportunities, writeOpportunities } = require('./lib/pipeline');

const DATA_DIR = path.join(__dirname, 'data');
const SEEDS_DIR = path.join(__dirname, 'seeds');
const SIGNALS_QUEUE_FILE = path.join(DATA_DIR, 'signals-queue.jsonl');
const INBOX_HTML_FILE = path.join(__dirname, 'ui', 'inbox.html');

const PORT = process.env.PORT || 3000;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// data/ is gitignored (runtime + PII). On boot, seed the config files the
// stubs read (protected-accounts.json, warm-paths.json) from the committed,
// neutral seeds/ folder if they are not already present. Never overwrites
// files the user has edited.
function seedDataIfMissing() {
  ensureDataDir();
  if (!fs.existsSync(SEEDS_DIR)) return;
  for (const file of fs.readdirSync(SEEDS_DIR)) {
    if (!file.endsWith('.json')) continue;
    const dest = path.join(DATA_DIR, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(SEEDS_DIR, file), dest);
      console.log(`[seed] data/${file} seeded from seeds/`);
    }
  }
}

function appendSignalToQueue(signal) {
  ensureDataDir();
  fs.appendFileSync(SIGNALS_QUEUE_FILE, `${JSON.stringify(signal)}\n`, 'utf8');
}

function createApp() {
  ensureDataDir();
  seedDataIfMissing();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // No auth in this V0 (hackathon build). Add a shared-secret header check
  // (SILLAGE_API_KEY) here before running this anywhere beyond the demo.
  app.post('/webhook/sillage', (req, res) => {
    let signal;
    try {
      signal = normalizeSignal(req.body || {});
    } catch (err) {
      return res.status(400).json({ error: 'invalid payload', detail: err.message });
    }

    try {
      appendSignalToQueue(signal);
    } catch (err) {
      console.error('[webhook] failed to persist signal to queue:', err.message);
      return res.status(500).json({ error: 'failed to queue signal' });
    }

    // Fire-and-forget: the webhook responds immediately, the pipeline runs
    // async. Any pipeline failure is caught and logged, never crashes the
    // process and never blocks the webhook response.
    runPipeline(signal).catch((err) => {
      console.error(`[pipeline] run failed for signal ${signal.id}:`, err);
    });

    return res.status(202).json({ id: signal.id });
  });

  app.get('/api/opportunities', (req, res) => {
    let opportunities = [];
    try {
      opportunities = readOpportunities();
    } catch (err) {
      console.error('[api] failed to read opportunities:', err.message);
      return res.status(500).json({ error: 'failed to read opportunities' });
    }
    return res.status(200).json(opportunities);
  });

  function updateOpportunityStatus(req, res, status) {
    const { id } = req.params;
    let opportunities;
    try {
      opportunities = readOpportunities();
    } catch (err) {
      return res.status(500).json({ error: 'failed to read opportunities' });
    }

    const index = opportunities.findIndex((opp) => opp.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `opportunity ${id} not found` });
    }

    opportunities[index].status = status;

    try {
      writeOpportunities(opportunities);
    } catch (err) {
      console.error('[api] failed to write opportunities:', err.message);
      return res.status(500).json({ error: 'failed to persist status change' });
    }

    return res.status(200).json(opportunities[index]);
  }

  app.post('/api/opportunities/:id/approve', (req, res) => updateOpportunityStatus(req, res, 'approved'));
  app.post('/api/opportunities/:id/reject', (req, res) => updateOpportunityStatus(req, res, 'rejected'));

  app.get('/', (req, res) => {
    if (fs.existsSync(INBOX_HTML_FILE)) {
      return res.status(200).sendFile(INBOX_HTML_FILE);
    }
    return res.status(200).type('text/plain').send('inbox UI coming');
  });

  return app;
}

function startServer() {
  const app = createApp();
  return app.listen(PORT, () => {
    console.log(`Wake listening on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
