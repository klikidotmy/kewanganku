/* baki. statement importer: reads Maybank savings and UOB credit card PDF statements in the browser,
   checks them against the statement's own totals, and proposes categories from rules + past transactions.
   No data leaves the device. Works in the browser (window.KKImport) and in Node (module.exports) for tests. */
(function (root) {
  'use strict';

  const MON = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const MONEY = '([\\d,]*\\.\\d{2})';
  const r2 = (n) => Math.round(n * 100) / 100;
  const amt = (s) => Number(String(s).replace(/,/g, ''));
  const pad = (n) => String(n).padStart(2, '0');
  const same = (a, b) => Math.abs(a - b) < 0.005;
  const fmt = (n) => Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- PDF to lines ---------- */
  // Groups pdf.js text items into visual lines. Cells are split where the horizontal gap is wide (table columns).
  async function pdfLines(pdfjs, bytes, askPassword) {
    const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
    if (askPassword) {
      task.onPassword = (update, reason) => {
        Promise.resolve(askPassword(reason === 2)).then((p) => { if (p == null) task.destroy(); else update(p); });
      };
    }
    const doc = await task.promise;
    const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items.filter((i) => i.str && i.str.trim())
        .map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = [];
      items.forEach((it) => {
        const l = lines.find((L) => Math.abs(L.y - it.y) < 2.5);
        if (l) l.items.push(it); else lines.push({ y: it.y, items: [it] });
      });
      lines.sort((a, b) => b.y - a.y);
      lines.forEach((l) => {
        l.items.sort((a, b) => a.x - b.x);
        const cells = [];
        let end = null;
        l.items.forEach((it) => {
          const gap = end === null ? 99 : it.x - end;
          if (gap > 8) cells.push(it.s);
          else cells[cells.length - 1] += (gap > 1 ? ' ' : '') + it.s;
          end = it.x + it.w;
        });
        const clean = cells.map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean);
        out.push({ page: p, cells: clean, text: clean.join('  ') });
      });
    }
    await task.destroy();
    return out;
  }

  function detect(lines) {
    const head = lines.slice(0, 120).map((l) => l.text).join('\n');
    const all = lines.map((l) => l.text).join('\n');
    if (/UOB CARD CENTRE/.test(head) && /PREVIOUS BAL/.test(all)) return 'uob';
    if (/Maybank/i.test(head) && /BEGINNING BALANCE/.test(all)) return 'mbb';
    return null;
  }

  /* ---------- Maybank savings ---------- */
  function parseMaybank(lines) {
    const st = { bank: 'mbb', bankName: 'Maybank', account_id: 'acc_maybank', rows: [], checks: [] };
    let inTable = false, cur = null, begin = null, ending = null, totCr = null, totDr = null;
    const rowRe = new RegExp(`^(\\d{2})/(\\d{2})/(\\d{2})\\s+(.*?)\\s+${MONEY}([+-])\\s+${MONEY}(DR)?$`);
    lines.forEach((l) => {
      const t = l.text;
      let m;
      if (!st.date && (m = t.match(/:\s*(\d{2})\/(\d{2})\/(\d{2})$/))) st.date = `20${m[3]}-${m[2]}-${m[1]}`;
      if (!st.last4 && (m = t.match(/(\d{6})-(\d{6})/))) st.last4 = m[2].slice(-4);
      if ((m = t.match(new RegExp(`BEGINNING BALANCE\\s+${MONEY}(DR)?`)))) { begin = amt(m[1]) * (m[2] ? -1 : 1); inTable = true; return; }
      if ((m = t.match(new RegExp(`ENDING BALANCE\\s*:\\s*${MONEY}(DR)?`)))) { ending = amt(m[1]) * (m[2] ? -1 : 1); inTable = false; cur = null; return; }
      if ((m = t.match(new RegExp(`TOTAL CREDIT\\s*:\\s*${MONEY}`)))) { totCr = amt(m[1]); return; }
      if ((m = t.match(new RegExp(`TOTAL DEBIT\\s*:\\s*${MONEY}`)))) { totDr = amt(m[1]); return; }
      if (/^Perha?tian|^Perhation/i.test(t)) { inTable = false; return; }
      if (/STATEMENT BALANCE/.test(t)) { if (begin !== null && ending === null) inTable = true; return; }
      if (!inTable) return;
      if ((m = t.match(rowRe))) {
        cur = {
          date: `20${m[3]}-${m[2]}-${m[1]}`, kind: m[4].trim(), amount: amt(m[5]), dir: m[6] === '+' ? 'in' : 'out',
          balance: amt(m[7]) * (m[8] ? -1 : 1), lines: []
        };
        st.rows.push(cur);
      } else if (cur) cur.lines.push(t);
    });

    let bal = begin, chainOk = true, badRow = null;
    st.rows.forEach((r, i) => {
      r.idx = i;
      r.party = (r.lines[0] || '').replace(/\s*\*\s*$/, '').trim();
      if (/^\d{6,}Q$/i.test(r.party)) r.party = '';
      r.memo = r.lines.slice(1).filter((x) => /[a-z]/.test(x) && !/^(MAE QR|DUITNOW QR|SALE DEBIT)$/i.test(x)).join(' ').trim();
      r.raw = [r.kind].concat(r.lines).join(' / ');
      if (bal !== null) {
        bal = r2(bal + (r.dir === 'in' ? r.amount : -r.amount));
        if (!same(bal, r.balance) && chainOk) { chainOk = false; badRow = r; }
        bal = r.balance;
      }
    });
    const cr = r2(st.rows.filter((r) => r.dir === 'in').reduce((n, r) => n + r.amount, 0));
    const dr = r2(st.rows.filter((r) => r.dir === 'out').reduce((n, r) => n + r.amount, 0));
    st.period = st.date ? st.date.slice(0, 7) : '';
    st.checks.push({ label: 'Jumlah masuk = TOTAL CREDIT', ok: totCr !== null && same(cr, totCr), got: cr, want: totCr });
    st.checks.push({ label: 'Jumlah keluar = TOTAL DEBIT', ok: totDr !== null && same(dr, totDr), got: dr, want: totDr });
    st.checks.push({ label: 'Baki awal + masuk - keluar = baki akhir', ok: begin !== null && ending !== null && same(r2(begin + cr - dr), ending), got: begin === null ? null : r2(begin + cr - dr), want: ending });
    st.checks.push({ label: 'Baki berjalan setiap baris sepadan', ok: chainOk && st.rows.length > 0, detail: badRow ? `Berhenti sepadan pada ${badRow.date} ${badRow.kind}` : '' });
    st.summary = { begin, ending, credit: totCr, debit: totDr };
    st.ok = st.checks.every((c) => c.ok);
    return st;
  }

  /* ---------- UOB credit card ---------- */
  function parseUob(lines) {
    const st = { bank: 'uob', bankName: 'UOB', account_id: 'acc_uob', rows: [], checks: [] };
    let inTable = false, cur = null, prev = null, subtotal = null, summary = null;
    const rowRe = new RegExp(`^(\\d{2}) ([A-Z]{3})\\s+(.*?)\\s+${MONEY}(\\s*CR)?$`);
    const sumRe = new RegExp(`^${MONEY}\\s+${MONEY}\\s+${MONEY}\\s+${MONEY}\\s+${MONEY}\\s+${MONEY}$`);
    lines.forEach((l) => {
      const t = l.text;
      let m;
      if (!st.date && (m = t.match(/Statement Date\s+(\d{2}) ([A-Z]{3}) (\d{2})/))) st.date = `20${m[3]}-${pad(MON[m[2]])}-${m[1]}`;
      if (!st.last4 && (m = t.match(/\*\*\d{4}-\d{4}-\d{4}-(\d{4})\*\*/))) st.last4 = m[1];
      if (!summary && (m = t.match(sumRe))) summary = { prev: amt(m[1]), credit: amt(m[2]), fees: amt(m[3]), retail: amt(m[4]), cash: amt(m[5]), total: amt(m[6]) };
      if ((m = t.match(new RegExp(`^PREVIOUS BAL\\s+${MONEY}(\\s*CR)?$`)))) { prev = (prev || 0) + amt(m[1]) * (m[2] ? -1 : 1); inTable = true; return; }
      if ((m = t.match(new RegExp(`^SUB-TOTAL\\s+${MONEY}(\\s*CR)?$`)))) { subtotal = (subtotal || 0) + amt(m[1]) * (m[2] ? -1 : 1); inTable = false; cur = null; return; }
      if (!inTable) return;
      if ((m = t.match(rowRe))) {
        const cells = l.cells;
        cur = { mon: MON[m[2]], day: Number(m[1]), merchant: (cells[1] || m[3]).trim(), where: m[3], amount: amt(m[4]), dir: m[5] ? 'in' : 'out', fx: '' };
        if (!cur.mon) { cur = null; return; }
        st.rows.push(cur);
      } else if (cur && (m = t.match(new RegExp(`^([A-Z]{3})\\s+${MONEY}$`)))) cur.fx = `${m[1]} ${m[2]}`;
    });
    const sy = Number((st.date || '2000').slice(0, 4)), sm = Number((st.date || '2000-01').slice(5, 7));
    st.rows.forEach((r, i) => {
      r.idx = i;
      r.date = `${r.mon > sm ? sy - 1 : sy}-${pad(r.mon)}-${pad(r.day)}`;
      r.raw = `${r.where}${r.fx ? ` (${r.fx})` : ''}`;
      r.kind = r.merchant;
    });
    const cr = r2(st.rows.filter((r) => r.dir === 'in').reduce((n, r) => n + r.amount, 0));
    const dr = r2(st.rows.filter((r) => r.dir === 'out').reduce((n, r) => n + r.amount, 0));
    st.period = st.date ? st.date.slice(0, 7) : '';
    st.checks.push({ label: 'Baki terdahulu + caj - bayaran = SUB-TOTAL', ok: prev !== null && subtotal !== null && same(r2(prev + dr - cr), subtotal), got: prev === null ? null : r2(prev + dr - cr), want: subtotal });
    if (summary) {
      st.checks.push({ label: 'Jumlah bayaran/kredit = ringkasan penyata', ok: same(cr, summary.credit), got: cr, want: summary.credit });
      st.checks.push({ label: 'Jumlah caj = belian + yuran + tunai', ok: same(dr, r2(summary.retail + summary.fees + summary.cash)), got: dr, want: r2(summary.retail + summary.fees + summary.cash) });
    } else st.checks.push({ label: 'Jadual ringkasan penyata dijumpai', ok: false });
    st.summary = Object.assign({ subtotal }, summary || {});
    st.ok = st.checks.every((c) => c.ok) && st.rows.length > 0;
    return st;
  }

  function parse(lines) {
    const bank = detect(lines);
    if (bank === 'mbb') return parseMaybank(lines);
    if (bank === 'uob') return parseUob(lines);
    return null;
  }

  /* ---------- categorising ---------- */
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const title = (s) => String(s || '').toLowerCase().replace(/(^|[\s\-(\/.&])([a-z])/g, (x, a, b) => a + b.toUpperCase()).trim();
  const words2 = (k) => k.split(' ').filter((w) => w.length > 1 || /\d/.test(w)).slice(0, 2).join(' ');

  // Keyword rules for shops, applied after exact history so the person's own past choices win. Order matters.
  const SHOP_RULES = [
    [/PHARMACY|FARMASI|WATSON|GUARDIAN|\bCARING\b|KLINIK|CLINIC|\bHOSP(ITAL)?\b|DENTAL|PERGIGIAN/, 'cat_sihat'],
    [/BABYSHOP|BABY SHOP|ANAKKU|MOTHERCARE|PAMPERS|DRYPERS/, 'cat_anak'],
    [/FOODPANDA|GRABFOOD|GRAB FOOD|SHOPEEFOOD|DELIVERY HERO|\bKFC\b|QSR STORES|MCDONALD|MARRYBROWN|PIZZA|SUSHI|TEXAS|4 FINGERS|STARBUCKS|\bZUS\b|TEALIVE|\bCBTL\b|COFFEE|\bKOPI|RESTORAN|RESTAURANT|\bNASI\b|\bAYAM\b|MIXUE|CHAGEE|BASKIN|SECRET RECIPE|DOMINO|\bA ?& ?W\b|SUBWAY|BURGER|IKEA.*FOOD|MAMAK|\bCAFE|\bKAFE|DONUT|FAMOUS AMOS|SEAFOOD|\bFOOD\b|WARONG|WARUNG|\bSHAKE\b|SATAY|SATE\b|BAKSO|MEE\b|\bROTI CANAI|LOOB|BOOST JUICE|DAILY FRESH/, 'cat_makan'],
    [/SPEED ?MART|LOTUS|MYDIN|ECONSAVE|LS MART|PASARAYA|FAMILYMART|FAMILY MART|C-MART|AEON BIG|AEON CO|\bGIANT\b|TF VALUE|BILLION|HAROLD|BREAD|7-ELEVEN|7 ELEVEN|KK SUPER|SUPERMARKET|HYPERMARKET|EKONOMART|\bECONO\b|MINI MARKET|MINIMARKET|PASAR\b/, 'cat_dapur'],
    [/MR\.? ?DIY|MR\.? ?DOLLAR|ECOSHOP|ECO SHOP|DAISO|KAISON|\bIKEA\b|STATIONERY|HARDWARE|TOOLS/, 'cat_rumah'],
    [/PETRON|SHELL|BHPETROL|BH PETROL|PETRONAS|CALTEX|\bCTX\b|FIVE STAR|PETROL|^PSS\b|\bPSS[- ]/, 'cat_minyak'],
    [/PLUS TOLL|\bTOLL?\b|PARKING|PARKIR|SMART ?SELANGOR|FLEXI ?PARKING/, 'cat_tol'],
    [/JABATAN PENGANGKUTAN|\bJPJ|MYEG|ROADTAX|PUSPAKOM|TAYAR|TYRE|BATTERY|BATERI|WORKSHOP|BENGKEL|SERVIS|APEG/, 'cat_servis'],
    [/NETFLIX|SPOTIFY|APPLE\.COM|APPLE SERVICES|ITUNES|YOUTUBE|GOOGLE ?\*?(STORAGE|ONE|PLAY)|ASTRO|SOOKA|DISNEY|\bVIU\b/, 'cat_sub'],
    [/YTL COMM|Y-MAX|YES 4G|\bDIGI\b|CELCOM|MAXIS|HOTLINK|UMOBILE|U MOBILE|TUNE TALK|UNIFI|TM NET|TIME DOTCOM|TIMEDOTCOM|TIME FIBRE/, 'cat_telco'],
    [/TIKTOK PROMOTE|ADS\.TIKTOK|TIKTOKADS|CAPCUT|CANVA|META ADS|FACEBK|FACEBOOK ADS/, 'cat_kosaff'],
    [/LAZADA|TIKTOK SHOP|ZALORA|UNIQLO|PADINI|\bH ?& ?M\b|\bBATA\b|SPORTS DIRECT|DECATHLON|\bPOPULAR\b|\bMPH\b|BOUTIQUE|BRANDS OUTLET|\bOPERA\b|BOSTON|NAGOYA|TEXTILE|FASHION|\bJAKEL\b|KEDAI KASUT/, 'cat_shopping'],
    [/CINEMA|\bGSC\b|\bTGV\b|\bMBO\b|\bLFS\b|STEAM|PLAYSTATION/, 'cat_hiburan'],
    [/MASJID|SURAU|INFAQ|ZAKAT|SEDEKAH|WAKAF/, 'cat_sedekah']
  ];

  // Rules on a merchant / biller name, shared by UOB card rows and Maybank debit card or FPX rows.
  function merchantRule(name, bank, amount) {
    const m = String(name || '').toUpperCase();
    const acc = bank === 'uob' ? 'acc_uob' : 'acc_maybank';
    if (/^TNG[- ]?EWALLET|TNG EWALLET|TOUCH ?N ?GO|TNG DIGITAL/.test(m)) {
      if (bank === 'uob') return P('tng', same(amount, 50.5) ? 'Auto reload TNG' : 'Topup TNG guna kad', { why: 'Topup TNG guna kad: pindahan + caj 1%' });
      return P(`tr:${acc}>acc_tng`, 'Topup TNG', { why: 'Topup TNG guna kad debit (tiada caj)' });
    }
    if (/SPAYLATER/.test(m)) return P('cat:cat_bnpl', 'Bayar SPayLater', { commitment_id: 'com_spay', why: 'SPayLater' });
    if (/TIKTOK PAYLATER/.test(m)) return P('cat:cat_bnpl', 'Bayar TikTok PayLater', { commitment_id: 'com_tiktokpl', why: 'TikTok PayLater' });
    if (/^ATOME|APAYLATER/.test(m)) return P('cat:cat_bnpl', /TIKTOK/.test(m) ? 'Bayar Atome (TikTok Shop)' : 'Bayar Atome', { why: 'Atome' });
    if (/MONEE CAPITAL/.test(m)) return P('cat:cat_bnpl', 'Bayar PayLater (Monee)', { conf: 'semak', why: 'Monee Capital: semak PayLater mana' });
    if (/SHOPEEPAY TOP ?UP|SHOPEEPAY TOPUP/.test(m)) return P('cat:cat_lain', 'Topup ShopeePay', { why: 'Topup ShopeePay' });
    if (/ANTHROPIC|CLAUDE/.test(m)) return P('cat:cat_kosaff', 'Claude (alat edit video affiliate)', { commitment_id: 'com_claude', why: 'Claude' });
    if (/SOOKA/.test(m)) return P('cat:cat_sub', 'Sooka', { commitment_id: 'com_sooka', why: 'Astro Sooka' });
    if (/TIME DOTCOM|TIMEDOTCOM|TIME FIBRE|TIME INTERNET/.test(m)) return P('cat:cat_telco', 'Time WiFi', { commitment_id: 'com_time', why: 'Time WiFi' });
    if (/YTL COMM|Y-MAX/.test(m)) return P('cat:cat_telco', 'Yes', { commitment_id: 'com_telcoabi', why: 'Yes = telco Abi' });
    if (/\bTNB\b|TENAGA NASIONAL/.test(m)) return P('cat:cat_elektrik', 'Bil TNB', { conf: 'semak', why: 'TNB: semak rumah mak (119G) atau Amanjaya' });
    if (/AIR DARUL AMAN|SYARIKAT AIR DARUL|\bSADA\b/.test(m)) return P('cat:cat_air', 'Bil air SADA', { why: 'SADA' });
    if (/MOOMOO/.test(m)) return P(`tr:${acc}>acc_moomoo`, 'Deposit Moomoo', { why: 'Moomoo' });
    if (/VERSA/.test(m)) return P(`tr:${acc}>acc_versa`, 'Deposit Versa', { why: 'Versa' });
    if (/SERVICE TAX|RETAIL INTEREST|FINANCE CHARGE|LATE (PAYMENT )?CHARGE|ANNUAL FEE|^DEBIT ADVICE/.test(m)) return P('cat:cat_caj', title(name), { conf: /DEBIT ADVICE/.test(m) ? 'semak' : 'auto', why: 'Caj bank' });
    return null;
  }

  function buildHistory(transactions, excludeSource) {
    const exact = {}, fuzzy = {};
    const add = (map, k, v) => { if (!k) return; const m = map[k] || (map[k] = {}); m[v] = (m[v] || 0) + 1; };
    (transactions || []).forEach((t) => {
      if (excludeSource && t.source === excludeSource) return;
      const k = norm(t.note);
      if (!k) return;
      let v = '';
      if ((t.type === 'expense' || t.type === 'income') && t.category_id) v = `${t.type}|cat:${t.category_id}`;
      else if (t.type === 'transfer' && t.to_account_id) v = `transfer|tr:${t.account_id}>${t.to_account_id}`;
      if (!v) return;
      add(exact, k, v);
      add(fuzzy, words2(k), v);
    });
    const best = (m) => {
      if (!m) return null;
      const e = Object.entries(m).sort((a, b) => b[1] - a[1]);
      const total = e.reduce((n, x) => n + x[1], 0);
      return { v: e[0][0], share: e[0][1] / total, n: total };
    };
    return { exact: (k) => best(exact[k]), fuzzy: (k) => best(fuzzy[words2(k)]) };
  }

  // A proposal: what to record for one statement row.
  //   sel: 'cat:<id>' (expense or income by direction) | 'tr:<from>><to>' | 'tng' (UOB topup: transfer + 1% fee) | 'skip'
  //   conf: 'auto' (rule or consistent history) | 'semak' (best guess, please check)
  function P(sel, note, opts) { return Object.assign({ sel, note, conf: 'auto', commitment_id: '', why: '' }, opts || {}); }

  function ruleMaybank(r) {
    const party = r.party.toUpperCase(), kind = r.kind.toUpperCase(), memo = r.memo, all = r.raw.toUpperCase();
    const own = /MUHAMMAD AZIZI HAFI|AZIZI HAFIZUDDIN/.test(party);
    if (r.dir === 'in') {
      if (/MONEYMATCH/.test(party)) return P('cat:cat_affiliate', 'Komisen TikTok (MoneyMatch)', { why: 'MoneyMatch = komisen TikTok' });
      if (/PIPO/.test(party)) return P('cat:cat_shopee', 'Komisen Shopee (PIPO)', { why: 'PIPO = komisen Shopee' });
      if (/KLIKI/.test(party)) {
        const pv = all.match(/\bPV\d+/);
        if (pv) return P('cat:cat_komisen', `Komisen KLIKI (${pv[0]})`, { commitment_id: 'com_komisen', why: 'KLIKI PV = komisen kerja' });
        if (/\bSAL/.test(all)) return P('cat:cat_gaji', 'Gaji KLIKI', { commitment_id: 'com_gaji', why: 'KLIKI Sal = gaji' });
        return P('cat:cat_komisen', 'KLIKI', { conf: 'semak', why: 'Dari KLIKI, jenis tak jelas' });
      }
      if (/AIRPAY/.test(party)) return P('cat:cat_masuklain', 'Airpay (ShopeePay)', { why: 'Airpay' });
      if (/BANTUAN|\bSTR\b|SUMBANGAN TUNAI/.test(all)) return P('cat:cat_bantuan', 'Bantuan kerajaan', { why: 'Bantuan' });
      if (/HIBAH|PROFIT PAID|DIVIDEN/.test(all)) return P('cat:cat_dividen', title(kind), { why: 'Hibah/untung bank' });
      if (own) return P('tr:acc_mbsb>acc_maybank', 'Pindah dari akaun sendiri', { conf: 'semak', why: 'Dari nama sendiri, akaun asal tak tertera' });
      return null;
    }
    if (/ESI PYMT/.test(kind)) {
      if (r.date >= '2026-06-01') return P('cat:cat_loan', 'Ansuran Proton S70', { commitment_id: 'com_s70', why: 'ESI auto debit = loan S70' });
      return P('cat:cat_loan', 'Ansuran loan kereta lama', { why: 'ESI auto debit = loan kereta' });
    }
    if (own) {
      if (/CC SETTLEMENT/.test(all)) {
        if (/^AZIZI HAFIZUDDIN/.test(party)) return P('tr:acc_maybank>acc_cimb', 'Bayar kad CIMB', { commitment_id: 'com_cimb', why: 'CC Settlement ke AZIZI HAFIZUDDIN = CIMB' });
        return P('tr:acc_maybank>acc_uob', 'Bayar kad UOB', { commitment_id: 'com_uob', why: 'CC Settlement ke MUHAMMAD AZIZI HAFI = UOB' });
      }
      if (/CASA AUTO ?TOP/.test(all)) return P('tr:acc_maybank>acc_mae', 'MAE auto topup', { why: 'CASA AutoTopUp = MAE' });
      if (/\bSAVING/.test(all)) return P('tr:acc_maybank>acc_kwsp', 'Saving ke KWSP', { why: 'Nota "Saving" = KWSP' });
      return P('tr:acc_maybank>', `Pindahan ke akaun sendiri${memo ? ` (${memo})` : ''}`, { conf: 'semak', why: 'Ke nama sendiri, akaun tujuan tak tertera' });
    }
    if (/KWSP/.test(party) || (/AUTODB/.test(kind) && /KWSP/.test(all))) return P('tr:acc_maybank>acc_kwsp', 'KWSP sukarela (autodebit)', { commitment_id: 'com_kwsp', why: 'KWSP' });
    if (/AMANAH SAHAM|ASNB|PERMODALAN NASIONAL/.test(party)) return P('tr:acc_maybank>acc_asnb', 'ASNB (autodebit)', { commitment_id: 'com_asnb', why: 'ASNB' });
    if (/PTPTN|PERBADANAN TABUNG PE/.test(party)) return P('cat:cat_ptptn', 'PTPTN', { commitment_id: 'com_ptptn', why: 'PTPTN' });
    if (/TABUNG HAJI|LEMBAGA TABUNG/.test(party)) return P('tr:acc_maybank>acc_th', 'Tabung Haji', { why: 'Tabung Haji' });
    if (/MIGA/.test(all)) return P('tr:acc_maybank>acc_miga', 'Beli emas MIGA-i', { why: 'MIGA-i' });
    if (/ABDUL HARIS/.test(party)) {
      if (/MAC ?MINI/i.test(memo) || same(r.amount, 105)) return P('cat:cat_loan', 'Ansuran Mac mini (kepada ayah)', { commitment_id: 'com_macmini', why: 'RM105 kepada ayah = Mac mini' });
      if (/susu|pampers|lampin/i.test(memo)) return P('cat:cat_anak', `Susu (kepada ayah)`, { conf: 'semak', why: 'Nota pindahan' });
      return P('cat:cat_makabah', `Kepada ayah${memo ? `: ${memo}` : ''}`, { conf: 'semak', why: 'Pindahan kepada ayah' });
    }
    if (/PUAN ZAINI/.test(party)) return P('cat:cat_makabah', `Kepada mak${memo ? `: ${memo}` : ''}`, { conf: 'semak', why: 'Pindahan kepada mak' });
    if (/MADIHA/.test(party)) {
      if (/susu|pampers|lampin|ubat anak/i.test(memo)) return P('cat:cat_anak', `Isteri: ${memo}`, { conf: 'semak', why: 'Nota pindahan' });
      return P('cat:cat_isteri', `Belanja isteri${memo ? ` (${memo})` : ''}`, { conf: /^(belanja|bwlanja|elaun|duit|bulanan)/i.test(memo) ? 'auto' : 'semak', why: 'Pindahan kepada isteri' });
    }
    if (/^MBBQR\d+/.test(party)) return P('cat:cat_qr', 'QR Maybank', { why: 'DuitNow QR peniaga' });
    if (/TIKTOK SHOP/.test(party) && /QR/.test(all)) return P('cat:cat_shopping', 'TikTok Shop (QR)', { why: 'TikTok Shop' });
    const biller = merchantName(r);
    if (biller) return merchantRule(biller, 'mbb', r.amount);
    return null;
  }

  // The merchant or biller behind a Maybank debit card / FPX row (empty for person-to-person transfers).
  function merchantName(r) {
    const k = r.kind.toUpperCase();
    if (/SALE DEBIT|PAYMENT VIA MYDEBIT|POS PURCHASE|DEBIT CARD/.test(k)) {
      // Some card rows carry only a town ("SUNGAI PETANI, MY") instead of a shop name.
      const town = r.party.match(/^([^,]+),\s*MY$/i);
      return town ? `Kad debit ${title(town[1])}` : r.party;
    }
    if (/^FPX/.test(k)) return r.lines[1] && /[A-Za-z]{3}/.test(r.lines[1]) ? `${r.lines[1]} ${r.party}` : r.party;
    if (/JOMPAY|BILL PAYMENT/.test(k)) return r.party;
    if (/PYMT FROM/.test(k)) return /QR PAY|\bQR\b/.test(r.raw.toUpperCase()) ? '' : r.party;
    if (/DEBIT ADVICE/.test(k)) return 'DEBIT ADVICE';
    return '';
  }

  function ruleUob(r) {
    const m = r.merchant.toUpperCase();
    if (/^PAYMENT REC'?D/.test(m)) return P('skip', 'Bayaran kad (direkod dari akaun bank)', { why: 'Bayaran masuk kad sudah direkod sebagai pindahan dari Maybank' });
    if (r.dir === 'in') return P('cat:cat_masuklain', `Refund ${title(r.merchant)}`, { conf: 'semak', why: 'Kredit/refund' });
    return merchantRule(r.merchant, 'uob', r.amount);
  }

  function noteFor(st, r) {
    if (st.bank === 'uob') return title(r.merchant);
    const biller = merchantName(r);
    if (biller) return title(/^FPX/i.test(r.kind) && r.lines[1] ? r.lines[1] : biller);
    if (/QR/.test(r.raw.toUpperCase())) return r.party ? `QR ${title(r.party)}` : 'QR (tiada nama)';
    return `${r.dir === 'in' ? 'Dari' : 'Kepada'} ${title(r.party || r.kind)}${r.memo ? ` (${r.memo})` : ''}`;
  }

  function classifyRow(st, r, hist, catOk) {
    const rule = st.bank === 'uob' ? ruleUob(r) : ruleMaybank(r);
    if (rule && rule.conf === 'auto') return rule;
    const note = (rule && rule.note) || noteFor(st, r);
    const want = r.dir === 'in' ? 'income' : 'expense';
    const accept = (h) => {
      if (!h) return null;
      const [type, sel] = h.v.split('|');
      if (type === 'transfer') {
        const [from, to] = sel.slice(3).split('>');
        if (r.dir === 'out' && from === st.account_id) return sel;
        if (r.dir === 'in' && to === st.account_id) return sel;
        return null;
      }
      return type === want && catOk(sel.slice(4), want) ? sel : null;
    };
    const key = norm(note);
    const ex = hist.exact(key);
    const exSel = accept(ex);
    if (exSel && ex.share >= 0.6 && !rule) return P(exSel, note, { conf: ex.share >= 0.8 ? 'auto' : 'semak', why: `Sama macam ${ex.n} rekod lepas` });
    if (rule) return rule;
    if (r.dir === 'out') {
      const text = `${note} ${st.bank === 'mbb' ? r.party : r.merchant}`.toUpperCase();
      const hit = SHOP_RULES.find(([re]) => re.test(text));
      if (hit && catOk(hit[1], 'expense')) return P(`cat:${hit[1]}`, note, { why: 'Kata kunci kedai' });
    }
    const person = st.bank === 'mbb' && !merchantName(r);
    const qr = person && /\b(MAE QR|DUITNOW QR|QR PAY)\b/.test(r.raw.toUpperCase());
    if (!person) {
      const fz = hist.fuzzy(key);
      const fzSel = accept(fz);
      if (fzSel) return P(fzSel, note, { conf: fz.share >= 0.8 && fz.n >= 2 ? 'auto' : 'semak', why: `Hampir sama dengan ${fz.n} rekod lepas` });
    }
    if (qr && r.dir === 'out') {
      // QR merchant names are often squashed together (AYAMGORENGMAHAPRIMA), so look for food words inside them.
      if (/AYAM|KAFE|CAFE|NASI|SEAFOOD|RESTORAN|MAKAN|BURGER|KOPI|MEE|SATE|ROTI|MIXUE|KEDAIMAKAN|WARUNG|WARONG/.test(r.party.toUpperCase().replace(/[^A-Z]/g, '')) && catOk('cat_makan', 'expense')) return P('cat:cat_makan', note, { why: 'QR kedai makan' });
      return P('cat:cat_qr', note, { conf: r.amount >= 100 ? 'semak' : 'auto', why: r.amount >= 100 ? 'QR jumlah besar: semak' : 'Bayar DuitNow QR' });
    }
    return P(r.dir === 'in' ? 'cat:cat_masuklain' : 'cat:cat_lain', note, { conf: 'semak', why: 'Tiada padanan' });
  }

  // Finds an existing transaction that already records this row (same account, same amount, within 2 days).
  function findDup(st, r, p, transactions, used) {
    const want = p.sel === 'tng' ? splitTng(r.amount).transfer : r.amount;
    const d0 = Date.parse(r.date);
    let best = null;
    (transactions || []).forEach((t) => {
      if (used.has(t.id)) return;
      if (t.account_id !== st.account_id && t.to_account_id !== st.account_id) return;
      if (!(same(Number(t.amount), want) || same(Number(t.amount), r.amount))) return;
      const dd = Math.abs(Date.parse(String(t.date).slice(0, 10)) - d0) / 864e5;
      if (!(dd <= 2)) return;
      if (!best || dd < best.dd) best = { t, dd };
    });
    if (best) used.add(best.t.id);
    return best ? best.t : null;
  }

  function splitTng(total) {
    const transfer = r2(total / 1.01);
    return { transfer, fee: r2(total - transfer) };
  }

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  function classify(st, ctx) {
    const source = `stmt:${st.bank}:${st.period}`;
    const hist = buildHistory(ctx.transactions, ctx.excludeSource);
    const cats = {};
    (ctx.categories || []).forEach((c) => { if (!c.archived) cats[c.id] = c; });
    const catOk = (id, kind) => !!cats[id] && cats[id].kind === kind;
    const accOk = {};
    (ctx.accounts || []).forEach((a) => { if (!a.archived) accOk[a.id] = 1; });
    const comOk = {};
    (ctx.commitments || []).forEach((c) => { comOk[c.id] = 1; });
    const valid = (p) => {
      if (p.commitment_id && !comOk[p.commitment_id]) p.commitment_id = '';
      if (p.sel.startsWith('tr:')) {
        const [from, to] = p.sel.slice(3).split('>');
        if (!accOk[from] || (to && !accOk[to])) { p.sel = `tr:${st.account_id}>`; p.conf = 'semak'; p.why += ' (akaun tak wujud dalam app)'; }
      }
      if (p.sel === 'tng' && !accOk.acc_tng) { p.sel = `tr:${st.account_id}>`; p.conf = 'semak'; }
      if (p.sel.startsWith('cat:') && !cats[p.sel.slice(4)]) { p.sel = `cat:${p.row && p.row.dir === 'in' ? 'cat_masuklain' : 'cat_lain'}`; p.conf = 'semak'; }
      return p;
    };
    const used = new Set();
    const already = (ctx.transactions || []).filter((t) => t.source === source).length;
    const items = st.rows.map((r) => {
      const p = valid(Object.assign(classifyRow(st, r, hist, catOk), { row: r }));
      const dup = p.sel === 'skip' ? null : findDup(st, r, p, ctx.transactions, used);
      return Object.assign({ row: r, id: `imp_${st.bank}${st.period.replace('-', '')}_${hash(`${r.idx}|${r.date}|${r.amount}|${r.raw}`)}`, include: p.sel !== 'skip' && !dup, dup }, p);
    });
    return { source, already, items };
  }

  // Turns one reviewed item into Transactions rows.
  function toTx(st, it, source) {
    const r = it.row, acc = st.account_id;
    const base = { date: r.date, commitment_id: it.commitment_id || '', for_month: '', note: it.note, source };
    if (it.sel === 'tng') {
      const s = splitTng(r.amount);
      return [
        Object.assign({}, base, { id: `${it.id}a`, type: 'transfer', amount: s.transfer, account_id: acc, to_account_id: 'acc_tng', category_id: '', commitment_id: '' }),
        Object.assign({}, base, { id: `${it.id}b`, type: 'expense', amount: s.fee, account_id: acc, to_account_id: '', category_id: 'cat_caj', commitment_id: '', note: 'Caj 1% topup TNG' })
      ];
    }
    if (it.sel.startsWith('tr:')) {
      const [from, to] = it.sel.slice(3).split('>');
      return [Object.assign({}, base, { id: it.id, type: 'transfer', amount: r.amount, account_id: from, to_account_id: to, category_id: '' })];
    }
    if (it.sel.startsWith('cat:')) {
      return [Object.assign({}, base, { id: it.id, type: r.dir === 'in' ? 'income' : 'expense', amount: r.amount, account_id: acc, to_account_id: '', category_id: it.sel.slice(4) })];
    }
    return [];
  }

  let pdfjsPromise = null;
  function loadPdfJs(base) {
    if (!pdfjsPromise) {
      pdfjsPromise = import(`${base}vendor/pdfjs/pdf.min.mjs`).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = `${base}vendor/pdfjs/pdf.worker.min.mjs`;
        return lib;
      }).catch((e) => { pdfjsPromise = null; throw e; });
    }
    return pdfjsPromise;
  }

  async function readFile(file, askPassword) {
    const base = new URL('./', root.location ? root.location.href : 'http://x/').href;
    const pdfjs = await loadPdfJs(base);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const lines = await pdfLines(pdfjs, bytes, askPassword);
    return parse(lines);
  }

  const api = { pdfLines, detect, parse, parseMaybank, parseUob, classify, toTx, splitTng, readFile, norm, title, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KKImport = api;
})(typeof window !== 'undefined' ? window : globalThis);
