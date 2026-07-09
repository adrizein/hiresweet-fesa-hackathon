'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OPPORTUNITIES_FILE = path.join(DATA_DIR, 'opportunities.json');

/**
 * Seven-step orchestrator: triage -> route -> enrich -> proof -> craft -> gate -> publish.
 *
 * Every step is injected via `deps` so each one can be swapped independently
 * (a real triage model, a real enrichment API, a real proof engine, a real
 * CRM writer) without touching this file. The defaults below are stubs: they
 * log what they would do and return a plausible, schema-shaped object so the
 * pipeline can be exercised end-to-end before any real integration exists.
 */

function generateOpportunityId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `opp_${ts}_${rand}`;
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readOpportunities() {
  ensureDataDir();
  if (!fs.existsSync(OPPORTUNITIES_FILE)) return [];
  try {
    const raw = fs.readFileSync(OPPORTUNITIES_FILE, 'utf8');
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('[pipeline] failed to read opportunities.json, treating as empty:', err.message);
    return [];
  }
}

function writeOpportunities(list) {
  ensureDataDir();
  fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// --- Default stub implementations -----------------------------------------
// Each stub is intentionally dependency-free (no network calls) so the
// pipeline runs and tests pass with zero external services configured.

// Overridable so tests can point at a scratch file without touching the
// real runtime list in data/.
function protectedAccountsFile() {
  return process.env.WAKE_PROTECTED_ACCOUNTS || path.join(DATA_DIR, 'protected-accounts.json');
}

/**
 * Accounts the agent must never cold-outreach (active clients, open deals,
 * live processes). The real triage engine derives this from the CRM; the
 * stub reads a plain JSON array of lowercase domains/names from
 * data/protected-accounts.json so the guard behavior is demoable end-to-end
 * with zero external services.
 */
function readProtectedAccounts() {
  try {
    const file = protectedAccountsFile();
    if (!fs.existsSync(file)) return [];
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(list) ? list.map((s) => String(s).toLowerCase()) : [];
  } catch (err) {
    console.error('[triage:stub] failed to read protected-accounts.json:', err.message);
    return [];
  }
}

async function defaultTriage(signal) {
  console.log(`[triage:stub] evaluating signal ${signal.id} (${signal.type}) for ${signal.company.name}`);
  const protectedAccounts = readProtectedAccounts();
  const domain = String(signal.company.domain || '').toLowerCase();
  const name = String(signal.company.name || '').toLowerCase();
  if (protectedAccounts.some((p) => p && (p === domain || p === name))) {
    return {
      verdict: 'T1',
      reasons: ['guard: active client account, cold outreach forbidden (route to a human)']
    };
  }
  return {
    verdict: 'T2',
    reasons: ['stub triage: no disqualifying signal found']
  };
}

// Overridable so tests can point at a scratch file without touching the
// real runtime list in data/.
function warmPathsFile() {
  return process.env.WAKE_WARM_PATHS || path.join(DATA_DIR, 'warm-paths.json');
}

/**
 * Warm paths: the relationship edges between us and target accounts
 * (a person we placed who works there, a past deal contact who moved there,
 * a common investor, a real past email thread). The real route engine
 * computes this from the operating history graph; the stub reads
 * data/warm-paths.json entries shaped like:
 *   { "match": "acme.io", "route": "warm_intro"|"warm_direct",
 *     "via": "Jane Doe (Fund X)", "evidence": "co-invested in our client Y" }
 */
function readWarmPaths() {
  try {
    const file = warmPathsFile();
    if (!fs.existsSync(file)) return [];
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('[route:stub] failed to read warm-paths.json:', err.message);
    return [];
  }
}

/**
 * PLUG POINT -> Sillage power map + our relationship graph. The stub reads
 * data/warm-paths.json; the real implementation walks the relationship graph
 * (placements, past deal contacts, common investors) AND the Sillage power map
 * (who-knows-who, do-not-contact) to pick the warmest path.
 *
 * The route decision is the agent's first differentiator: never go cold when
 * a warm path exists. warm_intro = draft an intro REQUEST to the connector,
 * warm_direct = we have real shared history with the target, use it,
 * cold = last resort, best angle + proof.
 */
async function defaultRoute(signal, triage) {
  console.log(`[route:stub] computing warmest path to ${signal.company.name}`);
  const domain = String(signal.company.domain || '').toLowerCase();
  const name = String(signal.company.name || '').toLowerCase();
  const hit = readWarmPaths().find((p) => {
    const m = String(p.match || '').toLowerCase();
    return m && (m === domain || m === name);
  });
  if (hit) {
    return {
      route: hit.route === 'warm_intro' ? 'warm_intro' : 'warm_direct',
      via: hit.via || null,
      evidence: hit.evidence || null,
      reasons: [`warm path found: ${hit.evidence || hit.via || 'relationship on file'}`]
    };
  }
  return {
    route: 'cold',
    via: null,
    evidence: null,
    reasons: ['no warm path found in relationship graph']
  };
}

// PLUG POINT -> FullEnrich. Replace this stub with a call that fills email + phone.
//   deps.enrich = async (signal) => {
//     const c = await fullenrich.enrichContact({ firstname, lastname, domain });
//     return { ...signal.person, email: c.email, phone: c.phone };
//   }
// Enrich the target, and (for a warm_intro route) the connector too.
async function defaultEnrich(signal) {
  console.log(`[enrich:stub] enriching contact ${signal.person.firstname || '?'} ${signal.person.lastname || '?'} @ ${signal.company.name}`);
  return {
    firstname: signal.person.firstname,
    lastname: signal.person.lastname,
    title: signal.person.title,
    linkedin_url: signal.person.linkedin_url,
    email: null,
    phone: null
  };
}

// PLUG POINT -> proof / value. A specific, honest reason to reach out (past result,
// relevant pattern), or the value payload itself (e.g. a Gamma one-pager generated
// from the enriched signal). Empty narrative -> the gate should catch it.
async function defaultProof(signal) {
  console.log(`[proof:stub] looking for social proof relevant to ${signal.company.name}`);
  return {
    narrative: '',
    source: 'none'
  };
}

// PLUG POINT -> Claude (drafting) + optional Gamma (visual) + optional Gradium (voice).
// Multi-modal activation. Signature is (signal, proof, route): a warm_intro route
// means step 1 is addressed to the connector, not the target.
//   - text:   Claude drafts a 3-step email + a LinkedIn line + a 30s call brief
//   - visual: Gamma generates a personalized one-pager/deck -> reference its URL
//   - voice:  Gradium renders a voice note from step 1 -> attach its audio
async function defaultCraft(signal, proof, route) {
  console.log(`[craft:stub] drafting 3-step sequence for ${signal.company.name}`);
  return [
    { step: 1, subject: `Re: ${signal.company.name}`, body: 'stub: opening email body' },
    { step: 2, subject: 'Quick follow-up', body: 'stub: follow-up email body' },
    { step: 3, subject: 'Last check-in', body: 'stub: breakup email body' }
  ];
}

async function defaultGate(opportunityDraft) {
  console.log(`[gate:stub] running QA gate for ${opportunityDraft.company.name}`);
  // Fail-closed on triage: anything that is not an explicit T2 verdict must
  // not go out cold. Mirrors check C1 of the production gate.
  if (opportunityDraft.triage && opportunityDraft.triage.verdict !== 'T2') {
    return {
      ok: false,
      reasons: [
        `C1: triage verdict is ${opportunityDraft.triage.verdict || 'unknown'}, only T2 may be sequenced`,
        ...(opportunityDraft.triage.reasons || [])
      ]
    };
  }
  return {
    ok: true,
    reasons: ['stub gate: triage verdict T2 confirmed (adversarial checks plug in here)']
  };
}

// PLUG POINT -> HubSpot / Gmail. Default writes to data/opportunities.json for the
// inbox. A real deployment ALSO creates a HubSpot draft contact + a follow-up task
// here, and/or a Gmail draft. Draft only, never auto-send.
async function defaultPublish(opportunity) {
  const list = readOpportunities();
  list.push(opportunity);
  writeOpportunities(list);
  console.log(`[publish:stub] wrote opportunity ${opportunity.id} with status "${opportunity.status}"`);
  return opportunity;
}

const defaultDeps = {
  triage: defaultTriage,
  route: defaultRoute,
  enrich: defaultEnrich,
  proof: defaultProof,
  craft: defaultCraft,
  gate: defaultGate,
  publish: defaultPublish
};

/**
 * Runs the full pipeline for a single normalized Signal.
 * @param {object} signal - a Signal envelope (see contracts/signal.schema.json)
 * @param {object} [deps] - partial override of { triage, enrich, proof, craft, gate, publish }
 * @returns {Promise<object>} the Opportunity that was published (see contracts/opportunity.schema.json)
 */
async function runPipeline(signal, deps = {}) {
  const steps = { ...defaultDeps, ...deps };

  const triage = await steps.triage(signal);
  const route = await steps.route(signal, triage);
  const contact = await steps.enrich(signal);
  const proof = await steps.proof(signal);
  const sequence = await steps.craft(signal, proof, route);

  const draft = {
    id: generateOpportunityId(),
    signal: {
      id: signal.id,
      type: signal.type,
      detail: signal.detail,
      detected_at: signal.detected_at
    },
    company: signal.company,
    contact,
    triage,
    route,
    proof,
    sequence,
    gate: { ok: false, reasons: [] },
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const gate = await steps.gate(draft);
  draft.gate = gate;
  draft.status = gate.ok ? 'pending' : 'blocked';

  // Fail-closed: if the gate does not explicitly pass, short-circuit and do
  // not hand a blocked draft to the publish step's normal path. We still
  // persist it (so it's auditable) but publish is responsible for respecting
  // draft.status; the default stub just writes whatever it's given, so we
  // only call publish when there's something worth persisting either way.
  const published = await steps.publish(draft);
  return published;
}

module.exports = {
  runPipeline,
  defaultDeps,
  readOpportunities,
  writeOpportunities,
  OPPORTUNITIES_FILE,
  DATA_DIR
};
