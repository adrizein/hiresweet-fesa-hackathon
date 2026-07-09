/* Account Intelligence Tool — onglet "Find leads" (brique amont manquante).
 * Rôle : détecter des signaux, générer des comptes candidats, les qualifier
 * (score + verdict suggéré), puis les faire entrer dans le flux (ACCOUNTS +
 * GTM Flow monitor via window.GTM.enqueue).
 *
 * Contrat avec app.js : window.renderFindView(route). Globals utilisés :
 * ACCOUNTS (array mutable), esc(), $app, signalChip(), SIGNAL_LABELS.
 * Contrat avec gtmflow.js (autre module) : window.GTM.enqueue(accountId),
 * appelé en mode guardé (jamais défini ici).
 *
 * Toutes les classes CSS sont préfixées "fl-" pour éviter toute collision
 * (cf. convention "seq-" de sequence.css).
 */

(function () {
  'use strict';

  // ---------- état module (persiste tant que la page n'est pas rechargée) ----------

  let pool = null;              // pool complet chargé depuis data/signals.json
  let poolPromise = null;       // cache de la promesse fetch (garde le re-fetch)
  let promotedIds = new Set();  // ids de candidats déjà envoyés dans ACCOUNTS
  let scanned = false;          // le bouton "Scanner" a déjà été déclenché une fois
  let revealed = new Set();     // ids de candidats déjà apparus (stagger)
  let scanGeneration = 0;       // permet d'annuler un stagger en cours si on re-scanne

  let filterText = '';
  let filterTier = null;         // 'GO' | 'EXPLORE' | 'HUMAN' | null
  let filterSignalType = null;   // ex: 'funding_round' | null

  const TIER_ORDER = ['GO', 'EXPLORE', 'HUMAN'];

  // ---------- data ----------

  function fetchPool() {
    if (poolPromise) return poolPromise;
    poolPromise = fetch('data/signals.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(data => { pool = data; return pool; })
      .catch(err => { poolPromise = null; throw err; });
    return poolPromise;
  }

  // ---------- helpers ----------

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function foundAccountId(candidate) {
    return 'acct_found_' + slugify(candidate.name);
  }

  function isPromoted(candidate) {
    if (promotedIds.has(candidate.id)) return true;
    const id = foundAccountId(candidate);
    return !!(ACCOUNTS || []).find(a => a.id === id);
  }

  function matchesFilters(candidate) {
    if (filterTier && candidate.suggested_verdict.tier !== filterTier) return false;
    if (filterSignalType && !candidate.signals.some(s => s.type === filterSignalType)) return false;
    if (filterText) {
      const needle = filterText.toLowerCase();
      const haystack = [
        candidate.name, candidate.domain, candidate.location, candidate.stage,
        ...candidate.signals.map(s => s.type + ' ' + s.detail),
      ].join(' ').toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  function toast(html) {
    let el = document.getElementById('fl-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fl-toast';
      el.className = 'fl-toast';
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(el._flHideTimer);
    el._flHideTimer = setTimeout(() => { el.classList.remove('show'); }, 4500);
  }

  // ---------- promotion (candidat -> compte réel dans ACCOUNTS + GTM Flow) ----------

  function craftDraft(candidate, person) {
    const primary = candidate.signals[0];
    const first = person.name.split(' ')[0] || person.name;
    const insight = primary
      ? primary.detail.charAt(0).toUpperCase() + primary.detail.slice(1)
      : `${candidate.name} matches the criteria we're tracking`;
    return `Hi ${first},\n\n${insight}.\n\nIf that translates into a tech hiring opening at ${candidate.name}, I can move on the first profiles within 5 days, 0€ if you don't hire.\n\nWorth a quick chat?\n\nMathieu`;
  }

  function mapPerson(candidate, p, tier) {
    const isGo = tier === 'GO';
    const highlighted = !!p.highlighted;
    const primary = candidate.signals[0];
    const pitch = `${candidate.name}, ${p.name}, ${p.role}. Signal detected: ${primary ? primary.detail : 'account identified by Find leads'}.`;
    const brief = isGo
      ? {
          why: `${p.role} at ${candidate.name}. ${candidate.suggested_verdict.why}`,
          limits: 'Account sourced from Find leads: signal detected automatically, to corroborate if context has changed since detection.',
          angle: "Open on the detected signal rather than on the HireSweet offer.",
          social_proof: [],
        }
      : {
          why: `${p.role} at ${candidate.name}.`,
          limits: `Account blocked by the gate (verdict ${tier}): a human must qualify before any contact.`,
          angle: 'No automated angle. The gate refuses the draft on this account.',
          social_proof: [],
        };
    return {
      name: p.name,
      role: p.role,
      email: null,
      phone: null,
      linkedin_url: null,
      highlighted,
      contact_status: p.contact_status || 'never',
      pitch,
      brief,
      draft: (isGo && highlighted) ? craftDraft(candidate, p) : null,
    };
  }

  function promoteLead(candidate) {
    const id = foundAccountId(candidate);
    const existing = (ACCOUNTS || []).find(a => a.id === id);
    if (existing) { promotedIds.add(candidate.id); return existing; }

    const tier = candidate.suggested_verdict.tier;
    let sourcePeople = (candidate.suggested_people || []).slice();
    if (!sourcePeople.length) {
      sourcePeople = [{ name: 'Contact to identify', role: 'To qualify', highlighted: true, contact_status: 'never' }];
    }
    if (!sourcePeople.some(p => p.highlighted)) sourcePeople[0].highlighted = true;

    const account = {
      id,
      name: candidate.name,
      domain: candidate.domain,
      url: candidate.url || '#',
      size: candidate.size,
      location: candidate.location,
      stage: candidate.stage,
      signals: candidate.signals,
      verdict: { tier, why: candidate.suggested_verdict.why },
      investors: [],
      connections: [],
      people: sourcePeople.map(p => mapPerson(candidate, p, tier)),
    };

    ACCOUNTS.push(account);
    if (window.GTM && window.GTM.enqueue) window.GTM.enqueue(account.id);
    promotedIds.add(candidate.id);
    return account;
  }

  // ---------- rendu ----------

  function tierIcon(tier) {
    return { GO: '✅', EXPLORE: '🔍', HUMAN: '🚧' }[tier] || 'ℹ️';
  }

  function scoreBar(score) {
    const pct = Math.max(0, Math.min(100, Number(score) || 0));
    const cls = pct >= 70 ? 'go' : pct >= 45 ? 'explore' : 'human';
    return `
      <div class="fl-score ${cls}" title="Score ${pct}/100">
        <div class="fl-score-fill" style="width:${pct}%"></div>
        <span class="fl-score-num">${pct}</span>
      </div>
    `;
  }

  function candidateCard(candidate) {
    const tier = candidate.suggested_verdict.tier;
    return `
      <div class="fl-card" data-id="${esc(candidate.id)}">
        <div class="fl-card-row1">
          <span class="fl-name">${esc(candidate.name)}</span>
          <span class="tier ${esc(tier)}">${tierIcon(tier)} ${esc(tier)}</span>
          <span class="meta">${esc(candidate.stage)} · ${esc(String(candidate.size))} pers · ${esc(candidate.location)} · ${esc(candidate.domain)}</span>
        </div>
        ${scoreBar(candidate.score)}
        <div class="why">${esc(candidate.suggested_verdict.why)}</div>
        <div class="chips">${candidate.signals.map(signalChip).join('')}</div>
        <div class="fl-card-actions">
          <button class="btn primary small fl-add" data-id="${esc(candidate.id)}">➕ Add to flow</button>
          <button class="btn ghost small fl-view" data-id="${esc(candidate.id)}">👁 Analyze</button>
        </div>
      </div>
    `;
  }

  function tierChip(tier, counts) {
    const active = filterTier === tier ? 'active' : '';
    const count = counts[tier] || 0;
    return `<span class="fl-chip fl-chip-tier ${tier} ${active}" data-tier="${esc(tier)}">${tierIcon(tier)} ${esc(tier)} (${count})</span>`;
  }

  function signalTypeChip(type) {
    const active = filterSignalType === type ? 'active' : '';
    const label = (window.SIGNAL_LABELS && window.SIGNAL_LABELS[type]) || type;
    return `<span class="fl-chip ${active}" data-signal-type="${esc(type)}">${esc(label)}</span>`;
  }

  function renderUI() {
    const remaining = (pool || []).filter(c => !isPromoted(c));
    const visible = remaining.filter(c => revealed.has(c.id));
    const displayed = visible.filter(matchesFilters);

    const counts = { GO: 0, EXPLORE: 0, HUMAN: 0 };
    remaining.forEach(c => { counts[c.suggested_verdict.tier] = (counts[c.suggested_verdict.tier] || 0) + 1; });

    const signalTypes = Array.from(new Set(remaining.flatMap(c => c.signals.map(s => s.type))));

    const tierChips = TIER_ORDER.filter(t => counts[t]).map(t => tierChip(t, counts)).join('');
    const signalChips = signalTypes.map(signalTypeChip).join('');

    const body = !scanned
      ? `
        <div class="fl-empty">
          <div class="fl-empty-icon">📡</div>
          <div class="fl-empty-title">No scan run yet</div>
          <div class="fl-empty-sub">Type a company name, domain or sector (optional), then run the scan to surface detected signals.</div>
        </div>
      `
      : (displayed.length
          ? `
            <div class="fl-toolbar">
              <span class="fl-toolbar-title">${displayed.length} candidate account(s)</span>
              <button class="btn primary small" id="fl-add-all">⚡ Add all to flow</button>
            </div>
            <div class="fl-grid">${displayed.map(candidateCard).join('')}</div>
          `
          : (remaining.length
              ? `<div class="fl-empty"><div class="fl-empty-icon">🔎</div><div class="fl-empty-title">Nothing matches</div><div class="fl-empty-sub">Broaden the search or remove a filter.</div></div>`
              : `<div class="fl-empty"><div class="fl-empty-icon">✓</div><div class="fl-empty-title">Pool exhausted</div><div class="fl-empty-sub">All detected accounts have been added to the flow. <a href="#/gtmflow">View GTM Flow &rarr;</a></div></div>`
            )
        );

    $app.innerHTML = `
      <div class="page-head">
        <div>
          <div class="page-title">Find leads</div>
          <div class="page-sub">Signal detection &rarr; candidate accounts &rarr; qualification &rarr; into the flow (accounts list + GTM Flow).</div>
        </div>
      </div>
      <div class="fl-searchbar">
        <input type="text" class="fl-input" id="fl-search" placeholder="Company name, domain or sector (optional)" value="${esc(filterText)}">
        <button class="btn primary" id="fl-scan">🔍 Scan signals</button>
      </div>
      ${(tierChips || signalChips) ? `<div class="fl-filters">${tierChips}${signalChips}</div>` : ''}
      ${body}
    `;

    bindEvents();
  }

  // ---------- interactions ----------

  function startScan() {
    scanGeneration += 1;
    const gen = scanGeneration;
    scanned = true;

    const toReveal = (pool || [])
      .filter(c => !isPromoted(c))
      .filter(matchesFilters)
      .filter(c => !revealed.has(c.id));

    if (!toReveal.length) { renderUI(); return; }

    renderUI(); // affiche déjà la structure + ce qui est révélé
    toReveal.forEach((candidate, i) => {
      setTimeout(() => {
        if (gen !== scanGeneration) return; // scan annulé/relancé depuis
        revealed.add(candidate.id);
        renderUI();
      }, (i + 1) * 300);
    });
  }

  function bindEvents() {
    const searchInput = document.getElementById('fl-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterText = searchInput.value;
        renderUI();
        const el = document.getElementById('fl-search');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
    }

    const scanBtn = document.getElementById('fl-scan');
    if (scanBtn) scanBtn.addEventListener('click', startScan);

    $app.querySelectorAll('.fl-chip-tier').forEach(el => {
      el.addEventListener('click', () => {
        const t = el.dataset.tier;
        filterTier = filterTier === t ? null : t;
        renderUI();
      });
    });

    $app.querySelectorAll('.fl-chip[data-signal-type]').forEach(el => {
      el.addEventListener('click', () => {
        const t = el.dataset.signalType;
        filterSignalType = filterSignalType === t ? null : t;
        renderUI();
      });
    });

    $app.querySelectorAll('.fl-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const candidate = (pool || []).find(c => c.id === btn.dataset.id);
        if (!candidate) return;
        const account = promoteLead(candidate);
        renderUI();
        toast(`<strong>${esc(account.name)}</strong> added to GTM Flow · <a href="#/gtmflow">view the flow &rarr;</a>`);
      });
    });

    $app.querySelectorAll('.fl-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const candidate = (pool || []).find(c => c.id === btn.dataset.id);
        if (!candidate) return;
        const account = promoteLead(candidate);
        location.hash = `#/account/${account.id}`;
      });
    });

    const addAllBtn = document.getElementById('fl-add-all');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', () => {
        const remaining = (pool || []).filter(c => !isPromoted(c));
        const toPromote = remaining.filter(c => revealed.has(c.id)).filter(matchesFilters);
        if (!toPromote.length) return;
        toPromote.forEach(promoteLead);
        renderUI();
        toast(`<strong>${toPromote.length} account(s)</strong> added to GTM Flow · <a href="#/gtmflow">open the flow &rarr;</a>`);
      });
    }
  }

  // ---------- boot ----------

  window.renderFindView = function renderFindView(_route) {
    $app.innerHTML = '<div class="loading">Loading&hellip;</div>';
    fetchPool()
      .then(() => { renderUI(); })
      .catch(err => {
        $app.innerHTML = `<div class="error">Unable to load signals (${esc(err.message)}).<br>Serve the app/ folder via an HTTP server (e.g. <code>python3 -m http.server 8642</code>).</div>`;
      });
  };
})();
