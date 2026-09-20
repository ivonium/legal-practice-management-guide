// Calculator formulas - Sheet A section 8. Exact arithmetic; unit-tested against
// the worked examples in the specification.

// 8.1 Profit Driver: NPPP = (1 + L) × BR × CH × R × M
export function profitDriver({ L, BR, CH, R, M }) {
  const nppp = (1 + L) * BR * CH * (R / 100) * (M / 100);
  let band;
  if (nppp < 350000) band = 'Average on all five drivers';
  else if (nppp <= 700000) band = 'Very good on two drivers, one being leverage or price';
  else band = 'Very good on two, average on the rest, plus a homogeneous culture';
  return { nppp, takeHomeLow: nppp * 0.5, takeHomeHigh: nppp * 0.7, band };
}
export const PROFIT_DRIVER_DEFAULTS = { L: 2.5, BR: 350, CH: 1100, R: 85, M: 35 };

// 8.2 Cost of Production
export function costOfProduction({ salary, onCosts, overhead, chargeableHours, targetMargin }) {
  const annualCost = salary * (1 + onCosts / 100) + overhead;
  const costPerHour = chargeableHours > 0 ? annualCost / chargeableHours : NaN;
  const feeAtMargin = targetMargin < 100 ? costPerHour / (1 - targetMargin / 100) : NaN;
  return { annualCost, costPerHour, feeAtMargin };
}
export const COST_OF_PRODUCTION_DEFAULTS = { salary: 120000, onCosts: 25, overhead: 60000, chargeableHours: 1100, targetMargin: 35 };

// 8.3 Fixed fee: three routes to extra profit
export function fixedFeeRoutes({ P, BR, H, c, m, hoursPerDay }) {
  const r1Billed = P / BR;
  const r1Worked = r1Billed / (c / 100);
  const r1Days = r1Worked / hoursPerDay;
  const r2Revenue = P / (m / 100);
  const r2Billed = r2Revenue / BR;
  const r2Worked = r2Billed / (c / 100);
  const r2Days = r2Worked / hoursPerDay;
  const newRate = BR + P / H;
  const pctIncrease = (newRate / BR - 1) * 100;
  return { route1: { billedHours: r1Billed, workedHours: r1Worked, days: r1Days }, route2: { extraRevenue: r2Revenue, billedHours: r2Billed, workedHours: r2Worked, days: r2Days }, route3: { newRate, pctIncrease } };
}
export const FIXED_FEE_DEFAULTS = { P: 30000, BR: 350, H: 1000, c: 60, m: 30, hoursPerDay: 8 };

// 8.4 WIP and debtor days
export function wipDebtorDays({ wip, debtors, annualFees }) {
  const perDay = annualFees / 365;
  const wipDays = perDay > 0 ? wip / perDay : NaN;
  const debtorDays = perDay > 0 ? debtors / perDay : NaN;
  return {
    wipDays,
    debtorDays,
    wipWarning: wipDays > 40 ? 'The guide recommends WIP below 40 days of production equivalent' : null,
    debtorWarning: debtorDays > 90 ? '90-plus is unacceptable unless there is a business rationale' : null,
  };
}
export const WIP_DEBTOR_DEFAULTS = { wip: 100000, debtors: 120000, annualFees: 800000 };

// 8.5 Partner dilution
export function partnerDilution({ profit, owners, salaryAddedBack, newOwners }) {
  const before = owners > 0 ? profit / owners : NaN;
  const after = owners + newOwners > 0 ? (profit + salaryAddedBack) / (owners + newOwners) : NaN;
  return { before, after, change: after - before };
}
export const DILUTION_DEFAULTS = { profit: 500000, owners: 2, salaryAddedBack: 100000, newOwners: 1 };

