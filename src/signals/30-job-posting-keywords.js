// Tier 1 strategy — LIVE: job-posting keyword detections from the real
// Sillage workspace (agent "Postes SALES ouverts"). One detection = one
// (posting, keyword) hit on a tracked account; this strategy groups them per
// company, resolves company enrichment, and emits one corroborable signal.
// Degrades gracefully: without a key or dump it simply contributes nothing.

function inferTags(title) {
  if (/sales|account exec|commercial|revenue|business develop|bdr|sdr|partner/i.test(title)) {
    return ['ae', 'sales'];
  }
  if (/data|machine learning|\bml\b/i.test(title)) return ['data', 'python'];
  if (/devops|sre|infra|platform/i.test(title)) return ['devops', 'aws'];
  if (/fullstack|front.?end/i.test(title)) return ['fullstack', 'react', 'node'];
  if (/engineer|developer|tech/i.test(title)) return ['backend'];
  return [];
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default {
  name: 'sillage:job-posting-keywords',
  description: 'LIVE Sillage detections: tracked-keyword job postings on workspace accounts',

  async collect(ctx) {
    const { log } = ctx;
    const { detections, companies: enrichment, source } =
      await ctx.clients.sillage.fetchDetections({ log });
    if (detections.length === 0) return { companies: [], people: [], signals: [] };
    log(`sillage live: ${detections.length} detection(s) from ${source}`);

    // Group per company; dedupe postings by URL (a posting matching two
    // keywords arrives as two detections).
    const byCompany = new Map();
    for (const d of detections) {
      if (d.signal_type !== 'jobPostingKeywordDetection' || !d.company_id) continue;
      if (!byCompany.has(d.company_id)) byCompany.set(d.company_id, new Map());
      const postings = byCompany.get(d.company_id);
      const url = d.data?.posting?.job_url ?? d.source_url ?? `detection-${d.id}`;
      const existing = postings.get(url);
      postings.set(url, {
        title: d.data?.posting?.title ?? 'Untitled role',
        url,
        keywords: [
          ...new Set([...(existing?.keywords ?? []), ...(d.data?.keywords_found ?? [])]),
        ],
        signalDate: existing?.signalDate && existing.signalDate > d.signal_date
          ? existing.signalDate
          : d.signal_date,
      });
    }

    const companies = [];
    const signals = [];
    for (const [companyId, postingsMap] of byCompany) {
      const info = enrichment[companyId] ?? {};
      const name = info.name ?? `Sillage company ${companyId}`;
      const id = `co-sillage-${slugify(name)}`;
      const postings = [...postingsMap.values()];
      const keywords = [...new Set(postings.flatMap((p) => p.keywords))];
      const latest = postings.map((p) => p.signalDate).sort().at(-1);

      companies.push({
        id,
        name,
        domain: info.domain ?? null,
        location: info.location ?? null,
        flags: [],
        sillageCompanyId: companyId,
        openRoles: postings.map((p) => ({ title: p.title, tags: inferTags(p.title), url: p.url })),
      });
      signals.push({
        id: `sig-jobkw-${slugify(name)}`,
        type: 'job_posting_keyword',
        companyId: id,
        summary: `${name} has ${postings.length} live job posting(s) matching tracked keywords (${keywords.join(', ')})`,
        evidence: postings
          .slice(0, 3)
          .map((p) => `${p.title} — ${p.url}`)
          .join(' | '),
        confidence: 0.75,
        observedAt: latest,
      });
    }

    return { companies, people: [], signals };
  },
};
