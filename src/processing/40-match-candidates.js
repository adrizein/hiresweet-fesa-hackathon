import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function roleTags(company) {
  return [...new Set((company.openRoles ?? []).flatMap((role) => role.tags ?? []))];
}

// Tier 2, step 4: the HireSweet edge. Match anonymized candidates from our
// marketplace against each company's open roles, at first sight — these
// matches become the value-first hook in outreach ("here are two profiles
// that fit what you are hiring for"). Candidates stay anonymized end to end.
export default {
  name: 'match-candidates',
  description: 'Match anonymized HireSweet candidates against each company open roles',

  async process(ctx) {
    const { store, config, log } = ctx;
    const pool = JSON.parse(
      readFileSync(join(config.fixturesDir, 'candidates.json'), 'utf8'),
    );
    for (const candidate of pool) store.upsert('candidates', candidate);

    let matched = 0;
    for (const company of store.all('companies')) {
      const tags = roleTags(company);
      if (tags.length === 0) continue;

      const ranked = pool
        .map((candidate) => {
          const overlap = (candidate.tags ?? []).filter((t) => tags.includes(t));
          let score = overlap.length * 25;
          if (score > 0 && (candidate.location ?? '') === (company.location ?? '')) {
            score += 15;
          }
          return { candidate, overlap, score: Math.min(100, score) };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      for (const { candidate, overlap, score } of ranked) {
        store.upsert('matches', {
          id: `match-${company.id}-${candidate.id}`,
          companyId: company.id,
          candidateId: candidate.id,
          score,
          rationale: `matches on ${overlap.join(', ')}`,
        });
        matched += 1;
      }
    }
    log(`match-candidates: ${matched} candidate match(es) across the pipeline`);
  },
};
