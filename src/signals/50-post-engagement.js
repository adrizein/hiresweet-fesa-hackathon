// Tier 1 strategy: genuine cross-company engagement (likes/comments) on our
// own tracked accounts' LinkedIn posts. Every candidate interaction is
// verified through companyVerification.js before it becomes a signal —
// same-company noise (a colleague commenting on a colleague's post) and
// unresolvable affiliations are both dropped, not guessed into a lead.
import { verifyCrossCompanyInteraction } from '../backbone/companyVerification.js';

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default {
  name: 'sillage:post-engagement',
  description: 'Verified cross-company likes/comments on tracked accounts\' posts (Sillage engagement + FullEnrich verification)',

  async collect(ctx) {
    const { log } = ctx;
    const raw = await ctx.clients.sillage.fetchEngagement({ log });
    const companies = [];
    const people = [];
    const signals = [];
    let blocked = 0;

    for (const item of raw) {
      const verdict = await verifyCrossCompanyInteraction(item, ctx);
      if (!verdict.verified) {
        blocked += 1;
        continue;
      }

      // The lead is the OUTSIDE party (the one who is not our tracked
      // account) — that is the company worth a warm-path conversation.
      const companyId = `co-${slugify(item.interaction.author.name.split(' ').pop() + '-' + verdict.interactionDomain)}`;
      companies.push({
        id: companyId,
        name: verdict.interactionDomain.replace(/\.example$|\.[a-z]+$/, ''),
        domain: verdict.interactionDomain,
        location: null,
        flags: [],
      });
      const personId = `p-${slugify(item.interaction.author.name)}`;
      people.push({
        id: personId,
        companyId,
        kind: 'contact',
        name: item.interaction.author.name,
        role: item.interaction.author.headline ?? null,
        powerRole: 'unknown',
        flags: [],
      });
      signals.push({
        id: `sig-engagement-${personId}`,
        type: 'post_engagement',
        companyId,
        personId,
        summary: `${item.interaction.author.name} (${verdict.interactionDomain}) engaged with ${item.post.author.name}'s post at ${item.post.company.name}`,
        evidence: `"${item.interaction.excerpt}" on ${item.post.author.name}'s post, ${item.observedAt}`,
        confidence: 0.5, // weak alone by design — see criteria/lead-criteria.md corroboration rule
        observedAt: item.observedAt,
      });
    }

    if (blocked > 0) log(`sillage:post-engagement — ${blocked} interaction(s) blocked (same-company or unresolved)`);
    return { companies, people, signals };
  },
};
