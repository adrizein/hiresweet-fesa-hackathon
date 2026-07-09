// Tier 1 strategy: hiring signals sourced from Mantiks (job-change alerts +
// job-board scans) — a second, independent data source from Sillage, so a
// company corroborated by both is a stronger lead than either one alone.
// Same shape as the Sillage hiring-wave / champion-move strategies: this is
// deliberately a second instance of the same pattern, not a new one, so
// `10-corroborate` treats a Mantiks hit and a Sillage hit on the same company
// as two independent signals.
export default {
  name: 'mantiks:hiring',
  description: 'Job changes and job-board hiring signals from Mantiks (job_change + job_posting)',

  async collect(ctx) {
    const [jobChanges, jobPostings] = await Promise.all([
      ctx.clients.mantiks.fetchSignals('job_change'),
      ctx.clients.mantiks.fetchSignals('job_posting'),
    ]);
    const companies = [];
    const people = [];
    const signals = [];

    for (const s of jobChanges) {
      const companyId = `co-${s.company.slug}`;
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
        id: `sig-mantiks-jobchange-${s.company.slug}`,
        type: 'mantiks_job_change',
        companyId,
        personId,
        summary: `${s.person.name} recently started as ${s.person.role} at ${s.company.name} (Mantiks)`,
        evidence: s.evidence,
        confidence: s.confidence,
        observedAt: s.observedAt,
      });
    }

    for (const s of jobPostings) {
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
        id: `sig-mantiks-postings-${s.company.slug}`,
        type: 'mantiks_job_posting',
        companyId,
        summary: `${s.company.name} has ${s.roles.length} open role(s) via Mantiks: ${s.roles
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
