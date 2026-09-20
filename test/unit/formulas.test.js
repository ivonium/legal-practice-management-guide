// Acceptance test 12: all calculator test cases in Sheet A section 8.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers.js';

const A = loadApp();
const close = (a, b, eps = 0.051) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('8.1 profit driver - test case 1 (established firm)', () => {
  const r = A.profitDriver({ L: 2.5, BR: 350, CH: 1100, R: 85, M: 35 });
  assert.equal(Math.round(r.nppp), 400881);
  assert.equal(A.money0(r.nppp), '$400,881');
  assert.equal(r.band, 'Very good on two drivers, one being leverage or price');
  close(r.takeHomeLow, 200440.625, 0.001);
  close(r.takeHomeHigh, 280616.875, 0.001);
});

test('8.1 profit driver - test case 2 (part-time sole practice)', () => {
  const r = A.profitDriver({ L: 0, BR: 500, CH: 726, R: 90, M: 70 });
  assert.equal(Math.round(r.nppp), 228690);
  assert.equal(r.band, 'Average on all five drivers');
});

test('8.2 cost of production', () => {
  const r = A.costOfProduction({ salary: 120000, onCosts: 25, overhead: 60000, chargeableHours: 1100, targetMargin: 35 });
  assert.equal(r.annualCost, 210000);
  assert.equal(A.money2(r.costPerHour), '$190.91');
  assert.equal(A.money2(r.feeAtMargin), '$293.71');
});

test('8.3 fixed fee three routes', () => {
  const r = A.fixedFeeRoutes({ P: 30000, BR: 350, H: 1000, c: 60, m: 30, hoursPerDay: 8 });
  assert.equal(A.num(r.route1.billedHours), '85.7');
  assert.equal(A.num(r.route1.workedHours), '142.9');
  assert.equal(A.num(r.route1.days), '17.9');
  assert.equal(r.route2.extraRevenue, 100000);
  assert.equal(A.num(r.route2.billedHours), '285.7');
  assert.equal(A.num(r.route2.workedHours), '476.2');
  assert.equal(A.num(r.route2.days), '59.5');
  assert.equal(r.route3.newRate, 380);
  assert.equal(A.num(r.route3.pctIncrease), '8.6');
});

test('8.4 WIP and debtor days flags', () => {
  const r = A.wipDebtorDays({ wip: 100000, debtors: 250000, annualFees: 800000 });
  close(r.wipDays, 45.625, 0.001);
  assert.equal(r.wipWarning, 'The guide recommends WIP below 40 days of production equivalent');
  assert.equal(r.debtorWarning, '90-plus is unacceptable unless there is a business rationale');
  const ok = A.wipDebtorDays({ wip: 50000, debtors: 100000, annualFees: 800000 });
  assert.equal(ok.wipWarning, null);
  assert.equal(ok.debtorWarning, null);
});

test('8.5 partner dilution', () => {
  const r = A.partnerDilution({ profit: 500000, owners: 2, salaryAddedBack: 100000, newOwners: 1 });
  assert.equal(r.before, 250000);
  assert.equal(r.after, 200000);
  assert.equal(r.change, -50000);
});

test('8.6 lockstep', () => {
  const r = A.lockstep(A.LOCKSTEP_DEFAULTS);
  assert.equal(r.totalPoints, 250);
  assert.equal(r.valuePerPoint, 2000);
  assert.equal(r.distribution[2].amount, 100000);
  assert.equal(r.distribution[0].amount, 200000);
  assert.equal(r.nextTotalPoints, 260);
  assert.equal(r.profitNeeded, 520000);
  assert.equal(r.growthRequired, 20000);
});

test('8.7 statutory deposit worked example', () => {
  const r = A.statutoryDeposit({ periodEnd: '2026-06-30', lowPrev: 23600, sdPrev: 50000, lowFwd: 7600, sdFwd: 50000, sdNow: 50000 });
  assert.equal(r.base, 73600);
  assert.equal(r.fwd, 57600);
  close(r.candidate, 46080, 0.0001);
  assert.equal(r.required, 46100);
  assert.equal(r.action, -3900);
  assert.equal(r.actionText, 'No deposit required; $3,900 may be withdrawn');
  assert.equal(r.deadline, '2026-07-28'); // 20 weekdays after Tue 30 June 2026
  const below = A.statutoryDeposit({ periodEnd: '2026-03-31', lowPrev: 4000, sdPrev: 0, lowFwd: '', sdFwd: '', sdNow: 0 });
  assert.equal(below.required, 0);
  assert.equal(below.actionText, 'No action required');
  const dep = A.statutoryDeposit({ periodEnd: '2026-03-31', lowPrev: 30010, sdPrev: 0, lowFwd: '', sdFwd: '', sdNow: 0 });
  assert.equal(dep.required, 30100);
  assert.equal(dep.actionText, 'Deposit $30,100');
});

test('8.8 rule 42 method selector', () => {
  assert.deepEqual(A.rule42Method({ inTrustAccount: false }), { method: null, notApplicable: true });
  assert.equal(A.rule42Method({ inTrustAccount: true, commercialClient: true }).method, 4);
  assert.equal(A.rule42Method({ inTrustAccount: true, commercialClient: false, reimbursement: true }).method, 3);
  assert.equal(A.rule42Method({ inTrustAccount: true, commercialClient: false, reimbursement: false, instructions: true }).method, 2);
  assert.equal(A.rule42Method({ inTrustAccount: true, commercialClient: false, reimbursement: false, instructions: false }).method, 1);
  // 7 business days (weekdays) after Fri 11 Sep 2026 = Tue 22 Sep 2026
  assert.equal(A.method1EarliestWithdrawal('2026-09-11'), '2026-09-22');
});

test('weekday arithmetic', () => {
  assert.equal(A.addWeekdays('2026-09-12', 7), '2026-09-22'); // Sat 12 Sep -> Tue 22 Sep
  assert.equal(A.addWeekdays('2026-06-30', 20), '2026-07-28');
});

test('8.11 supervision level', () => {
  assert.equal(A.supervisionLevel({ ability: 'low', confidence: 'low' }), 'M1');
  assert.equal(A.supervisionLevel({ ability: 'low', confidence: 'high' }), 'M2');
  assert.equal(A.supervisionLevel({ ability: 'high', confidence: 'low' }), 'M3');
  assert.equal(A.supervisionLevel({ ability: 'high', confidence: 'high' }), 'M4');
});

test('8.12 PII excess', () => {
  assert.deepEqual(A.piiExcess({ excess: 5000 }), { standard: 5000, unverified: 10000 });
});
