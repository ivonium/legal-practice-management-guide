// Shared helpers. Files under src/app are concatenated into one IIFE by the build;
// `export` keywords are stripped so the same files can be unit-tested in Node.

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function escapeAttr(s) {
  return escapeHtml(s);
}

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function nowIso() {
  return new Date().toISOString();
}

export function debounce(fn, ms) {
  let t = null;
  const d = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
  d.flush = (...args) => {
    if (t) {
      clearTimeout(t);
      t = null;
      fn(...args);
    }
  };
  return d;
}

// ---- numbers and money
const AUD0 = typeof Intl !== 'undefined' ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0, minimumFractionDigits: 0 }) : null;
const AUD2 = typeof Intl !== 'undefined' ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2, minimumFractionDigits: 2 }) : null;

export function money0(n) {
  if (!isFinite(n)) return '-';
  const v = Math.round(n);
  return AUD0 ? AUD0.format(v) : '$' + v.toLocaleString();
}
export function money2(n) {
  if (!isFinite(n)) return '-';
  return AUD2 ? AUD2.format(n) : '$' + n.toFixed(2);
}
export function num(n, dp = 1) {
  if (!isFinite(n)) return '-';
  return Number(n).toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: dp });
}
export function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((n + Number.EPSILON) * f) / f;
}
export function toNumber(v, fallback = 0) {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = Number(String(v).replace(/[,$\s]/g, ''));
  return isFinite(n) ? n : fallback;
}

// ---- dates (ISO yyyy-mm-dd, timezone-free)
export function parseIso(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}
export function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export function isoToDate(s) {
  const p = parseIso(s);
  return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : null;
}
export function dateToIso(dt) {
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
export function todayIso() {
  const d = new Date();
  return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
export function addDays(iso, n) {
  const dt = isoToDate(iso);
  if (!dt) return null;
  dt.setUTCDate(dt.getUTCDate() + n);
  return dateToIso(dt);
}
export function daysBetween(a, b) {
  const da = isoToDate(a);
  const db = isoToDate(b);
  return Math.round((db - da) / 86400000);
}
export function isWeekend(iso) {
  const dt = isoToDate(iso);
  const wd = dt.getUTCDay();
  return wd === 0 || wd === 6;
}
// n weekdays after iso (weekdays only; public holidays are not allowed for)
export function addWeekdays(iso, n) {
  let cur = iso;
  let count = 0;
  while (count < n) {
    cur = addDays(cur, 1);
    if (!isWeekend(cur)) count++;
  }
  return cur;
}
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function fmtDate(iso) {
  const p = parseIso(iso);
  if (!p) return '';
  return `${p.d} ${MONTHS_LONG[p.m - 1]} ${p.y}`;
}
export function fmtDateTime(isoTs) {
  if (!isoTs) return '';
  const d = new Date(isoTs);
  if (isNaN(d)) return String(isoTs);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function monthName(m) {
  return MONTHS_LONG[m - 1];
}
export function lastDayOfMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// ---- minimal markdown for notes (paragraphs, bold, italics, bullet lists, links). No HTML input.
export function renderNoteMarkdown(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const out = [];
  let para = [];
  let list = null;
  const inline = (s) => {
    let t = escapeHtml(s);
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]+)\)/g, (m, a, b) => `<a href="${b}"${b.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}>${a}</a>`);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    return t;
  };
  const flushPara = () => {
    if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
    para = [];
  };
  const flushList = () => {
    if (list) out.push('<ul>' + list.map((i) => '<li>' + inline(i) + '</li>').join('') + '</ul>');
    list = null;
  };
  for (const line of lines) {
    const lm = line.match(/^\s*[-*]\s+(.*)$/);
    if (lm) {
      flushPara();
      (list = list || []).push(lm[1]);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join('');
}

// ---- simple word diff for the change log (LCS on words)
export function wordDiff(a, b) {
  const wa = String(a || '').split(/\s+/).filter(Boolean);
  const wb = String(b || '').split(/\s+/).filter(Boolean);
  const n = wa.length;
  const m = wb.length;
  if (n * m > 4e6) return { removed: wa, added: wb, ops: [{ type: 'del', text: wa.join(' ') }, { type: 'ins', text: wb.join(' ') }] };
  const dp = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Uint16Array(m + 1);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = wa[i] === wb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0;
  let j = 0;
  const push = (type, text) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += ' ' + text;
    else ops.push({ type, text });
  };
  while (i < n && j < m) {
    if (wa[i] === wb[j]) {
      push('eq', wa[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push('del', wa[i++]);
    else push('ins', wb[j++]);
  }
  while (i < n) push('del', wa[i++]);
  while (j < m) push('ins', wb[j++]);
  return { ops };
}

export function stripTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function $(sel, root) {
  return (root || document).querySelector(sel);
}
export function $$(sel, root) {
  return Array.from((root || document).querySelectorAll(sel));
}
