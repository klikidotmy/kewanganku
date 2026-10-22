/**
 * KewanganKu API (Google Apps Script, bound to the "KewanganKu DB" sheet)
 *
 * Setup:
 *  1. Open the sheet > Extensions > Apps Script, paste this file as Code.gs.
 *  2. Run setup() once. Approve permissions. Copy the token from the log.
 *  3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *  4. Paste the web app URL and token into the app's setup screen.
 *  To update later: Deploy > Manage deployments > edit > New version (same URL).
 */

const TABS = {
  Transactions: ['id', 'date', 'type', 'amount', 'account_id', 'to_account_id', 'category_id', 'commitment_id', 'note', 'source', 'created_at', 'updated_at'],
  Accounts: ['id', 'name', 'type', 'group', 'last4', 'opening_balance', 'credit_limit', 'color', 'order', 'archived', 'note'],
  Categories: ['id', 'name', 'kind', 'group', 'icon', 'budget', 'order', 'archived'],
  Commitments: ['id', 'name', 'amount', 'due_day', 'category_id', 'account_id', 'start_month', 'end_month', 'active', 'note'],
  Settings: ['key', 'value']
};
const TZ = 'Asia/Kuala_Lumpur';
const NUMERIC = { amount: 1, opening_balance: 1, credit_limit: 1, order: 1, budget: 1, due_day: 1 };
const BOOL = { archived: 1, active: 1 };
const TEXT_DATE = { date: 'yyyy-MM-dd', start_month: 'yyyy-MM', end_month: 'yyyy-MM' };

function setup() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('API_TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
    props.setProperty('API_TOKEN', token);
  }
  ensureTabs_();
  Logger.log('API token: ' + token);
  return token;
}

/** Run this if the token ever leaks. Old devices will need the new token. */
function rotateToken() {
  PropertiesService.getScriptProperties().deleteProperty('API_TOKEN');
  return setup();
}

function doGet() {
  return json_({ ok: true, app: 'KewanganKu API' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Bad JSON' });
  }
  const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!token || body.token !== token) return json_({ ok: false, error: 'Unauthorized' });

  try {
    if (body.action === 'bootstrap') return json_({ ok: true, data: bootstrap_() });
    if (body.action === 'ops') {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        const results = (body.ops || []).map(applyOp_);
        SpreadsheetApp.flush();
        return json_({ ok: true, results: results });
      } finally {
        lock.releaseLock();
      }
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function bootstrap_() {
  return {
    accounts: readTab_('Accounts'),
    categories: readTab_('Categories'),
    commitments: readTab_('Commitments'),
    transactions: readTab_('Transactions'),
    settings: readTab_('Settings').reduce(function (o, r) { o[r.key] = r.value; return o; }, {}),
    serverTime: new Date().toISOString()
  };
}

/** op = { op: 'upsert'|'delete', tab: 'Transactions'|'Accounts'|'Categories'|'Commitments', row: {...} } */
function applyOp_(op) {
  if (!TABS[op.tab] || op.tab === 'Settings') throw new Error('Bad tab: ' + op.tab);
  if (!op.row || !op.row.id) throw new Error('Missing id');
  const sh = sheet_(op.tab);
  const headers = TABS[op.tab];
  const rowIndex = findRow_(sh, op.row.id);

  if (op.op === 'delete') {
    if (rowIndex > 0) sh.deleteRow(rowIndex);
    return { id: op.row.id, deleted: rowIndex > 0 };
  }
  if (op.op !== 'upsert') throw new Error('Bad op: ' + op.op);

  const now = new Date().toISOString();
  let existing = {};
  if (rowIndex > 0) {
    const vals = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    headers.forEach(function (h, i) { existing[h] = vals[i]; });
  }
  const merged = {};
  headers.forEach(function (h) {
    merged[h] = op.row.hasOwnProperty(h) ? op.row[h] : (existing[h] !== undefined ? existing[h] : '');
  });
  if (op.tab === 'Transactions') {
    if (!merged.created_at) merged.created_at = now;
    merged.updated_at = now;
  }
  const out = [headers.map(function (h) { return merged[h] === null ? '' : merged[h]; })];
  if (rowIndex > 0) {
    sh.getRange(rowIndex, 1, 1, headers.length).setValues(out);
  } else {
    sh.getRange(sh.getLastRow() + 1, 1, 1, headers.length).setValues(out);
  }
  return { id: op.row.id, saved: true };
}

function readTab_(name) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values.filter(function (r) { return r[0] !== '' && r[0] !== null; }).map(function (r) {
    const o = {};
    headers.forEach(function (h, i) { if (h) o[h] = clean_(h, r[i]); });
    return o;
  });
}

function clean_(h, v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, TZ, TEXT_DATE[h] || "yyyy-MM-dd'T'HH:mm:ss");
  if (NUMERIC[h]) return v === '' || v === null ? null : Number(v);
  if (BOOL[h]) return v === true || String(v).toUpperCase() === 'TRUE';
  return v === null ? '' : String(v);
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const finder = sh.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return finder ? finder.getRow() : -1;
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Missing tab: ' + name);
  return sh;
}

function ensureTabs_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(TABS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, TABS[name].length).setValues([TABS[name]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
