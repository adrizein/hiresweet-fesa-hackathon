// Connector tests, mock mode only. No network calls, no dependency outside
// Node built-ins and the connector modules themselves (no express, no
// server/lib/*). Deletes every connector API key/base env var BEFORE
// importing the connectors, so every connector runs in its deterministic
// mock branch.

delete process.env.FULLENRICH_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.HUBSPOT_TOKEN;
delete process.env.SILLAGE_API_KEY;
delete process.env.SILLAGE_API_BASE;

import test from 'node:test';
import assert from 'node:assert/strict';

import * as fullenrich from '../connectors/fullenrich.js';
import * as claude from '../connectors/claude.js';
import * as hubspot from '../connectors/hubspot.js';
import * as sillage from '../connectors/sillage.js';

// A realistic account/person fixture, shaped like fixtures/accounts.example.json
// (acct_lumengrid), with English brief fields so mock copy stays in English.
const account = {
  id: 'acct_lumengrid',
  name: 'Lumen Grid',
  domain: 'lumengrid.io',
  url: 'https://lumengrid.io',
  size: 45,
  location: 'Paris',
  stage: 'Series A',
  signals: [
    { type: 'funding_round', detail: 'Series A (12M) announced this week', detected_at: '2026-07-08', source: 'sillage' },
  ],
  verdict: { tier: 'GO', why: 'Recent Series A, contact the CTO with a hiring-velocity angle' },
};

const person = {
  name: 'Marco Reyes',
  role: 'Co-founder & CTO',
  email: 'marco@lumengrid.io',
  phone: '+33 6 12 34 56 78',
  linkedin_url: 'https://www.linkedin.com/in/marco-reyes-demo/',
  highlighted: true,
  contact_status: 'never',
  brief: {
    why: 'Technical decision maker, just raised, must staff backend/data to hold the roadmap.',
    limits: 'Very solicited post-raise. The angle must be specific (his open roles), never generic.',
    angle: 'Series A plus an aggressive roadmap means a 3-month window where a pre-qualified pipeline changes the outcome.',
    social_proof: ['Placed a lead backend engineer at an energy scale-up at an equivalent stage'],
  },
};

test('fullenrich mock builds a plausible email from name + domain', async () => {
  assert.equal(fullenrich.isConfigured(), false);

  const result = await fullenrich.enrichPerson({
    name: person.name,
    domain: account.domain,
    company: account.name,
    linkedin_url: person.linkedin_url,
  });

  assert.equal(result.source, 'mock');
  assert.equal(result.email, 'marco.reyes@lumengrid.io');
  assert.equal(result.verified, false);
});

test('fullenrich mock credits', async () => {
  const credits = await fullenrich.getCredits();
  assert.deepEqual(credits, { credits: null, source: 'mock' });
});

test('claude mock draftEmail (cold) returns subject + body under 150 words, no banned openers', async () => {
  assert.equal(claude.isConfigured(), false);

  const draft = await claude.draftEmail({ account, person, mode: 'cold' });

  assert.equal(draft.source, 'mock');
  assert.ok(typeof draft.subject === 'string' && draft.subject.length > 0);
  assert.ok(typeof draft.body === 'string' && draft.body.length > 0);

  const words = draft.body.trim().split(/\s+/).filter(Boolean);
  assert.ok(words.length < 150, `expected under 150 words, got ${words.length}`);

  assert.doesNotMatch(draft.body, /^Congratulations/i);
  assert.doesNotMatch(draft.body, /^F[ée]licitations/i);
});

test('claude mock draftEmail (followup) references the earlier thread', async () => {
  const draft = await claude.draftEmail({ account, person, mode: 'followup' });

  assert.equal(draft.source, 'mock');
  assert.match(draft.body, /previous|earlier|last exchange|thread/i);

  const words = draft.body.trim().split(/\s+/).filter(Boolean);
  assert.ok(words.length < 150, `expected under 150 words, got ${words.length}`);
});

test('hubspot mock returns nulls (unknown, do not overwrite)', async () => {
  assert.equal(hubspot.isConfigured(), false);

  const status = await hubspot.getContactStatus({ email: person.email, name: person.name, domain: account.domain });

  assert.deepEqual(status, {
    contact_status: null,
    last_contacted_at: null,
    owner: null,
    source: 'mock',
  });
});

test('sillage returns [] and isConfigured() is false without key/base', async () => {
  assert.equal(sillage.isConfigured(), false);

  const signals = await sillage.fetchSignals();
  assert.deepEqual(signals, []);
});
