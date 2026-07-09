// Bridge between Mathieu's app (server/, accounts contract) and the agent
// backbone (src/, per-collection store used by the Claude Managed Agent).
// Both live on the same data/ dir but in different files, so this module is
// the single place where the two shapes meet. It never edits src/ code.
//
// push: accounts -> companies/people/signals, so the agent's power map (and
//       its fail-closed gate) sees every account of the app, including the
//       HUMAN/protected ones and the do-not-contact people.
// pull: companies/people/signals/leads -> accounts, so what the agent
//       discovers and scores shows up in the app's UI.

import path from 'node:path';

import { createStore } from '../../src/backbone/store.js';
import { repoRoot } from './env.js';
import { loadAccounts, upsertAccounts } from './store.js';

function backboneDir() {
  return process.env.ACCOUNT_DATA_DIR || path.join(repoRoot(), 'data');
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// accounts -> backbone collections. Gate parity: HUMAN tier maps to the
// 'protected' company flag, contact_status "client" maps to 'do_not_contact'.
export async function pushAccountsToBackbone() {
  const store = createStore(backboneDir());
  const accounts = await loadAccounts();
  const counts = { companies: 0, people: 0, signals: 0 };

  for (const account of accounts) {
    store.upsert('companies', {
      id: account.id,
      name: account.name,
      domain: account.domain ?? null,
      url: account.url ?? null,
      location: account.location ?? null,
      size: account.size ?? null,
      stage: account.stage ?? null,
      flags: account.verdict?.tier === 'HUMAN' ? ['protected'] : [],
      verdict: account.verdict ?? null,
    });
    counts.companies += 1;

    (account.people || []).forEach((person) => {
      store.upsert('people', {
        id: `${account.id}:${slug(person.name)}`,
        companyId: account.id,
        name: person.name,
        role: person.role ?? null,
        email: person.email ?? null,
        phone: person.phone ?? null,
        linkedinUrl: person.linkedin_url ?? null,
        powerRole: person.highlighted ? 'decision_maker' : null,
        flags: person.contact_status === 'client' ? ['do_not_contact'] : [],
        emailStatus: person.enrichment?.verified ? 'verified' : person.email ? 'unverified' : null,
        contactStatus: person.contact_status ?? 'never',
        brief: person.brief ?? null,
      });
      counts.people += 1;
    });

    (account.signals || []).forEach((signal, i) => {
      store.upsert('signals', {
        id: `${account.id}:sig:${i}`,
        companyId: account.id,
        type: signal.type,
        summary: signal.detail,
        detectedAt: signal.detected_at ?? null,
        source: signal.source ?? null,
      });
      counts.signals += 1;
    });
  }

  return counts;
}

// backbone collections -> accounts. Companies the agent worked on become
// visible in the app: protected -> HUMAN, scored lead -> GO, otherwise
// EXPLORE (found by the agent, needs a human look).
export async function pullBackboneToAccounts() {
  const store = createStore(backboneDir());
  const companies = store.all('companies');
  const people = store.all('people');
  const signals = store.all('signals');
  const leads = store.all('leads');

  const incoming = companies.map((company) => {
    const companyLeads = leads.filter((l) => l.companyId === company.id);
    const bestLead = companyLeads.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

    let verdict = company.verdict ?? null;
    if (!verdict) {
      if ((company.flags || []).includes('protected')) {
        verdict = { tier: 'HUMAN', why: 'Protected account (agent backbone): route to the account owner' };
      } else if (bestLead) {
        verdict = {
          tier: 'GO',
          why: bestLead.reason ?? bestLead.rationale ?? `Agent-scored lead (score ${bestLead.score ?? '?'})`,
        };
      } else {
        verdict = { tier: 'EXPLORE', why: 'Surfaced by the agent backbone, needs review' };
      }
    }

    return {
      id: company.id,
      name: company.name,
      domain: company.domain ?? undefined,
      url: company.url ?? undefined,
      size: company.size ?? undefined,
      location: company.location ?? undefined,
      stage: company.stage ?? undefined,
      verdict,
      signals: signals
        .filter((s) => s.companyId === company.id)
        .map((s) => ({
          type: s.type,
          detail: s.summary,
          detected_at: s.detectedAt ?? undefined,
          source: s.source ?? 'agent-backbone',
        })),
      people: people
        .filter((p) => p.companyId === company.id)
        .map((p) => ({
          name: p.name,
          role: p.role ?? undefined,
          email: p.email ?? null,
          phone: p.phone ?? null,
          linkedin_url: p.linkedinUrl ?? null,
          highlighted: p.powerRole != null,
          contact_status: p.contactStatus
            ?? ((p.flags || []).includes('do_not_contact') ? 'client' : 'never'),
          brief: p.brief ?? { why: '', limits: '', angle: '', social_proof: [] },
        })),
    };
  });

  if (incoming.length === 0) return { created: 0, updated: 0 };
  const { created, updated } = await upsertAccounts(incoming);
  return { created, updated };
}
