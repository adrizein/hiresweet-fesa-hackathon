/* Account Intelligence Tool — V1 mock (Blocs B+C)
 * Parcours : liste comptes → vue compte (organigramme + surbrillance + investisseurs
 * + graphe de connexions) → brief personne (pitch call-ready) → draft gated.
 * + Onglet Intégrations (mock : toggle localStorage, OAuth réel en couche suivante).
 * Data : data/accounts.json + data/integrations.json statiques. Pas de backend en V1.
 */

const $app = document.getElementById('app');
let ACCOUNTS = [];
let INTEGRATIONS = [];

// ---------- routing (#/, #/integrations, #/account/:id[/person/:idx[/draft]]) ----------

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'integrations') return { view: 'integrations' };
  if (parts[0] === 'find') return { view: 'find' };
  if (parts[0] === 'gtmflow') return { view: 'gtmflow', accountId: parts[1] ? decodeURIComponent(parts[1]) : null };
  if (parts[0] === 'agent') return { view: 'agent', agentAccountId: parts[1] ? decodeURIComponent(parts[1]) : null };
  if (parts[0] === 'account' && parts[1]) {
    const personIdx = parts[2] === 'person' && parts[3] !== undefined ? Number(parts[3]) : null;
    if (parts[4] === 'sequence' && personIdx !== null) {
      return { view: 'sequence', accountId: parts[1], personIdx };
    }
    return {
      view: 'account',
      accountId: parts[1],
      personIdx,
      showDraft: parts[4] === 'draft',
    };
  }
  return { view: 'list' };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function setActiveTab(route) {
  const activeRoute = { integrations: '#/integrations', agent: '#/agent', find: '#/find', gtmflow: '#/gtmflow' }[route.view] || '#/';
  document.querySelectorAll('#main-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.route === activeRoute);
  });
}

// ---------- vue liste ----------

const SIGNAL_LABELS = {
  funding_round: 'Funding round',
  hiring_wave: 'Hiring wave',
  new_cto: 'New CTO',
  new_talent_lead: 'New Head of Talent',
  champion_move: 'Champion move',
  headcount_growth: 'Headcount growth',
  manual_input: 'Manual entry',
  placement_history: 'Placement history',
  job_update: 'Job change',
  hiring_declared: 'Hiring declared',
  watchlist_customer: 'Watchlisted customer',
  no_signal: 'No signal',
};

// Every signal carries a provider. Attribute it visually instead of drowning the
// source in muted text: the reader should see WHO said it before reading WHAT.
function sourceMeta(source) {
  const s = String(source || '').toLowerCase();
  if (s.includes('sillage')) return { label: 'Sillage', cls: 'sillage' };
  if (s.includes('deals-history') || s.includes('revenue')) return { label: 'HireSweet history', cls: 'deals' };
  if (s.includes('fullenrich')) return { label: 'FullEnrich', cls: 'fullenrich' };
  return { label: source || 'unknown source', cls: 'other' };
}

// A value the sourcing block never filled (size, stage) comes through as "?".
// Showing "?" to a user is noise: drop the field entirely instead.
function known(v) {
  const s = String(v == null ? '' : v).trim();
  return s && s !== '?' ? s : null;
}

function metaLine(a) {
  return [
    known(a.stage),
    known(a.size) ? `${known(a.size)} people` : null,
    known(a.location),
  ].filter(Boolean).map(esc).join(' · ');
}

function signalChip(sig) {
  const label = SIGNAL_LABELS[sig.type] || sig.type;
  const src = sourceMeta(sig.source);
  return `<span class="signal src-${src.cls}">`
    + `<span class="signal-src">${esc(src.label)}</span>`
    + `<span class="signal-body">`
    + `<span class="signal-label">${esc(label)}</span>`
    + `<span class="signal-detail">${esc(sig.detail)}</span>`
    + `</span>`
    + `<span class="signal-date">${esc(sig.detected_at)}</span>`
    + `</span>`;
}

function investorChips(account) {
  return (account.investors || []).map(inv =>
    `<span class="chip inv ${inv.is_client_portfolio ? 'portfolio' : ''}">${esc(inv.name)}${inv.is_client_portfolio ? ' · client portfolio' : ''}</span>`
  ).join('');
}

