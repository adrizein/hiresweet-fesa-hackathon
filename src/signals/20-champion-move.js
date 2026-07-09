// Tier 1 strategy: people we know (champions) landing at new companies.
// Corroborates hiring waves — a champion plus a hiring wave on the same
// account is the strongest lead the pipeline can produce.
export default {
  name: 'sillage:champion-move',
  description: 'Champions from past relationships landing at new companies (Sillage champion_move signals)',

  async collect(ctx) {
    const raw = await ctx.clients.sillage.fetchSignals('champion_move');
    const companies = [];
    const people = [];
    const signals = [];

    for (const s of raw) {
      const companyId = `co-${s.company.slug}`;
      // No openRoles key here: upserts shallow-merge, and the hiring-wave
      // strategy may have already attached roles to the same company.
      companies.push({
        id: companyId,
        name: s.company.name,
        domain: s.company.domain,
        location: s.company.location,
        flags: s.company.flags ?? [],
      });
      const personId = `p-${s.person.slug}`;
      people.push({
        id: personId,
        companyId,
        kind: 'contact',
        name: s.person.name,
        role: s.person.role,
        powerRole: s.person.powerRole,
        flags: s.person.flags ?? [],
        relationshipContext: s.person.context,
      });
      signals.push({
        id: `sig-champion-${s.company.slug}`,
        type: 'champion_move',
        companyId,
        personId,
        summary: `${s.person.name} joined ${s.company.name} as ${s.person.role}`,
        evidence: s.evidence,
        confidence: s.confidence,
        observedAt: s.observedAt,
      });
    }

    return { companies, people, signals };
  },
};
