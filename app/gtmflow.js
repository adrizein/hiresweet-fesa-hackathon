/* GTM Flow tab — autonomous fleet monitor (mock).
 * Turns the ~19 accounts of data/accounts.json (plus anything findleads.js
 * promotes via window.GTM.enqueue) into a Notion-like table where every lead
 * progresses on its own through 6 stages: Signal -> Enrich -> Analyse ->
 * Brief -> Sequence -> Outreach. Each row runs an independent chain of
 * setTimeout ticks (staggered so the fleet feels alive), gated fail-closed
 * at the Analyse step by the account's verdict.tier: only GO sails through
 * on its own, EXPLORE/HUMAN pause for a human "Approuver" override, SKIP
 * stops immediately at Signal. Draft-only: Outreach never actually sends
 * anything, it just logs that a sequence was scheduled.
 *
 * Contract exposed to the rest of the app (see window.GTM below):
 *   window.GTM.STAGES        - the 6 stages, used by anything that wants to
 *                               draw its own mini progress UI.
 *   window.GTM.enqueue(id)   - idempotent: adds a queued row for accountId
 *                               if it doesn't exist yet (used by findleads.js
 *                               when a lead gets promoted to an account).
 *   window.renderGtmFlowView(route) - called by app.js's router for
 *                               #/gtmflow and #/gtmflow/:accountId.
 *
 * State lives in the GTM_STATE module variable (no localStorage): it
 * survives hash navigation within the page but resets on reload. Progress
 * keeps ticking even while the user is on another tab — see maybeRender().
 */

const GTM_STAGES = [
  { key: 'signal', label: 'Signal', icon: '📡' },
  { key: 'enrich', label: 'Enrich', icon: '🔎' },
  { key: 'analyse', label: 'Analysis', icon: '🧠' },
  { key: 'brief', label: 'Brief', icon: '📋' },
  { key: 'sequence', label: 'Sequence', icon: '🧭' },
  { key: 'outreach', label: 'Outreach', icon: '✉️' },
];

const GTM_STATUS_LABELS = {
  queued: 'Queued',
  running: 'Running',
  review: 'In review',
  done: 'Done',
  blocked: 'Blocked',
};

const GTM_STATE = {
  rows: {},     // accountId -> { accountId, stageIdx, status, needsReview, log, lastStep }
  order: [],    // display order, accountId list
  timers: {},   // accountId -> setTimeout handle
  paused: false,
};

// ---------- row lifecycle ----------

function gtmCreateRow(accountId) {
  return {
    accountId,
    stageIdx: 0,
    status: 'queued',
    needsReview: false,
    log: [],
    lastStep: 'Queued',
  };
}

function gtmEnsureRows() {
  ACCOUNTS.forEach(a => {
    if (!GTM_STATE.rows[a.id]) {
      GTM_STATE.rows[a.id] = gtmCreateRow(a.id);
      GTM_STATE.order.push(a.id);
    }
  });
}

function gtmEnqueue(accountId) {
  if (!accountId) return;
  if (!GTM_STATE.rows[accountId]) {
    GTM_STATE.rows[accountId] = gtmCreateRow(accountId);
    GTM_STATE.order.push(accountId);
  }
  gtmMaybeRender();
}

function gtmPushLog(row, icon, text) {
  row.log.push({ icon, text });
}

// ---------- scheduling ----------

function gtmClearTimer(accountId) {
  if (GTM_STATE.timers[accountId]) {
    clearTimeout(GTM_STATE.timers[accountId]);
    delete GTM_STATE.timers[accountId];
  }
}

function gtmScheduleStep(accountId, delay) {
  gtmClearTimer(accountId);
  GTM_STATE.timers[accountId] = setTimeout(() => gtmRunStep(accountId), delay);
}

function gtmLaunchAll() {
  gtmEnsureRows();
  GTM_STATE.paused = false;
  const queuedIds = GTM_STATE.order.filter(id => GTM_STATE.rows[id].status === 'queued');
  queuedIds.forEach((id, i) => {
    const row = GTM_STATE.rows[id];
    row.status = 'running';
    row.lastStep = 'Flow starting';
    gtmScheduleStep(id, 140 + i * 130); // stagger: keeps the fleet feeling alive
  });
  gtmMaybeRender();
}

function gtmTogglePause() {
  GTM_STATE.paused = !GTM_STATE.paused;
  if (GTM_STATE.paused) {
    Object.keys(GTM_STATE.timers).forEach(gtmClearTimer);
  } else {
    GTM_STATE.order.forEach(id => {
      const row = GTM_STATE.rows[id];
      if (row && row.status === 'running') gtmScheduleStep(id, 250 + Math.random() * 200);
    });
  }
  gtmMaybeRender();
}

