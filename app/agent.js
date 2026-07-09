/* Agent tab — orchestration backbone (mock).
 * The agent sits on top of every tool and every piece of data in the app:
 * it takes a detected account, derives the outreach strategy, shows the full
 * sequence, and can run it autonomously (email only, simulated in V1).
 * It also accepts raw leads (names / companies) and orchestrates the whole
 * pipeline (Sillage -> FullEnrich -> mapping -> brief), and a natural-language
 * command bar that drives the rest of the app.
 * V1: deterministic planning + simulated execution. The real Claude layer
 * replaces planSequence() and the intent parser without touching the UI.
 */

const AGENT_STATE = {
  journal: [],           // { who: 'user'|'agent', msg }
  selectedAccountId: null,
  pipeline: null,        // { leadName, steps: [{label, result, status}] }
  run: null,             // { accountId, steps: [{...seqStep, status}], log: [] }
};

// ---------- sequence planning (deterministic mock of the future Claude layer) ----------

function planSequence(account) {
  const highlighted = account.people
    .map((p, idx) => ({ p, idx }))
    .filter(x => x.p.highlighted);

  if (!highlighted.length) {
    return { warnings: ['No highlighted target: enrichment must run before any sequence.'], steps: [] };
  }

  const primary = highlighted.find(x => x.p.draft) || highlighted[0];
  const secondary = highlighted.find(x => x !== primary)
    || account.people.map((p, idx) => ({ p, idx })).find(x => x.p !== primary.p && /CTO|VP|Head|CEO|COO/i.test(x.p.role));
  const warnings = [];

  if (account.verdict.tier !== 'GO') {
    if (account.verdict.tier === 'HUMAN') {
      warnings.push(`HUMAN verdict: ${account.verdict.why}`);
    } else if (account.verdict.tier === 'EXPLORE') {
      warnings.push(`EXPLORE verdict: pain not confirmed. ${account.verdict.why}`);
    } else {
      warnings.push(`${account.verdict.tier} verdict: ${account.verdict.why}`);
    }
  }
  if (primary.p.contact_status === 'contacted') {
    warnings.push(`${primary.p.name} has already been contacted: email 1 must mention the history in one line (rule 8).`);
  }

  const steps = [
    {
      day: 'D0', channel: 'email', target: primary.p.name,
      action: primary.p.draft ? 'Email 1: personalized draft ready (passed the gate)' : 'Email 1: draft to generate from the brief',
      why: primary.p.brief ? primary.p.brief.why : '',
    },
    {
      day: 'D+2', channel: 'linkedin', target: primary.p.name,
      action: 'LinkedIn touch: profile visit + connection request without a note',
      why: 'Warms up the second channel without adding pressure.', locked: true,
    },
    {
      day: 'D+5', channel: 'email', target: primary.p.name,
      action: 'Short follow-up (2nd touch, max reached for this target)',
      why: 'Never more than 2 touches per target (activation engine §2).',
    },
  ];

  if (secondary) {
    steps.push({
      day: 'D+7', channel: 'email', target: secondary.p.name,
      action: `Fallback to ${secondary.p.role} with a repositioned angle, deliberate switch`,
      why: 'Target 1 silent after 5-7 business days: switch to target 2 (fallback §2).',
    });
  }

  steps.push({
    day: 'D+14', channel: 'system', target: account.name,
    action: 'Stop: dormant account, revisit on a new signal (60-90 days)',
    why: 'No identifiable 2nd contact: handing back to the signal.',
  });

  return { warnings, steps };
}

// ---------- journal ----------

function agentSay(msg) { AGENT_STATE.journal.push({ who: 'agent', msg }); }
function userSay(msg) { AGENT_STATE.journal.push({ who: 'user', msg }); }

// ---------- natural-language command bar (intent parser, mocked Claude layer) ----------

const HELP_TEXT = 'I understand (V1): "add <company1>, <company2>", "open <account>", "sequence <account>", "launch <account>", "integrations", "accounts". The real Claude layer will replace this parser.';

function findAccountByName(fragment) {
  const f = fragment.trim().toLowerCase();
  if (!f) return null;
  return ACCOUNTS.find(a => a.name.toLowerCase().includes(f) || a.id.toLowerCase().includes(f));
}

