import test from 'node:test';
import assert from 'node:assert/strict';
import strategy from '../src/signals/40-mantiks-hiring.js';

function fakeMantiks({ jobChanges = [], jobPostings = [] }) {
  return {
    async fetchSignals(type) {
      if (type === 'job_change') return jobChanges;
      if (type === 'job_posting') return jobPostings;
      return [];
    },
  };
}

test('emits a mantiks_job_change signal for a recent hire', async () => {
  const ctx = {
    clients: {
      mantiks: fakeMantiks({
        jobChanges: [
          {
            company: { slug: 'brindao', name: 'Brindao', domain: 'brindao.example', location: 'Paris', flags: [] },
            person: { slug: 'salome-fournier', name: 'Salomé Fournier', role: 'CTO', powerRole: 'decision_maker', context: 'first tech hire' },
            evidence: 'Mantiks job-change alert',
            confidence: 0.85,
            observedAt: '2026-07-07',
          },
        ],
      }),
    },
  };
  const { companies, people, signals } = await strategy.collect(ctx);
  assert.equal(companies.length, 1);
  assert.equal(companies[0].name, 'Brindao');
  assert.equal(people.length, 1);
  assert.equal(people[0].role, 'CTO');
  assert.equal(signals.length, 1);
  assert.equal(signals[0].type, 'mantiks_job_change');
  assert.match(signals[0].summary, /Salomé Fournier/);
});

test('emits a mantiks_job_posting signal grouping open roles', async () => {
  const ctx = {
    clients: {
      mantiks: fakeMantiks({
        jobPostings: [
          {
            company: { slug: 'kelvane', name: 'Kelvane', domain: 'kelvane.example', location: 'Lyon', flags: [] },
            roles: [{ title: 'Founding Engineer', tags: ['backend'] }, { title: 'Product Engineer', tags: ['fullstack'] }],
            contacts: [{ slug: 'marc-oyelaran', name: 'Marc Oyelaran', role: 'CEO', powerRole: 'decision_maker' }],
            evidence: 'Mantiks job-board scan',
            confidence: 0.7,
            observedAt: '2026-07-08',
          },
        ],
      }),
    },
  };
  const { companies, people, signals } = await strategy.collect(ctx);
  assert.equal(companies[0].openRoles.length, 2);
  assert.equal(people[0].name, 'Marc Oyelaran');
  assert.equal(signals[0].type, 'mantiks_job_posting');
  assert.match(signals[0].summary, /Founding Engineer/);
});

test('contributes nothing when Mantiks has no signals', async () => {
  const ctx = { clients: { mantiks: fakeMantiks({}) } };
  const result = await strategy.collect(ctx);
  assert.deepEqual(result, { companies: [], people: [], signals: [] });
});