// 8.6 Lockstep points
export function lockstep({ profit, partners }) {
  const totalPoints = partners.reduce((s, p) => s + Number(p.points || 0), 0);
  const valuePerPoint = totalPoints > 0 ? profit / totalPoints : NaN;
  const distribution = partners.map((p) => ({ name: p.name, points: Number(p.points || 0), nextPoints: Number(p.nextPoints || 0), amount: Number(p.points || 0) * valuePerPoint }));
  const nextTotalPoints = partners.reduce((s, p) => s + Number(p.nextPoints || 0), 0);
  const profitNeeded = nextTotalPoints * valuePerPoint;
  const growthRequired = profitNeeded - profit;
  return { totalPoints, valuePerPoint, distribution, nextTotalPoints, profitNeeded, growthRequired };
}
export const LOCKSTEP_DEFAULTS = {
  profit: 500000,
  partners: [
    { name: 'Partner A', points: 100, nextPoints: 100 },
    { name: 'Partner B', points: 100, nextPoints: 100 },
    { name: 'New partner', points: 50, nextPoints: 60 },
  ],
};

// 8.7 Statutory deposit
export const PERIOD_ENDS = [
  { month: 3, day: 31 },
  { month: 6, day: 30 },
  { month: 9, day: 30 },
  { month: 12, day: 31 },
];
export function isApplicablePeriodEnd(iso) {
  const p = parseIso(iso);
  if (!p) return false;
  return PERIOD_ENDS.some((e) => e.month === p.m && e.day === p.d);
}
export function statutoryDeposit({ periodEnd, lowPrev, sdPrev, lowFwd, sdFwd, sdNow }) {
  const base = lowPrev + sdPrev;
  const fwdProvided = lowFwd !== null && lowFwd !== undefined && lowFwd !== '' && !Number.isNaN(Number(lowFwd));
  const fwd = fwdProvided ? Number(lowFwd) + Number(sdFwd || 0) : null;
  let candidate = base;
  let usedLookForward = false;
  if (fwdProvided && fwd < base) {
    candidate = 0.8 * fwd;
    usedLookForward = true;
  }
  let required;
  if (candidate < 10000) required = 0;
  else required = Math.ceil(candidate / 100) * 100;
  const action = required - sdNow;
  const deadline = periodEnd && isApplicablePeriodEnd(periodEnd) ? addWeekdays(periodEnd, 20) : null;
  let actionText;
  if (action > 0) actionText = `Deposit ${money0(action)}`;
  else if (action < 0) actionText = `No deposit required; ${money0(-action)} may be withdrawn`;
  else actionText = 'No action required';
  return { base, fwd, candidate, usedLookForward, required, action, actionText, deadline };
}
export const STATUTORY_DEPOSIT_DEFAULTS = { scenario: 'continuing-with-deposit', periodEnd: '', lowPrev: 23600, sdPrev: 50000, lowFwd: 7600, sdFwd: 50000, sdNow: 50000 };

// 8.8 Rule 42 method selector (decision flow, not arithmetic)
export function rule42Method(a) {
  // a: { inTrustAccount, commercialClient, reimbursement, instructions }
  if (a.inTrustAccount === false) return { method: null, notApplicable: true };
  if (a.commercialClient === true) return { method: 4 };
  if (a.reimbursement === true) return { method: 3 };
  if (a.instructions === true) return { method: 2 };
  if (a.inTrustAccount === true && a.commercialClient === false && a.reimbursement === false && a.instructions === false) return { method: 1 };
  return { method: null, pending: true };
}
export function method1EarliestWithdrawal(billDateIso) {
  return billDateIso ? addWeekdays(billDateIso, 7) : null;
}

// 8.11 Supervision level selector
export function supervisionLevel({ ability, confidence }) {
  if (ability === 'low' && confidence === 'low') return 'M1';
  if (ability === 'low' && confidence === 'high') return 'M2';
  if (ability === 'high' && confidence === 'low') return 'M3';
  return 'M4';
}

// 8.12 PII excess exposure
export function piiExcess({ excess }) {
  return { standard: excess, unverified: excess * 2 };
}
export const PII_EXCESS_DEFAULTS = { excess: 5000 };