function renderList() {
  const counts = {};
  ACCOUNTS.forEach(a => { counts[a.verdict.tier] = (counts[a.verdict.tier] || 0) + 1; });
  const stats = ['GO', 'EXPLORE', 'HUMAN', 'SKIP']
    .filter(t => counts[t])
    .map(t => `<span class="tier-stat ${t}">${counts[t]} ${t}</span>`).join('');

  const cards = ACCOUNTS.map(a => `
    <div class="account-card" data-id="${esc(a.id)}">
      <div class="row1">
        <span class="name">${esc(a.name)}</span>
        <span class="tier ${esc(a.verdict.tier)}">${esc(a.verdict.tier)}</span>
        <span class="meta">${[metaLine(a), esc(a.domain)].filter(Boolean).join(' · ')}</span>
      </div>
      <div class="why">${esc(a.verdict.why)}</div>
      ${a.signals.length ? `<div class="chips signals">${a.signals.map(signalChip).join('')}</div>` : ''}
      ${(a.investors || []).length ? `<div class="chips">${investorChips(a)}</div>` : ''}
    </div>
  `).join('');

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Detected accounts</div>
        <div class="page-sub">${ACCOUNTS.length} accounts qualified by the analysis engine. Click to open the account view.</div>
      </div>
      <div class="tier-stats">${stats}</div>
    </div>
    ${cards}
  `;

  $app.querySelectorAll('.account-card').forEach(el => {
    el.addEventListener('click', () => { location.hash = `#/account/${el.dataset.id}`; });
  });
}

// ---------- graphe de connexions (hub and spoke SVG) ----------

function cssVar(name, fallback) {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch (e) { return fallback; }
}
const CONN_COLORS = { fund: cssVar('--accent', '#2f6fed'), client: cssVar('--go', '#0e9f6e'), person: cssVar('--human', '#d03050'), community: cssVar('--explore', '#b7791f') };
const CONN_KIND_LABELS = { fund: 'Fund', client: 'HireSweet client', person: 'Person', community: 'Ecosystem' };
const STRENGTH_WIDTH = { forte: 3, moyenne: 2, faible: 1.2 };
const STRENGTH_LABELS = { forte: 'strong', moyenne: 'medium', faible: 'weak' };