function gtmResetAll() {
  Object.keys(GTM_STATE.timers).forEach(gtmClearTimer);
  GTM_STATE.paused = false;
  GTM_STATE.rows = {};
  GTM_STATE.order = [];
  gtmEnsureRows();
  gtmMaybeRender();
}

// ---------- the per-row agent step ----------

function gtmRunStep(accountId) {
  gtmClearTimer(accountId);
  const row = GTM_STATE.rows[accountId];
  const account = ACCOUNTS.find(a => a.id === accountId);
  if (!row || !account || row.status !== 'running') { gtmMaybeRender(); return; }

  const stage = GTM_STAGES[row.stageIdx];
  let continueChain = true;

  switch (stage.key) {
    case 'signal': {
      const sig = (account.signals || [])[0];
      const label = sig ? (SIGNAL_LABELS[sig.type] || sig.type) : 'signal';
      const detail = sig ? `${label}: ${sig.detail}` : 'no explicit signal, manual sourcing';
      gtmPushLog(row, '📡', `Signal captured: ${detail}`);
      row.lastStep = 'Signal captured';
      if (account.verdict.tier === 'SKIP') {
        row.status = 'blocked';
        gtmPushLog(row, '⛔', `Account discarded at signal: ${account.verdict.why}`);
        row.lastStep = 'Discarded at signal';
        continueChain = false;
      }
      break;
    }
    case 'enrich': {
      const people = account.people || [];
      const withCoords = people.filter(p => p.email || p.phone || p.linkedin_url).length;
      gtmPushLog(row, '🔎', `FullEnrich: ${withCoords} verified contact detail(s) out of ${people.length} contact(s) (simulated)`);
      row.lastStep = 'FullEnrich: contact details verified';
      break;
    }
    case 'analyse': {
      gtmPushLog(row, '🧠', `Sillage + activation engine: verdict ${account.verdict.tier}. ${account.verdict.why}`);
      row.lastStep = `Verdict ${account.verdict.tier}`;
      if (account.verdict.tier === 'EXPLORE') {
        row.status = 'review';
        row.needsReview = true;
        gtmPushLog(row, '🔍', `Human review required: pain not confirmed. ${account.verdict.why}`);
        row.lastStep = 'In review: pain not confirmed';
        continueChain = false;
      } else if (account.verdict.tier === 'HUMAN') {
        row.status = 'review';
        row.needsReview = true;
        gtmPushLog(row, '🚧', `Fail-closed gate: ${account.verdict.why}. Human review required.`);
        row.lastStep = 'In review: fail-closed gate';
        continueChain = false;
      } else if (account.verdict.tier === 'SKIP') {
        row.status = 'blocked';
        gtmPushLog(row, '⛔', `Account discarded at analysis: ${account.verdict.why}`);
        row.lastStep = 'Discarded at analysis';
        continueChain = false;
      }
      break;
    }
    case 'brief': {
      const target = (account.people || []).find(p => p.highlighted) || (account.people || [])[0];
      const name = target ? target.name : 'contact to identify';
      gtmPushLog(row, '📋', `Activation engine: brief generated for ${name} (why + limits + angle + social proof)`);
      row.lastStep = `Brief generated for ${name}`;
      break;
    }
    case 'sequence': {
      const plan = planSequence(account);
      const warn = plan.warnings.length ? `, ${plan.warnings.length} warning(s) logged` : '';
      gtmPushLog(row, '🧭', `Sequence planned: ${plan.steps.length} step(s)${warn}`);
      row.lastStep = `Sequence planned (${plan.steps.length} steps)`;
      break;
    }
    case 'outreach': {
      gtmPushLog(row, '✉️', 'Sequence scheduled, draft-only, nothing sent (simulated)');
      row.lastStep = 'Outreach scheduled (draft-only)';
      row.status = 'done';
      continueChain = false;
      break;
    }
    default:
      continueChain = false;
  }

  if (continueChain && row.status === 'running') {
    row.stageIdx = Math.min(row.stageIdx + 1, GTM_STAGES.length - 1);
    gtmScheduleStep(accountId, 500 + Math.random() * 150);
  }

  gtmMaybeRender();
}

function gtmApproveRow(accountId) {
  const row = GTM_STATE.rows[accountId];
  const account = ACCOUNTS.find(a => a.id === accountId);
  if (!row || !account || !row.needsReview) return;
  gtmPushLog(row, '✍️', `Human override logged: resuming despite verdict ${account.verdict.tier}.`);
  row.needsReview = false;
  row.status = 'running';
  row.lastStep = 'Resumed after human override';
  row.stageIdx = Math.min(row.stageIdx + 1, GTM_STAGES.length - 1);
  gtmScheduleStep(accountId, 350);
  gtmMaybeRender();
}

