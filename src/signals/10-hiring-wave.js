// Tier 1 strategy: companies opening several tech/AE roles at once.
// Emits the company, its known stakeholders (with power-map roles and
// do-not-contact flags), and one hiring_wave signal per company.
export default {
  name: 'sillage:hiring-wave',
  description: 'Companies opening several tech/AE roles at once (Sillage hiring_wave signals)',

  async collect(ctx) {
    const raw = await ctx.clients.sillage.fetchSignals('hiring_wave');
    const companies = [];
    const people = [];
    const signals = [];

    for (const s of raw) {
      const companyId = `co-${s.company.slug}`;
      companies.push({
        id: companyId,
        name: s.company.name,
        domain: s.company.domain,
        location: s.company.location,
        flags: s.company.flags ?? [],
        openRoles: s.roles,
      });
      for (const contact of s.contacts ?? []) {
        people.push({
          id: `p-${contact.slug}`,
          companyId,
          kind: 'contact',
          name: contact.name,
          role: contact.role,
          powerRole: contact.powerRole,
          flags: contact.flags ?? [],
        });
      }
      signals.push({
        id: `sig-hiring-${s.company.slug}`,
        type: 'hiring_wave',
        companyId,
        summary: `${s.company.name} opened ${s.roles.length} role(s): ${s.roles
          .map((r) => r.title)
          .join(', ')}`,
        evidence: s.evidence,
        confidence: s.confidence,
        observedAt: s.observedAt,
      });
    }

    return { companies, people, signals };
  },
};
