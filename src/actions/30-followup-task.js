// Tier 3, nurture: every outreach that made it past the gate gets a draft
// CRM follow-up task. Runs last (file order 30-) so it can see what the
// earlier planners produced this run. Draft only — nothing is written to a
// live CRM without a human approving.
export default {
  name: 'followup-task',
  description: 'Draft a CRM follow-up task for every outreach that passed the gate',

  async plan(ctx) {
    const { store } = ctx;
    const actions = [];

    for (const action of store.all('actions')) {
      if (!['intro_request', 'outreach_email'].includes(action.kind)) continue;
      if (!['proposed', 'approved'].includes(action.status)) continue;
      const company = store.get('companies', action.companyId);
      if (!company) continue;

      actions.push({
        id: `act-task-${action.companyId}`,
        kind: 'crm_task',
        channel: 'crm',
        leadId: action.leadId,
        companyId: action.companyId,
        targetPersonId: action.targetPersonId,
        evidenceSignalIds: action.evidenceSignalIds,
        payload: {
          task: `Follow up with ${company.name} if no reply 3 business days after the first touch`,
          dueInDays: 3,
        },
      });
    }
    return actions;
  },
};