// ---------- rendering guard : keep advancing off-screen, only paint when visible ----------

function gtmMaybeRender() {
  if (!location.hash.startsWith('#/gtmflow')) return;
  const route = typeof parseHash === 'function' ? parseHash() : { view: 'gtmflow' };
  if (route.view === 'gtmflow') renderGtmFlowView(route);
}

// ---------- stepper / stats helpers ----------

function gtmDotClass(row, i) {
  if (row.status === 'done') return 'done';
  if (row.status === 'blocked') return i < row.stageIdx ? 'done' : (i === row.stageIdx ? 'blocked' : 'pending');
  if (row.status === 'review') return i < row.stageIdx ? 'done' : (i === row.stageIdx ? 'review' : 'pending');
  if (row.status === 'running') return i < row.stageIdx ? 'done' : (i === row.stageIdx ? 'current' : 'pending');
  return 'pending'; // queued
}

function gtmStepperDots(row) {
  return GTM_STAGES.map((s, i) => `<span class="gtm-dot ${gtmDotClass(row, i)}" title="${esc(s.label)}"></span>`).join('');
}

function gtmStageLabelText(row) {
  if (row.status === 'queued') return 'Queued';
  if (row.status === 'done') return `${GTM_STAGES[GTM_STAGES.length - 1].label} ${GTM_STAGES.length}/${GTM_STAGES.length}`;
  return `${GTM_STAGES[row.stageIdx].label} ${row.stageIdx + 1}/${GTM_STAGES.length}`;
}

function gtmComputeStats() {
  const stats = { queued: 0, running: 0, review: 0, done: 0, blocked: 0 };
  GTM_STATE.order.forEach(id => {
    const row = GTM_STATE.rows[id];
    if (row && stats[row.status] !== undefined) stats[row.status]++;
  });
  return stats;
}

// ---------- table view ----------

function renderGtmTable() {
  const stats = gtmComputeStats();

  const rowsHtml = GTM_STATE.order.map(id => {
    const account = ACCOUNTS.find(a => a.id === id);
    const row = GTM_STATE.rows[id];
    if (!account || !row) return '';
    const sig = (account.signals || [])[0];
    return `
      <tr class="gtmflow-row" data-id="${esc(id)}" data-status="${esc(row.status)}">
        <td class="gtm-col-lead">
          <div class="gtm-lead-name">${esc(account.name)}</div>
          <div class="gtm-lead-domain">${esc(account.domain)}</div>
        </td>
        <td class="gtm-col-signal">${sig ? signalChip(sig) : '<span class="gtm-dash">—</span>'}</td>
        <td class="gtm-col-verdict"><span class="tier ${esc(account.verdict.tier)}">${esc(account.verdict.tier)}</span></td>
        <td class="gtm-col-stage">
          <div class="gtm-stepper">${gtmStepperDots(row)}</div>
          <div class="gtm-stage-label">${esc(gtmStageLabelText(row))}</div>
        </td>
        <td class="gtm-col-status"><span class="gtmflow-status ${esc(row.status)}">${esc(GTM_STATUS_LABELS[row.status] || row.status)}</span></td>
        <td class="gtm-col-review">${row.needsReview ? `<button class="btn small primary gtmflow-approve" data-id="${esc(id)}">✅ Approve</button>` : '<span class="gtm-dash">—</span>'}</td>
        <td class="gtm-col-last">${esc(truncate(row.lastStep || '', 66))}</td>
      </tr>
    `;
  }).join('');

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">GTM Flow</div>
        <div class="page-sub">End-to-end autonomous orchestration: signal &rarr; enrich &rarr; analysis &rarr; brief &rarr; sequence &rarr; outreach. Draft-only, the human arbitrates.</div>
      </div>
    </div>

    <div class="gtmflow-controls">
      <button class="btn primary gtmflow-launch-btn" id="gtm-launch">🚀 Run GTM Flow</button>
      <button class="btn ghost" id="gtm-pause">${GTM_STATE.paused ? '▶ Resume' : '⏸ Pause'}</button>
      <button class="btn ghost" id="gtm-reset">↺ Reset</button>
    </div>

    <div class="gtmflow-stats">
      <div class="gtmflow-stat queued"><span class="n">${stats.queued}</span><span class="l">Queued</span></div>
      <div class="gtmflow-stat running"><span class="n">${stats.running}</span><span class="l">Running</span></div>
      <div class="gtmflow-stat review"><span class="n">${stats.review}</span><span class="l">In review</span></div>
      <div class="gtmflow-stat done"><span class="n">${stats.done}</span><span class="l">Done</span></div>
      <div class="gtmflow-stat blocked"><span class="n">${stats.blocked}</span><span class="l">Blocked</span></div>
    </div>

    <div class="gtmflow-table-wrap">
      <table class="gtmflow-table">
        <thead>
          <tr>
            <th>Lead</th><th>Signal</th><th>Verdict</th><th>Stage</th><th>Status</th><th>Review</th><th>Last action</th>
          </tr>
        </thead>
        <tbody>${rowsHtml || '<tr><td colspan="7" class="gtmflow-empty">No account to orchestrate yet.</td></tr>'}</tbody>
      </table>
    </div>
  `;

  document.getElementById('gtm-launch').addEventListener('click', gtmLaunchAll);
  document.getElementById('gtm-pause').addEventListener('click', gtmTogglePause);
  document.getElementById('gtm-reset').addEventListener('click', gtmResetAll);

  $app.querySelectorAll('.gtmflow-approve').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); gtmApproveRow(btn.dataset.id); });
  });
  $app.querySelectorAll('.gtmflow-row').forEach(tr => {
    tr.addEventListener('click', () => { location.hash = `#/gtmflow/${tr.dataset.id}`; });
  });
}