function handleCommand(text) {
  const t = text.trim();
  if (!t) return;
  userSay(t);

  let m;
  if ((m = t.match(/^(?:add|new)\s+(.+)/i))) {
    const names = m[1].split(/,| and /i).map(s => s.trim()).filter(Boolean);
    agentSay(`Ok, orchestrating the pipeline for ${names.length} lead(s): ${names.join(', ')}. Sillage then FullEnrich then mapping (simulated in V1).`);
    startLeadPipeline(names);
    return;
  }
  if ((m = t.match(/^(?:open|show|view)\s+(.+)/i))) {
    const acc = findAccountByName(m[1]);
    if (acc) { agentSay(`Opening the account view for ${acc.name}.`); location.hash = `#/account/${acc.id}`; return; }
    agentSay(`I can't find an account "${m[1]}". Known accounts: ${ACCOUNTS.map(a => a.name).join(', ')}.`);
    renderAgentView({ view: 'agent' });
    return;
  }
  if ((m = t.match(/^(?:sequence|outreach|strategy)\s+(.+)/i))) {
    const acc = findAccountByName(m[1]);
    if (acc) {
      AGENT_STATE.selectedAccountId = acc.id;
      agentSay(`Here's the outreach strategy I'm proposing for ${acc.name}.`);
      renderAgentView({ view: 'agent' });
      return;
    }
    agentSay(`Account "${m[1]}" not found.`);
    renderAgentView({ view: 'agent' });
    return;
  }
  if ((m = t.match(/^(?:launch|run|autopilot)\s*(.*)/i))) {
    const acc = m[1] ? findAccountByName(m[1]) : ACCOUNTS.find(a => a.id === AGENT_STATE.selectedAccountId);
    if (acc) {
      AGENT_STATE.selectedAccountId = acc.id;
      agentSay(`Launching the sequence for ${acc.name} autonomously (email only, simulated).`);
      renderAgentView({ view: 'agent' });
      startAutopilot(acc.id, false);
      return;
    }
    agentSay('Specify the account: "launch Lumen Grid".');
    renderAgentView({ view: 'agent' });
    return;
  }
  if (/integration/i.test(t)) { agentSay('Opening integrations.'); location.hash = '#/integrations'; return; }
  if (/^(accounts|list)$/i.test(t)) { agentSay('Opening the accounts list.'); location.hash = '#/'; return; }
  agentSay(HELP_TEXT);
  renderAgentView({ view: 'agent' });
}

// ---------- add-lead pipeline (multi-format input, FullEnrich-first) ----------
// Sillage is NOT used for manually-entered leads: its watchlist is capped at
// 20 pre-selected companies (block A). FullEnrich is the entry point here.

const LEAD_TYPE_LABELS = {
  company: 'company name',
  domain: 'domain',
  email: 'work email',
  linkedin_person: 'LinkedIn profile',
  linkedin_company: 'LinkedIn company page',
  person_at_company: 'person @ company',
};

function prettify(slug) {
  return slug.replace(/[-_.]+/g, ' ').trim().replace(/\b[a-z]/g, c => c.toUpperCase());
}

function detectLead(raw) {
  const t = raw.trim();
  let m;
  if ((m = t.match(/linkedin\.com\/in\/([a-z0-9-]+)/i))) {
    return { raw: t, type: 'linkedin_person', person: prettify(m[1]), company: null, label: prettify(m[1]) };
  }
  if ((m = t.match(/linkedin\.com\/company\/([a-z0-9-]+)/i))) {
    return { raw: t, type: 'linkedin_company', person: null, company: prettify(m[1]), label: prettify(m[1]) };
  }
  if ((m = t.match(/^([^\s@]+)@([^\s@]+\.[a-z]{2,})$/i))) {
    const company = prettify(m[2].replace(/\.[a-z]{2,}$/i, ''));
    return { raw: t, type: 'email', person: prettify(m[1]), company, label: `${prettify(m[1])} (${company})` };
  }
  if ((m = t.match(/^(.+?)\s+@\s+(.+)$/))) {
    return { raw: t, type: 'person_at_company', person: m[1].trim(), company: m[2].trim(), label: `${m[1].trim()} (${m[2].trim()})` };
  }
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(t)) {
    return { raw: t, type: 'domain', person: null, company: prettify(t.replace(/\.[a-z]{2,}$/i, '')), label: prettify(t.replace(/\.[a-z]{2,}$/i, '')) };
  }
  return { raw: t, type: 'company', person: null, company: t, label: t };
}