function truncate(s, max) {
  s = String(s);
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function connectionGraph(account) {
  const conns = account.connections || [];
  if (!conns.length) return '';
  const rowH = 62;
  const h = Math.max(conns.length * rowH + 20, 120);
  const hubX = 130, spokeX = 420, w = 900;
  const hubY = h / 2;

  const spokes = conns.map((c, i) => {
    const y = 34 + i * rowH;
    const color = CONN_COLORS[c.kind] || '#5b6b7b';
    const width = STRENGTH_WIDTH[c.strength] || 1.5;
    const dash = c.strength === 'faible' ? 'stroke-dasharray="5 4"' : '';
    const sub = truncate(`${c.relation} · ${STRENGTH_LABELS[c.strength] || c.strength}`, 68);
    return `
      <path d="M ${hubX + 8} ${hubY} C ${hubX + 140} ${hubY}, ${spokeX - 140} ${y}, ${spokeX - 8} ${y}"
            stroke="${color}" stroke-width="${width}" fill="none" opacity=".55" ${dash}/>
      <circle cx="${spokeX}" cy="${y}" r="6" fill="${color}"><title>${esc(c.detail)}</title></circle>
      <text x="${spokeX + 16}" y="${y - 2}" font-size="13.5" font-weight="700" fill="#141e28">${esc(truncate(c.entity, 48))}<title>${esc(c.detail)}</title></text>
      <text x="${spokeX + 16}" y="${y + 15}" font-size="11.5" fill="#5b6b7b">${esc(sub)}</text>
    `;
  }).join('');

  const legend = Object.entries(CONN_KIND_LABELS)
    .filter(([kind]) => conns.some(c => c.kind === kind))
    .map(([kind, label]) => `<span><span class="dot" style="background:${CONN_COLORS[kind]}"></span>${esc(label)}</span>`)
    .join('');

  return `
    <div class="section-label">Connection nodes</div>
    <div class="conn-wrap">
      <svg class="conn-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Connection graph">
        <circle cx="${hubX}" cy="${hubY}" r="9" fill="#141e28"/>
        <text x="${hubX}" y="${hubY - 18}" font-size="14" font-weight="800" fill="#141e28" text-anchor="middle">${esc(account.name)}</text>
        ${spokes}
      </svg>
      <div class="conn-legend">${legend}</div>
    </div>
  `;
}

// ---------- vue compte ----------

function orgLevel(person) {
  if (/\bCEO\b/i.test(person.role)) return 0;
  if (/CTO|VP|Head|Director|COO|CFO/i.test(person.role)) return 1;
  return 2;
}

function personCard(p, idx, selectedIdx) {
  const classes = ['person-card'];
  if (p.highlighted) classes.push('highlighted');
  if (idx === selectedIdx) classes.push('selected');
  const statusLabel = { never: 'Never contacted', contacted: 'Already contacted', client: 'Client / active deal' }[p.contact_status] || p.contact_status;
  return `
    <div class="${classes.join(' ')}" data-idx="${idx}">
      ${p.highlighted ? '<span class="badge-target">TARGET</span>' : ''}
      <div class="pname">${esc(p.name)}</div>
      <div class="prole">${esc(p.role)}</div>
      <span class="status ${esc(p.contact_status)}">${esc(statusLabel)}</span>
    </div>
  `;
}

function investorsSection(account) {
  const invs = account.investors || [];
  if (!invs.length) return '';
  const cards = invs.map(inv => `
    <div class="investor-card">
      <div class="iname">${esc(inv.name)} ${inv.is_client_portfolio ? '<span class="badge-portfolio">client portfolio</span>' : ''}</div>
      <div class="imeta">${esc(inv.type)} · ${esc(inv.round)}</div>
      <div class="inote">${esc(inv.note)}</div>
    </div>
  `).join('');
  return `<div class="section-label">Investors</div><div class="investors">${cards}</div>`;
}

function draftBlock(account, person, showDraft) {
  const tier = account.verdict.tier;
  if (tier !== 'GO') {
    if (tier === 'HUMAN') {
      return `
        <button class="btn blocked" disabled>⛔ Draft blocked by the gate</button>
        <div class="gate-box">
          <div class="gate-title">Fail-closed gate · rule 10</div>
          ${esc(account.verdict.why)}<br><br>
          Nothing drafts on a HUMAN verdict: human iteration or review, never a relaxed criterion.
        </div>
      `;
    }
    if (tier === 'EXPLORE') {
      return `
        <button class="btn explore" disabled>🔍 No draft: pain not confirmed</button>
        <div class="gate-box explore">
          <div class="gate-title">EXPLORE verdict</div>
          ${esc(account.verdict.why)}
        </div>
      `;
    }
    return `
      <button class="btn blocked" disabled>⛔ Draft blocked by the gate</button>
      <div class="gate-box">
        <div class="gate-title">Fail-closed gate · rule 10</div>
        ${esc(account.verdict.why)}
      </div>
    `;
  }
  if (!person.draft) {
    return `<button class="btn ghost" disabled>No draft: target not a priority</button>`;
  }
  if (showDraft) {
    return `
      <div class="draft-box">
        <div class="draft-head">
          <span class="draft-title">✓ Draft ready (full gate detail: sequence page)</span>
          <button class="copy-btn" id="copy-draft">Copy</button>
        </div>
        <pre id="draft-text">${esc(person.draft)}</pre>
        <div class="draft-note">Draft-only: reviewed and sent by a human, never sent automatically.</div>
      </div>
    `;
  }
  return `<button class="btn primary" id="draft-btn">✉️ Generate draft</button>`;
}

function briefPanel(account, person, idx, showDraft) {
  // Attribute each coordinate to the provider that produced it: email and phone
  // come from FullEnrich, the LinkedIn URL from the Sillage mapping.
  const coordRow = (icon, value, provider) =>
    `<div class="coord"><span class="coord-icon">${icon}</span>`
    + `<span class="coord-val">${esc(value)}</span>`
    + `<span class="signal-src src-${provider.cls} coord-src">${esc(provider.label)}</span></div>`;

  const FE = sourceMeta('fullenrich');
  const SI = sourceMeta('sillage');
  const coords = [
    person.email ? coordRow('✉️', person.email, FE) : null,
    person.phone ? coordRow('📞', person.phone, FE) : null,
    person.linkedin_url ? coordRow('🔗', person.linkedin_url, SI) : null,
  ].filter(Boolean).join('') || '<span class="empty-proof">Contact details not enriched (FullEnrich: click Refresh contact)</span>';

  const contactStamp = REFRESH_STAMPS[`person:${account.id}:${idx}`];
  const refreshRow = `
    <div class="refresh-row">
      <button class="btn small refresh" id="refresh-contact-btn" title="Re-runs FullEnrich on this contact (email + phone). Without a server key: simulation clearly labeled.">🔄 Refresh contact</button>
      ${contactStamp ? `<span class="refresh-stamp">${esc(contactStamp)}</span>` : ''}
    </div>
  `;

  const brief = person.brief || {};
  const proofs = (brief.social_proof || []).length
    ? `<ul>${brief.social_proof.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`
    : '<div class="empty-proof">No social proof available for this target.</div>';

  const pitch = person.pitch
    ? `<div class="pitch-box"><div class="k">30-second pitch</div>${esc(person.pitch)}</div>`
    : '';

  return `
    <div class="brief-panel">
      <span class="close" id="close-panel" title="Close">&times;</span>
      <h2>${esc(person.name)}</h2>
      <div class="prole">${esc(person.role)} · ${esc(account.name)}</div>
      <div class="coords">${coords}</div>
      ${refreshRow}
      ${pitch}
      <div class="brief-section"><div class="k">Why them</div><div class="v">${esc(brief.why || '')}</div></div>
      <div class="brief-section"><div class="k">Limits</div><div class="v">${esc(brief.limits || '')}</div></div>
      <div class="brief-section"><div class="k">Angle</div><div class="v">${esc(brief.angle || '')}</div></div>
      <div class="brief-section"><div class="k">Social proof</div>${proofs}</div>
      ${draftBlock(account, person, showDraft)}
      <a class="strategy-link" href="#/account/${esc(account.id)}/person/${idx}/sequence">🧭 Full outreach strategy (editable workflow) &rarr;</a>
    </div>
  `;
}

function orgChartHtml(account, selectedIdx) {
  const levels = [[], [], []];
  account.people.forEach((p, idx) => levels[orgLevel(p)].push({ p, idx }));
  return levels
    .filter(l => l.length)
    .map(l => `<div class="org-level">${l.map(({ p, idx }) => personCard(p, idx, selectedIdx)).join('')}</div>`)
    .join('');
}

function renderAccount(accountId, personIdx, showDraft = false) {
  const account = ACCOUNTS.find(a => a.id === accountId);
  if (!account) { location.hash = '#/'; return; }

  const org = orgChartHtml(account, personIdx);

  const tier = account.verdict.tier;
  const icon = { GO: '✅', HUMAN: '🚧', EXPLORE: '🔍' }[tier] || 'ℹ️';
  const banner = `
    <div class="verdict-banner ${esc(tier)}">
      <span class="icon">${icon}</span>
      <span><strong>${esc(tier)}</strong> · ${esc(account.verdict.why)}</span>
    </div>
  `;

  const person = personIdx !== null && account.people[personIdx] ? account.people[personIdx] : null;
  const curIdx = ACCOUNTS.indexOf(account);
  const nextAccount = ACCOUNTS[(curIdx + 1) % ACCOUNTS.length];

  const accountStamp = REFRESH_STAMPS[`account:${account.id}`];

  $app.innerHTML = `
    <div class="account-nav">
      <span class="back" id="back-link">&larr; Back to list</span>
      <button class="next-account" id="next-account" title="Work queue">Next account: ${esc(nextAccount.name)} &rarr;</button>
    </div>
    <div class="account-layout ${person ? 'with-panel' : ''}">
      <div>
        <div class="account-head">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span class="page-title" style="margin:0;">${esc(account.name)}</span>
            <span class="tier ${esc(tier)}">${esc(tier)}</span>
            <button class="btn small refresh" id="refresh-account-btn" title="Re-pulls the account's signals from Sillage. Not yet wired live in this build: simulation clearly labeled pending real-time server access.">🔄 Refresh account</button>
            ${accountStamp ? `<span class="refresh-stamp">${esc(accountStamp)}</span>` : ''}
          </div>
          <div style="color:var(--ink-soft);font-size:13.5px;margin-top:2px;">
            ${[metaLine(account)].filter(Boolean).join('')}${metaLine(account) ? ' · ' : ''}<a href="${esc(account.url)}" target="_blank" rel="noopener">${esc(account.domain)}</a>
          </div>
          <div class="chips signals">${account.signals.map(signalChip).join('')}</div>
          ${banner}
        </div>
        ${investorsSection(account)}
        ${connectionGraph(account)}
        <div class="section-label">Org chart · highlighted targets</div>
        <div class="org">${org}</div>
      </div>
      ${person ? briefPanel(account, person, personIdx, showDraft) : ''}
    </div>
  `;

  document.getElementById('back-link').addEventListener('click', () => { location.hash = '#/'; });
  document.getElementById('next-account').addEventListener('click', () => {
    location.hash = `#/account/${nextAccount.id}`;
  });

  $app.querySelectorAll('.person-card').forEach(el => {
    el.addEventListener('click', () => {
      location.hash = `#/account/${account.id}/person/${el.dataset.idx}`;
    });
  });

  const closeBtn = document.getElementById('close-panel');
  if (closeBtn) closeBtn.addEventListener('click', () => { location.hash = `#/account/${account.id}`; });

  const draftBtn = document.getElementById('draft-btn');
  if (draftBtn) draftBtn.addEventListener('click', () => {
    location.hash = `#/account/${account.id}/person/${personIdx}/draft`;
  });

  const copyBtn = document.getElementById('copy-draft');
  if (copyBtn) copyBtn.addEventListener('click', () => {
    if (!navigator.clipboard) { copyBtn.textContent = 'Copy unavailable'; return; }
    navigator.clipboard.writeText(document.getElementById('draft-text').textContent).then(() => {
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    }).catch(() => { copyBtn.textContent = 'Copy unavailable'; });
  });

  const refreshAccountBtn = document.getElementById('refresh-account-btn');
  if (refreshAccountBtn) refreshAccountBtn.addEventListener('click', () => {
    refreshAccountSimulated(account, personIdx, showDraft, refreshAccountBtn);
  });

  const refreshContactBtn = document.getElementById('refresh-contact-btn');
  if (refreshContactBtn) refreshContactBtn.addEventListener('click', () => {
    refreshPersonContact(account, personIdx, showDraft, refreshContactBtn);
  });
}

// ---------- refresh (contact réel via FullEnrich, compte simulé) ----------

// Freshness stamps: 'account:<id>' or 'person:<accountId>:<idx>' -> "MAJ à HH:MM (...)".
// Module-level only, never persisted (no localStorage) per brief.
const REFRESH_STAMPS = {};

function fmtStamp(label) {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Updated at ${hh}:${mm} (${label})`;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function showInlineRefreshMessage(btnEl, msg) {
  if (!btnEl || !btnEl.parentElement) return;
  let msgEl = btnEl.parentElement.querySelector('.refresh-msg');
  if (!msgEl) {
    msgEl = document.createElement('span');
    msgEl.className = 'refresh-msg';
    btnEl.parentElement.appendChild(msgEl);
  }
  msgEl.textContent = msg; // textContent only, never innerHTML: no esc() needed here
  setTimeout(() => { if (msgEl && msgEl.parentElement) msgEl.remove(); }, 4000);
}

// Company refresh is SIMULATED: Sillage has no server-side REST access in this build.
async function refreshAccountSimulated(account, personIdx, showDraft, btnEl) {
  const key = `account:${account.id}`;
  btnEl.disabled = true;
  btnEl.textContent = '⏳ Refreshing…';
  await sleep(800);
  REFRESH_STAMPS[key] = fmtStamp('simulated');
  renderAccount(account.id, personIdx, showDraft);
}

// Shared simulated fallback for the contact refresh (used when FullEnrich is not
// configured server-side, i.e. the public mock deploy, or when /api is unreachable).
async function refreshPersonSimulated(account, idx, showDraft) {
  const key = `person:${account.id}:${idx}`;
  await sleep(800);
  REFRESH_STAMPS[key] = fmtStamp('simulated');
  renderAccount(account.id, idx, showDraft);
}

// Contact refresh is REAL: submits to FullEnrich via the serverless proxy, then polls
// for completion. Falls back to the simulated refresh if the backend is not configured
// (501) or not reachable at all (e.g. 404 from a plain static file server, or no /api
// route deployed) — this must never throw or crash the view.
async function refreshPersonContact(account, idx, showDraft, btnEl) {
  const person = account.people[idx];
  if (!person) return;
  const key = `person:${account.id}:${idx}`;
  const spaceIdx = (person.name || '').indexOf(' ');
  const firstName = spaceIdx === -1 ? (person.name || '') : person.name.slice(0, spaceIdx);
  const lastName = spaceIdx === -1 ? (person.name || '') : person.name.slice(spaceIdx + 1);

  btnEl.disabled = true;
  btnEl.textContent = '⏳ FullEnrich enrichment in progress…';

  let resp = null;
  let data = null;
  try {
    resp = await fetch('/api/refresh-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        domain: account.domain,
        company_name: account.name,
        linkedin_url: person.linkedin_url || null,
        account_id: account.id,
      }),
    });
    try { data = await resp.json(); } catch (e) { data = null; }
  } catch (e) {
    resp = null;
    data = null;
  }

  // Not configured (real 501), route not deployed (404 under a plain static server),
  // network failure, or a non-JSON/unexpected body: fall back to the simulated path.
  const shouldFallback = !resp || resp.status === 501 || resp.status === 404 || !data || data.configured === false;
  if (shouldFallback) {
    btnEl.textContent = '⏳ Refreshing (simulated)…';
    await refreshPersonSimulated(account, idx, showDraft);
    return;
  }

  if (!resp.ok) {
    btnEl.disabled = false;
    btnEl.textContent = '🔄 Refresh contact';
    showInlineRefreshMessage(btnEl, (data && data.error) || 'Enrichment failed.');
    return;
  }

  const enrichmentId = data.enrichment_id;
  if (!enrichmentId) {
    btnEl.disabled = false;
    btnEl.textContent = '🔄 Refresh contact';
    showInlineRefreshMessage(btnEl, 'Invalid FullEnrich response.');
    return;
  }

  const TERMINAL_BAD = new Set(['CANCELED', 'CREDITS_INSUFFICIENT', 'UNKNOWN']);
  for (let tries = 0; tries < 20; tries++) {
    await sleep(4000);
    let statusResp = null;
    let statusData = null;
    try {
      statusResp = await fetch(`/api/refresh-status?id=${encodeURIComponent(enrichmentId)}`);
      statusData = await statusResp.json().catch(() => null);
    } catch (e) {
      statusResp = null;
      statusData = null;
    }
    if (!statusResp || !statusResp.ok || !statusData) continue;
    if (TERMINAL_BAD.has(statusData.status)) {
      btnEl.disabled = false;
      btnEl.textContent = '🔄 Refresh contact';
      showInlineRefreshMessage(btnEl, `Enrichment ${statusData.status.toLowerCase()}.`);
      return;
    }
    if (statusData.done) {
      if (statusData.email) person.email = statusData.email;
      if (statusData.phone) person.phone = statusData.phone;
      REFRESH_STAMPS[key] = fmtStamp('FullEnrich');
      renderAccount(account.id, idx, showDraft);
      return;
    }
  }

  btnEl.disabled = false;
  btnEl.textContent = '🔄 Refresh contact';
  showInlineRefreshMessage(btnEl, 'Timed out, try again later.');
}

// ---------- vue intégrations (mock) ----------

const INTEGR_COLORS = {
  hubspot: '#ff7a59', sillage: '#4a5fc1', fullenrich: '#12b0a0', claude: '#d97757',
  gmail: '#ea4335', slack: '#611f69', granola: '#3f9d63', notion: '#141e28',
};

function integrationStatus(integr) {
  try {
    return localStorage.getItem(`integr_${integr.id}`) || integr.status;
  } catch (e) {
    return integr.status;
  }
}

function renderIntegrations() {
  const cards = INTEGRATIONS.map(integr => {
    const status = integrationStatus(integr);
    const connected = status === 'connected';
    const color = INTEGR_COLORS[integr.id] || '#5b6b7b';
    return `
      <div class="integr-card">
        <div class="integr-head">
          <div class="integr-logo" style="background:${color}">${esc(integr.name[0])}</div>
          <div>
            <div class="integr-name">${esc(integr.name)}</div>
            <div class="integr-cat">${esc(integr.category)}</div>
          </div>
        </div>
        <div class="integr-desc">${esc(integr.description)}</div>
        ${integr.detail ? `<div class="integr-detail">${esc(integr.detail)}</div>` : ''}
        <div class="integr-foot">
          <span class="pill ${connected ? 'connected' : 'available'}"><span class="dot"></span>${connected ? 'Connected' : 'Available'}</span>
          <button class="connect-btn ${connected ? 'disconnect' : ''}" data-id="${esc(integr.id)}">${connected ? 'Disconnect' : 'Connect'}</button>
        </div>
      </div>
    `;
  }).join('');

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Integrations</div>
        <div class="page-sub">The sources the agent cross-checks before acting: signals, enrichment, history, comms.</div>
      </div>
    </div>
    <div class="integr-grid">${cards}</div>
    <div class="mock-note">🔌 V1: simulated connections (state lives in this browser). Real OAuth and server tokens arrive with the backend proxy, next layer. The HubSpot token already lives server-side (.env), never in the front end.</div>
  `;

  $app.querySelectorAll('.connect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const integr = INTEGRATIONS.find(x => x.id === id);
      const current = integrationStatus(integr);
      localStorage.setItem(`integr_${id}`, current === 'connected' ? 'available' : 'connected');
      renderIntegrations();
    });
  });
}

