/* KewanganKu: personal finance PWA backed by a Google Sheet through Apps Script. */
(() => {
  'use strict';

  const VERSION = '1.0.0';
  const LS = { cfg: 'kk_cfg', data: 'kk_data', queue: 'kk_queue', ui: 'kk_ui' };
  const EXP_GROUPS = [
    ['Fixed', '🏛️'], ['Household', '🏠'], ['Telco', '📱'], ['Transport', '🚗'],
    ['Family', '👨‍👩‍👦'], ['Lifestyle', '🍟'], ['Savings', '💰'], ['One Time', '🎯']
  ];
  const ACC_GROUPS = [['debit', 'Debit'], ['credit', 'Kredit & PayLater'], ['borrowed', 'Pinjaman'], ['invest', 'Pelaburan']];
  const ACC_TYPES = { bank: 'Bank', ewallet: 'E-wallet', cash: 'Tunai', card: 'Kad kredit', bnpl: 'PayLater', loan: 'Pinjaman', invest: 'Pelaburan' };
  const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const MON_S = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const TX_LABEL = { expense: 'Belanja', income: 'Masuk', transfer: 'Pindah', adjust: 'Pelarasan baki' };

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 3v3M16 3v3"/><path d="m9 15 2 2 4-4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    back: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m16 9-5 6M11 9l5 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  /* ---------- storage ---------- */
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } };

  let cfg = load(LS.cfg, null);
  let data = load(LS.data, null);
  let queue = load(LS.queue, []);
  const ui = Object.assign({ tab: 'home', month: null, private: false, lastAccount: null, search: '' }, load(LS.ui, {}));
  ui.month = ui.month || todayStr().slice(0, 7);
  let syncing = false;
  let syncError = '';

  /* ---------- utils ---------- */
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const round2 = (n) => Math.round(n * 100) / 100;
  const fmtAbs = (n) => Math.abs(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (n, sign) => {
    const neg = n < -0.004;
    const pre = sign && n > 0.004 ? '+' : neg ? '-' : '';
    return `${pre}RM${fmtAbs(n)}`;
  };
  const money = (n, sign, cls) => `<span class="money ${cls || ''}">${fmt(n, sign)}</span>`;
  const monthLabel = (m) => { const [y, mo] = m.split('-'); return `${MONTHS[+mo - 1]} ${y}`; };
  const shiftMonth = (m, d) => { const [y, mo] = m.split('-').map(Number); const dt = new Date(y, mo - 1 + d, 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; };
  const dayLabel = (s) => { const [y, m, d] = s.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DAYS[dt.getDay()]}, ${d} ${MON_S[m - 1]}`; };
  const initials = (name) => String(name).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const $ = (sel, root) => (root || document).querySelector(sel);

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- data model ---------- */
  const TAB_KEY = { Transactions: 'transactions', Accounts: 'accounts', Categories: 'categories', Commitments: 'commitments' };
  let idx = { acc: {}, cat: {} };
  function reindex() {
    idx = { acc: {}, cat: {} };
    (data.accounts || []).forEach((a) => { idx.acc[a.id] = a; });
    (data.categories || []).forEach((c) => { idx.cat[c.id] = c; });
  }
  const accounts = () => (data.accounts || []).filter((a) => !a.archived).sort((a, b) => num(a.order) - num(b.order));
  const categories = (kind) => (data.categories || []).filter((c) => !c.archived && (!kind || c.kind === kind)).sort((a, b) => num(a.order) - num(b.order));
  const openingDate = () => String((data.settings && data.settings.opening_date) || '').slice(0, 10);
  const countsForBalance = (t) => !openingDate() || String(t.date) >= openingDate();

  function balances() {
    const b = {};
    (data.accounts || []).forEach((a) => { b[a.id] = num(a.opening_balance); });
    (data.transactions || []).forEach((t) => {
      if (!countsForBalance(t)) return;
      const amt = num(t.amount);
      if (t.type === 'income') b[t.account_id] = (b[t.account_id] || 0) + amt;
      else if (t.type === 'expense') b[t.account_id] = (b[t.account_id] || 0) - amt;
      else if (t.type === 'adjust') b[t.account_id] = (b[t.account_id] || 0) + amt;
      else if (t.type === 'transfer') {
        b[t.account_id] = (b[t.account_id] || 0) - amt;
        if (t.to_account_id) b[t.to_account_id] = (b[t.to_account_id] || 0) + amt;
      }
    });
    Object.keys(b).forEach((k) => { b[k] = round2(b[k]); });
    return b;
  }

  function monthTx(m) {
    return (data.transactions || []).filter((t) => String(t.date).slice(0, 7) === m)
      .sort((a, b) => (String(b.date) + String(b.created_at)).localeCompare(String(a.date) + String(a.created_at)));
  }

  function monthStats(m) {
    const s = { income: 0, expense: 0, groups: {}, cats: {} };
    monthTx(m).forEach((t) => {
      const amt = num(t.amount);
      if (t.type === 'income') { s.income += amt; s.cats[t.category_id] = (s.cats[t.category_id] || 0) + amt; }
      if (t.type === 'expense') {
        s.expense += amt;
        s.cats[t.category_id] = (s.cats[t.category_id] || 0) + amt;
        const g = (idx.cat[t.category_id] || {}).group || 'Lifestyle';
        s.groups[g] = (s.groups[g] || 0) + amt;
      }
      if (t.type === 'transfer' && (idx.acc[t.to_account_id] || {}).group === 'invest') {
        s.groups.Savings = (s.groups.Savings || 0) + amt;
      }
    });
    return s;
  }

  function monthCommitments(m) {
    return (data.commitments || []).filter((c) => c.active !== false &&
      (!c.start_month || String(c.start_month) <= m) && (!c.end_month || String(c.end_month) >= m))
      .map((c) => {
        const tx = (data.transactions || []).find((t) => t.commitment_id === c.id && String(t.date).slice(0, 7) === m);
        return { c, tx };
      })
      .sort((a, b) => (a.tx ? 1 : 0) - (b.tx ? 1 : 0) || num(a.c.due_day || 99) - num(b.c.due_day || 99));
  }

  /* ---------- writes: optimistic + queued ---------- */
  function applyLocal(op) {
    const key = TAB_KEY[op.tab];
    const arr = data[key] || (data[key] = []);
    const i = arr.findIndex((r) => r.id === op.row.id);
    if (op.op === 'delete') { if (i >= 0) arr.splice(i, 1); return; }
    if (i >= 0) arr[i] = Object.assign({}, arr[i], op.row);
    else arr.push(Object.assign({ created_at: new Date().toISOString() }, op.row));
  }
  function commit(ops, msg) {
    ops.forEach(applyLocal);
    reindex();
    if (!cfg || !cfg.demo) { queue.push(...ops); save(LS.queue, queue); }
    save(LS.data, data);
    render();
    if (msg) toast(msg);
    sync();
  }

  /* ---------- network ---------- */
  async function post(body) {
    const res = await fetch(cfg.url, { method: 'POST', body: JSON.stringify(Object.assign({ token: cfg.token }, body)) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Ralat server');
    return j;
  }

  async function sync() {
    if (!cfg || cfg.demo || syncing) return;
    if (!navigator.onLine) { setSync(); return; }
    syncing = true; setSync();
    try {
      if (queue.length) {
        const batch = queue.slice(0, 50);
        await post({ action: 'ops', ops: batch });
        queue = queue.slice(batch.length);
        save(LS.queue, queue);
        if (queue.length) { syncing = false; return sync(); }
      }
      const j = await post({ action: 'bootstrap' });
      data = j.data;
      queue.forEach(applyLocal);
      reindex();
      save(LS.data, data);
      syncError = '';
      render();
    } catch (e) {
      syncError = String(e.message || e);
    } finally {
      syncing = false; setSync();
    }
  }

  function setSync() {
    const el = $('#syncState');
    if (!el) return;
    el.className = 'sync-state';
    let label = 'Sync';
    if (cfg && cfg.demo) label = 'Demo';
    else if (syncing) { label = 'Sync...'; el.classList.add('pending'); }
    else if (!navigator.onLine) { label = queue.length ? `${queue.length} menunggu` : 'Offline'; el.classList.add('pending'); }
    else if (syncError) { label = 'Gagal sync'; el.classList.add('error'); }
    else if (queue.length) { label = `${queue.length} menunggu`; el.classList.add('pending'); }
    el.innerHTML = `<span class="dot"></span>${label}`;
    el.title = syncError || '';
  }

  /* ---------- views ---------- */
  function render() {
    document.body.classList.toggle('private', !!ui.private);
    $('#privacyBtn').innerHTML = icon(ui.private ? 'eyeOff' : 'eye');
    const view = $('#view');
    const nav = document.querySelector('.tabbar');
    if (!cfg || !data) { nav.style.display = 'none'; view.innerHTML = setupView(); bindSetup(); return; }
    nav.style.display = '';
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
    const v = { home: homeView, accounts: accountsView, tx: txView, month: monthView }[ui.tab] || homeView;
    view.innerHTML = v();
    setSync();
    save(LS.ui, ui);
  }

  function guilloche() {
    let paths = '';
    const R = 96, r = 24;
    [70, 58, 46, 34].forEach((d, k) => {
      let p = '';
      for (let i = 0; i <= 720; i++) {
        const t = (i / 720) * Math.PI * 2;
        const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
        const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
        p += `${i ? 'L' : 'M'}${(330 + x).toFixed(1)} ${(40 + y).toFixed(1)}`;
      }
      paths += `<path d="${p}" stroke-opacity="${0.9 - k * 0.15}"/>`;
    });
    for (let w = 0; w < 7; w++) {
      let p = '';
      for (let x = 0; x <= 400; x += 4) {
        const y = 200 + w * 6 + Math.sin(x / 22 + w * 0.7) * 5;
        p += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)}`;
      }
      paths += `<path d="${p}" stroke-opacity="0.5"/>`;
    }
    return `<svg class="hero-guilloche" viewBox="0 0 400 240" preserveAspectRatio="xMaxYMin slice" fill="none" stroke="#D4AE68" stroke-width="0.6">${paths}</svg>`;
  }

  function monthBar() {
    return `<div class="month-bar">
      <div class="m">${monthLabel(ui.month)}</div>
      <div class="nav">
        <button data-act="month" data-d="-1" aria-label="Bulan sebelum">${icon('chevL')}</button>
        <button data-act="month" data-d="1" aria-label="Bulan seterusnya">${icon('chevR')}</button>
      </div></div>`;
  }

  function homeView() {
    const b = balances();
    let assets = 0, liab = 0;
    accounts().forEach((a) => { const v = b[a.id] || 0; if (v >= 0) assets += v; else liab += -v; });
    const s = monthStats(ui.month);
    const budgets = {};
    categories('expense').forEach((c) => { if (num(c.budget)) budgets[c.group] = (budgets[c.group] || 0) + num(c.budget); });
    const commits = monthCommitments(ui.month);
    const unpaid = commits.filter((x) => !x.tx);
    const unpaidTotal = unpaid.reduce((n, x) => n + num(x.c.amount), 0);
    const recent = (data.transactions || []).slice().sort((a, b) => (String(b.date) + String(b.created_at)).localeCompare(String(a.date) + String(a.created_at))).slice(0, 6);

    return `
      <section class="hero" aria-label="Nilai bersih">
        ${guilloche()}
        <div class="hero-label">Nilai bersih</div>
        <div class="hero-amount money"><span class="cur">RM</span>${(assets - liab < 0 ? '-' : '') + fmtAbs(assets - liab)}</div>
        <div class="hero-split">
          <div><span>Aset</span><strong>${money(assets)}</strong></div>
          <div><span>Hutang</span><strong>${money(liab)}</strong></div>
        </div>
      </section>

      ${monthBar()}
      <div class="flow">
        <div><span>Masuk</span><strong class="pos">${money(s.income)}</strong></div>
        <div><span>Keluar</span><strong class="neg">${money(s.expense)}</strong></div>
        <div><span>Baki bulan</span><strong>${money(s.income - s.expense, true)}</strong></div>
      </div>

      <div class="section">
        <div class="section-head"><h2>Belanja ikut kumpulan</h2></div>
        <div class="groups">
          ${EXP_GROUPS.map(([g, e]) => {
            const spent = s.groups[g] || 0, bud = budgets[g] || 0;
            const pct = bud ? Math.min(100, (spent / bud) * 100) : 0;
            return `<button class="group" data-act="group" data-g="${esc(g)}">
              <div class="group-top"><span>${esc(g)}</span><span class="e">${e}</span></div>
              <strong>${money(spent)}</strong>
              ${bud ? `<div class="bar ${spent > bud ? 'over' : ''}"><i style="width:${pct}%"></i></div><small>bajet ${money(bud)}</small>` : '<small>&nbsp;</small>'}
            </button>`;
          }).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2>Komitmen belum bayar</h2><span class="aside">${money(unpaidTotal)}</span></div>
        ${unpaid.length ? `<div class="list">${unpaid.slice(0, 4).map(commitRow).join('')}</div>
          ${unpaid.length > 4 ? `<p class="hint"><button class="link-btn" data-act="tab" data-tab="month">Lihat semua ${unpaid.length} komitmen</button></p>` : ''}`
          : `<div class="empty">Semua komitmen ${esc(monthLabel(ui.month))} dah dibayar.</div>`}
      </div>

      <div class="section">
        <div class="section-head"><h2>Terkini</h2><button class="link-btn" data-act="tab" data-tab="tx">Semua</button></div>
        ${recent.length ? `<div class="list">${recent.map(txRow).join('')}</div>`
          : `<div class="empty">Belum ada transaksi.<br><button class="btn" data-act="add" style="width:auto;display:inline-flex;padding:10px 18px">Tambah transaksi pertama</button></div>`}
      </div>`;
  }

  function txRow(t) {
    const cat = idx.cat[t.category_id];
    const acc = idx.acc[t.account_id];
    const to = idx.acc[t.to_account_id];
    let ico = cat ? cat.icon : '•', title = t.note || (cat ? cat.name : TX_LABEL[t.type]), sub = acc ? acc.name : '';
    let cls = '', sign = '';
    if (t.type === 'expense') { cls = 'neg'; sign = '-'; }
    if (t.type === 'income') { cls = 'pos'; sign = '+'; }
    if (t.type === 'transfer') { ico = '⇄'; title = t.note || `Pindah ke ${to ? to.name : '?'}`; sub = `${acc ? acc.name : '?'} → ${to ? to.name : '?'}`; }
    if (t.type === 'adjust') { ico = '⚖️'; title = t.note || 'Pelarasan baki'; sign = num(t.amount) >= 0 ? '+' : '-'; }
    if (cat && t.note && t.type !== 'transfer') sub = `${cat.name} · ${sub}`;
    return `<button class="row" data-act="edit-tx" data-id="${esc(t.id)}">
      <span class="row-ico">${esc(ico)}</span>
      <span class="row-main"><span class="t">${esc(title)}</span><span class="s">${esc(sub)}</span></span>
      <span class="row-amt ${cls}"><span class="money">${sign}RM${fmtAbs(num(t.amount))}</span><small>${esc(dayLabel(String(t.date)).split(', ')[1])}</small></span>
    </button>`;
  }

  function commitRow(x) {
    const { c, tx } = x;
    const cat = idx.cat[c.category_id];
    const sub = tx ? `Dibayar ${dayLabel(String(tx.date)).split(', ')[1]}${idx.acc[tx.account_id] ? ' · ' + idx.acc[tx.account_id].name : ''}`
      : (c.due_day ? `Jatuh tempo ${c.due_day} hb` : (cat ? cat.name : ''));
    return `<button class="row ${tx ? 'paid' : ''}" data-act="${tx ? 'edit-tx' : 'pay'}" data-id="${esc(tx ? tx.id : c.id)}">
      <span class="commit-check ${tx ? 'done' : ''}">${icon('check')}</span>
      <span class="row-main"><span class="t">${esc(c.name)}</span><span class="s">${esc(sub)}</span></span>
      <span class="row-amt">${money(tx ? num(tx.amount) : num(c.amount))}</span>
    </button>`;
  }

  function accountsView() {
    const b = balances();
    const all = accounts();
    return ACC_GROUPS.map(([g, label]) => {
      const list = all.filter((a) => a.group === g);
      if (!list.length) return '';
      const total = list.reduce((n, a) => n + (b[a.id] || 0), 0);
      return `<div class="acc-group-head"><h2>${label}</h2><span class="${total < 0 ? 'neg' : ''}">${money(total)}</span></div>
        <div class="acc-grid">${list.map((a) => accCard(a, b[a.id] || 0)).join('')}</div>`;
    }).join('') + `<div class="section"><button class="btn ghost" data-act="new-acc">Tambah akaun</button></div>`;
  }

  function accCard(a, bal) {
    const isCredit = a.group === 'credit' || a.group === 'borrowed';
    const lim = num(a.credit_limit);
    let main = money(bal), sub = '';
    if (isCredit) {
      main = `<span class="${bal < 0 ? 'neg' : ''}">${money(-bal)}</span>`;
      sub = lim ? `<small>Baki had ${money(lim + bal)}</small>` : '<small>Hutang</small>';
    }
    return `<button class="acc" style="--acc:${esc(a.color || '#D4AE68')}" data-act="acc" data-id="${esc(a.id)}">
      <div class="acc-head"><span class="acc-mono">${esc(initials(a.name))}</span>
        <span class="acc-name">${esc(a.name)}${a.last4 ? `<small>•••• ${esc(a.last4)}</small>` : `<small>${esc(ACC_TYPES[a.type] || '')}</small>`}</span></div>
      <div class="acc-bal">${main}${sub}</div>
    </button>`;
  }

  function txView() {
    const q = ui.search.trim().toLowerCase();
    let list = monthTx(ui.month);
    if (q) {
      list = list.filter((t) => [t.note, (idx.cat[t.category_id] || {}).name, (idx.acc[t.account_id] || {}).name, (idx.acc[t.to_account_id] || {}).name, String(t.amount)]
        .join(' ').toLowerCase().includes(q));
    }
    const s = monthStats(ui.month);
    const days = {};
    list.forEach((t) => { (days[t.date] = days[t.date] || []).push(t); });
    const dayKeys = Object.keys(days).sort().reverse();
    return `${monthBar()}
      <div class="flow">
        <div><span>Masuk</span><strong class="pos">${money(s.income)}</strong></div>
        <div><span>Keluar</span><strong class="neg">${money(s.expense)}</strong></div>
        <div><span>Bil. transaksi</span><strong>${monthTx(ui.month).length}</strong></div>
      </div>
      <div class="search">${icon('search')}<input class="input" id="txSearch" type="search" placeholder="Cari nota, kategori, akaun" value="${esc(ui.search)}" autocomplete="off"></div>
      ${dayKeys.length ? dayKeys.map((d) => {
        const out = days[d].filter((t) => t.type === 'expense').reduce((n, t) => n + num(t.amount), 0);
        return `<div class="day-head"><span>${esc(dayLabel(d))}</span><span>${out ? '-' + money(out) : ''}</span></div>
          <div class="list">${days[d].map(txRow).join('')}</div>`;
      }).join('') : `<div class="empty" style="margin-top:16px">${q ? 'Tiada transaksi sepadan.' : `Tiada transaksi untuk ${esc(monthLabel(ui.month))}.`}</div>`}`;
  }

  function monthView() {
    const commits = monthCommitments(ui.month);
    const total = commits.reduce((n, x) => n + num(x.c.amount), 0);
    const paid = commits.filter((x) => x.tx).reduce((n, x) => n + num(x.tx.amount), 0);
    const s = monthStats(ui.month);
    const budgeted = categories('expense').filter((c) => num(c.budget));
    const incomeCats = categories('income').filter((c) => s.cats[c.id]);
    return `${monthBar()}
      <div class="section" style="margin-top:14px">
        <div class="section-head"><h2>Komitmen</h2><button class="link-btn" data-act="manage-commit">Urus</button></div>
        <div class="progress-line"><span>Dibayar ${money(paid)}</span><span>daripada ${money(total)}</span></div>
        <div class="bar" style="margin-bottom:12px"><i style="width:${total ? Math.min(100, (paid / total) * 100) : 0}%;background:var(--sage)"></i></div>
        ${commits.length ? `<div class="list">${commits.map(commitRow).join('')}</div>` : '<div class="empty">Tiada komitmen aktif bulan ni.</div>'}
      </div>
      <div class="section">
        <div class="section-head"><h2>Bajet kategori</h2><button class="link-btn" data-act="manage-budget">Ubah</button></div>
        ${budgeted.length ? `<div class="list">${budgeted.map((c) => {
          const sp = s.cats[c.id] || 0, bud = num(c.budget);
          return `<div class="row" style="display:block">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px"><span><span style="margin-right:8px">${esc(c.icon)}</span><strong style="font-weight:600">${esc(c.name)}</strong></span>
            <span class="${sp > bud ? 'neg' : ''}" style="font-variant-numeric:tabular-nums">${money(sp)} / ${money(bud)}</span></div>
            <div class="bar ${sp > bud ? 'over' : ''}"><i style="width:${Math.min(100, (sp / bud) * 100)}%"></i></div></div>`;
        }).join('')}</div>` : '<div class="empty">Belum ada bajet kategori.</div>'}
      </div>
      <div class="section">
        <div class="section-head"><h2>Sumber pendapatan</h2><span class="aside">${money(s.income)}</span></div>
        ${incomeCats.length ? `<div class="list">${incomeCats.map((c) => `<div class="row"><span class="row-ico">${esc(c.icon)}</span>
          <span class="row-main"><span class="t">${esc(c.name)}</span><span class="s">${esc(c.group)}</span></span>
          <span class="row-amt pos">${money(s.cats[c.id])}</span></div>`).join('')}</div>` : '<div class="empty">Belum ada pendapatan direkod bulan ni.</div>'}
      </div>`;
  }

  function setupView() {
    return `<section class="setup">
      <h1>Sambung ke Sheet kau</h1>
      <p>Masukkan URL web app Apps Script dan token dari fungsi setup(). Data kekal dalam Google Sheet kau sendiri.</p>
      <div class="form-grid">
        <label>URL web app<input class="input" id="cfgUrl" type="url" placeholder="https://script.google.com/macros/s/.../exec" autocomplete="off"></label>
        <label>Token<input class="input" id="cfgToken" type="password" placeholder="Token dari log setup()" autocomplete="off"></label>
      </div>
      <button class="btn" id="cfgSave">Sambung</button>
      <p class="hint" id="cfgMsg"></p>
      <div style="margin-top:22px"><button class="btn ghost" id="cfgDemo">Cuba dengan data contoh</button></div>
    </section>`;
  }

  function bindSetup() {
    $('#cfgSave').onclick = async () => {
      const url = $('#cfgUrl').value.trim(), token = $('#cfgToken').value.trim();
      const msg = $('#cfgMsg');
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) { msg.textContent = 'URL kena berakhir dengan /exec. Salin dari Deploy > Manage deployments.'; return; }
      if (!token) { msg.textContent = 'Masukkan token.'; return; }
      msg.textContent = 'Menyambung...';
      cfg = { url, token };
      try {
        const j = await post({ action: 'bootstrap' });
        data = j.data; reindex();
        save(LS.cfg, cfg); save(LS.data, data);
        queue = []; save(LS.queue, queue);
        render(); toast('Disambung');
      } catch (e) {
        cfg = null;
        msg.textContent = /Unauthorized/.test(e.message) ? 'Token salah. Semak log setup() dalam Apps Script.' : `Gagal sambung: ${e.message}`;
      }
    };
    $('#cfgDemo').onclick = () => {
      cfg = { demo: true }; data = demoData(); reindex();
      save(LS.cfg, cfg); save(LS.data, data); render();
    };
  }

  /* ---------- sheets (bottom panels) ---------- */
  let sheetKeyHandler = null;
  function openSheet(html, onMount) {
    closeSheet(true);
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
    const sheet = $('.sheet', root);
    requestAnimationFrame(() => { $('.scrim', root).classList.add('open'); sheet.classList.add('open'); });
    $('.scrim', root).onclick = () => closeSheet();
    root.querySelectorAll('[data-close-btn]').forEach((b) => { b.onclick = () => closeSheet(); });
    if (onMount) onMount(sheet);
    return sheet;
  }
  function closeSheet(immediate) {
    const root = $('#sheetRoot');
    if (sheetKeyHandler) { document.removeEventListener('keydown', sheetKeyHandler); sheetKeyHandler = null; }
    if (!root.firstChild) return;
    if (immediate) { root.innerHTML = ''; return; }
    root.querySelector('.sheet').classList.remove('open');
    root.querySelector('.scrim').classList.remove('open');
    setTimeout(() => { root.innerHTML = ''; }, 260);
  }
  const sheetHead = (title) => `<div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close-btn aria-label="Tutup">${icon('x')}</button></div>`;

  function usageRank() {
    const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    const r = {};
    (data.transactions || []).forEach((t) => { if (String(t.date) >= since) { r[t.category_id] = (r[t.category_id] || 0) + 1; r[t.account_id] = (r[t.account_id] || 0) + 1; } });
    return r;
  }

  function openTxSheet(opts) {
    opts = opts || {};
    const editing = opts.tx || null;
    if (editing && editing.type === 'adjust') return openAdjustInfo(editing);
    const firstDebit = accounts().find((a) => a.group === 'debit');
    const st = {
      type: editing ? editing.type : (opts.type || 'expense'),
      amount: editing ? String(round2(num(editing.amount))) : (opts.amount ? String(opts.amount) : ''),
      category_id: editing ? editing.category_id : (opts.category_id || ''),
      account_id: editing ? editing.account_id : (opts.account_id || (idx.acc[ui.lastAccount] && ui.lastAccount) || (firstDebit && firstDebit.id) || ''),
      to_account_id: editing ? editing.to_account_id : (opts.to_account_id || ''),
      date: editing ? String(editing.date) : (opts.date || todayStr()),
      note: editing ? editing.note : (opts.note || ''),
      commitment_id: editing ? editing.commitment_id : (opts.commitment_id || '')
    };
    const rank = usageRank();
    const accList = () => accounts().slice().sort((a, b) => (rank[b.id] || 0) - (rank[a.id] || 0) || num(a.order) - num(b.order));
    const catList = (kind) => categories(kind).slice().sort((a, b) => (rank[b.id] || 0) - (rank[a.id] || 0) || num(a.order) - num(b.order));

    const accChips = (field) => accList().map((a) => `<button class="chip ${st[field] === a.id ? 'on' : ''}" data-pick="${field}" data-id="${esc(a.id)}"><span class="sw" style="background:${esc(a.color || '#D4AE68')}"></span>${esc(a.name)}</button>`).join('');
    const catChips = () => catList(st.type === 'income' ? 'income' : 'expense').map((c) => `<button class="chip ${st.category_id === c.id ? 'on' : ''}" data-pick="category_id" data-id="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</button>`).join('');
    const body = () => st.type === 'transfer'
      ? `<div class="field-label"><span>Dari</span></div><div class="chips">${accChips('account_id')}</div>
         <div class="field-label"><span>Ke</span></div><div class="chips">${accChips('to_account_id')}</div>`
      : `<div class="field-label"><span>Kategori</span></div><div class="chips">${catChips()}</div>
         <div class="field-label"><span>${st.type === 'income' ? 'Masuk ke' : 'Bayar guna'}</span></div><div class="chips">${accChips('account_id')}</div>`;

    const html = `${sheetHead(editing ? 'Edit transaksi' : (st.commitment_id ? 'Bayar komitmen' : 'Transaksi baru'))}
      <div class="seg" role="tablist">
        ${['expense', 'income', 'transfer'].map((t) => `<button data-v="${t}" class="${st.type === t ? 'on' : ''}">${TX_LABEL[t]}</button>`).join('')}
      </div>
      <div class="amount-display" id="amtDisp"></div>
      <div id="txBody">${body()}</div>
      <div class="inline-fields">
        <input class="input" type="date" id="txDate" value="${esc(st.date)}" aria-label="Tarikh">
        <input class="input" type="text" id="txNote" value="${esc(st.note)}" placeholder="Nota (pilihan)" aria-label="Nota" maxlength="120">
      </div>
      <div class="keypad" id="keypad">
        ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((k) => `<button data-k="${k}">${k}</button>`).join('')}
        <button data-k="del" aria-label="Padam">${icon('back')}</button>
      </div>
      <div class="btn-row ${editing ? '' : 'one'}">
        ${editing ? '<button class="btn danger" id="txDel">Padam</button>' : ''}
        <button class="btn" id="txSave">${editing ? 'Simpan' : 'Simpan transaksi'}</button>
      </div>`;

    openSheet(html, (sh) => {
      const disp = $('#amtDisp', sh);
      const showAmt = () => {
        const v = st.amount || '0';
        const [i, d] = v.split('.');
        const pretty = Number(i || 0).toLocaleString('en-MY') + (d !== undefined ? '.' + d : '');
        disp.innerHTML = `<span class="cur">RM</span>${pretty}`;
        disp.classList.toggle('zero', !num(st.amount));
      };
      const press = (k) => {
        if (k === 'del') st.amount = st.amount.slice(0, -1);
        else if (k === '.') { if (!st.amount.includes('.')) st.amount = (st.amount || '0') + '.'; }
        else {
          const [, d] = st.amount.split('.');
          if (d !== undefined && d.length >= 2) return;
          if (st.amount.replace('.', '').length >= 9) return;
          st.amount = st.amount === '0' ? k : st.amount + k;
        }
        showAmt();
      };
      showAmt();
      $('#keypad', sh).onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); };
      sheetKeyHandler = (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === '.' || e.key === ',') press('.');
        else if (e.key === 'Backspace') press('del');
        else if (e.key === 'Enter') $('#txSave', sh).click();
        else if (e.key === 'Escape') closeSheet();
      };
      document.addEventListener('keydown', sheetKeyHandler);
      $('.seg', sh).onclick = (e) => {
        const b = e.target.closest('[data-v]'); if (!b) return;
        const prevKind = st.type === 'income' ? 'income' : 'expense';
        st.type = b.dataset.v;
        const kind = st.type === 'income' ? 'income' : 'expense';
        if (kind !== prevKind) st.category_id = '';
        sh.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
        $('#txBody', sh).innerHTML = body();
      };
      $('#txBody', sh).onclick = (e) => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        st[b.dataset.pick] = b.dataset.id;
        b.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
      };
      $('#txSave', sh).onclick = () => {
        st.date = $('#txDate', sh).value || todayStr();
        st.note = $('#txNote', sh).value.trim();
        const amt = round2(num(st.amount));
        if (!(amt > 0)) return toast('Masukkan jumlah');
        if (!st.account_id || !idx.acc[st.account_id]) return toast('Pilih akaun');
        if (st.type === 'transfer') {
          if (!st.to_account_id) return toast('Pilih akaun tujuan');
          if (st.to_account_id === st.account_id) return toast('Akaun asal dan tujuan sama');
        } else if (!st.category_id) return toast('Pilih kategori');
        const row = {
          id: editing ? editing.id : uid('tx'), date: st.date, type: st.type, amount: amt,
          account_id: st.account_id, to_account_id: st.type === 'transfer' ? st.to_account_id : '',
          category_id: st.type === 'transfer' ? '' : st.category_id,
          commitment_id: st.commitment_id || '', note: st.note, source: editing ? (editing.source || 'manual') : 'manual'
        };
        ui.lastAccount = st.account_id;
        closeSheet();
        commit([{ op: 'upsert', tab: 'Transactions', row }], editing ? 'Disimpan' : `${TX_LABEL[st.type]} ${fmt(amt)} disimpan`);
      };
      const del = $('#txDel', sh);
      if (del) del.onclick = () => {
        if (!confirm('Padam transaksi ni?')) return;
        closeSheet();
        commit([{ op: 'delete', tab: 'Transactions', row: { id: editing.id } }], 'Dipadam');
      };
    });
  }

  function openAdjustInfo(t) {
    const acc = idx.acc[t.account_id];
    openSheet(`${sheetHead('Pelarasan baki')}
      <div class="note-box">Pelarasan <strong>${money(num(t.amount), true)}</strong> pada ${esc(acc ? acc.name : '?')}, ${esc(dayLabel(String(t.date)))}.<br>Ini dibuat bila kau kemas kini baki sebenar akaun. Ia tak dikira sebagai belanja atau pendapatan.</div>
      <div class="btn-row one"><button class="btn danger" id="adjDel">Padam pelarasan</button></div>`, (sh) => {
      $('#adjDel', sh).onclick = () => { closeSheet(); commit([{ op: 'delete', tab: 'Transactions', row: { id: t.id } }], 'Dipadam'); };
    });
  }

  function openAccountSheet(a) {
    const bal = balances()[a.id] || 0;
    const isCredit = a.group === 'credit' || a.group === 'borrowed';
    const txs = (data.transactions || []).filter((t) => t.account_id === a.id || t.to_account_id === a.id)
      .sort((x, y) => (String(y.date) + String(y.created_at)).localeCompare(String(x.date) + String(x.created_at))).slice(0, 12);
    openSheet(`${sheetHead(a.name)}
      <div class="note-box">
        <div style="font-size:12.5px">${isCredit ? 'Hutang semasa' : a.group === 'invest' ? 'Nilai semasa' : 'Baki semasa'}</div>
        <div style="font-family:var(--serif);font-size:32px;color:var(--ivory)" class="money">${fmt(isCredit ? -bal : bal)}</div>
        ${isCredit && num(a.credit_limit) ? `<div>Had ${money(num(a.credit_limit))} · Baki had ${money(num(a.credit_limit) + bal)}</div>` : ''}
        ${a.note ? `<div style="margin-top:6px">${esc(a.note)}</div>` : ''}
      </div>
      <div class="field-label"><span>${isCredit ? 'Hutang sebenar sekarang' : a.group === 'invest' ? 'Nilai sebenar sekarang' : 'Baki sebenar sekarang'}</span></div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:8px">
        <input class="input" id="adjVal" inputmode="decimal" placeholder="${fmtAbs(isCredit ? -bal : bal)}">
        <button class="btn" id="adjSave" style="width:auto;padding:0 18px">Kemas kini</button>
      </div>
      <p class="hint">App rekod beza sebagai pelarasan, bukan belanja.</p>
      <div class="field-label" style="margin-top:20px"><span>Transaksi terkini</span></div>
      ${txs.length ? `<div class="list">${txs.map(txRow).join('')}</div>` : '<div class="empty">Belum ada transaksi.</div>'}
      <div class="btn-row one"><button class="btn ghost" id="accEdit">Edit akaun</button></div>`, (sh) => {
      $('#adjSave', sh).onclick = () => {
        const raw = $('#adjVal', sh).value.replace(/[^0-9.\-]/g, '');
        if (raw === '') return toast('Masukkan jumlah');
        const target = isCredit ? -Math.abs(num(raw)) : num(raw);
        const delta = round2(target - bal);
        if (Math.abs(delta) < 0.005) return toast('Baki dah sama');
        closeSheet();
        commit([{ op: 'upsert', tab: 'Transactions', row: { id: uid('tx'), date: todayStr(), type: 'adjust', amount: delta, account_id: a.id, to_account_id: '', category_id: '', commitment_id: '', note: 'Pelarasan baki', source: 'adjust' } }], 'Baki dikemas kini');
      };
      sh.addEventListener('click', (e) => {
        const r = e.target.closest('[data-act="edit-tx"]');
        if (r) { const t = data.transactions.find((x) => x.id === r.dataset.id); if (t) openTxSheet({ tx: t }); }
      });
      $('#accEdit', sh).onclick = () => openAccountForm(a);
    });
  }

  function openAccountForm(a) {
    const isNew = !a;
    a = a || { id: uid('acc'), name: '', type: 'bank', group: 'debit', last4: '', opening_balance: 0, credit_limit: '', color: '#D4AE68', order: (data.accounts || []).length + 1, archived: false, note: '' };
    const groupForType = { bank: 'debit', ewallet: 'debit', cash: 'debit', card: 'credit', bnpl: 'credit', loan: 'borrowed', invest: 'invest' };
    openSheet(`${sheetHead(isNew ? 'Akaun baru' : 'Edit akaun')}
      <div class="form-grid">
        <label>Nama<input class="input" id="fName" value="${esc(a.name)}" maxlength="40"></label>
        <label>Jenis<select class="input" id="fType">${Object.entries(ACC_TYPES).map(([k, v]) => `<option value="${k}" ${a.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label>4 digit akhir (pilihan)<input class="input" id="fLast4" value="${esc(a.last4)}" inputmode="numeric" maxlength="4"></label>
        <label>${isNew ? 'Baki permulaan (hutang ditulis positif)' : 'Baki permulaan (sejak tarikh mula)'}<input class="input" id="fOpen" inputmode="decimal" value="${esc(Math.abs(num(a.opening_balance)))}"></label>
        <label>Had kredit (kad / PayLater)<input class="input" id="fLimit" inputmode="decimal" value="${esc(a.credit_limit === null ? '' : a.credit_limit)}"></label>
        <label>Warna<input class="input" id="fColor" type="color" value="${esc(a.color || '#D4AE68')}" style="height:46px;padding:4px"></label>
        <label>Nota<input class="input" id="fNote" value="${esc(a.note)}" maxlength="120"></label>
      </div>
      ${isNew ? '' : '<p class="hint">Untuk betulkan baki semasa, guna "Kemas kini" pada akaun, bukan baki permulaan.</p>'}
      <div class="btn-row ${isNew ? 'one' : ''}">
        ${isNew ? '' : `<button class="btn danger" id="fArchive">${a.archived ? 'Aktifkan' : 'Arkib'}</button>`}
        <button class="btn" id="fSave">Simpan akaun</button>
      </div>`, (sh) => {
      $('#fSave', sh).onclick = () => {
        const name = $('#fName', sh).value.trim();
        if (!name) return toast('Masukkan nama akaun');
        const type = $('#fType', sh).value;
        const group = groupForType[type];
        const open = Math.abs(num($('#fOpen', sh).value.replace(/[^0-9.]/g, '')));
        const lim = $('#fLimit', sh).value.replace(/[^0-9.]/g, '');
        const row = Object.assign({}, a, {
          name, type, group, last4: $('#fLast4', sh).value.replace(/\D/g, '').slice(0, 4),
          opening_balance: group === 'credit' || group === 'borrowed' ? -open : open,
          credit_limit: lim === '' ? '' : num(lim), color: $('#fColor', sh).value, note: $('#fNote', sh).value.trim()
        });
        closeSheet();
        commit([{ op: 'upsert', tab: 'Accounts', row }], 'Akaun disimpan');
      };
      const ar = $('#fArchive', sh);
      if (ar) ar.onclick = () => { closeSheet(); commit([{ op: 'upsert', tab: 'Accounts', row: Object.assign({}, a, { archived: !a.archived }) }], a.archived ? 'Diaktifkan' : 'Diarkib'); };
    });
  }

  function openCommitManager() {
    const list = (data.commitments || []).slice().sort((a, b) => (b.active !== false) - (a.active !== false) || num(a.due_day || 99) - num(b.due_day || 99));
    openSheet(`${sheetHead('Urus komitmen')}
      <div class="list">${list.map((c) => `<button class="row" data-cid="${esc(c.id)}">
        <span class="row-ico">${esc((idx.cat[c.category_id] || {}).icon || '📌')}</span>
        <span class="row-main"><span class="t">${esc(c.name)}</span><span class="s">${c.active === false ? 'Tak aktif' : (c.due_day ? `${c.due_day} hb` : 'Tiada tarikh')}${c.end_month ? ` · tamat ${esc(c.end_month)}` : ''}</span></span>
        <span class="row-amt">${money(num(c.amount))}</span></button>`).join('')}</div>
      <div class="btn-row one"><button class="btn" id="cNew">Tambah komitmen</button></div>`, (sh) => {
      sh.addEventListener('click', (e) => {
        const r = e.target.closest('[data-cid]');
        if (r) openCommitForm(data.commitments.find((c) => c.id === r.dataset.cid));
      });
      $('#cNew', sh).onclick = () => openCommitForm(null);
    });
  }

  function openCommitForm(c) {
    const isNew = !c;
    c = c || { id: uid('com'), name: '', amount: '', due_day: '', category_id: '', account_id: '', start_month: '', end_month: '', active: true, note: '' };
    const catOpts = categories('expense').map((x) => `<option value="${x.id}" ${c.category_id === x.id ? 'selected' : ''}>${esc(x.icon + ' ' + x.name)}</option>`).join('');
    const accOpts = `<option value="">Tiada (pilih masa bayar)</option>` + accounts().map((x) => `<option value="${x.id}" ${c.account_id === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    openSheet(`${sheetHead(isNew ? 'Komitmen baru' : 'Edit komitmen')}
      <div class="form-grid">
        <label>Nama<input class="input" id="kName" value="${esc(c.name)}" maxlength="60"></label>
        <label>Jumlah sebulan (RM)<input class="input" id="kAmt" inputmode="decimal" value="${esc(c.amount === null ? '' : c.amount)}"></label>
        <label>Hari jatuh tempo (1 hingga 31, pilihan)<input class="input" id="kDay" inputmode="numeric" value="${esc(c.due_day === null ? '' : c.due_day)}"></label>
        <label>Kategori<select class="input" id="kCat">${catOpts}</select></label>
        <label>Akaun biasa guna<select class="input" id="kAcc">${accOpts}</select></label>
        <label>Bulan mula (pilihan)<input class="input" id="kStart" type="month" value="${esc(c.start_month)}"></label>
        <label>Bulan akhir (pilihan, contoh ansuran)<input class="input" id="kEnd" type="month" value="${esc(c.end_month)}"></label>
      </div>
      <div class="btn-row ${isNew ? 'one' : ''}">
        ${isNew ? '' : `<button class="btn danger" id="kToggle">${c.active === false ? 'Aktifkan' : 'Hentikan'}</button>`}
        <button class="btn" id="kSave">Simpan</button>
      </div>`, (sh) => {
      $('#kSave', sh).onclick = () => {
        const name = $('#kName', sh).value.trim();
        const amount = round2(num($('#kAmt', sh).value.replace(/[^0-9.]/g, '')));
        if (!name || !(amount > 0)) return toast('Isi nama dan jumlah');
        const day = parseInt($('#kDay', sh).value, 10);
        const row = Object.assign({}, c, {
          name, amount, due_day: day >= 1 && day <= 31 ? day : '', category_id: $('#kCat', sh).value,
          account_id: $('#kAcc', sh).value, start_month: $('#kStart', sh).value, end_month: $('#kEnd', sh).value
        });
        closeSheet();
        commit([{ op: 'upsert', tab: 'Commitments', row }], 'Komitmen disimpan');
      };
      const tg = $('#kToggle', sh);
      if (tg) tg.onclick = () => { closeSheet(); commit([{ op: 'upsert', tab: 'Commitments', row: Object.assign({}, c, { active: c.active === false }) }], 'Dikemas kini'); };
    });
  }

  function openBudgetEditor() {
    const cats = categories('expense');
    openSheet(`${sheetHead('Bajet bulanan')}
      <p class="hint" style="margin-top:0">Biarkan kosong kalau tak nak hadkan kategori tu.</p>
      <div class="list">${cats.map((c) => `<div class="row"><span class="row-ico">${esc(c.icon)}</span>
        <span class="row-main"><span class="t">${esc(c.name)}</span><span class="s">${esc(c.group)}</span></span>
        <input class="input" style="width:110px;text-align:right" inputmode="decimal" data-bud="${c.id}" value="${num(c.budget) ? esc(c.budget) : ''}" placeholder="RM"></div>`).join('')}</div>
      <div class="btn-row one"><button class="btn" id="bSave">Simpan bajet</button></div>`, (sh) => {
      $('#bSave', sh).onclick = () => {
        const ops = [];
        sh.querySelectorAll('[data-bud]').forEach((inp) => {
          const c = idx.cat[inp.dataset.bud];
          const v = inp.value.replace(/[^0-9.]/g, '');
          const nv = v === '' ? '' : round2(num(v));
          if (String(nv) !== String(num(c.budget) ? c.budget : '')) ops.push({ op: 'upsert', tab: 'Categories', row: Object.assign({}, c, { budget: nv }) });
        });
        closeSheet();
        if (ops.length) commit(ops, 'Bajet disimpan');
      };
    });
  }

  function openGroupSheet(g) {
    const txs = monthTx(ui.month).filter((t) => t.type === 'expense' && ((idx.cat[t.category_id] || {}).group || 'Lifestyle') === g);
    openSheet(`${sheetHead(`${g}, ${monthLabel(ui.month)}`)}
      ${txs.length ? `<div class="list">${txs.map(txRow).join('')}</div>` : '<div class="empty">Tiada belanja dalam kumpulan ni bulan ni.</div>'}`, (sh) => {
      sh.addEventListener('click', (e) => {
        const r = e.target.closest('[data-act="edit-tx"]');
        if (r) { const t = data.transactions.find((x) => x.id === r.dataset.id); if (t) openTxSheet({ tx: t }); }
      });
    });
  }

  function openSettings() {
    const demo = cfg && cfg.demo;
    openSheet(`${sheetHead('Tetapan')}
      <div class="note-box">${demo ? 'Mod demo. Data contoh disimpan dalam pelayar ni sahaja.' : `Disambung ke Apps Script.<br>${queue.length ? `<strong>${queue.length}</strong> perubahan menunggu sync.` : 'Semua perubahan dah sync.'}${syncError ? `<br>Ralat terakhir: ${esc(syncError)}` : ''}`}</div>
      <div class="form-grid" style="margin-top:14px">
        ${demo ? '' : '<button class="btn" id="sSync">Sync sekarang</button>'}
        <button class="btn ghost" id="sCsv">Eksport transaksi (CSV)</button>
        <button class="btn ghost" id="sDisc">${demo ? 'Keluar mod demo' : 'Tukar sambungan'}</button>
      </div>
      <p class="hint">Tarikh mula baki: ${esc(openingDate() || 'tiada')}. Transaksi sebelum tarikh ni disimpan sebagai sejarah dan tak ubah baki akaun.</p>
      <p class="hint">KewanganKu v${VERSION}</p>`, (sh) => {
      const s = $('#sSync', sh);
      if (s) s.onclick = () => { closeSheet(); sync().then(() => toast(syncError ? 'Sync gagal' : 'Sync selesai')); };
      $('#sCsv', sh).onclick = exportCsv;
      $('#sDisc', sh).onclick = () => {
        if (!demo && queue.length && !confirm(`${queue.length} perubahan belum sync akan hilang. Teruskan?`)) return;
        localStorage.removeItem(LS.cfg); localStorage.removeItem(LS.data); localStorage.removeItem(LS.queue);
        cfg = null; data = null; queue = []; closeSheet(); render();
      };
    });
  }

  function exportCsv() {
    const cols = ['date', 'type', 'amount', 'account', 'to_account', 'category', 'group', 'note'];
    const rows = (data.transactions || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map((t) => [
      t.date, t.type, t.amount, (idx.acc[t.account_id] || {}).name || '', (idx.acc[t.to_account_id] || {}).name || '',
      (idx.cat[t.category_id] || {}).name || '', (idx.cat[t.category_id] || {}).group || '', t.note || ''
    ]);
    const csv = [cols].concat(rows).map((r) => r.map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `kewanganku-${todayStr()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t && t.classList.contains('tab')) { ui.tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
    const a = e.target.closest('[data-act]');
    if (!a || a.closest('#sheetRoot')) return;
    const act = a.dataset.act;
    if (act === 'tab') { ui.tab = a.dataset.tab; render(); window.scrollTo(0, 0); }
    else if (act === 'month') { ui.month = shiftMonth(ui.month, +a.dataset.d); render(); }
    else if (act === 'add') openTxSheet();
    else if (act === 'edit-tx') { const tx = data.transactions.find((x) => x.id === a.dataset.id); if (tx) openTxSheet({ tx }); }
    else if (act === 'pay') {
      const c = data.commitments.find((x) => x.id === a.dataset.id);
      if (c) {
        const now = todayStr();
        const date = now.slice(0, 7) === ui.month ? now : `${ui.month}-${String(Math.min(num(c.due_day) || 1, 28)).padStart(2, '0')}`;
        openTxSheet({ type: 'expense', amount: num(c.amount), category_id: c.category_id, account_id: c.account_id || undefined, note: c.name, commitment_id: c.id, date });
      }
    }
    else if (act === 'acc') { const acc = idx.acc[a.dataset.id]; if (acc) openAccountSheet(acc); }
    else if (act === 'new-acc') openAccountForm(null);
    else if (act === 'manage-commit') openCommitManager();
    else if (act === 'manage-budget') openBudgetEditor();
    else if (act === 'group') openGroupSheet(a.dataset.g);
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'txSearch') {
      ui.search = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const s = $('#txSearch'); s.focus(); try { s.setSelectionRange(pos, pos); } catch (err) { /* type=search */ }
    }
  });
  $('#addBtn').onclick = () => { if (data) openTxSheet(); };
  $('#settingsBtn').onclick = () => { if (data) openSettings(); };
  $('#privacyBtn').onclick = () => { ui.private = !ui.private; render(); };
  $('#settingsBtn').innerHTML = icon('gear');
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  window.addEventListener('online', sync);
  window.addEventListener('offline', setSync);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });

  /* ---------- demo data (fictional) ---------- */
  function demoData() {
    const m = todayStr().slice(0, 7), pm = shiftMonth(m, -1);
    const d = (mm, day) => `${mm}-${String(day).padStart(2, '0')}`;
    const cats = [
      ['cat_loan', 'Loan & Ansuran', 'expense', 'Fixed', '🏦'], ['cat_sub', 'Langganan', 'expense', 'Fixed', '🔁'],
      ['cat_dapur', 'Barang Dapur', 'expense', 'Household', '🛒', 400], ['cat_elektrik', 'Bil Elektrik', 'expense', 'Household', '⚡'],
      ['cat_telco', 'Telco & Internet', 'expense', 'Telco', '📱'], ['cat_minyak', 'Minyak', 'expense', 'Transport', '⛽', 200],
      ['cat_tol', 'Tol & Parking', 'expense', 'Transport', '🛣️', 60], ['cat_anak', 'Anak', 'expense', 'Family', '🍼', 250],
      ['cat_family', 'Keluarga', 'expense', 'Family', '👪'], ['cat_makan', 'Makan Luar', 'expense', 'Lifestyle', '🍜', 250],
      ['cat_shopping', 'Shopping', 'expense', 'Lifestyle', '🛍️'], ['cat_simpan', 'Simpanan', 'expense', 'Savings', '💰'],
      ['cat_sekali', 'Sekali Sekala', 'expense', 'One Time', '🎯'],
      ['cat_gaji', 'Gaji', 'income', 'Salary', '💼'], ['cat_side', 'Kerja Sampingan', 'income', 'Affiliate', '💎']
    ].map((c, i) => ({ id: c[0], name: c[1], kind: c[2], group: c[3], icon: c[4], budget: c[5] || '', order: i + 1, archived: false }));
    const accs = [
      ['acc_bank', 'Bank Utama', 'bank', 'debit', 2150, '', '#E3B23C'], ['acc_ew', 'E-Wallet', 'ewallet', 'debit', 85, '', '#3D6FD8'],
      ['acc_cash', 'Tunai', 'cash', 'debit', 60, '', '#2E9E6A'], ['acc_cc', 'Kad Kredit', 'card', 'credit', -640, 5000, '#C43B3B'],
      ['acc_pl', 'PayLater', 'bnpl', 'credit', -120, 1500, '#B8D432'], ['acc_car', 'Pinjaman Kereta', 'loan', 'borrowed', -18400, '', '#8B5CF6'],
      ['acc_asb', 'ASB', 'invest', 'invest', 6200, '', '#2B4BA0'], ['acc_epf', 'KWSP', 'invest', 'invest', 24800, '', '#A07C2C']
    ].map((a, i) => ({ id: a[0], name: a[1], type: a[2], group: a[3], last4: '', opening_balance: a[4], credit_limit: a[5], color: a[6], order: i + 1, archived: false, note: '' }));
    const coms = [
      ['com_car', 'Ansuran kereta', 520, 5, 'cat_loan', 'acc_bank'], ['com_net', 'Internet rumah', 99, 10, 'cat_telco', 'acc_bank'],
      ['com_tnb', 'Bil elektrik', 160, 15, 'cat_elektrik', 'acc_bank'], ['com_ph', 'Pelan telefon', 45, 20, 'cat_telco', 'acc_cc'],
      ['com_str', 'Langganan streaming', 25, 25, 'cat_sub', 'acc_cc']
    ].map((c) => ({ id: c[0], name: c[1], amount: c[2], due_day: c[3], category_id: c[4], account_id: c[5], start_month: '', end_month: '', active: true, note: '' }));
    const tx = [];
    const add = (date, type, amount, account_id, category_id, note, extra) => tx.push(Object.assign({ id: uid('tx'), date, type, amount, account_id, to_account_id: '', category_id, commitment_id: '', note, source: 'demo', created_at: date + 'T09:00:00' }, extra || {}));
    const today = Math.max(1, Number(todayStr().slice(8, 10)));
    [[pm, 28], [m, Math.min(today, 28)]].forEach(([mm, last], k) => {
      add(d(mm, 1), 'income', 3800, 'acc_bank', 'cat_gaji', 'Gaji');
      if (last >= 5) add(d(mm, 5), 'expense', 520, 'acc_bank', 'cat_loan', 'Ansuran kereta', { commitment_id: 'com_car' });
      if (last >= 10) add(d(mm, 10), 'expense', 99, 'acc_bank', 'cat_telco', 'Internet rumah', { commitment_id: 'com_net' });
      if (last >= 6) add(d(mm, 6), 'expense', 186.4, 'acc_cc', 'cat_dapur', 'Pasar raya');
      if (last >= 7) add(d(mm, 7), 'expense', 60, 'acc_cc', 'cat_minyak', 'Isi minyak');
      if (last >= 9) add(d(mm, 9), 'expense', 23.5, 'acc_ew', 'cat_makan', 'Nasi lemak & kopi');
      if (last >= 12) add(d(mm, 12), 'income', 640, 'acc_bank', 'cat_side', 'Komisen sampingan');
      if (last >= 12) add(d(mm, 12), 'transfer', 100, 'acc_bank', '', 'Topup e-wallet', { to_account_id: 'acc_ew' });
      if (last >= 14) add(d(mm, 14), 'expense', 89.9, 'acc_pl', 'cat_shopping', 'Kasut anak');
      if (last >= 15 && k === 0) add(d(mm, 15), 'expense', 160, 'acc_bank', 'cat_elektrik', 'Bil elektrik', { commitment_id: 'com_tnb' });
      if (last >= 16) add(d(mm, 16), 'expense', 42, 'acc_ew', 'cat_tol', 'Tol');
      if (last >= 18) add(d(mm, 18), 'expense', 68, 'acc_cc', 'cat_anak', 'Susu & lampin');
      if (last >= 20) add(d(mm, 20), 'transfer', 300, 'acc_bank', '', 'Simpan ASB', { to_account_id: 'acc_asb' });
      if (last >= 21) add(d(mm, 21), 'expense', 54, 'acc_ew', 'cat_makan', 'Makan malam keluarga');
    });
    return { accounts: accs, categories: cats, commitments: coms, transactions: tx, settings: { opening_date: '' } };
  }

  /* ---------- boot ---------- */
  if (data) reindex();
  render();
  sync();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ });
  }
})();