function pipelineSteps(lead) {
  const enrichStep = {
    email: { label: 'FullEnrich reverse lookup: email to identity + company', result: 'Identity and company resolved, contact details verified (simulated)' },
    linkedin_person: { label: 'FullEnrich: LinkedIn profile to verified contact details (email, phone)', result: 'Contact details and current company resolved (simulated)' },
    linkedin_company: { label: 'FullEnrich company: LinkedIn company to domain + target contacts', result: '2 target roles identified (simulated)' },
    person_at_company: { label: `FullEnrich person: ${lead.person} at ${lead.company}, contact details verified`, result: 'Email and phone resolved (simulated)' },
    domain: { label: 'FullEnrich company: domain to firmographics + target contacts', result: '2 target roles identified (simulated)' },
    company: { label: 'FullEnrich company: name to domain + target contacts', result: 'Domain resolved, 2 target roles identified (simulated)' },
  }[lead.type];

  return [
    { label: `Input detected: ${LEAD_TYPE_LABELS[lead.type]}`, result: lead.raw },
    { label: 'Sillage: not used for manual leads', result: 'Watchlist limited to 20 pre-selected accounts (Block A): signal to confirm via FullEnrich + public sources' },
    enrichStep,
    { label: 'Mapping: org chart + highlighting', result: lead.person ? `${lead.person} highlighted (simulated)` : 'CTO highlighted by default (simulated)' },
    { label: 'Activation engine: brief + angle', result: 'Skeleton brief generated, angle pending proof' },
    { label: 'Verdict', result: 'EXPLORE: to confirm by a human before any activation' },
  ].map(s => ({ ...s, status: 'pending' }));
}

function slugify(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lead';
}

function addAccountFromLead(lead) {
  const companyName = lead.company || `${lead.person} (company to identify)`;
  const slug = slugify(companyName);
  if (ACCOUNTS.some(a => a.id === `acct_manual_${slug}`)) return null;
  const primaryPerson = lead.person
    ? {
        name: lead.person, role: 'Role to confirm', email: lead.type === 'email' ? lead.raw : null, phone: null,
        linkedin_url: lead.type === 'linkedin_person' ? lead.raw : null,
        highlighted: true, contact_status: 'never',
        pitch: 'Pitch to generate after real FullEnrich enrichment.',
        brief: {
          why: 'Person provided as input: role and mandate to confirm via FullEnrich.',
          limits: 'Identity partially confirmed: no activation before real enrichment.',
          angle: 'None until the signal and pain are confirmed.',
          social_proof: [],
        },
        draft: null,
      }
    : {
        name: 'CTO (to identify)', role: 'CTO', email: null, phone: null, linkedin_url: null,
        highlighted: true, contact_status: 'never',
        pitch: 'Pitch to generate after real enrichment of contacts.',
        brief: {
          why: 'Default target role for this account type, identity to confirm via FullEnrich.',
          limits: 'Identity not confirmed: no activation before real enrichment.',
          angle: 'None until the signal and pain are confirmed.',
          social_proof: [],
        },
        draft: null,
      };
  const account = {
    id: `acct_manual_${slug}`,
    name: companyName,
    domain: lead.type === 'domain' ? lead.raw : `${slug}.example`,
    url: '#',
    size: '?',
    location: 'To enrich',
    stage: 'To qualify',
    signals: [
      { type: 'manual_input', detail: `Lead added via the agent (${LEAD_TYPE_LABELS[lead.type]}), FullEnrich enrichment to launch`, detected_at: '2026-07-09', source: 'agent' },
    ],
    verdict: { tier: 'EXPLORE', why: 'Lead entered manually: contacts to enrich via FullEnrich (Sillage reserved for the 20-account Block A watchlist).' },
    investors: [],
    connections: [],
    people: [
      primaryPerson,
      {
        name: 'Head of Talent (to identify)', role: 'Head of Talent', email: null, phone: null, linkedin_url: null,
        highlighted: false, contact_status: 'never',
        pitch: 'Potential fallback target, to confirm after enrichment.',
        brief: {
          why: 'Possible fallback if a TA exists, to confirm.',
          limits: "Don't bypass an existing TA to cold-contact EMs.",
          angle: 'None.',
          social_proof: [],
        },
        draft: null,
      },
    ],
  };
  ACCOUNTS.push(account);
  return account;
}