// ---------- boot ----------

function render() {
  const route = parseHash();
  setActiveTab(route);
  if (route.view === 'account') renderAccount(route.accountId, route.personIdx, route.showDraft);
  else if (route.view === 'integrations') renderIntegrations();
  else if (route.view === 'agent' && window.renderAgentView) window.renderAgentView(route);
  else if (route.view === 'find' && window.renderFindView) window.renderFindView(route);
  else if (route.view === 'gtmflow' && window.renderGtmFlowView) window.renderGtmFlowView(route);
  else if (route.view === 'sequence' && window.renderSequenceView) window.renderSequenceView(route);
  else renderList();
}

document.getElementById('home-link').addEventListener('click', () => { location.hash = '#/'; });
document.querySelectorAll('#main-tabs .tab').forEach(t => {
  t.addEventListener('click', () => { location.hash = t.dataset.route; });
});
window.addEventListener('hashchange', render);

// Load the real local dataset if present (data/accounts.local.json, gitignored),
// otherwise fall back to the public-safe mock (data/accounts.json, the committed +
// deployed file). This is how "real data locally, mock in public deploy" holds
// without ever swapping the tracked file: the public deploy simply has no local file.
function loadAccounts() {
  return fetch('data/accounts.local.json')
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .catch(() => fetch('data/accounts.json').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }));
}

Promise.all([
  loadAccounts(),
  fetch('data/integrations.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
])
  .then(([accounts, integrations]) => {
    ACCOUNTS = accounts;
    INTEGRATIONS = integrations;
    render();
  })
  .catch(err => {
    $app.innerHTML = `<div class="error">Could not load data (${esc(err.message)}).<br>Serve the app/ folder over HTTP (e.g. <code>python3 -m http.server 8642</code>).</div>`;
  });