// ---------- per-account journal view ----------

function renderGtmJournal(accountId) {
  const account = ACCOUNTS.find(a => a.id === accountId);
  const row = GTM_STATE.rows[accountId];
  if (!account || !row) { location.hash = '#/gtmflow'; return; }

  const tier = account.verdict.tier;
  const icon = { GO: '✅', HUMAN: '🚧', EXPLORE: '🔍', SKIP: '⛔' }[tier] || 'ℹ️';

  const timeline = GTM_STAGES.map((s, i) => `
    <div class="gtmflow-tl-step ${gtmDotClass(row, i)}">
      <span class="gtmflow-tl-icon">${s.icon}</span>
      <span class="gtmflow-tl-label">${esc(s.label)}</span>
    </div>
  `).join('');

  const journalEntries = row.log.length
    ? row.log.map(l => `
        <div class="gtmflow-log-line">
          <span class="gtmflow-log-icon">${l.icon}</span>
          <span class="gtmflow-log-text">${esc(l.text)}</span>
        </div>
      `).join('')
    : '<div class="gtmflow-log-empty">No activity yet. Run the GTM Flow from the list view.</div>';

  const highlightedIdx = account.people.findIndex(p => p.highlighted);
  const personIdx = highlightedIdx >= 0 ? highlightedIdx : 0;

  const gateBlock = row.needsReview ? `
    <div class="gtmflow-gate ${esc(tier)}">
      <div class="gtmflow-gate-title">⛑️ Human review required &middot; fail-closed gate</div>
      <div class="gtmflow-gate-why">${esc(account.verdict.why)}</div>
      <button class="btn primary gtmflow-approve" data-id="${esc(account.id)}">✅ Approve and continue (override logged)</button>
    </div>
  ` : '';

  $app.innerHTML = `
    <div class="gtmflow-journal-head">
      <span class="back" id="gtmflow-back">&larr; Back to GTM Flow</span>
    </div>
    <div class="brief-panel gtmflow-journal-panel">
      <span class="close" id="gtmflow-close" title="Close">&times;</span>
      <h2>${esc(account.name)}</h2>
      <div class="prole">${esc(account.domain)} &middot; <span class="tier ${esc(tier)}">${esc(tier)}</span></div>
      <div class="gtmflow-journal-verdict">${icon} ${esc(account.verdict.why)}</div>

      <div class="section-label">Progress</div>
      <div class="gtmflow-tl">${timeline}</div>

      <div class="section-label">Agent journal</div>
      <div class="gtmflow-log">${journalEntries}</div>

      ${gateBlock}

      <a class="strategy-link" href="#/account/${esc(account.id)}/person/${personIdx}/sequence">🧭 View sequence &rarr;</a>
    </div>
  `;

  document.getElementById('gtmflow-back').addEventListener('click', () => { location.hash = '#/gtmflow'; });
  document.getElementById('gtmflow-close').addEventListener('click', () => { location.hash = '#/gtmflow'; });
  const approveBtn = $app.querySelector('.gtmflow-approve');
  if (approveBtn) approveBtn.addEventListener('click', () => { gtmApproveRow(accountId); });
}

// ---------- entry point ----------

function renderGtmFlowView(route) {
  gtmEnsureRows();
  if (route && route.accountId) renderGtmJournal(route.accountId);
  else renderGtmTable();
}

window.GTM = {
  STAGES: GTM_STAGES,
  enqueue: gtmEnqueue,
};
window.renderGtmFlowView = renderGtmFlowView;
