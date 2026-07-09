// API routes. The contract is the shape of fixtures/accounts.example.json
// (documented field by field in docs/FRONT-BRIEF.md). Bloc A pushes accounts
// through POST /api/leads; the front reads GET /api/accounts; enrich and draft
// mutate/consume single accounts.

import express from 'express';

import { loadAccounts, getAccount, saveAccounts, upsertAccounts, dataFilePath } from '../lib/store.js';
import { validateAccount, normalizeAccount } from '../lib/validate.js';
import { gate } from '../lib/gate.js';
import * as fullenrich from '../connectors/fullenrich.js';
import * as claude from '../connectors/claude.js';
import * as hubspot from '../connectors/hubspot.js';
import * as sillage from '../connectors/sillage.js';
import { pushAccountsToBackbone, pullBackboneToAccounts } from '../lib/backbone-sync.js';

// Wrap async handlers so rejections reach the central error handler.
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function apiRouter() {
  const router = express.Router();

  router.get('/health', asyncH(async (req, res) => {
    res.json({
      ok: true,
      connectors: {
        sillage: sillage.isConfigured(),
        fullenrich: fullenrich.isConfigured(),
        hubspot: hubspot.isConfigured(),
        claude: claude.isConfigured(),
      },
      data: dataFilePath(),
    });
  }));

  router.get('/accounts', asyncH(async (req, res) => {
    res.json(await loadAccounts());
  }));

  router.get('/accounts/:id', asyncH(async (req, res) => {
    const account = await getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: `unknown account: ${req.params.id}` });
    res.json(account);
  }));

  // Input point for Bloc A (Sillage flow) and any external producer.
  // Accepts one account object or an array. Valid entries are normalized and
  // upserted (matched by id, then domain); invalid ones are reported, never
  // silently dropped. An incoming account without people keeps existing people.
  router.post('/leads', asyncH(async (req, res) => {
    const body = req.body;
    const incoming = Array.isArray(body) ? body : body && typeof body === 'object' ? [body] : null;
    if (!incoming || incoming.length === 0) {
      return res.status(400).json({ error: 'body must be an account object or a non-empty array of accounts' });
    }

    const valid = [];
    const rejected = [];
    incoming.forEach((entry, index) => {
      const { ok, errors } = validateAccount(entry);
      if (ok) valid.push(normalizeAccount(entry));
      else rejected.push({ index, id: entry && entry.id ? entry.id : null, errors });
    });

    let created = 0;
    let updated = 0;
    if (valid.length > 0) {
      const result = await upsertAccounts(valid);
      created = result.created;
      updated = result.updated;
    }

    res.json({ accepted: valid.length, created, updated, rejected });
  }));

  // Enrich one named person, or every person missing an email, on an account.
  // Mock mode (no FULLENRICH_API_KEY) fills a deterministic fake tagged mock.
  router.post('/enrich/:accountId', asyncH(async (req, res) => {
    const account = await getAccount(req.params.accountId);
    if (!account) return res.status(404).json({ error: `unknown account: ${req.params.accountId}` });

    const people = account.people || [];
    let targets;
    if (req.body && req.body.person) {
      targets = people.filter((p) => p.name === req.body.person);
      if (targets.length === 0) {
        return res.status(404).json({ error: `unknown person on ${account.id}: ${req.body.person}` });
      }
    } else {
      targets = people.filter((p) => !p.email);
    }

    const enriched = [];
    for (const person of targets) {
      const result = await fullenrich.enrichPerson({
        name: person.name,
        domain: account.domain,
        company: account.name,
        linkedin_url: person.linkedin_url,
      });
      if (!person.email && result.email) person.email = result.email;
      if (!person.phone && result.phone) person.phone = result.phone;
      person.enrichment = { source: result.source, verified: result.verified, at: new Date().toISOString() };
      enriched.push({ name: person.name, source: result.source, verified: result.verified });
    }

    if (enriched.length > 0) {
      const accounts = await loadAccounts();
      const idx = accounts.findIndex((a) => a.id === account.id);
      if (idx !== -1) accounts[idx] = account;
      await saveAccounts(accounts);
    }

    res.json({ account, enriched });
  }));

  // Draft an outreach email for one person. The gate runs FIRST and is
  // fail-closed: HUMAN tier, client relationship or missing data all block.
  // A blocked draft is a feature (the demo's guard moment), not an error,
  // so it returns 200 with blocked: true.
  router.post('/draft', asyncH(async (req, res) => {
    const { account_id: accountId, person: personName } = req.body || {};
    if (!accountId || !personName) {
      return res.status(400).json({ error: 'body must contain account_id and person' });
    }
    const account = await getAccount(accountId);
    if (!account) return res.status(404).json({ error: `unknown account: ${accountId}` });
    const person = (account.people || []).find((p) => p.name === personName);
    if (!person) return res.status(404).json({ error: `unknown person on ${accountId}: ${personName}` });

    const verdict = gate(account, person);
    if (!verdict.allowed) {
      return res.json({ blocked: true, reason: verdict.reason, mode: null });
    }

    const draft = await claude.draftEmail({ account, person, mode: verdict.mode });
    res.json({
      blocked: false,
      mode: verdict.mode,
      reason: verdict.reason,
      source: draft.source,
      draft: { subject: draft.subject, body: draft.body },
    });
  }));

  // Bridge with the agent backbone (src/). push = app accounts into the
  // agent's power map (guards included), pull = agent findings into the app.
  // Default is both, so one call keeps the two stores in sync for the demo.
  router.post('/agents/sync', asyncH(async (req, res) => {
    const direction = (req.body && req.body.direction) || 'both';
    if (!['push', 'pull', 'both'].includes(direction)) {
      return res.status(400).json({ error: 'direction must be push, pull or both' });
    }
    const result = {};
    if (direction === 'push' || direction === 'both') result.push = await pushAccountsToBackbone();
    if (direction === 'pull' || direction === 'both') result.pull = await pullBackboneToAccounts();
    res.json(result);
  }));

  return router;
}
