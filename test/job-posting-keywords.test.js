import test from 'node:test';
import assert from 'node:assert/strict';
import strategy from '../src/signals/30-job-posting-keywords.js';

function fakeSillage({ detections, companies }) {
  return {
    async fetchDetections() {
      return { detections, companies, source: 'test' };
    },
  };
}

const DETECTIONS = [
  {
    id: 1,
    signal_type: 'jobPostingKeywordDetection',
    company_id: 42,
    signal_date: '2026-07-01T00:00:00.000Z',
    data: {
      keywords_found: ['Head of Sales'],
      posting: { title: 'Senior Account Executive', job_url: 'https://jobs.example/ae' },
    },
  },
  {
    // same posting, second keyword — must dedupe by URL and merge keywords
    id: 2,
    signal_type: 'jobPostingKeywordDetection',
    company_id: 42,
    signal_date: '2026-07-03T00:00:00.000Z',
    data: {
      keywords_found: ['Commercial'],
      posting: { title: 'Senior Account Executive', job_url: 'https://jobs.example/ae' },
    },
  },
  {
    id: 3,
    signal_type: 'jobPostingKeywordDetection',
    company_id: 42,
    signal_date: '2026-07-02T00:00:00.000Z',
    data: {
      keywords_found: ['Commercial'],
      posting: { title: 'Data Engineer', job_url: 'https://jobs.example/data' },
    },
  },
];

const COMPANIES = { 42: { name: 'Café Räx', domain: 'cafe-rax.example', location: 'Paris' } };

test('groups detections per company, dedupes postings, merges keywords', async () => {
  const ctx = { clients: { sillage: fakeSillage({ detections: DETECTIONS, companies: COMPANIES }) }, log: () => {} };
  const { companies, signals } = await strategy.collect(ctx);

  assert.equal(companies.length, 1);
  const company = companies[0];
  assert.equal(company.id, 'co-sillage-cafe-rax'); // accents and spaces slugified
  assert.equal(company.openRoles.length, 2); // 3 detections, 2 unique postings
  assert.deepEqual(company.openRoles.find((r) => r.title.includes('Account')).tags, ['ae', 'sales']);

  assert.equal(signals.length, 1);
  const signal = signals[0];
  assert.equal(signal.type, 'job_posting_keyword');
  assert.equal(signal.companyId, company.id);
  assert.match(signal.summary, /2 live job posting/);
  assert.match(signal.summary, /Head of Sales/);
  assert.match(signal.summary, /Commercial/);
  assert.equal(signal.observedAt, '2026-07-03T00:00:00.000Z'); // latest signal_date
});

test('contributes nothing when no detections are available', async () => {
  const ctx = { clients: { sillage: fakeSillage({ detections: [], companies: {} }) }, log: () => {} };
  const result = await strategy.collect(ctx);
  assert.deepEqual(result, { companies: [], people: [], signals: [] });
});
