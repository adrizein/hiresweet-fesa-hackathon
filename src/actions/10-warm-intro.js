import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const INTRO_SYSTEM_PROMPT =
  'You write short internal intro requests for HireSweet, a tech-recruitment marketplace. ' +
  'Write 2 to 3 sentences asking the connector to introduce us to the target, citing the ' +
  'observed signals as the reason to reach out now. Warm, specific, honest. Use only the ' +
  'provided facts. Plain text only — no square brackets, no placeholders, no subject line.';

function fallbackMessage(rel, target, company, signalSummaries) {
  return (
    `Hi ${rel.connector.name} — could you introduce us to ${target.name} at ${company.name}? ` +
    `What we see right now: ${signalSummaries.join('; ')}. ` +
    `Given your history there (${rel.connector.context}), a warm word from you beats any cold email we could write.`
  );
}

// Tier 3, the routing decision: when a strong relationship path exists to a
// hot lead, ask the connector for an intro instead of going cold. This is
// the "warmest path first" rule — it runs before any cold planner (file
// order 10- beats 20-).
export default {
  name: 'warm-intro',
  description: 'Ask a connector for an intro when a strong relationship path exists (warm beats cold)',

  async plan(ctx) {
    const { store, config, llm, log } = ctx;
    const relationships = JSON.parse(
      readFileSync(join(config.fixturesDir, 'relationships.json'), 'utf8'),
    );

    const actions = [];
    for (const lead of store.all('leads')) {
      if (lead.score < 60) continue;
      const rel = relationships.find(
        (r) => r.companyId === lead.companyId && r.strength >= 0.7,
      );
      if (!rel) continue;

      const company = store.get('companies', lead.companyId);
      const target = store.get('people', rel.targetPersonId);
      if (!company || !target) continue;
      const signalSummaries = lead.signalIds
        .map((id) => store.get('signals', id)?.summary)
        .filter(Boolean);

      let message = null;
      if (llm.enabled) {
        try {
          message = await llm.complete({
            system: INTRO_SYSTEM_PROMPT,
            prompt: JSON.stringify({
              connector: rel.connector,
              target: { name: target.name, role: target.role },
              company: { name: company.name, location: company.location },
              signals: signalSummaries,
            }),
            maxTokens: 400,
          });
        } catch (error) {
          log(`warm-intro: Claude draft failed for ${company.name} (${error.message}), using template`);
        }
      }
      if (!message) message = fallbackMessage(rel, target, company, signalSummaries);

      actions.push({
        id: `act-intro-${lead.companyId}`,
        kind: 'intro_request',
        channel: 'internal',
        leadId: lead.id,
        companyId: lead.companyId,
        targetPersonId: rel.targetPersonId,
        evidenceSignalIds: lead.signalIds,
        payload: {
          connector: rel.connector.name,
          connectorContext: rel.connector.context,
          message,
        },
      });
    }
    return actions;
  },
};
