/* KewanganKu: personal finance PWA backed by a Google Sheet through Apps Script. */
(() => {
  'use strict';

  const VERSION = '2.0.1';
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
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'
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
  let lastSync = '';

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


  const commitKind = (c) => c.kind || 'expense';
  function commitAmount(c, bal) {
    if (num(c.amount) > 0) return num(c.amount);
    if (commitKind(c) === 'transfer') {
      const to = idx.acc[c.to_account_id];
      if (to && (to.group === 'credit' || to.group === 'borrowed')) {
        const owed = -((bal || balances())[to.id] || 0);
        return owed > 0.004 ? round2(owed) : 0;
      }
    }
    return null;
  }
  function commitStatus(x, m) {
    if (x.tx) return { k: 'paid', label: `Selesai ${dayLabel(String(x.tx.date)).split(', ')[1]}` };
    if (x.amount === 0) return { k: 'paid', label: 'Tiada hutang' };
    const cur = todayStr().slice(0, 7);
    const due = num(x.c.due_day);
    if (m < cur) return { k: 'overdue', label: 'Belum direkod' };
    if (m > cur) return { k: 'upcoming', label: due ? `${due} hb` : 'Tiada tarikh' };
    if (!due) return { k: 'nodate', label: 'Tiada tarikh' };
    const day = Number(todayStr().slice(8, 10));
    if (due < day) return { k: 'overdue', label: commitKind(x.c) === 'income' ? 'Belum direkod' : `Lewat ${day - due} hari` };
    if (due === day) return { k: 'today', label: 'Hari ni' };
    return { k: 'upcoming', label: due - day === 1 ? 'Esok' : `${due - day} hari lagi` };
  }
  function monthCommitments(m) {
    const bal = balances();
    return (data.commitments || []).filter((c) => c.active !== false &&
      (!c.start_month || String(c.start_month) <= m) && (!c.end_month || String(c.end_month) >= m))
      .map((c) => {
        const tx = (data.transactions || []).find((t) => t.commitment_id === c.id && String(t.date).slice(0, 7) === m);
        const x = { c, tx, amount: tx ? num(tx.amount) : commitAmount(c, bal) };
        x.status = commitStatus(x, m);
        return x;
      })
      .sort((a, b) => (num(a.c.due_day) || 99) - (num(b.c.due_day) || 99));
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
      lastSync = new Date().toTimeString().slice(0, 5);
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
    let label = lastSync ? `Dikemas kini ${lastSync}` : 'Sync';
    if (cfg && cfg.demo) label = 'Demo';
    else if (syncing) { label = 'Sync...'; el.classList.add('pending'); }
    else if (!navigator.onLine) { label = queue.length ? `${queue.length} menunggu` : 'Offline'; el.classList.add('pending'); }
    else if (syncError) { label = 'Gagal sync'; el.classList.add('error'); }
    else if (queue.length) { label = `${queue.length} menunggu`; el.classList.add('pending'); }
    el.innerHTML = `<span class="dot"></span>${label}`;
    el.title = syncError || '';
  }

  /* ---------- views ---------- */
  const GROUP_COLORS = { Fixed: '#4D8BFF', Household: '#45C987', Telco: '#A78BFA', Transport: '#F2B14C', Family: '#F2696D', Lifestyle: '#2EC4D6', Savings: '#9AA4B8', 'One Time': '#F08A50' };
  const INCOME_COLORS = ['#4D8BFF', '#45C987', '#A78BFA', '#F2B14C', '#2EC4D6', '#F08A50', '#9AA4B8'];
  const TITLES = { home: 'Ringkasan', trend: 'Trend', plan: 'Bajet', tx: 'Transaksi', accounts: 'Akaun' };
  const isCurMonth = (m) => m === todayStr().slice(0, 7);
  /* A month counts as having data only when transactions span most of it; partial months are not used for comparisons. */
  function monthHasData(m) {
    const ds = (data.transactions || []).map((t) => String(t.date)).filter((d) => d.slice(0, 7) === m).sort();
    if (!ds.length) return false;
    if (isCurMonth(m)) return true;
    const [y, mo] = m.split('-').map(Number);
    const dim = new Date(y, mo, 0).getDate();
    const span = Number(ds[ds.length - 1].slice(8, 10)) - Number(ds[0].slice(8, 10)) + 1;
    return span / dim >= 0.6;
  }
  const shortMonth = (m) => MON_S[Number(m.slice(5, 7)) - 1];
  const fmtShort = (n) => { const a = Math.abs(n); const s = n < 0 ? '-' : ''; return a >= 1000 ? `${s}RM${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `${s}RM${Math.round(a)}`; };
  const setting = (k, d) => { const v = data.settings && data.settings[k]; return v === undefined || v === null || v === '' ? d : v; };

  function savingsOf(m) {
    return monthTx(m).filter((t) => t.type === 'transfer' && (idx.acc[t.to_account_id] || {}).group === 'invest').reduce((n, t) => n + num(t.amount), 0);
  }
  function monthSeries(end, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const m = shiftMonth(end, -i);
      const s = monthStats(m);
      Object.assign(s, { m, has: monthHasData(m), net: s.income - s.expense, saving: savingsOf(m) });
      out.push(s);
    }
    return out;
  }
  function deltaPill(cur, prev, upIsGood, onHero) {
    if (!prev || Math.abs(prev) < 0.01) return '';
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    if (!isFinite(pct)) return '';
    const up = pct >= 0;
    const good = up === upIsGood;
    return `<span class="pill ${onHero ? '' : (good ? 'good' : 'bad')}">${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%</span>`;
  }
  function ring(pct, color, track) {
    const p = Math.max(0, Math.min(100, pct || 0));
    const r = 24, c = 2 * Math.PI * r;
    return `<div class="ring"><svg viewBox="0 0 58 58"><circle cx="29" cy="29" r="${r}" fill="none" stroke="${track || 'rgba(255,255,255,.18)'}" stroke-width="6"/>
      <circle cx="29" cy="29" r="${r}" fill="none" stroke="${color || '#fff'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * p) / 100} ${c}" transform="rotate(-90 29 29)"/></svg>
      <b>${Math.round(pct || 0)}%</b></div>`;
  }
  function sparkline(vals, color) {
    const pts = vals.map((v, i) => ({ v, i })).filter((p) => p.v !== null);
    if (pts.length < 2) return `<svg viewBox="0 0 200 46"></svg>`;
    const min = Math.min(...pts.map((p) => p.v)), max = Math.max(...pts.map((p) => p.v));
    const span = max - min || 1, n = vals.length - 1;
    const xy = pts.map((p) => [(p.i / n) * 200, 40 - ((p.v - min) / span) * 30]);
    const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
    const area = `${line}L${xy[xy.length - 1][0].toFixed(1)} 46L${xy[0][0].toFixed(1)} 46Z`;
    const last = xy[xy.length - 1];
    return `<svg viewBox="0 0 200 46" preserveAspectRatio="none"><path d="${area}" fill="${color}" opacity=".16"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="${color}"/></svg>`;
  }
  /* cols: [{ label, cur, has, groups: [[{v,color}], ...] }] grouped (side by side) and stacked (within a group) */
  function barChart(cols, opts) {
    opts = opts || {};
    const W = 340, H = opts.height || 190, top = 16, bottom = 22, left = 34;
    const totals = cols.flatMap((c) => c.groups.map((g) => g.reduce((n, s) => n + Math.max(0, s.v), 0)));
    const max = Math.max(1, ...totals) * 1.12;
    const plotH = H - top - bottom, colW = (W - left) / cols.length;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Carta')}">`;
    [0, 0.5, 1].forEach((f) => {
      const y = top + plotH * (1 - f);
      s += `<line x1="${left}" x2="${W}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-dasharray="${f ? '3 4' : ''}"/>`;
      s += `<text x="${left - 6}" y="${y + 3}" text-anchor="end">${f ? fmtShort((max / 1.12) * f) : '0'}</text>`;
    });
    cols.forEach((c, i) => {
      const x0 = left + i * colW;
      const gw = Math.min(26, (colW * 0.72) / c.groups.length);
      const gx = x0 + (colW - gw * c.groups.length) / 2;
      if (!c.has) {
        s += `<rect x="${x0 + colW * 0.2}" y="${top + plotH - 18}" width="${colW * 0.6}" height="18" rx="5" fill="none" stroke="var(--line)" stroke-dasharray="3 3"/>`;
      }
      c.groups.forEach((g, gi) => {
        let y = top + plotH;
        g.forEach((seg) => {
          const h = (Math.max(0, seg.v) / max) * plotH;
          if (h <= 0) return;
          y -= h;
          s += `<rect x="${gx + gi * gw + 1}" y="${y}" width="${gw - 2}" height="${h}" rx="3" fill="${seg.color}" opacity="${c.cur ? 1 : 0.78}"><title>${esc(c.label)}: ${fmt(seg.v)}${seg.name ? ' ' + esc(seg.name) : ''}</title></rect>`;
        });
      });
      if (c.cur && opts.valueLabel) {
        const tot = c.groups[0].reduce((n, sg) => n + sg.v, 0);
        s += `<text class="val" x="${x0 + colW / 2}" y="${top + plotH - (tot / max) * plotH - 5}" text-anchor="middle">${fmtShort(tot)}</text>`;
      }
      s += `<text class="${c.cur ? 'cur' : ''}" x="${x0 + colW / 2}" y="${H - 6}" text-anchor="middle">${esc(c.label)}</text>`;
    });
    return `<div class="chart">${s}</svg></div>`;
  }

  function render() {
    document.body.classList.toggle('private', !!ui.private);
    $('#privacyBtn').innerHTML = icon(ui.private ? 'eyeOff' : 'eye');
    const view = $('#view');
    const app = $('#app');
    if (!cfg || !data) { app.classList.add('setup-mode'); $('#pageTitle').textContent = 'KewanganKu'; view.innerHTML = setupView(); bindSetup(); return; }
    app.classList.remove('setup-mode');
    if (!TITLES[ui.tab]) ui.tab = 'home';
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab));
    $('#pageTitle').textContent = TITLES[ui.tab];
    $('#monthLabel').textContent = `${shortMonth(ui.month)} ${ui.month.slice(0, 4)}`;
    const v = { home: homeView, trend: trendView, plan: planView, tx: txView, accounts: accountsView }[ui.tab];
    view.innerHTML = v();
    setSync();
    save(LS.ui, ui);
  }

  function sectionHead(eyebrow, title, sub, aside) {
    return `<div class="section-head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${aside || ''}</div>`;
  }

  function homeView() {
    const m = ui.month, pm = shiftMonth(m, -1);
    const s = monthStats(m), p = monthStats(pm), pHas = monthHasData(pm);
    const b = balances();
    const budgetTotal = categories('expense').reduce((n, c) => n + num(c.budget), 0);
    const [y, mo] = m.split('-').map(Number);
    const dim = new Date(y, mo, 0).getDate();
    const cur = isCurMonth(m);
    const day = cur ? Number(todayStr().slice(8, 10)) : dim;
    const remain = budgetTotal - s.expense;
    const perDay = remain / Math.max(1, dim - day + 1);
    const credit = accounts().filter((a) => a.group === 'credit');
    const owed = credit.reduce((n, a) => n + Math.max(0, -(b[a.id] || 0)), 0);
    const lim = credit.reduce((n, a) => n + num(a.credit_limit), 0);
    const commits = monthCommitments(m);
    const outs = commits.filter((x) => commitKind(x.c) !== 'income');
    const paidN = outs.filter((x) => x.status.k === 'paid').length;
    const pending = commits.filter((x) => x.status.k !== 'paid');
    const saving = savingsOf(m);
    const recent = monthTx(m).slice(0, 6);
    const groupMax = Math.max(1, ...EXP_GROUPS.map(([g]) => s.groups[g] || 0));
    const budgets = {};
    categories('expense').forEach((c) => { if (num(c.budget)) budgets[c.group] = (budgets[c.group] || 0) + num(c.budget); });

    return `
      <section class="hero">
        <div class="hero-top">
          <div><div class="eyebrow">${cur ? 'Bulan semasa' : 'Bulan dipilih'} · ${esc(monthLabel(m))}</div>
            <h2>Aliran duit bulan ini</h2>
            <p>${cur ? `Hari ${day}/${dim}` : 'Bulan penuh'} · semua akaun digabung</p></div>
          <span class="live-chip">${cur ? '<i></i>Semasa' : 'Arkib'}</span>
        </div>
        <div class="kpi-grid">
          <div class="kpi wide"><div class="kpi-row"><div style="flex:1;min-width:0"><div class="kpi-label">Belanja</div><div class="kpi-value money">${fmt(s.expense)}</div></div>
            ${ring(budgetTotal ? (s.expense / budgetTotal) * 100 : 0, s.expense > budgetTotal ? '#F2696D' : '#fff')}</div>
            <div class="kpi-sub">/ ${money(budgetTotal)} bajet ${pHas ? deltaPill(s.expense, p.expense, false, true) : ''}</div>
            <div class="kpi-foot">${remain >= 0 ? `Baki bajet ${money(remain)}${cur ? ` · boleh ${money(perDay)}/hari` : ''}` : `Lebih bajet ${money(-remain)}`}</div></div>
          <div class="kpi"><div class="kpi-label">Masuk</div><div class="kpi-value money">${fmt(s.income)}</div>
            <div class="kpi-sub">${pHas ? deltaPill(s.income, p.income, true, true) + ' vs ' + shortMonth(pm) : 'Gaji, komisen, affiliate'}</div>
            <div class="kpi-foot">Baki bulan <span class="money">${fmt(s.income - s.expense, true)}</span></div></div>
          <div class="kpi"><div class="kpi-label">Hutang kad & PayLater</div><div class="kpi-value money">${fmt(owed)}</div>
            <div class="kpi-sub">/ ${money(lim)} had · ${lim ? Math.round((owed / lim) * 100) : 0}% guna</div>
            <div class="seg-bar">${credit.filter((a) => (b[a.id] || 0) < 0).map((a) => `<i style="width:${lim ? (Math.max(0, -(b[a.id] || 0)) / lim) * 100 : 0}%;background:${esc(a.color || '#fff')}"></i>`).join('')}</div></div>
          <div class="kpi wide"><div class="kpi-label">Bayaran bulan ini</div><div class="kpi-value">${paidN}<span style="font-size:15px;opacity:.7">/${outs.length}</span></div>
            <div class="kpi-sub">selesai · simpanan <span class="money">${fmt(saving)}</span></div>
            <div class="seg-bar"><i style="width:${outs.length ? (paidN / outs.length) * 100 : 0}%;background:#45C987"></i></div></div>
        </div>
      </section>

      <div class="grid-2">
        <div class="section">
          ${sectionHead('Fokus utama', 'Perlu bayar', `${pending.length} item belum selesai bulan ni`, `<button class="link-btn" data-act="tab" data-tab="plan">Jadual penuh</button>`)}
          ${pending.length ? timelineHtml(m, pending.slice(0, 5)) : `<div class="empty">Semua bayaran ${esc(monthLabel(m))} dah selesai.</div>`}
        </div>
        ${creditPanel(b)}
      </div>

      <div class="grid-2">
        <div class="section">
          ${sectionHead('Belanja', 'Ikut kumpulan', 'Garis kecil = bajet kumpulan', `<span class="aside">${money(s.expense)}</span>`)}
          <div class="card"><div class="rank">${EXP_GROUPS.map(([g, e]) => {
            const v = s.groups[g] || 0, bud = budgets[g] || 0, scale = Math.max(groupMax, bud);
            return `<button class="rank-row" data-act="group" data-g="${esc(g)}">
              <span class="nm"><span class="sw-dot" style="background:${GROUP_COLORS[g]}"></span><span>${e} ${esc(g)}</span></span>
              <span class="am money">${fmt(v)}${bud ? `<small>bajet ${fmtShort(bud)}</small>` : ''}</span>
              <span class="track"><i style="width:${(v / scale) * 100}%;background:${v > bud && bud ? 'var(--bad)' : GROUP_COLORS[g]}"></i>${bud ? `<u style="left:${(bud / scale) * 100}%"></u>` : ''}</span>
            </button>`;
          }).join('')}</div></div>
        </div>
        <div class="section">
          ${sectionHead('Terkini', 'Transaksi', '', `<button class="link-btn" data-act="tab" data-tab="tx">Semua</button>`)}
          ${recent.length ? `<div class="list">${recent.map(txRow).join('')}</div>`
            : `<div class="empty">Tiada transaksi untuk ${esc(monthLabel(m))}.<br><button class="btn" data-act="add" style="width:auto;display:inline-flex;padding:10px 18px">Tambah transaksi</button></div>`}
        </div>
      </div>`;
  }

  function creditPanel(b) {
    const list = accounts().filter((a) => a.group === 'credit');
    if (!list.length) return '';
    const owedOf = (a) => Math.max(0, -(b[a.id] || 0));
    const total = list.reduce((n, a) => n + owedOf(a), 0);
    const active = list.filter((a) => owedOf(a) > 0.004).sort((x, y) => owedOf(y) - owedOf(x));
    const clear = list.length - active.length;
    return `<div class="section">
      ${sectionHead('Hutang', 'Kad & PayLater', clear ? `${clear} akaun tiada hutang` : '', `<span class="aside neg money">${fmt(total)}</span>`)}
      ${active.length ? `<div class="list">${active.map((a) => {
        const owed = owedOf(a), lim = num(a.credit_limit);
        const pct = lim ? Math.min(100, (owed / lim) * 100) : 0;
        return `<button class="row credit-row" data-act="acc" data-id="${esc(a.id)}">
          <span class="acc-mono" style="--acc:${esc(a.color || '#4D8BFF')}">${esc(initials(a.name))}</span>
          <span class="row-main"><span class="t">${esc(a.name)}</span>
            <span class="s">${lim ? `Baki had ${money(lim - owed)} · ${Math.round(pct)}%` : 'Hutang'}</span>
            ${lim ? `<span class="bar ${pct >= 80 ? 'over' : ''}"><i style="width:${pct}%"></i></span>` : ''}</span>
          <span class="row-amt neg">${money(owed)}</span>
        </button>`;
      }).join('')}</div>` : '<div class="empty">Tiada hutang kad atau PayLater.</div>'}
    </div>`;
  }

  function timelineHtml(m, items) {
    const groups = {};
    items.forEach((x) => { const k = num(x.c.due_day) || 0; (groups[k] = groups[k] || []).push(x); });
    const today = todayStr();
    const keys = Object.keys(groups).map(Number).sort((a, b) => (a || 99) - (b || 99));
    return `<div class="tl">${keys.map((d) => {
      let dateCol = '<strong>·</strong><span>Tiada tarikh</span>';
      let isToday = false;
      if (d) {
        const [y, mo] = m.split('-').map(Number);
        dateCol = `<strong>${d}</strong><span>${DAYS[new Date(y, mo - 1, d).getDay()].slice(0, 3)}</span>`;
        isToday = `${m}-${String(d).padStart(2, '0')}` === today;
      }
      return `<div class="tl-day ${isToday ? 'today' : ''}"><div class="tl-date">${dateCol}</div>
        <div class="tl-items">${groups[d].map(tlItem).join('')}</div></div>`;
    }).join('')}</div>`;
  }

  function tlItem(x) {
    const { c, tx, status } = x;
    const kind = commitKind(c);
    const from = idx.acc[c.account_id], to = idx.acc[c.to_account_id];
    let route = '';
    if (kind === 'transfer') route = `${from ? from.name : '?'} → ${to ? to.name : '?'}`;
    else if (kind === 'income') route = from ? `Masuk ${from.name}` : 'Pendapatan';
    else route = from ? from.name : ((idx.cat[c.category_id] || {}).name || '');
    const amt = x.amount === null ? `<span class="faint">${kind === 'income' ? 'Ikut gaji' : 'Isi jumlah'}</span>` : money(x.amount, kind === 'income', kind === 'income' ? 'pos' : '');
    return `<button class="tl-item st-${status.k}" data-act="${tx ? 'edit-tx' : 'pay'}" data-id="${esc(tx ? tx.id : c.id)}">
      <span class="tl-dot">${status.k === 'paid' ? icon('check') : ''}</span>
      <span class="row-main"><span class="t">${esc(c.name)}</span><span class="s">${esc(route)}</span></span>
      <span class="row-amt">${amt}<small class="tl-status">${esc(status.label)}</small></span>
    </button>`;
  }

  function txRow(t) {
    const cat = idx.cat[t.category_id];
    const acc = idx.acc[t.account_id];
    const to = idx.acc[t.to_account_id];
    let ico = cat ? cat.icon : '•', title = t.note || (cat ? cat.name : TX_LABEL[t.type]), sub = acc ? acc.name : '';
    let cls = '', sign = '';
    if (t.type === 'expense') sign = '-';
    if (t.type === 'income') { cls = 'pos'; sign = '+'; }
    if (t.type === 'transfer') { ico = '⇄'; title = t.note || `Pindah ke ${to ? to.name : '?'}`; sub = `${acc ? acc.name : '?'} → ${to ? to.name : '?'}`; cls = 'faint'; }
    if (t.type === 'adjust') { ico = '⚖️'; title = t.note || 'Pelarasan baki'; sign = num(t.amount) >= 0 ? '+' : '-'; cls = 'faint'; }
    if (cat && t.note && t.type !== 'transfer') sub = `${cat.name} · ${sub}`;
    return `<button class="row" data-act="edit-tx" data-id="${esc(t.id)}">
      <span class="row-ico">${esc(ico)}</span>
      <span class="row-main"><span class="t">${esc(title)}</span><span class="s">${esc(sub)}</span></span>
      <span class="row-amt ${cls}"><span class="money">${sign}RM${fmtAbs(num(t.amount))}</span><small>${esc(dayLabel(String(t.date)).split(', ')[1])}</small></span>
    </button>`;
  }

  function trendView() {
    const N = 6;
    const ser = monthSeries(ui.month, N);
    const cur = ser[N - 1], prev = ser[N - 2];
    const withData = ser.filter((x) => x.has);
    const avg = (k) => withData.length ? withData.reduce((n, x) => n + x[k], 0) / withData.length : 0;
    const best = withData.slice().sort((a, b) => b.net - a.net)[0];
    const cards = [
      ['Masuk', 'income', true, '#4D8BFF', 'Semua sumber'],
      ['Keluar', 'expense', false, '#F08A50', 'Belanja sahaja, tak termasuk pindahan'],
      ['Baki bersih', 'net', true, '#45C987', 'Masuk tolak keluar'],
      ['Simpanan', 'saving', true, '#A78BFA', 'Pindah ke KWSP, ASNB & pelaburan']
    ];
    const incomeCats = categories('income');
    const incColor = {};
    incomeCats.forEach((c, i) => { incColor[c.id] = INCOME_COLORS[i % INCOME_COLORS.length]; });
    const incUsed = incomeCats.filter((c) => ser.some((x) => x.cats[c.id]));
    // category table: this month vs average of previous months with data
    const prevWith = ser.slice(0, N - 1).filter((x) => x.has);
    const rows = categories('expense').map((c) => {
      const now = cur.cats[c.id] || 0;
      const av = prevWith.length ? prevWith.reduce((n, x) => n + (x.cats[c.id] || 0), 0) / prevWith.length : null;
      return { c, now, av };
    }).filter((r) => r.now || r.av).sort((a, b) => b.now - a.now).slice(0, 10);

    return `
      ${sectionHead(`${N} bulan terakhir · sehingga ${esc(monthLabel(ui.month))}`, 'Trend bulanan', `Perbandingan ${esc(monthLabel(cur.m))} dengan ${esc(monthLabel(prev.m))}.${isCurMonth(ui.month) ? ' Bulan semasa belum lengkap.' : ''}`)}
      <div class="spark-grid">${cards.map(([label, k, upGood, color, sub], i) => `
        <div class="spark-card ${i === 0 ? 'feature' : ''}">
          <div class="lbl"><span>${label}</span>${prev.has && cur.has ? deltaPill(cur[k], prev[k], upGood, false) : ''}</div>
          <div class="val money">${cur.has ? fmt(cur[k], k === 'net') : '<span class="faint">Tiada data</span>'}</div>
          <div class="sub">${sub}</div>
          ${sparkline(ser.map((x) => (x.has ? x[k] : null)), i === 0 ? '#ffffff' : color)}
        </div>`).join('')}
      </div>

      <div class="section"><div class="card">
        <div class="card-head"><div><div class="eyebrow">Aliran tunai</div><h3>Masuk vs keluar</h3></div>
          <div class="chips-row">${best ? `<span class="stat-chip">Terbaik <b>${shortMonth(best.m)}</b> <span class="money">${fmtShort(best.net)}</span></span>` : ''}<span class="stat-chip">Purata keluar <b class="money">${fmtShort(avg('expense'))}</b></span></div></div>
        <div class="legend"><span><i style="background:#4D8BFF"></i>Masuk</span><span><i style="background:#F08A50"></i>Keluar</span></div>
        ${barChart(ser.map((x) => ({ label: shortMonth(x.m), cur: x.m === ui.month, has: x.has, groups: [[{ v: x.income, color: '#4D8BFF', name: 'masuk' }], [{ v: x.expense, color: '#F08A50', name: 'keluar' }]] })), { label: 'Masuk vs keluar ikut bulan' })}
        <div class="chart-note">Kotak putus-putus = bulan tiada data lengkap (bukan sifar). Upload penyata bulan tu untuk isi.</div>
      </div></div>

      <div class="grid-2">
        <div class="section"><div class="card">
          <div class="card-head"><div><div class="eyebrow">Belanja</div><h3>Ikut kumpulan</h3></div><span class="stat-chip">Purata <b class="money">${fmtShort(avg('expense'))}</b></span></div>
          <div class="legend">${EXP_GROUPS.filter(([g]) => ser.some((x) => x.groups[g])).map(([g]) => `<span><i style="background:${GROUP_COLORS[g]}"></i>${esc(g)}</span>`).join('')}</div>
          ${barChart(ser.map((x) => ({ label: shortMonth(x.m), cur: x.m === ui.month, has: x.has, groups: [EXP_GROUPS.map(([g]) => ({ v: x.groups[g] || 0, color: GROUP_COLORS[g], name: g }))] })), { label: 'Belanja ikut kumpulan', valueLabel: true })}
        </div></div>
        <div class="section"><div class="card">
          <div class="card-head"><div><div class="eyebrow">Pendapatan</div><h3>Ikut sumber</h3></div><span class="stat-chip">Purata <b class="money">${fmtShort(avg('income'))}</b></span></div>
          <div class="legend">${incUsed.map((c) => `<span><i style="background:${incColor[c.id]}"></i>${esc(c.name)}</span>`).join('')}</div>
          ${barChart(ser.map((x) => ({ label: shortMonth(x.m), cur: x.m === ui.month, has: x.has, groups: [incUsed.map((c) => ({ v: x.cats[c.id] || 0, color: incColor[c.id], name: c.name }))] })), { label: 'Pendapatan ikut sumber', valueLabel: true })}
        </div></div>
      </div>

      <div class="section">
        ${sectionHead('Kategori', `${esc(monthLabel(cur.m))} vs purata`, prevWith.length ? `Purata ${prevWith.length} bulan sebelum yang ada data` : 'Belum cukup bulan untuk purata')}
        ${rows.length ? `<div class="list">${rows.map((r) => {
          const d = r.av ? ((r.now - r.av) / r.av) * 100 : null;
          return `<div class="row"><span class="row-ico">${esc(r.c.icon)}</span>
            <span class="row-main"><span class="t">${esc(r.c.name)}</span><span class="s">${r.av !== null ? `Purata ${fmt(r.av)}` : 'Tiada purata'}</span></span>
            <span class="row-amt"><span class="money">${fmt(r.now)}</span>${d !== null && isFinite(d) ? `<small class="${d > 0 ? 'neg' : 'pos'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}%</small>` : ''}</span></div>`;
        }).join('')}</div>` : '<div class="empty">Tiada belanja bulan ni.</div>'}
      </div>`;
  }

  function planGoals() {
    const b = balances();
    const now = todayStr().slice(0, 7);
    const goals = [];
    // 1. PayLater cleared by target month
    const bnpl = accounts().filter((a) => a.type === 'bnpl');
    const bnplOwed = bnpl.reduce((n, a) => n + Math.max(0, -(b[a.id] || 0)), 0);
    const clearBy = String(setting('plan_paylater_clear_by', '2027-01'));
    const [cy, cm] = clearBy.split('-').map(Number), [ny, nm] = now.split('-').map(Number);
    const monthsLeft = Math.max(1, (cy - ny) * 12 + (cm - nm) + 1);
    goals.push({
      title: `PayLater kosong menjelang ${monthLabel(clearBy)}`,
      big: fmt(bnplOwed), status: bnplOwed < 0.01 ? ['good', 'Selesai'] : ['warn', `${monthsLeft} bulan lagi`],
      pct: null, text: bnplOwed < 0.01 ? 'Tiada baki PayLater.' : `Perlu kurang ${money(bnplOwed / monthsLeft)} sebulan, dan jangan buat belian PayLater baru.`
    });
    // 2. Card utilisation
    const cards = accounts().filter((a) => a.type === 'card' && num(a.credit_limit));
    const cardOwed = cards.reduce((n, a) => n + Math.max(0, -(b[a.id] || 0)), 0);
    const cardLim = cards.reduce((n, a) => n + num(a.credit_limit), 0);
    const util = cardLim ? cardOwed / cardLim : 0;
    const maxU = num(setting('plan_card_util_max', 0.6));
    goals.push({
      title: `Guna kad kredit bawah ${Math.round(maxU * 100)}% had`,
      big: `${Math.round(util * 100)}%`, status: util <= maxU ? ['good', 'Dalam had'] : ['bad', 'Terlebih'],
      pct: util * 100, marker: maxU * 100,
      text: `${money(cardOwed)} daripada ${money(cardLim)}. Bayar penuh setiap penyata supaya tiada faedah.`
    });
    // 3. Fixed commitments vs stable income
    const fixed = monthCommitments(now).filter((x) => commitKind(x.c) === 'expense' && x.amount).reduce((n, x) => n + x.amount, 0);
    const stable = num(setting('plan_stable_income', 0));
    const ratio = stable ? fixed / stable : 0;
    goals.push({
      title: 'Komitmen tetap ditanggung gaji + komisen',
      big: `${Math.round(ratio * 100)}%`, status: !stable ? ['na', 'Tiada data'] : ratio <= 0.7 ? ['good', 'Selamat'] : ratio <= 0.9 ? ['warn', 'Ketat'] : ['bad', 'Tak cukup'],
      pct: ratio * 100, marker: 70,
      text: `Komitmen tetap ${money(fixed)} sebulan berbanding pendapatan tetap ${money(stable)}. Sasaran bawah 70%.`
    });
    // 4. Emergency fund
    const target = num(setting('plan_emergency_target', 6000));
    const ids = String(setting('plan_emergency_accounts', '')).split(',').map((x) => x.trim()).filter(Boolean);
    const have = ids.reduce((n, id) => n + Math.max(0, b[id] || 0), 0);
    goals.push({
      title: `Dana kecemasan ${fmt(target)}`,
      big: ids.length ? fmt(have) : '–', status: !ids.length ? ['na', 'Akaun belum dipilih'] : have >= target ? ['good', 'Cukup'] : ['warn', `${Math.round((have / target) * 100)}%`],
      pct: ids.length ? (have / target) * 100 : null,
      text: ids.length ? `Disimpan dalam ${ids.map((id) => (idx.acc[id] || {}).name || id).join(', ')}.` : 'Kira-kira 3 bulan komitmen tetap. Pilih satu akaun khas untuk dana ni.'
    });
    return goals;
  }

  function planView() {
    const m = ui.month;
    const commits = monthCommitments(m);
    const outs = commits.filter((x) => commitKind(x.c) !== 'income');
    const total = outs.reduce((n, x) => n + (x.amount || 0), 0);
    const paid = outs.filter((x) => x.tx).reduce((n, x) => n + num(x.tx.amount), 0);
    const s = monthStats(m);
    const budgeted = categories('expense').filter((c) => num(c.budget));
    const budTotal = budgeted.reduce((n, c) => n + num(c.budget), 0);
    return `
      ${sectionHead('Pelan kewangan', 'Sasaran utama', 'Dikira automatik dari baki dan komitmen semasa')}
      <div class="goals">${planGoals().map((g) => `
        <div class="goal">
          <div class="goal-top"><h4>${esc(g.title)}</h4><span class="status ${g.status[0]}">${esc(g.status[1])}</span></div>
          <div class="big money">${g.big}</div>
          ${g.pct !== null && g.pct !== undefined ? `<div class="rank-row" style="display:block"><span class="track" style="display:block"><i style="width:${Math.min(100, g.pct)}%;background:${g.status[0] === 'bad' ? 'var(--bad)' : g.status[0] === 'good' ? 'var(--good)' : 'var(--bar)'}"></i>${g.marker ? `<u style="left:${g.marker}%"></u>` : ''}</span></div>` : ''}
          <p>${g.text}</p>
        </div>`).join('')}
      </div>
      <div class="card" style="margin-top:12px">
        <div class="eyebrow">Peraturan duit</div>
        <ul class="rules">
          <li><span class="n">1</span><span><b>Gaji + komisen KLIKI</b> untuk komitmen tetap: loan, PTPTN, bil, isteri, Coway.</span></li>
          <li><span class="n">2</span><span><b>Komisen affiliate</b> untuk belanja harian dan bayar baki PayLater.</span></li>
          <li><span class="n">3</span><span><b>Tiada belian PayLater baru</b> sampai semua baki kosong. Kad UOB dibayar penuh setiap 19hb.</span></li>
        </ul>
      </div>

      <div class="section">
        ${sectionHead(esc(monthLabel(m)), 'Jadual bayaran', '', `<button class="link-btn" data-act="manage-commit">Urus</button>`)}
        <div class="progress-line"><span>Dibayar <b class="money">${fmt(paid)}</b></span><span>daripada <span class="money">${fmt(total)}</span></span></div>
        <div class="bar ok" style="margin-bottom:14px"><i style="width:${total ? Math.min(100, (paid / total) * 100) : 0}%"></i></div>
        ${commits.length ? timelineHtml(m, commits) : '<div class="empty">Tiada komitmen aktif bulan ni.</div>'}
      </div>

      <div class="grid-2">
        <div class="section">
          ${sectionHead('Bajet', 'Ikut kategori', `${money(s.expense)} daripada ${money(budTotal)}`, `<button class="link-btn" data-act="manage-budget">Ubah</button>`)}
          ${budgeted.length ? `<div class="card"><div class="rank">${budgeted.map((c) => {
            const sp = s.cats[c.id] || 0, bud = num(c.budget), pct = (sp / bud) * 100;
            return `<div class="rank-row">
              <span class="nm"><span>${esc(c.icon)}</span><span>${esc(c.name)}</span></span>
              <span class="am"><span class="money ${sp > bud ? 'neg' : ''}">${fmt(sp)}</span><small>/ ${fmtShort(bud)}</small></span>
              <span class="track"><i style="width:${Math.min(100, pct)}%;background:${sp > bud ? 'var(--bad)' : pct > 85 ? 'var(--warn)' : 'var(--bar)'}"></i></span>
            </div>`;
          }).join('')}</div></div>` : '<div class="empty">Belum ada bajet kategori.</div>'}
        </div>
        <div class="section">
          ${sectionHead('Pendapatan', 'Ikut sumber', '', `<span class="aside pos money">${fmt(s.income)}</span>`)}
          ${categories('income').filter((c) => s.cats[c.id]).length ? `<div class="list">${categories('income').filter((c) => s.cats[c.id]).map((c) => `<div class="row"><span class="row-ico">${esc(c.icon)}</span>
            <span class="row-main"><span class="t">${esc(c.name)}</span><span class="s">${esc(c.group)} · ${Math.round((s.cats[c.id] / s.income) * 100)}%</span></span>
            <span class="row-amt pos">${money(s.cats[c.id])}</span></div>`).join('')}</div>` : '<div class="empty">Belum ada pendapatan direkod bulan ni.</div>'}
        </div>
      </div>`;
  }

  function accountsView() {
    const b = balances();
    const all = accounts();
    const tot = (g) => all.filter((a) => a.group === g).reduce((n, a) => n + (b[a.id] || 0), 0);
    const assets = all.reduce((n, a) => n + Math.max(0, b[a.id] || 0), 0);
    const liab = all.reduce((n, a) => n + Math.max(0, -(b[a.id] || 0)), 0);
    return `
      <section class="hero">
        <div class="hero-top"><div><div class="eyebrow">Semua akaun</div><h2 class="money">${fmt(assets - liab)}</h2><p>Nilai bersih: aset tolak hutang</p></div></div>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">Tunai & bank</div><div class="kpi-value money">${fmt(tot('debit'))}</div></div>
          <div class="kpi"><div class="kpi-label">Pelaburan</div><div class="kpi-value money">${fmt(tot('invest'))}</div></div>
          <div class="kpi"><div class="kpi-label">Kad & PayLater</div><div class="kpi-value money">${fmt(-tot('credit'))}</div></div>
          <div class="kpi"><div class="kpi-label">Pinjaman</div><div class="kpi-value money">${fmt(-tot('borrowed'))}</div></div>
        </div>
      </section>
      ${ACC_GROUPS.map(([g, label]) => {
        const list = all.filter((a) => a.group === g);
        if (!list.length) return '';
        const total = list.reduce((n, a) => n + (b[a.id] || 0), 0);
        return `<div class="acc-group-head"><h2>${label}</h2><span class="money ${total < 0 ? 'neg' : ''}">${fmt(total)}</span></div>
          <div class="acc-grid">${list.map((a) => accCard(a, b[a.id] || 0)).join('')}</div>`;
      }).join('')}
      <div class="section"><button class="btn ghost" data-act="new-acc">Tambah akaun</button></div>`;
  }

  function accCard(a, bal) {
    const isCredit = a.group === 'credit' || a.group === 'borrowed';
    const lim = num(a.credit_limit);
    let main = money(bal), sub = '';
    if (isCredit) {
      main = `<span class="${bal < 0 ? 'neg' : ''}">${money(-bal)}</span>`;
      sub = lim ? `<small>Baki had ${money(lim + bal)}</small>` : '<small>Hutang</small>';
    }
    return `<button class="acc" style="--acc:${esc(a.color || '#4D8BFF')}" data-act="acc" data-id="${esc(a.id)}">
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
    return `
      <div class="mini-stats">
        <div><span>Masuk</span><strong class="pos money">${fmt(s.income)}</strong></div>
        <div><span>Keluar</span><strong class="money">${fmt(s.expense)}</strong></div>
        <div><span>Transaksi</span><strong>${monthTx(ui.month).length}</strong></div>
      </div>
      <div class="search">${icon('search')}<input class="input" id="txSearch" type="search" placeholder="Cari nota, kategori, akaun, jumlah" value="${esc(ui.search)}" autocomplete="off"></div>
      ${dayKeys.length ? dayKeys.map((d) => {
        const out = days[d].filter((t) => t.type === 'expense').reduce((n, t) => n + num(t.amount), 0);
        return `<div class="day-head"><span>${esc(dayLabel(d))}</span><span class="money">${out ? '-' + fmt(out) : ''}</span></div>
          <div class="list">${days[d].map(txRow).join('')}</div>`;
      }).join('') : `<div class="empty" style="margin-top:16px">${q ? 'Tiada transaksi sepadan.' : `Tiada transaksi untuk ${esc(monthLabel(ui.month))}.`}</div>`}`;
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
    const firstCard = accounts().find((a) => a.type === 'card');
    const st = {
      type: editing ? editing.type : (opts.type || 'expense'),
      amount: editing ? String(round2(num(editing.amount))) : (opts.amount ? String(opts.amount) : ''),
      category_id: editing ? editing.category_id : (opts.category_id || ''),
      account_id: editing ? editing.account_id : (opts.account_id || (idx.acc[ui.lastAccount] && ui.lastAccount) || (firstCard && firstCard.id) || (firstDebit && firstDebit.id) || ''),
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

    const html = `${sheetHead(editing ? 'Edit transaksi' : (st.commitment_id ? (st.type === 'income' ? 'Rekod pendapatan' : 'Rekod bayaran') : 'Transaksi baru'))}
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
    const list = (data.commitments || []).slice().sort((a, b) => (b.active !== false) - (a.active !== false) || (num(a.due_day) || 99) - (num(b.due_day) || 99));
    const bal = balances();
    openSheet(`${sheetHead('Urus komitmen')}
      <div class="list">${list.map((c) => {
        const amt = commitAmount(c, bal);
        const kindLabel = { expense: 'Bayar', transfer: 'Pindah', income: 'Masuk' }[commitKind(c)];
        return `<button class="row" data-cid="${esc(c.id)}">
        <span class="row-ico">${esc(commitKind(c) === 'transfer' ? '⇄' : (idx.cat[c.category_id] || {}).icon || '📌')}</span>
        <span class="row-main"><span class="t">${esc(c.name)}</span><span class="s">${kindLabel} · ${c.active === false ? 'Tak aktif' : (c.due_day ? `${c.due_day} hb` : 'Tiada tarikh')}${c.end_month ? ` · tamat ${esc(c.end_month)}` : ''}</span></span>
        <span class="row-amt">${amt === null ? '<span class="faint">Ikut jumlah</span>' : money(amt)}</span></button>`;
      }).join('')}</div>
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
    c = c || { id: uid('com'), name: '', amount: '', due_day: '', category_id: '', account_id: '', start_month: '', end_month: '', active: true, note: '', kind: 'expense', to_account_id: '' };
    const kind = commitKind(c);
    const accOpts = (sel) => `<option value="">Tiada</option>` + accounts().map((x) => `<option value="${x.id}" ${sel === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
    const catOpts = (k) => categories(k).map((x) => `<option value="${x.id}" ${c.category_id === x.id ? 'selected' : ''}>${esc(x.icon + ' ' + x.name)}</option>`).join('');
    openSheet(`${sheetHead(isNew ? 'Komitmen baru' : 'Edit komitmen')}
      <div class="form-grid">
        <label>Nama<input class="input" id="kName" value="${esc(c.name)}" maxlength="60"></label>
        <label>Jenis<select class="input" id="kKind">
          <option value="expense" ${kind === 'expense' ? 'selected' : ''}>Bayaran (loan, bil, langganan)</option>
          <option value="transfer" ${kind === 'transfer' ? 'selected' : ''}>Pindah / bayar hutang kad atau PayLater</option>
          <option value="income" ${kind === 'income' ? 'selected' : ''}>Pendapatan (gaji)</option>
        </select></label>
        <label>Jumlah sebulan (RM)<input class="input" id="kAmt" inputmode="decimal" value="${esc(c.amount === null ? '' : c.amount)}" placeholder="Kosong = ikut hutang semasa / berubah"></label>
        <label>Hari bulan (1 hingga 31)<input class="input" id="kDay" inputmode="numeric" value="${esc(c.due_day === null ? '' : c.due_day)}"></label>
        <label id="kFromL"><span id="kFromT">Akaun</span><select class="input" id="kAcc">${accOpts(c.account_id)}</select></label>
        <label id="kToL">Ke akaun<select class="input" id="kTo">${accOpts(c.to_account_id)}</select></label>
        <label id="kCatL">Kategori<select class="input" id="kCat"></select></label>
        <label>Bulan mula (pilihan)<input class="input" id="kStart" type="month" value="${esc(c.start_month)}"></label>
        <label>Bulan akhir (pilihan, contoh ansuran)<input class="input" id="kEnd" type="month" value="${esc(c.end_month)}"></label>
      </div>
      <div class="btn-row ${isNew ? 'one' : ''}">
        ${isNew ? '' : `<button class="btn danger" id="kToggle">${c.active === false ? 'Aktifkan' : 'Hentikan'}</button>`}
        <button class="btn" id="kSave">Simpan</button>
      </div>`, (sh) => {
      const sync = () => {
        const k = $('#kKind', sh).value;
        $('#kToL', sh).style.display = k === 'transfer' ? '' : 'none';
        $('#kCatL', sh).style.display = k === 'transfer' ? 'none' : '';
        $('#kFromT', sh).textContent = k === 'transfer' ? 'Dari akaun' : k === 'income' ? 'Masuk ke akaun' : 'Bayar guna akaun';
        const want = k === 'income' ? 'income' : 'expense';
        const cat = $('#kCat', sh);
        if (cat.dataset.k !== want) { cat.innerHTML = catOpts(want); cat.dataset.k = want; }
      };
      $('#kKind', sh).onchange = sync;
      sync();
      $('#kSave', sh).onclick = () => {
        const name = $('#kName', sh).value.trim();
        const k = $('#kKind', sh).value;
        const raw = $('#kAmt', sh).value.replace(/[^0-9.]/g, '');
        const amount = raw === '' ? '' : round2(num(raw));
        if (!name) return toast('Isi nama');
        if (k === 'transfer' && !$('#kTo', sh).value) return toast('Pilih akaun tujuan');
        const day = parseInt($('#kDay', sh).value, 10);
        const row = Object.assign({}, c, {
          name, kind: k, amount, due_day: day >= 1 && day <= 31 ? day : '',
          category_id: k === 'transfer' ? '' : $('#kCat', sh).value,
          account_id: $('#kAcc', sh).value, to_account_id: k === 'transfer' ? $('#kTo', sh).value : '',
          start_month: $('#kStart', sh).value, end_month: $('#kEnd', sh).value
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
        const amt = commitAmount(c);
        const kind = commitKind(c);
        openTxSheet({
          type: kind, amount: amt || '', category_id: kind === 'transfer' ? '' : c.category_id,
          account_id: c.account_id || undefined, to_account_id: kind === 'transfer' ? c.to_account_id : '',
          note: c.name, commitment_id: c.id, date
        });
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
      ['com_salary', 'Gaji masuk', '', 1, 'cat_gaji', 'acc_bank', 'income', ''],
      ['com_car', 'Ansuran kereta', 520, 5, 'cat_loan', 'acc_bank', 'expense', ''],
      ['com_net', 'Internet rumah', 99, 10, 'cat_telco', 'acc_bank', 'expense', ''],
      ['com_tnb', 'Bil elektrik', 160, 15, 'cat_elektrik', 'acc_bank', 'expense', ''],
      ['com_pl', 'Bayar PayLater', '', 20, '', 'acc_cc', 'transfer', 'acc_pl'],
      ['com_cc', 'Bayar kad kredit', '', 25, '', 'acc_bank', 'transfer', 'acc_cc'],
      ['com_str', 'Langganan streaming', 25, '', 'cat_sub', 'acc_cc', 'expense', '']
    ].map((c) => ({ id: c[0], name: c[1], amount: c[2], due_day: c[3], category_id: c[4], account_id: c[5], start_month: '', end_month: '', active: true, note: '', kind: c[6], to_account_id: c[7] }));
    const tx = [];
    const add = (date, type, amount, account_id, category_id, note, extra) => tx.push(Object.assign({ id: uid('tx'), date, type, amount, account_id, to_account_id: '', category_id, commitment_id: '', note, source: 'demo', created_at: date + 'T09:00:00' }, extra || {}));
    const today = Math.max(1, Number(todayStr().slice(8, 10)));
    [[pm, 28], [m, Math.min(today, 28)]].forEach(([mm, last], k) => {
      add(d(mm, 1), 'income', 3800, 'acc_bank', 'cat_gaji', 'Gaji', { commitment_id: 'com_salary' });
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
