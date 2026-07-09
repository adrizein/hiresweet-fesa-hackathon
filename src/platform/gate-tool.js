import { runGate } from '../backbone/gate.js';
import { TOOL_RECORD_ENRICHMENT, TOOL_PROPOSE_ACTION } from './agent-config.js';

// Host-side handlers for the Agent's custom tools. These run in OUR process
// against OUR store, so the guardrails are enforced where the model can't reach
// them: Claude proposes, the gate disposes. The Managed Agent calls these tools
// over the session event stream; run.js routes agent.custom_tool_use here and
// sends the result back as user.custom_tool_result.

const HUMAN_DECIDED = new Set(['approved', 'rejected', 'done']);

export function createHostTools(ctx) {
  const { store } = ctx;
  const counts = { proposed: 0, blocked: 0, enriched: 0, skipped: 0 };

  // The roster we hand Claude at kickoff: ids + power-map flags + evidence, so
  // it can only act within accounts we control and must cite real signal ids.
  function powerMap() {
    return {
      companies: store.all('companies').map((c) => ({
        id: c.id,
        name: c.name,
        location: c.location ?? null,
        flags: c.flags ?? [],
        openRoles: (c.openRoles ?? []).map((r) => r.title ?? r),
      })),
      people: store.all('people').map((p) => ({
        id: p.id,
        companyId: p.companyId,
        name: p.name,
        role: p.role ?? null,
        powerRole: p.powerRole ?? null,
        flags: p.flags ?? [],
        email: p.email ?? null,
        emailStatus: p.emailStatus ?? null,
      })),
      signals: store.all('signals').map((s) => ({
        id: s.id,
        companyId: s.companyId,
        type: s.type,
        summary: s.summary,
        confidence: s.confidence ?? null,
      })),
      leads: store
        .all('leads')
        .sort((a, b) => b.score - a.score)
        .map((l) => ({
          id: l.id,
          companyId: l.companyId,
          contactId: l.contactId,
          score: l.score,
          rationale: l.rationale,
          signalIds: l.signalIds,
        })),
    };
  }

  function recordEnrichment(input) {
    const person = input.personId ? store.get('people', input.personId) : null;
    if (!person) {
      return { text: `No person "${input.personId}" in the roster — check the id.`, is_error: true };
    }
    store.upsert('people', {
      id: person.id,
      email: input.email,
      emailStatus: input.emailStatus,
      ...(input.phone ? { phone: input.phone } : {}),
      enrichedBy: `fullenrich (${input.source})`,
    });
    counts.enriched += 1;
    return {
      text: `Recorded ${input.emailStatus} email for ${person.name}. ${
        input.emailStatus === 'verified'
          ? 'An email action to this person can now pass the gate.'
          : 'Still unverified — the email gate will block an email action.'
      }`,
    };
  }

  async function proposeAction(input) {
    const draft = {
      id: `act-${input.kind}-${input.companyId}`,
      kind: input.kind,
      channel: input.channel,
      companyId: input.companyId,
      targetPersonId: input.targetPersonId ?? null,
      evidenceSignalIds: input.evidenceSignalIds ?? [],
      payload: input.payload ?? {},
      reason: input.reason ?? null,
    };

    const existing = store.get('actions', draft.id);
    if (existing && HUMAN_DECIDED.has(existing.status)) {
      counts.skipped += 1;
      return {
        text: `A human already marked this action "${existing.status}" — left untouched, move on.`,
      };
    }

    const gate = await runGate(draft, ctx);
    const status = gate.passed ? 'proposed' : 'blocked';
    store.upsert('actions', {
      ...draft,
      planner: 'claude-managed-agent',
      status,
      gate,
      updatedAt: new Date().toISOString(),
    });
    counts[status] += 1;

    if (gate.passed) {
      return { text: `PASSED — queued in the inbox for human approval (${draft.id}).` };
    }
    const failed = gate.results.filter((r) => !r.passed).map((r) => `${r.name}: ${r.reason}`);
    return {
      text: `BLOCKED (${draft.id}). Fix and retry, or abandon if it is a policy block:\n- ${failed.join('\n- ')}`,
    };
  }

  async function handle(name, input) {
    try {
      if (name === TOOL_RECORD_ENRICHMENT) return recordEnrichment(input);
      if (name === TOOL_PROPOSE_ACTION) return await proposeAction(input);
      return { text: `Unknown tool "${name}".`, is_error: true };
    } catch (error) {
      return { text: `Tool "${name}" crashed: ${error.message}`, is_error: true };
    }
  }

  return { handle, powerMap, counts };
}
