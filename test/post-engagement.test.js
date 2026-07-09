import test from 'node:test';
import assert from 'node:assert/strict';
import strategy from '../src/signals/50-post-engagement.js';

function fakeSillage(engagement) {
  return { async fetchEngagement() { return engagement; } };
}
function fakeFullEnrich(map) {
  return { async resolvePersonCompanyDomain(url) { return map[url] ?? null; } };
}

const sameCompanyItem = {
  observedAt: '2026-07-06',
  post: {
    author: { name: 'Mika', linkedinUrl: 'https://linkedin.com/in/mika' },
    company: { name: 'Kerbio' },
  },
  interaction: {
    author: { name: 'Theo', linkedinUrl: 'https://linkedin.com/in/theo', headline: 'Building things' },
    excerpt: 'So proud of this team!!',
  },
};

const crossCompanyItem = {
  observedAt: '2026-07-08',
  post: {
    author: { name: 'Lucie', linkedinUrl: 'https://linkedin.com/in/lucie' },
    company: { name: 'Novapay' },
  },
  interaction: {
    author: { name: 'Amine Belkacem', linkedinUrl: 'https://linkedin.com/in/amine', headline: 'VP Sales' },
    excerpt: 'We had the exact same hiring wave last quarter.',
  },
};

test('drops a same-company interaction even when the headline suggests otherwise', async () => {
  const ctx = {
    clients: {
      sillage: fakeSillage([sameCompanyItem]),
      fullenrich: fakeFullEnrich({
        'https://linkedin.com/in/theo': 'kerbio.example',
        'https://linkedin.com/in/mika': 'kerbio.example',
      }),
    },
    log: () => {},
  };
  const { companies, signals } = await strategy.collect(ctx);
  assert.equal(companies.length, 0);
  assert.equal(signals.length, 0);
});

test('emits a signal for a verified cross-company interaction, naming the outside company as the lead', async () => {
  const ctx = {
    clients: {
      sillage: fakeSillage([crossCompanyItem]),
      fullenrich: fakeFullEnrich({
        'https://linkedin.com/in/amine': 'solenne-corp.example',
        'https://linkedin.com/in/lucie': 'novapay.example',
      }),
    },
    log: () => {},
  };
  const { companies, people, signals } = await strategy.collect(ctx);
  assert.equal(companies.length, 1);
  assert.equal(companies[0].domain, 'solenne-corp.example');
  assert.equal(people.length, 1);
  assert.equal(people[0].name, 'Amine Belkacem');
  assert.equal(signals.length, 1);
  assert.equal(signals[0].type, 'post_engagement');
  assert.equal(signals[0].confidence, 0.5);
});

test('mixed batch: keeps only the verified cross-company interaction', async () => {
  const ctx = {
    clients: {
      sillage: fakeSillage([sameCompanyItem, crossCompanyItem]),
      fullenrich: fakeFullEnrich({
        'https://linkedin.com/in/theo': 'kerbio.example',
        'https://linkedin.com/in/mika': 'kerbio.example',
        'https://linkedin.com/in/amine': 'solenne-corp.example',
        'https://linkedin.com/in/lucie': 'novapay.example',
      }),
    },
    log: () => {},
  };
  const { signals } = await strategy.collect(ctx);
  assert.equal(signals.length, 1);
});