function startLeadPipeline(raws) {
  const lead = detectLead(raws[0]);
  AGENT_STATE.pipeline = { lead, leadName: lead.label, queue: raws.slice(1), steps: pipelineSteps(lead) };
  renderAgentView({ view: 'agent' });
  advancePipeline();
}

function advancePipeline() {
  if (parseHash().view !== 'agent') { AGENT_STATE.pipeline = null; return; }
  const pipe = AGENT_STATE.pipeline;
  if (!pipe) return;
  const idx = pipe.steps.findIndex(s => s.status !== 'done');
  if (idx === -1) {
    const created = addAccountFromLead(pipe.lead);
    agentSay(created
      ? `${pipe.leadName} added to the accounts list with EXPLORE verdict. The real FullEnrich call will take over in the next layer.`
      : `${pipe.leadName} was already in the list, not duplicating it.`);
    const rest = pipe.queue;
    AGENT_STATE.pipeline = null;
    if (rest.length) startLeadPipeline(rest);
    else renderAgentView({ view: 'agent' });
    return;
  }
  pipe.steps[idx].status = 'running';
  renderAgentView({ view: 'agent' });
  setTimeout(() => {
    if (AGENT_STATE.pipeline !== pipe) return;
    pipe.steps[idx].status = 'done';
    advancePipeline();
  }, 650);
}

// ---------- autopilot (simulated run, email only) ----------

function startAutopilot(accountId, overridden) {
  const account = ACCOUNTS.find(a => a.id === accountId);
  if (!account) return;
  const plan = planSequence(account);
  if (plan.warnings.length && !overridden) return; // UI shows the override button instead
  if (!plan.steps.length) {
    agentSay('No highlighted target: nothing to sequence on this account.');
    renderAgentView({ view: 'agent' });
    return;
  }

  const steps = plan.steps.map(s => ({ ...s, status: 'pending' }));
  const log = [];
  if (overridden && plan.warnings.length) {
    log.push({ icon: '✍️', text: `Human override logged: launching despite ${plan.warnings.length} warning(s).` });
  }
  AGENT_STATE.run = { accountId, steps, log };
  renderAgentView({ view: 'agent' });
  advanceAutopilot();
}

function advanceAutopilot() {
  if (parseHash().view !== 'agent') { AGENT_STATE.run = null; return; }
  const run = AGENT_STATE.run;
  if (!run) return;
  const idx = run.steps.findIndex(s => s.status === 'pending');
  if (idx === -1) {
    if (run.steps.length) {
      run.log.push({ icon: '🏁', text: 'Sequence scheduled end to end. Simulated execution: no message actually sends in V1.' });
    }
    renderAgentView({ view: 'agent' });
    return;
  }
  const step = run.steps[idx];
  step.status = 'running';
  renderAgentView({ view: 'agent' });
  setTimeout(() => {
    if (AGENT_STATE.run !== run) return;
    if (step.channel === 'email') {
      step.status = 'done';
      run.log.push({ icon: '✉️', text: `${step.day} · gate checked then email scheduled to ${step.target} (simulated).` });
    } else if (step.channel === 'linkedin') {
      step.status = 'skipped';
      run.log.push({ icon: '🔗', text: `${step.day} · LinkedIn step noted but not executed: email-only channel for now.` });
    } else {
      step.status = 'done';
      run.log.push({ icon: '⏹', text: `${step.day} · ${step.action}` });
    }
    advanceAutopilot();
  }, 620);
}

// ---------- rendering ----------

const CHANNEL_META = {
  email: { icon: '✉️', label: 'Email' },
  linkedin: { icon: '🔗', label: 'LinkedIn' },
  system: { icon: '⏹', label: 'Rule' },
};

function journalHtml() {
  if (!AGENT_STATE.journal.length) {
    return '<div class="agent-journal-empty">The agent journal will appear here. Try a command, or click a suggestion.</div>';
  }
  return AGENT_STATE.journal.slice(-14).map(e => `
    <div class="agent-msg ${e.who}">
      <span class="agent-msg-who">${e.who === 'agent' ? '🤖' : '🧑'}</span>
      <span class="agent-msg-text">${esc(e.msg)}</span>
    </div>
  `).join('');
}

