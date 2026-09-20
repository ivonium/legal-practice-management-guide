// Acceptance test 13 and the verbatim-label check for the Trust Transaction Walkthrough.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadApp } from './helpers.js';
import { loadContentModel } from '../../src/build/load.js';
import { renderedTextOf } from '../../src/build/fidelity.js';

const A = loadApp();

test('test 13a: $5,000 GTA receipt then $6,000 bill is blocked with the overdraw warning', () => {
  const s = A.wtInitialState();
  s.receipt.amount = 5000;
  s.receipt.dateReceived = '2026-09-11';
  const r = A.wtAddEvent(s, { type: 'bill', amount: 6000, date: '2026-09-11', rule42Method: 1, method: 'eft', payee: 'Office account' });
  assert.equal(r.ok, false);
  assert.equal(r.blockedBy, 'overdraw');
  assert.match(r.error, /overdraw the client's trust ledger/);
  assert.equal(s.events.length, 0);
});

test('test 13b: $5,000 receipt then $3,000 bill (Method 1, bill date today) -> earliest withdrawal today + 7 weekdays; balance $2,000', () => {
  const s = A.wtInitialState();
  s.receipt.amount = 5000;
  s.receipt.dateReceived = '2026-09-11';
  const today = A.todayIso();
  const r = A.wtAddEvent(s, { type: 'bill', amount: 3000, date: today, rule42Method: 1, method: 'eft', payee: 'Office account' });
  assert.equal(r.ok, true);
  const led = A.wtLedger(s);
  assert.equal(led.balance, 2000);
  const wait = A.wtWaitingPeriod(1, today);
  assert.equal(wait.earliest, A.addWeekdays(today, 7));
});

test('method 3 reimbursement is blocked when the office debit date is blank or after the withdrawal', () => {
  const s = A.wtInitialState();
  s.receipt.amount = 5000;
  assert.equal(A.wtAddEvent(s, { type: 'reimbursement', amount: 100, date: '2026-09-11', officeDebitDate: '' }).ok, false);
  assert.equal(A.wtAddEvent(s, { type: 'reimbursement', amount: 100, date: '2026-09-11', officeDebitDate: '2026-09-14' }).ok, false);
  assert.equal(A.wtAddEvent(s, { type: 'reimbursement', amount: 100, date: '2026-09-11', officeDebitDate: '2026-09-10', method: 'eft' }).ok, true);
});

test('cash override and CMA name test', () => {
  assert.deepEqual(A.cashOverride('cash', 'transit'), { applies: true, deposit: 'GTA', onward: true });
  assert.deepEqual(A.cashOverride('cash', 'controlled'), { applies: true, deposit: 'CMA', onward: false });
  assert.equal(A.cashOverride('cheque', 'transit').applies, false);
  assert.equal(A.cmaNameCompliant('Smith Legal CMA - Jones purchase', 'Smith Legal').compliant, true);
  assert.equal(A.cmaNameCompliant('Smith Legal - Jones purchase', 'Smith Legal').compliant, false);
});

test('walkthrough labels are verbatim from the Trust Accounting guide (or logged)', () => {
  const model = loadContentModel();
  const trust = model.guides.find((g) => g.slug === 'trust-accounting');
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const guideText = norm(renderedTextOf(trust));
  const missing = [];
  const check = (key, s) => {
    if (!guideText.includes(norm(s))) missing.push(`${key}: ${s}`);
  };
  for (const [k, v] of Object.entries(A.WT_LABELS)) {
    if (Array.isArray(v)) v.forEach((x, i) => check(`${k}[${i}]`, x));
    else check(k, v);
  }
  // Labels known not to be verbatim (documented in BUILD_NOTES.md)
  const allowed = new Set(['overdrawSpec']);
  const unexpected = missing.filter((m) => !allowed.has(m.split(':')[0].replace(/\[\d+\]$/, '')));
  const outPath = path.join(process.cwd(), 'test', 'unit', '.walkthrough-labels.json');
  fs.writeFileSync(outPath, JSON.stringify({ missing }, null, 2));
  assert.deepEqual(unexpected, [], 'Non-verbatim labels:\n' + unexpected.join('\n'));
});
