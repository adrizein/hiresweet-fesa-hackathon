import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCrossCompanyInteraction } from '../src/backbone/companyVerification.js';

function fakeFullEnrich(map) {
  return { async resolvePersonCompanyDomain(url) { return map[url] ?? null; } };
}

const alice = { name: 'Alice', linkedinUrl: 'https://linkedin.com/in/alice' };
const bob = { name: 'Bob', linkedinUrl: 'https://linkedin.com/in/bob' };
const mystery = { name: 'Mystery', linkedinUrl: 'https://linkedin.com/in/mystery' };

test('blocks two people confirmed to work at the same company', async () => {
  const ctx = { clients: { fullenrich: fakeFullEnrich({ [alice.linkedinUrl]: 'acme.com', [bob.linkedinUrl]: 'acme.com' }) }, log: () => {} };
  const result = await verifyCrossCompanyInteraction(
    { interaction: { author: alice }, post: { author: bob } },
    ctx,
  );
  assert.equal(result.verified, false);
  assert.match(result.reason, /same-company/);
});

test('passes two people confirmed to work at different companies', async () => {
  const ctx = { clients: { fullenrich: fakeFullEnrich({ [alice.linkedinUrl]: 'acme.com', [bob.linkedinUrl]: 'other.com' }) }, log: () => {} };
  const result = await verifyCrossCompanyInteraction(
    { interaction: { author: alice }, post: { author: bob } },
    ctx,
  );
  assert.equal(result.verified, true);
  assert.equal(result.interactionDomain, 'acme.com');
  assert.equal(result.postDomain, 'other.com');
});

test('fail-closed: blocks when one party\'s employer cannot be resolved, never assumes distinct', async () => {
  const ctx = { clients: { fullenrich: fakeFullEnrich({ [alice.linkedinUrl]: 'acme.com' }) }, log: () => {} };
  const result = await verifyCrossCompanyInteraction(
    { interaction: { author: mystery }, post: { author: alice } },
    ctx,
  );
  assert.equal(result.verified, false);
  assert.match(result.reason, /unresolved/);
});

test('blocks when a linkedin identifier is missing entirely', async () => {
  const ctx = { clients: { fullenrich: fakeFullEnrich({}) }, log: () => {} };
  const result = await verifyCrossCompanyInteraction(
    { interaction: { author: { name: 'No URL' } }, post: { author: alice } },
    ctx,
  );
  assert.equal(result.verified, false);
  assert.match(result.reason, /missing linkedin/);
});