function pipelineHtml() {
  const pipe = AGENT_STATE.pipeline;
  if (!pipe) return '';
  const items = pipe.steps.map(s => `
    <div class="pipe-step ${s.status}">
      <span class="pipe-dot"></span>
      <div>
        <div class="pipe-label">${esc(s.label)}</div>
        ${s.status === 'done' ? `<div class="pipe-result">${esc(s.result)}</div>` : ''}
      </div>
    </div>
  `).join('');
  return `
    <div class="pipe-title">Pipeline running: <strong>${esc(pipe.leadName)}</strong>${pipe.queue.length ? ` (then ${pipe.queue.length} more)` : ''}</div>
    <div class="pipe-steps">${items}</div>
  `;
}

function sequenceTimelineHtml(steps, runSteps) {
  return steps.map((s, i) => {
    const rs = runSteps ? runSteps[i] : null;
    const status = rs ? rs.status : '';
    const meta = CHANNEL_META[s.channel] || CHANNEL_META.system;
    return `
      <div class="atl-step ${esc(s.channel)} ${status}">
        <div class="atl-day">${esc(s.day)}</div>
        <div class="atl-node">
          <span class="atl-icon">${meta.icon}</span>
          ${status ? `<span class="atl-status ${status}"></span>` : ''}
        </div>
        <div class="atl-body">
          <div class="atl-action">${esc(s.action)} ${s.locked ? '<span class="atl-locked">channel simulated in V1</span>' : ''}</div>
          <div class="atl-meta">${meta.label} · target: ${esc(s.target)}</div>
          <div class="atl-why">${esc(s.why)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function strategySectionHtml() {
  const options = ACCOUNTS.map(a =>
    `<option value="${esc(a.id)}" ${a.id === AGENT_STATE.selectedAccountId ? 'selected' : ''}>${esc(a.name)} (${esc(a.verdict.tier)})</option>`
  ).join('');

  const account = ACCOUNTS.find(a => a.id === AGENT_STATE.selectedAccountId) || null;
  if (!account) {
    return `
      <div class="section-label">Outreach strategy</div>
      <div class="agent-card">
        <select id="agent-account-select" class="agent-select">
          <option value="">Choose an account to orchestrate…</option>${options}
        </select>
      </div>
    `;
  }

  const plan = planSequence(account);
  const run = AGENT_STATE.run && AGENT_STATE.run.accountId === account.id ? AGENT_STATE.run : null;

  const warnings = plan.warnings.length ? `
    <div class="agent-warnings">
      <div class="agent-warnings-title">⚠️ Gate checkpoint: ${plan.warnings.length} warning(s), the human decides</div>
      ${plan.warnings.map(w => `<div class="agent-warning">${esc(w)}</div>`).join('')}
    </div>` : '';

  const highlighted = account.people.filter(p => p.highlighted);
  const primary = highlighted.find(p => p.draft) || highlighted[0];
  const primaryIdx = primary ? account.people.indexOf(primary) : -1;

  let launchBtn = '';
  if (!run) {
    launchBtn = plan.warnings.length
      ? `<button class="btn warning-launch" id="agent-launch" data-override="1">Launch despite ${plan.warnings.length} warning(s), override logged</button>`
      : `<button class="btn primary" id="agent-launch" data-override="0">🚀 Run autonomously (email only, simulated)</button>`;
  }

  const runLog = run ? `
    <div class="agent-runlog">
      ${run.log.map(l => `<div class="agent-runlog-line">${l.icon} ${esc(l.text)}</div>`).join('')}
    </div>` : '';

  const seqLink = primaryIdx >= 0
    ? `<a class="agent-atl-link" href="#/account/${esc(account.id)}/person/${primaryIdx}/sequence">Open the detailed strategy for ${esc(primary.name)} (editable workflow) &rarr;</a>`
    : '';

  return `
    <div class="section-label">Outreach strategy</div>
    <div class="agent-card">
      <div class="agent-strategy-head">
        <select id="agent-account-select" class="agent-select">${options}</select>
        <span class="tier ${esc(account.verdict.tier)}">${esc(account.verdict.tier)}</span>
      </div>
      <div class="agent-strategy-summary">
        Primary target: <strong>${primary ? esc(primary.name) + ' (' + esc(primary.role) + ')' : 'to enrich'}</strong>.
        Channels: email (active) + LinkedIn (shown, simulated in V1). Rules: 2 touches max per target, repositioned fallback at D+7, stop at D+14.
      </div>
      ${warnings}
      <div class="atl-timeline">${sequenceTimelineHtml(plan.steps, run ? run.steps : null)}</div>
      ${launchBtn}
      ${runLog}
      ${seqLink}
    </div>
    <div class="section-label">Account view · ${esc(account.name)}</div>
    <div class="agent-card">
      <div style="color:var(--ink-soft);font-size:13.5px;">${esc(account.stage)} · ${account.size} pers · ${esc(account.location)} · ${esc(account.domain)}</div>
      <div class="chips">${account.signals.map(signalChip).join('')}${investorChips(account)}</div>
    </div>
    ${investorsSection(account)}
    ${connectionGraph(account)}
    <div class="section-label">Org chart · highlighted targets (click for the brief)</div>
    <div class="org">${orgChartHtml(account, primaryIdx)}</div>
  `;
}

function renderAgentView() {
  const suggestions = ['add Helios Freight, Vantor Health', 'sequence Lumen Grid', 'launch Lumen Grid', 'open Northwind Robotics'];

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Orchestration agent</div>
        <div class="page-sub">The layer that drives every tool: from signal to send. V1 backbone: deterministic planning, simulated execution, the real Claude layer plugs in here.</div>
      </div>
    </div>

    <div class="agent-cmdbar">
      <input type="text" id="agent-input" class="agent-input" placeholder="Talk to the agent: &quot;add Helios Freight&quot;, &quot;sequence Lumen Grid&quot;, &quot;launch Lumen Grid&quot;…" autocomplete="off">
      <button class="btn primary agent-send" id="agent-send">Send</button>
    </div>
    <div class="agent-suggestions">
      ${suggestions.map(s => `<span class="agent-chip" data-cmd="${esc(s)}">${esc(s)}</span>`).join('')}
    </div>

    <div class="agent-grid">
      <div class="agent-card">
        <div class="agent-card-title">➕ Add leads (any format)</div>
        <div class="agent-card-sub">Company name, domain, work email, LinkedIn URL (profile or company), or "First Last @ Company". Multiple leads separated by commas. Enrichment via <strong>FullEnrich</strong> (Sillage reserved for the 20-account Block A watchlist).</div>
        <div class="agent-addlead">
          <input type="text" id="agent-lead-input" class="agent-input small" placeholder="Ex: calderis.io, jeanne@novelune.fr, linkedin.com/in/first-last, Paul Rivet @ Calderis" autocomplete="off">
          <button class="btn primary small" id="agent-lead-add">Orchestrate</button>
        </div>
        ${pipelineHtml()}
      </div>
      <div class="agent-card">
        <div class="agent-card-title">🤖 Agent journal</div>
        <div class="agent-journal" id="agent-journal">${journalHtml()}</div>
      </div>
    </div>

    ${strategySectionHtml()}
  `;

  const input = document.getElementById('agent-input');
  const send = () => { const v = input.value; input.value = ''; handleCommand(v); };
  document.getElementById('agent-send').addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  $app.querySelectorAll('.agent-chip').forEach(c => {
    c.addEventListener('click', () => handleCommand(c.dataset.cmd));
  });

  const leadInput = document.getElementById('agent-lead-input');
  const addLead = () => {
    const names = leadInput.value.split(/,| and /i).map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    userSay(`Add ${names.join(', ')}`);
    agentSay(`Ok, orchestration pipeline launched for ${names.join(', ')} (simulated in V1).`);
    leadInput.value = '';
    startLeadPipeline(names);
  };
  document.getElementById('agent-lead-add').addEventListener('click', addLead);
  leadInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLead(); });

  $app.querySelectorAll('.person-card').forEach(el => {
    el.addEventListener('click', () => {
      location.hash = `#/account/${AGENT_STATE.selectedAccountId}/person/${el.dataset.idx}`;
    });
  });

  const select = document.getElementById('agent-account-select');
  if (select) select.addEventListener('change', () => {
    AGENT_STATE.selectedAccountId = select.value || null;
    AGENT_STATE.run = null;
    renderAgentView();
  });

  const launch = document.getElementById('agent-launch');
  if (launch) launch.addEventListener('click', () => {
    startAutopilot(AGENT_STATE.selectedAccountId, launch.dataset.override === '1');
  });

  const journal = document.getElementById('agent-journal');
  if (journal) journal.scrollTop = journal.scrollHeight;
}

window.renderAgentView = renderAgentView;
