/* Account Intelligence Tool, "Outreach strategy" page (sequence layer)
 * View dedicated to ONE contact of ONE account: multi-channel workflow inspired by n8n
 * (nodes linked by SVG connectors), step editing, gate in checkpoint mode
 * (non-blocking warnings + logged human override), and
 * simulated execution (running -> done, no real send).
 *
 * Contract with app.js:
 *   window.renderSequenceView({ view:'sequence', accountId, personIdx })
 *   Globals used: ACCOUNTS, esc(), $app.
 *
 * All state lives in the S object (rebuilt on every view entry). Edited
 * sequences are persisted in localStorage (key seq_{id}_{idx}).
 */

(function () {
  'use strict';

  // ---------- render constants ----------

  const ROW = 136;              // vertical step between two node rows
  const TOP = 26;               // top margin of the canvas
  const CANVAS_W = 620;         // fixed canvas width (horizontal scroll if needed)
  const NODE_W = 250;
  const STEP_MS = 620;          // delay between two steps in simulated execution

  const COLS = { trunk: 310, yes: 150, no: 470 };     // x centers per column
  const EDGE_COLOR = { trunk: '#c3cdda', yes: '#0e9f6e', no: '#b7791f' };

  const CHAN_ICON = { email: '✉️', linkedin: '🔗' };
  const CHAN_LABEL = { email: 'Email', linkedin: 'LinkedIn' };
  const KIND_ICON = { branch: '🔀', handoff: '🤝', stop: '⏹️' };
  const STATUS_LABEL = { running: 'running', done: 'done', skipped: 'branch not taken', pending: 'pending' };
  const CONTACT_LABEL = { never: 'Never contacted', contacted: 'Already contacted', client: 'Client / active deal' };

  const SEND_KINDS = ['email', 'linkedin', 'fallback'];

  // current view state
  let S = null;
  let uidSeq = 0;

  function baseHashFor(accountId, personIdx) {
    return '#/account/' + accountId + '/person/' + personIdx + '/sequence';
  }

  // true as long as the user is still looking at THIS sequence
  function stillOnView(st) {
    return st === S && location.hash.indexOf(st.baseHash) === 0;
  }

  // ---------- utilities ----------

  function firstName(name) {
    return String(name || '').trim().split(/\s+/)[0] || 'there';
  }

  function wordCount(s) {
    return String(s || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function nodeHeight(n) {
    switch (n.kind) {
      case 'branch': return 58;
      case 'handoff': return 84;
      case 'stop': return 76;
      default: return 104;
    }
  }

  function iconFor(n) {
    if (SEND_KINDS.indexOf(n.kind) !== -1) return CHAN_ICON[n.channel] || CHAN_ICON.email;
    return KIND_ICON[n.kind] || '⚙️';
  }

  function kindClass(n) {
    if (n.kind === 'fallback') return 'seq-fallback';
    if (SEND_KINDS.indexOf(n.kind) !== -1) return 'seq-' + (n.channel === 'linkedin' ? 'linkedin' : 'email');
    return 'seq-' + n.kind;
  }

  function splitDraft(text) {
    const m = /^\s*Subject\s*:\s*(.+?)\n+([\s\S]*)$/.exec(String(text || ''));
    if (m) return { subject: m[1].trim(), body: m[2].trim() };
    return { subject: '', body: String(text || '').trim() };
  }

  // ---------- default sequence generation ----------

  function templateBody(account, person) {
    const fn = firstName(person.name);
    const sig = (account.signals && account.signals[0]) ? account.signals[0].detail : 'a recent buying signal';
    return `Hi ${fn},\n\n${account.name}: ${sig}. This is usually the moment when the roadmap starts depending on hiring speed, with no TA team to absorb it.\n\nWe place tech profiles in this window: first profiles within 5 days, time-to-hire around 3 weeks.\n\nUp for 15 minutes this week?\n\nMathieu`;
  }

  function relanceBody(person) {
    const fn = firstName(person.name);
    return `Hi ${fn},\n\nA quick reminder of my previous message: if engineering hiring is on your radar, 15 minutes is enough to see if we can help.\n\nNo hard feelings if I don't hear back.\n\nMathieu`;
  }

  function fallbackBody(account, person, target) {
    const tfn = firstName(target.name);
    const pfn = firstName(person.name);
    return `Hi ${tfn},\n\nI haven't heard back from ${pfn} about the ongoing engineering hires. Reaching out to you with a different angle: the operational side (sourcing and pre-screening handled), you keep control of the process.\n\nFirst profiles within 5 days, time-to-hire around 3 weeks. A 15-minute slot?\n\nMathieu`;
  }

  function defaultSequence(account, person) {
    const draft = person.draft ? splitDraft(person.draft) : null;
    const j0subject = draft && draft.subject ? draft.subject : ('Engineering hiring at ' + account.name);
    const j0body = draft && draft.body ? draft.body : templateBody(account, person);

    const fallbackTarget = (account.people || []).find(function (p) {
      return p.highlighted && p.name !== person.name;
    });

    const nodes = [
      {
        id: 'n_j0', section: 'pre', kind: 'email', channel: 'email', day: 0,
        title: 'Personalized email', action: 'Subject: ' + j0subject,
        body: j0body, condition: '',
      },
      {
        id: 'n_li', section: 'pre', kind: 'linkedin', channel: 'linkedin', day: 2,
        title: 'LinkedIn touch', action: 'Profile visit + connection request without a note',
        body: 'Visit the profile then send a connection request without a note. Simple presence, no written outreach at this stage (touch 1 of 2 max).',
        condition: '',
      },
      {
        id: 'n_r1', section: 'pre', kind: 'email', channel: 'email', day: 5,
        title: 'Short follow-up', action: 'Subject: quick reminder',
        body: relanceBody(person), condition: '',
      },
      {
        id: 'n_branch', section: 'branch', kind: 'branch', channel: 'none', day: 0,
        title: 'Reply received?', action: 'Condition',
        body: 'Did the prospect reply to either of the two email touches or to the LinkedIn connection request?',
        condition: '',
      },
      {
        id: 'n_handoff', section: 'yes', kind: 'handoff', channel: 'none', day: 0,
        title: 'Human handoff', action: 'Handoff to a human',
        body: 'Reply detected: the automatic sequence stops. A human takes over the conversation, qualifies the need and schedules the call. No automation beyond this point.',
        condition: 'If reply',
      },
      fallbackTarget
        ? {
          id: 'n_fb', section: 'no', kind: 'fallback', channel: 'email', day: 7,
          title: 'Fallback to 2nd target', action: 'Email ' + target(fallbackTarget),
          body: fallbackBody(account, person, fallbackTarget),
          condition: 'If silent after 2 touches',
        }
        : {
          id: 'n_fb', section: 'no', kind: 'fallback', channel: 'email', day: 7,
          title: 'Fallback (no 2nd target)', action: 'No 2nd highlighted target',
          body: 'No 2nd highlighted target on this account: no repositioning possible, going straight to dormant.',
          condition: 'If silent after 2 touches',
        },
      {
        id: 'n_stop', section: 'no', kind: 'stop', channel: 'none', day: 14,
        title: 'Stop, go dormant', action: 'Dormant 60 to 90 days',
        body: 'No identifiable second contact after repositioning: going dormant. Revisit on a new buying signal in 60 to 90 days.',
        condition: 'If still silent',
      },
    ];
    return nodes;
  }

  function target(person) {
    return person.name + ' (' + person.role + ')';
  }

  // ---------- persistence ----------

  function storageKey(accountId, personIdx) {
    return 'seq_' + accountId + '_' + personIdx;
  }

  function loadState(account, person, accountId, personIdx) {
    const fallback = { nodes: defaultSequence(account, person), overrides: [] };
    try {
      const raw = localStorage.getItem(storageKey(accountId, personIdx));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      const ok = parsed && Array.isArray(parsed.nodes) && parsed.nodes.length &&
        parsed.nodes.every(function (n) { return n && n.id && n.section && n.kind; });
      if (!ok) return fallback;
      return {
        nodes: parsed.nodes,
        overrides: Array.isArray(parsed.overrides) ? parsed.overrides : [],
      };
    } catch (e) {
      return fallback;
    }
  }

  function saveState() {
    if (!S) return;
    try {
      const clean = S.nodes.map(function (n) {
        const copy = {};
        Object.keys(n).forEach(function (k) { if (k !== 'status') copy[k] = n[k]; });
        return copy;
      });
      localStorage.setItem(storageKey(S.accountId, S.personIdx), JSON.stringify({
        v: 1, nodes: clean, overrides: S.overrides,
      }));
    } catch (e) { /* localStorage unavailable: the view works without persistence */ }
  }

  // ---------- gate (checkpoint, not a hard block) ----------

  function computeChecks(node, account, person) {
    const items = [];
    const tier = account.verdict ? account.verdict.tier : null;
    const isEmail = node.channel === 'email';
    const body = String(node.body || '');
    const bodyLc = body.toLowerCase();

    if (isEmail) {
      const wc = wordCount(body);
      if (wc > 150) items.push({ level: 'warn', text: 'Body at ' + wc + ' words (> 150), tighten it up (rule 7).' });
      else items.push({ level: 'ok', text: 'Body at ' + wc + ' words (150 max).' });

      if (/15\s*%|success[- ]based|0\s*(eur|€)|4[- ]month guarantee/.test(bodyLc.slice(0, 140))) {
        items.push({ level: 'warn', text: 'Success-fee model in the opener (rule 6): reserve for objections.' });
      }
      if (/bravo|congrats|congratulations/.test(bodyLc)) {
        items.push({ level: 'warn', text: 'Compliment with no follow-through detected (rule 1), to check.' });
      }
    }

    if (node.channel === 'linkedin') {
      items.push({ level: 'info', text: 'LinkedIn channel simulated in V1, no real action sent.' });
    }

    if (tier === 'HUMAN') {
      items.push({ level: 'warn', text: 'HUMAN account: open deal in the CRM, human coordination required (rule 10).' });
    }
    if (person.contact_status === 'client') {
      items.push({ level: 'warn', text: 'Contact is client / active deal status: do-not-contact by default.' });
    } else if (person.contact_status === 'contacted' && isEmail) {
      if (/wrote|previous|reply|no reply|reminder|follow.?up|last exchange|already|haven.?t heard/.test(bodyLc)) {
        items.push({ level: 'ok', text: 'Contact history mentioned (rule 8).' });
      } else {
        items.push({ level: 'warn', text: 'Contact history not mentioned (rule 8): flag it in 1 line.' });
      }
    }

    const status = items.some(function (i) { return i.level === 'warn'; }) ? 'warn' : 'ok';
    return { status: status, items: items };
  }

  function gateSummary() {
    const sends = S.nodes.filter(function (n) { return SEND_KINDS.indexOf(n.kind) !== -1; });
    const rows = sends.map(function (n) {
      const c = computeChecks(n, S.account, S.person);
      return { node: n, status: c.status, items: c.items };
    });
    const warnings = [];
    rows.forEach(function (r) {
      r.items.filter(function (i) { return i.level === 'warn'; }).forEach(function (i) {
        warnings.push({ title: r.node.title, text: i.text });
      });
    });
    return { rows: rows, warnings: warnings, warnCount: warnings.length };
  }

  // ---------- workflow layout ----------

  function layout() {
    const pre = S.nodes.filter(function (n) { return n.section === 'pre'; });
    const branchArr = S.nodes.filter(function (n) { return n.section === 'branch'; });
    const yes = S.nodes.filter(function (n) { return n.section === 'yes'; });
    const no = S.nodes.filter(function (n) { return n.section === 'no'; });

    const pos = {};
    function place(n, col, row) {
      const cx = COLS[col];
      pos[n.id] = {
        top: TOP + row * ROW, left: cx - NODE_W / 2, width: NODE_W,
        cx: cx, height: nodeHeight(n), row: row, col: col,
      };
    }

    let row = 0;
    pre.forEach(function (n) { place(n, 'trunk', row); row++; });
    const branchRow = row;
    branchArr.forEach(function (n) { place(n, 'trunk', row); row++; });
    yes.forEach(function (n, k) { place(n, 'yes', branchRow + 1 + k); });
    no.forEach(function (n, k) { place(n, 'no', branchRow + 1 + k); });

    const laneRows = Math.max(yes.length, no.length, 0);
    const totalRows = branchRow + (branchArr.length ? 1 : 0) + laneRows;
    const height = TOP + totalRows * ROW + 10;

    return { pos: pos, height: height, pre: pre, branch: branchArr[0] || null, yes: yes, no: no };
  }

  // ---------- SVG connector rendering ----------

  function edgeStyle(targetNode) {
    const st = targetNode ? targetNode.status : 'idle';
    if (st === 'skipped') return { op: 0.22, dash: '6 5' };
    if (st === 'done' || st === 'running') return { op: 0.95, dash: '' };
    return { op: 0.5, dash: '' };
  }

  function svgLine(pos, a, b, color) {
    const from = pos[a.id], to = pos[b.id];
    const x1 = from.cx, y1 = from.top + from.height;
    const x2 = to.cx, y2 = to.top;
    const s = edgeStyle(b);
    const dash = s.dash ? ' stroke-dasharray="' + s.dash + '"' : '';
    return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="2.2" fill="none" opacity="${s.op}"${dash}/>` +
      `<circle cx="${x1}" cy="${y1}" r="3.5" fill="${color}" opacity="${s.op}"/>` +
      `<circle cx="${x2}" cy="${y2}" r="3.5" fill="${color}" opacity="${s.op}"/>`;
  }

  function svgCurve(pos, a, b, color, label) {
    const from = pos[a.id], to = pos[b.id];
    const x1 = from.cx, y1 = from.top + from.height;
    const x2 = to.cx, y2 = to.top;
    const dy = Math.max((y2 - y1) / 2, 24);
    const s = edgeStyle(b);
    const dash = s.dash ? ' stroke-dasharray="' + s.dash + '"' : '';
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const lw = Math.max(String(label).length * 6.6 + 14, 40);
    let out = `<path d="M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}" stroke="${color}" stroke-width="2.2" fill="none" opacity="${s.op}"${dash}/>`;
    out += `<circle cx="${x1}" cy="${y1}" r="3.5" fill="${color}" opacity="${s.op}"/>`;
    out += `<circle cx="${x2}" cy="${y2}" r="3.5" fill="${color}" opacity="${s.op}"/>`;
    out += `<rect x="${midX - lw / 2}" y="${midY - 11}" width="${lw}" height="22" rx="11" fill="#ffffff" stroke="${color}" stroke-width="1.2" opacity="${Math.max(s.op, 0.7)}"/>`;
    out += `<text x="${midX}" y="${midY + 4}" font-size="11.5" font-weight="700" fill="${color}" text-anchor="middle">${esc(label)}</text>`;
    return out;
  }

  function connectorsSvg(lay) {
    const pos = lay.pos;
    let paths = '';
    const chain = lay.pre.slice();
    if (lay.branch) chain.push(lay.branch);
    for (let i = 0; i < chain.length - 1; i++) {
      paths += svgLine(pos, chain[i], chain[i + 1], EDGE_COLOR.trunk);
    }
    if (lay.branch) {
      if (lay.yes[0]) paths += svgCurve(pos, lay.branch, lay.yes[0], EDGE_COLOR.yes, lay.yes[0].condition || 'Replies');
      if (lay.no[0]) paths += svgCurve(pos, lay.branch, lay.no[0], EDGE_COLOR.no, lay.no[0].condition || 'Silence');
    }
    for (let i = 0; i < lay.yes.length - 1; i++) paths += svgLine(pos, lay.yes[i], lay.yes[i + 1], EDGE_COLOR.yes);
    for (let i = 0; i < lay.no.length - 1; i++) paths += svgLine(pos, lay.no[i], lay.no[i + 1], EDGE_COLOR.no);
    return `<svg class="seq-svg" width="${CANVAS_W}" height="${lay.height}" viewBox="0 0 ${CANVAS_W} ${lay.height}" role="img" aria-label="Workflow connectors">${paths}</svg>`;
  }

  // ---------- node rendering ----------

  function nodeCheckDot(n) {
    if (SEND_KINDS.indexOf(n.kind) === -1) return { cls: 'info', title: 'Control node' };
    const c = computeChecks(n, S.account, S.person);
    const title = c.items.length ? c.items[0].text : '';
    return { cls: c.status === 'warn' ? 'warn' : 'ok', title: title };
  }

  function nodeCard(n, pos) {
    const p = pos[n.id];
    const dot = nodeCheckDot(n);
    const isSend = SEND_KINDS.indexOf(n.kind) !== -1;
    const selected = n.id === S.selectedId ? ' selected' : '';
    const status = n.status && n.status !== 'idle' ? ' ' + n.status : '';

    let meta = '';
    if (isSend) {
      meta = `<span class="seq-day">D+${esc(n.day)}</span>` +
        `<span class="seq-chan ${esc(n.channel)}">${esc(CHAN_LABEL[n.channel] || n.channel)}</span>` +
        (n.channel === 'linkedin' ? '<span class="seq-sim">simulated in V1</span>' : '');
    } else if (n.kind === 'stop') {
      meta = `<span class="seq-day">D+${esc(n.day)}</span><span class="seq-chan ctrl">Stop</span>`;
    } else if (n.kind === 'handoff') {
      meta = '<span class="seq-chan ctrl go">Human</span>';
    } else {
      meta = '<span class="seq-chan ctrl">Condition</span>';
    }

    const badge = (n.status && n.status !== 'idle' && n.status !== 'pending')
      ? `<span class="seq-badge ${n.status}">${esc(STATUS_LABEL[n.status] || n.status)}</span>` : '';

    return `<div class="seq-node ${kindClass(n)}${selected}${status}" data-id="${esc(n.id)}" tabindex="0"
      style="left:${p.left}px;top:${p.top}px;width:${p.width}px;height:${p.height}px;">
      <div class="seq-node-top">
        <span class="seq-ic">${iconFor(n)}</span>
        <span class="seq-node-title">${esc(n.title)}</span>
        <span class="seq-dot ${dot.cls}" title="${esc(dot.title)}"></span>
      </div>
      <div class="seq-node-action">${esc(n.action)}</div>
      <div class="seq-node-meta">${meta}${badge}</div>
    </div>`;
  }

  function workflowHtml() {
    const lay = layout();
    const nodes = S.nodes.map(function (n) { return nodeCard(n, lay.pos); }).join('');
    return `<div class="seq-canvas-wrap">
      <div class="seq-canvas" style="height:${lay.height}px;">
        ${connectorsSvg(lay)}
        ${nodes}
      </div>
    </div>
    <div class="seq-legend">
      <span><span class="seq-lg-dot" style="background:${EDGE_COLOR.trunk}"></span>Trunk</span>
      <span><span class="seq-lg-dot" style="background:${EDGE_COLOR.yes}"></span>Reply branch</span>
      <span><span class="seq-lg-dot" style="background:${EDGE_COLOR.no}"></span>Silence branch</span>
      <span><span class="seq-lg-dot ok"></span>Kill-list OK</span>
      <span><span class="seq-lg-dot warn"></span>Point of attention</span>
    </div>`;
  }

  // ---------- edit panel ----------

  function editorHtml() {
    const n = S.nodes.find(function (x) { return x.id === S.selectedId; });
    if (!n) {
      return `<div class="seq-panel seq-editor">
        <div class="seq-panel-head">Step editing</div>
        <div class="seq-empty">Click a workflow node to edit its channel, delay, subject, message and condition.</div>
      </div>`;
    }
    const isSend = SEND_KINDS.indexOf(n.kind) !== -1;
    const deletable = isSend;
    const chan = n.channel === 'linkedin' ? 'linkedin' : 'email';

    return `<div class="seq-panel seq-editor">
      <div class="seq-panel-head">Editing: ${esc(n.title)}</div>
      <label class="seq-field">
        <span>Title</span>
        <input type="text" id="ed-title" value="${esc(n.title)}">
      </label>
      ${isSend ? `<div class="seq-field-row">
        <label class="seq-field">
          <span>Channel</span>
          <select id="ed-channel">
            <option value="email"${chan === 'email' ? ' selected' : ''}>Email (active)</option>
            <option value="linkedin"${chan === 'linkedin' ? ' selected' : ''}>LinkedIn (simulated)</option>
          </select>
        </label>
        <label class="seq-field seq-field-day">
          <span>Delay</span>
          <div class="seq-day-input"><span>D+</span><input type="number" id="ed-day" min="0" value="${esc(n.day)}"></div>
        </label>
      </div>` : `<label class="seq-field">
          <span>Delay</span>
          <div class="seq-day-input"><span>D+</span><input type="number" id="ed-day" min="0" value="${esc(n.day)}"></div>
        </label>`}
      <label class="seq-field">
        <span>${isSend && chan === 'email' ? 'Subject' : 'Action'}</span>
        <input type="text" id="ed-action" value="${esc(n.action)}">
      </label>
      <label class="seq-field">
        <span>${isSend ? 'Message body' : 'Description'}</span>
        <textarea id="ed-body" rows="7">${esc(n.body)}</textarea>
      </label>
      <label class="seq-field">
        <span>Condition</span>
        <input type="text" id="ed-condition" value="${esc(n.condition || '')}" placeholder="e.g.: If silent after 2 touches">
      </label>
      <div class="seq-editor-btns">
        <button class="seq-btn" id="ed-add">+ Step after</button>
        <button class="seq-btn danger" id="ed-del"${deletable ? '' : ' disabled title="Structural node, cannot be deleted"'}>Delete</button>
      </div>
    </div>`;
  }

  // ---------- gate panel ----------

  function gateHtml() {
    const g = gateSummary();
    const pill = g.warnCount === 0
      ? '<span class="seq-gate-pill ok">Kill-list OK</span>'
      : '<span class="seq-gate-pill warn">' + g.warnCount + ' point' + (g.warnCount > 1 ? 's' : '') + ' of attention</span>';

    const rows = g.rows.map(function (r) {
      const items = r.items.map(function (i) {
        return `<li class="seq-gate-item ${i.level}"><span class="seq-dot ${i.level}"></span>${esc(i.text)}</li>`;
      }).join('');
      return `<div class="seq-gate-node">
        <div class="seq-gate-node-title"><span class="seq-dot ${r.status === 'warn' ? 'warn' : 'ok'}"></span>${esc(r.node.title)}</div>
        <ul>${items}</ul>
      </div>`;
    }).join('');

    return `<div class="seq-panel seq-gate">
      <div class="seq-panel-head">Gate <span class="seq-gate-sub">checkpoint, not a wall</span>${pill}</div>
      ${rows || '<div class="seq-empty">No send step in the sequence.</div>'}
      <div class="seq-gate-note">A human can override. Every override is logged in the journal at the bottom of the page.</div>
    </div>`;
  }

  // ---------- launch bar + journals ----------

  function launchHtml() {
    const g = gateSummary();
    const label = g.warnCount === 0
      ? 'Approve and launch (simulated)'
      : 'Launch despite ' + g.warnCount + ' warning' + (g.warnCount > 1 ? 's' : '');
    const cls = g.warnCount === 0 ? 'go' : 'warn';
    return `<div class="seq-launch">
      <div class="seq-outcome">
        <span class="seq-outcome-label">Simulated scenario</span>
        <button class="seq-seg ${S.outcome === 'no' ? 'active' : ''}" data-outcome="no">Silence</button>
        <button class="seq-seg ${S.outcome === 'yes' ? 'active' : ''}" data-outcome="yes">Reply received</button>
      </div>
      <button class="seq-run-btn ${cls}" id="seq-launch"${S.running ? ' disabled' : ''}>${S.running ? 'Running...' : esc(label)}</button>
      <div class="seq-note">Simulated execution, no message actually sends in V1.</div>
    </div>`;
  }

  function journalsHtml() {
    const log = S.log.length
      ? S.log.map(function (e) {
        return `<div class="seq-log-line"><span class="seq-log-t">+${e.sec.toFixed(1)}s</span>${esc(e.text)}</div>`;
      }).join('')
      : '<div class="seq-empty">Launch the sequence to see the step-by-step run.</div>';

    const ov = S.overrides.length
      ? S.overrides.map(function (o) {
        const reasons = (o.reasons || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');
        return `<div class="seq-override">
          <div class="seq-override-head">Human override <span class="seq-log-t">${esc(o.ts)}</span></div>
          <div class="seq-override-body">Launch (${esc(o.outcome === 'yes' ? 'reply scenario' : 'silence scenario')}) despite ${o.reasons ? o.reasons.length : 0} warning(s):</div>
          <ul>${reasons}</ul>
        </div>`;
      }).join('')
      : '<div class="seq-empty">No override logged yet.</div>';

    return `<div class="seq-journals">
      <div class="seq-journal">
        <div class="seq-panel-head">Execution journal</div>
        ${log}
      </div>
      <div class="seq-journal">
        <div class="seq-panel-head">Human override journal</div>
        ${ov}
      </div>
    </div>`;
  }

  // ---------- full view ----------

  function viewHtml() {
    const a = S.account, p = S.person;
    const statusCls = p.contact_status || 'never';
    const statusLabel = CONTACT_LABEL[p.contact_status] || p.contact_status;
    const pitch = p.pitch ? `<div class="seq-pitch"><span class="k">30-second pitch</span>${esc(p.pitch)}</div>` : '';

    return `<div class="seq-wrap">
      <div class="seq-head">
        <div class="seq-head-nav">
          <span class="seq-back" id="seq-back">&larr; Back to account ${esc(a.name)}</span>
          <span class="seq-crumb">${esc(a.name)} &middot; <span class="tier ${esc(a.verdict.tier)}">${esc(a.verdict.tier)}</span></span>
        </div>
        <h2>${esc(p.name)} <span class="seq-status ${esc(statusCls)}">${esc(statusLabel)}</span></h2>
        <div class="seq-role">${esc(p.role)} &middot; ${esc(a.name)}</div>
        ${pitch}
      </div>

      <div class="seq-banner">Simulated execution, no message actually sends in V1. Email active, LinkedIn simulated. A human approves before any real send.</div>

      <div class="seq-toolbar">
        <div class="seq-toolbar-title">Outreach workflow</div>
        <button class="seq-btn" id="seq-reset">Reset to default sequence</button>
      </div>

      <div class="seq-layout">
        <div class="seq-flow">${workflowHtml()}</div>
        <aside class="seq-side">
          ${editorHtml()}
          ${gateHtml()}
        </aside>
      </div>

      ${launchHtml()}
      ${journalsHtml()}
    </div>`;
  }

  // ---------- partial render (gate + dots) without breaking textarea focus ----------

  function refreshDynamic() {
    // updates the node check dots + the gate panel + the launch button,
    // without rebuilding the editor (to keep the textarea focus while typing).
    S.nodes.forEach(function (n) {
      const el = $app.querySelector('.seq-node[data-id="' + cssEsc(n.id) + '"] .seq-dot');
      if (!el) return;
      const dot = nodeCheckDot(n);
      el.className = 'seq-dot ' + dot.cls;
      el.setAttribute('title', dot.title);
    });
    const gate = $app.querySelector('.seq-gate');
    if (gate) gate.outerHTML = gateHtml();
    const launch = $app.querySelector('.seq-launch');
    if (launch) launch.outerHTML = launchHtml();
    wireLaunch();
  }

  function cssEsc(id) {
    return String(id).replace(/["\\]/g, '\\$&');
  }

  // ---------- simulated execution ----------

  function logPush(text) {
    S.log.push({ sec: (Date.now() - S.logStart) / 1000, text: text });
  }

  function runMsg(n, outcome) {
    if (n.kind === 'linkedin') return 'D+' + n.day + ': simulated LinkedIn action (profile visit + connection without a note).';
    if (n.kind === 'branch') return 'Evaluating the condition: ' + (outcome === 'yes' ? 'reply received.' : 'no reply detected.');
    if (n.kind === 'handoff') return 'Handoff: a human takes over the conversation.';
    if (n.kind === 'fallback') return 'D+' + n.day + ': repositioning to the 2nd target (simulated email).';
    if (n.kind === 'stop') return 'D+' + n.day + ': going dormant (60 to 90 days).';
    return 'D+' + n.day + ': simulated email sent to ' + firstName(S.person.name) + '.';
  }

  function doneMsg(n) {
    if (n.kind === 'linkedin') return 'LinkedIn touch marked done (simulated).';
    if (n.kind === 'branch') return 'Condition evaluated.';
    if (n.kind === 'handoff') return 'Sequence handed off to a human.';
    if (n.kind === 'stop') return 'Contact set to dormant.';
    if (n.kind === 'fallback') return 'Repositioning email marked sent (simulated).';
    return 'Email marked sent (simulated).';
  }

  function runSimulation() {
    if (S.running) return;
    const st = S;                 // capture the current state (guard against navigation)
    const outcome = st.outcome;

    // override if warnings exist
    const g = gateSummary();
    if (g.warnCount > 0) {
      const seen = {};
      const reasons = [];
      g.warnings.forEach(function (w) {
        const line = w.title + ' : ' + w.text;
        if (!seen[line]) { seen[line] = 1; reasons.push(line); }
      });
      st.overrides.unshift({ ts: 'just now', outcome: outcome, reasons: reasons });
      saveState();
    }

    st.running = true;
    st.log = [];
    st.logStart = Date.now();

    const pre = st.nodes.filter(function (n) { return n.section === 'pre'; });
    const branch = st.nodes.find(function (n) { return n.section === 'branch'; });
    const chosenSection = outcome === 'yes' ? 'yes' : 'no';
    const chosen = st.nodes.filter(function (n) { return n.section === chosenSection; });

    st.nodes.forEach(function (n) {
      n.status = (n.section === 'yes' || n.section === 'no')
        ? (n.section === chosenSection ? 'pending' : 'skipped')
        : 'pending';
    });

    const order = pre.slice();
    if (branch) order.push(branch);
    order.push.apply(order, chosen);

    logPush('Launching the simulated sequence (' + (outcome === 'yes' ? 'reply received scenario' : 'silence scenario') + ').');
    paint();

    let i = 0;
    function step() {
      if (!stillOnView(st)) return;   // the user left this sequence: bail out (no stray paint)
      if (i > 0) {
        order[i - 1].status = 'done';
        logPush(doneMsg(order[i - 1]));
      }
      if (i >= order.length) {
        st.running = false;
        logPush('Sequence completed. No real message sent.');
        paint();
        return;
      }
      const node = order[i];
      node.status = 'running';
      logPush(runMsg(node, outcome));
      i++;
      paint();
      setTimeout(step, STEP_MS);
    }
    step();
  }

  // ---------- edit actions ----------

  function selectedNode() {
    return S.nodes.find(function (n) { return n.id === S.selectedId; });
  }

  function addStepAfter() {
    const sel = selectedNode();
    if (!sel) return;
    const section = sel.section === 'branch' ? 'pre' : sel.section;
    const newNode = {
      id: 'n_' + Date.now() + '_' + (++uidSeq), section: section, kind: 'email', channel: 'email',
      day: (Number(sel.day) || 0) + 1, title: 'New step', action: 'Subject: to define',
      body: 'Hi ' + firstName(S.person.name) + ',\n\n(to write)\n\nMathieu', condition: '',
    };
    let idx = S.nodes.indexOf(sel);
    if (sel.section === 'branch') {
      // insert right before the branch node to stay in the pre section
      idx = S.nodes.indexOf(sel);
      S.nodes.splice(idx, 0, newNode);
    } else {
      S.nodes.splice(idx + 1, 0, newNode);
    }
    S.selectedId = newNode.id;
    saveState();
    paint();
  }

  function deleteStep() {
    const sel = selectedNode();
    if (!sel || SEND_KINDS.indexOf(sel.kind) === -1) return;
    S.nodes = S.nodes.filter(function (n) { return n.id !== sel.id; });
    S.selectedId = null;
    saveState();
    paint();
  }

  function resetSequence() {
    S.nodes = defaultSequence(S.account, S.person);
    S.selectedId = null;
    S.log = [];
    S.running = false;
    saveState();
    paint();
  }

  // ---------- event wiring ----------

  function wireLaunch() {
    const launchBtn = document.getElementById('seq-launch');
    if (launchBtn) launchBtn.addEventListener('click', runSimulation);
    $app.querySelectorAll('.seq-seg').forEach(function (b) {
      b.addEventListener('click', function () {
        if (S.running) return;
        S.outcome = b.dataset.outcome;
        paint();
      });
    });
  }

  function wire() {
    const back = document.getElementById('seq-back');
    if (back) back.addEventListener('click', function () {
      location.hash = '#/account/' + S.accountId + '/person/' + S.personIdx;
    });

    const reset = document.getElementById('seq-reset');
    if (reset) reset.addEventListener('click', resetSequence);

    $app.querySelectorAll('.seq-node').forEach(function (el) {
      const select = function () { S.selectedId = el.dataset.id; paint(); };
      el.addEventListener('click', select);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    });

    // editor
    const n = selectedNode();
    if (n) {
      const title = document.getElementById('ed-title');
      const chan = document.getElementById('ed-channel');
      const day = document.getElementById('ed-day');
      const action = document.getElementById('ed-action');
      const body = document.getElementById('ed-body');
      const cond = document.getElementById('ed-condition');

      if (title) title.addEventListener('input', function () {
        n.title = title.value; saveState();
        const t = $app.querySelector('.seq-node[data-id="' + cssEsc(n.id) + '"] .seq-node-title');
        if (t) t.textContent = n.title;
      });
      if (chan) chan.addEventListener('change', function () {
        n.channel = chan.value; saveState(); paint();
      });
      if (day) day.addEventListener('change', function () {
        n.day = Math.max(0, Number(day.value) || 0); saveState(); paint();
      });
      if (action) action.addEventListener('input', function () {
        n.action = action.value; saveState();
        const t = $app.querySelector('.seq-node[data-id="' + cssEsc(n.id) + '"] .seq-node-action');
        if (t) t.textContent = n.action;
      });
      if (body) body.addEventListener('input', function () {
        n.body = body.value; saveState(); refreshDynamic();
      });
      if (cond) {
        cond.addEventListener('input', function () { n.condition = cond.value; saveState(); });
        // the branch label is drawn in SVG: refresh the canvas on blur
        cond.addEventListener('change', function () { paint(); });
      }

      const add = document.getElementById('ed-add');
      if (add) add.addEventListener('click', addStepAfter);
      const del = document.getElementById('ed-del');
      if (del) del.addEventListener('click', deleteStep);
    }

    wireLaunch();
  }

  // ---------- paint + entry point ----------

  function paint() {
    $app.innerHTML = viewHtml();
    wire();
  }

  function errorView(msg) {
    S = null;   // no active sequence view: neutralize any ongoing simulation
    $app.innerHTML = `<div class="seq-wrap"><div class="seq-error">${esc(msg)}<br><span class="seq-back" id="seq-back-err">&larr; Back to the accounts list</span></div></div>`;
    const b = document.getElementById('seq-back-err');
    if (b) b.addEventListener('click', function () { location.hash = '#/'; });
  }

  window.renderSequenceView = function (route) {
    const accountId = route && route.accountId;
    const personIdx = route && route.personIdx;
    const list = (typeof ACCOUNTS !== 'undefined' && ACCOUNTS) ? ACCOUNTS : [];
    const account = list.find(function (a) { return a.id === accountId; });
    if (!account) { errorView('Account not found for this sequence.'); return; }
    const person = account.people && account.people[personIdx];
    if (!person) { errorView('Contact not found for this sequence.'); return; }

    const loaded = loadState(account, person, accountId, personIdx);
    loaded.nodes.forEach(function (n) { n.status = 'idle'; });

    S = {
      accountId: accountId,
      personIdx: personIdx,
      baseHash: baseHashFor(accountId, personIdx),
      account: account,
      person: person,
      nodes: loaded.nodes,
      overrides: loaded.overrides,
      selectedId: null,
      running: false,
      outcome: 'no',
      log: [],
      logStart: Date.now(),
    };
    paint();
  };
})();
