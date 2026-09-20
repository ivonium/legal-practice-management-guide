// Calculators - Sheet A section 8. Each calculator is a self-contained component
// rendered at a specified anchor with a static print rendering. Inputs persist in
// overlay.calculators[id]. Formulas live in formulas.js / walkthrough.js.

// ---------------------------------------------------------------------------
// State and generic helpers
// ---------------------------------------------------------------------------
export function calcState(id, defaults) {
  const saved = (Layout.overlay.calculators || {})[id] || {};
  return { ...JSON.parse(JSON.stringify(defaults)), ...JSON.parse(JSON.stringify(saved)) };
}
export function setCalcState(id, patch) {
  App.store.update((o) => {
    o.calculators[id] = { ...(o.calculators[id] || {}), ...patch };
  });
}
export function resetCalcState(id) {
  App.store.update((o) => {
    delete o.calculators[id];
  });
}

function fieldHtml(name, label, value, opts = {}) {
  const attrs = ['min', 'max', 'step'].filter((k) => opts[k] !== undefined).map((k) => `${k}="${opts[k]}"`).join(' ');
  const type = opts.type || 'number';
  return `<label class="calc-field"><span class="calc-label">${escapeHtml(label)}</span><input type="${type}" name="${escapeAttr(name)}" value="${escapeAttr(value ?? '')}" ${attrs} ${opts.required ? 'required' : ''} ${opts.placeholder ? `placeholder="${escapeAttr(opts.placeholder)}"` : ''} inputmode="${type === 'number' ? 'decimal' : 'text'}"></label>`;
}
function selectHtml(name, label, value, options) {
  return `<label class="calc-field"><span class="calc-label">${escapeHtml(label)}</span><select name="${escapeAttr(name)}">${options.map((o) => `<option value="${escapeAttr(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select></label>`;
}
function outRow(label, value, cls = '') {
  return `<tr class="${cls}"><th scope="row">${escapeHtml(label)}</th><td class="calc-value">${value}</td></tr>`;
}
function outTable(rows) {
  return `<table class="calc-out-table">${rows.join('')}</table>`;
}
function formulaHtml(text) {
  return `<details class="calc-formula"><summary>Show formula</summary><pre>${escapeHtml(text)}</pre></details>`;
}
function frameHtml(def, inputsHtml, outputsHtml, extra = '') {
  return (
    `<div class="calculator-inner"><div class="calculator-head"><h3 class="calculator-title">${escapeHtml(def.title)}</h3><button type="button" class="btn btn--small calc-reset">Reset to defaults</button></div>` +
    `<form class="calculator-form" autocomplete="off">${inputsHtml}</form>` +
    `<div class="calculator-output" aria-live="polite">${outputsHtml}</div>${extra}${formulaHtml(def.formula)}</div>`
  );
}
function readForm(form) {
  const out = {};
  for (const inp of form.querySelectorAll('input, select, textarea')) {
    if (!inp.name) continue;
    if (inp.type === 'checkbox') out[inp.name] = inp.checked;
    else if (inp.type === 'radio') {
      if (inp.checked) out[inp.name] = inp.value;
    } else if (inp.type === 'number') out[inp.name] = inp.value === '' ? '' : toNumber(inp.value);
    else out[inp.name] = inp.value;
  }
  return out;
}
function printTable(title, inputs, outputs, formula) {
  return (
    `<div class="calculator-static"><h4 class="calculator-title">${escapeHtml(title)}</h4>` +
    `<table class="calc-print-table"><thead><tr><th colspan="2">Inputs</th></tr></thead><tbody>${inputs.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`).join('')}</tbody>` +
    `<thead><tr><th colspan="2">Outputs</th></tr></thead><tbody>${outputs.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${v}</td></tr>`).join('')}</tbody></table>` +
    `<div class="calc-formula-static"><strong>Formula</strong><pre>${escapeHtml(formula)}</pre></div></div>`
  );
}

// Guide table access (verbatim by construction)
export function guideBlocks(sectionId, type) {
  return Layout.originalSectionBlocks(sectionId).filter((n) => n.kind === 'block' && (!type || n.type === type));
}
export function tableRows(node) {
  const tpl = document.createElement('template');
  tpl.innerHTML = node.html;
  const rows = [];
  tpl.content.querySelectorAll('tr').forEach((tr) => rows.push(Array.from(tr.children).map((c) => c.innerHTML)));
  return rows;
}
function rowTableHtml(headers, rows) {
  return `<div class="table-wrap"><table>${headers ? `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// Generic numeric calculator factory
function simpleCalc(def) {
  return {
    ...def,
    position: def.position || 'end',
    mount(container) {
      const render = () => {
        const s = calcState(def.id, def.defaults);
        const r = def.compute(s);
        container.innerHTML = frameHtml(def, def.inputs.map((f) => (f.type === 'select' ? selectHtml(f.name, f.label, s[f.name], f.options) : fieldHtml(f.name, f.label, s[f.name], f))).join(''), def.outputs(r, s));
        const form = container.querySelector('form');
        form.addEventListener('input', () => {
          const v = readForm(form);
          setCalcState(def.id, v);
          container.querySelector('.calculator-output').innerHTML = def.outputs(def.compute(calcState(def.id, def.defaults)), calcState(def.id, def.defaults));
        });
        form.addEventListener('submit', (e) => e.preventDefault());
        container.querySelector('.calc-reset').addEventListener('click', () => {
          resetCalcState(def.id);
          render();
        });
      };
      render();
    },
    print() {
      const s = calcState(def.id, def.defaults);
      const r = def.compute(s);
      return printTable(def.title, def.inputs.map((f) => [f.label, f.type === 'select' ? (f.options.find((o) => String(o.value) === String(s[f.name])) || {}).label : s[f.name]]), def.printOutputs(r, s), def.formula);
    },
  };
}

// ---------------------------------------------------------------------------
// 8.1 Profit Driver Calculator
// ---------------------------------------------------------------------------
const profitDriverDef = {
  id: 'profit-driver',
  title: 'Profit Driver Calculator',
  section: 'practice-management--s1-3',
  formula: 'NPPP = (1 + L) × BR × CH × R × M',
  defaults: { ...PROFIT_DRIVER_DEFAULTS, scenarios: [] },
  inputs: [
    { name: 'L', label: 'Leverage (employed fee earners per equity principal)', min: 0, max: 10, step: 0.1 },
    { name: 'BR', label: 'Weighted average billing rate ($/hour)', min: 50, max: 2000, step: 1 },
    { name: 'CH', label: 'Weighted average chargeable hours per fee earner per year', min: 200, max: 2500, step: 1 },
    { name: 'R', label: 'Realisation (%)', min: 0, max: 100, step: 1 },
    { name: 'M', label: 'Profit margin (%)', min: 0, max: 100, step: 1 },
  ],
  compute: (s) => profitDriver({ L: toNumber(s.L), BR: toNumber(s.BR), CH: toNumber(s.CH), R: toNumber(s.R), M: toNumber(s.M) }),
  outputs: (r, s) =>
    outTable([outRow('Net profit per principal (NPPP)', `<strong>${money0(r.nppp)}</strong>`, 'calc-primary'), outRow('Likely spendable range (50% to 70%)', `${money0(r.takeHomeLow)} to ${money0(r.takeHomeHigh)}`), outRow('Performance band', escapeHtml(r.band))]) +
    scenarioTableHtml(s),
  printOutputs: (r, s) => [
    ['Net profit per principal (NPPP)', money0(r.nppp)],
    ['Likely spendable range (50% to 70%)', `${money0(r.takeHomeLow)} to ${money0(r.takeHomeHigh)}`],
    ['Performance band', escapeHtml(r.band)],
    ...((s.scenarios || []).length ? [['Saved scenarios', scenarioTableHtml(s, true)]] : []),
  ],
};
function scenarioTableHtml(s, forPrint = false) {
  const sc = s.scenarios || [];
  const cols = sc.map((x) => ({ ...x, r: profitDriver({ L: toNumber(x.L), BR: toNumber(x.BR), CH: toNumber(x.CH), R: toNumber(x.R), M: toNumber(x.M) }) }));
  const head = `<tr><th>Scenario</th>${cols.map((c) => `<th>${escapeHtml(c.name)}${forPrint ? '' : ` <button type="button" class="btn-link scenario-del" data-name="${escapeAttr(c.name)}" aria-label="Delete scenario">×</button>`}</th>`).join('')}</tr>`;
  const line = (label, f) => `<tr><th scope="row">${label}</th>${cols.map((c) => `<td>${f(c)}</td>`).join('')}</tr>`;
  const table = cols.length
    ? `<div class="table-wrap"><table class="scenario-table">${head}${line('L', (c) => c.L)}${line('BR', (c) => money0(c.BR))}${line('CH', (c) => c.CH)}${line('R %', (c) => c.R)}${line('M %', (c) => c.M)}${line('NPPP', (c) => `<strong>${money0(c.r.nppp)}</strong>`)}${line('Spendable 50% to 70%', (c) => `${money0(c.r.takeHomeLow)} to ${money0(c.r.takeHomeHigh)}`)}${line('Band', (c) => escapeHtml(c.r.band))}</table></div>`
    : forPrint
      ? ''
      : '<p class="muted">No saved scenarios.</p>';
  if (forPrint) return table;
  return `<div class="scenarios"><h4>Scenarios <span class="muted">(up to five, side by side)</span></h4>${table}<button type="button" class="btn btn--small scenario-save"${sc.length >= 5 ? ' disabled' : ''}>Save current inputs as a scenario</button></div>`;
}
const profitDriverCalc = simpleCalc(profitDriverDef);
const baseMountPD = profitDriverCalc.mount;
profitDriverCalc.mount = function (container) {
  baseMountPD.call(this, container);
  container.addEventListener('click', (e) => {
    const save = e.target.closest('.scenario-save');
    const del = e.target.closest('.scenario-del');
    if (save) {
      const name = prompt('Scenario name');
      if (!name) return;
      const s = calcState(this.id, this.defaults);
      const scenarios = (s.scenarios || []).filter((x) => x.name !== name).slice(0, 4);
      scenarios.push({ name, L: s.L, BR: s.BR, CH: s.CH, R: s.R, M: s.M });
      setCalcState(this.id, { scenarios });
      container.querySelector('.calculator-output').innerHTML = this.outputs(this.compute(calcState(this.id, this.defaults)), calcState(this.id, this.defaults));
    } else if (del) {
      const s = calcState(this.id, this.defaults);
      setCalcState(this.id, { scenarios: (s.scenarios || []).filter((x) => x.name !== del.dataset.name) });
      container.querySelector('.calculator-output').innerHTML = this.outputs(this.compute(calcState(this.id, this.defaults)), calcState(this.id, this.defaults));
    }
  });
};

// ---------------------------------------------------------------------------
// 8.2 Cost of Production
// ---------------------------------------------------------------------------
const costOfProductionCalc = simpleCalc({
  id: 'cost-of-production',
  title: 'Cost of Production Calculator',
  section: 'practice-management--s4-4',
  formula: 'AnnualCost = Salary × (1 + OnCosts/100) + OverheadAllocation\nCostPerChargeableHour = AnnualCost / ChargeableHours\nFeeAtTargetMargin = CostPerChargeableHour / (1 - TargetMargin/100)',
  defaults: COST_OF_PRODUCTION_DEFAULTS,
  inputs: [
    { name: 'salary', label: 'Salary', min: 0, step: 1000 },
    { name: 'onCosts', label: 'On-costs (%) - super, leave, insurance', min: 0, max: 100, step: 1 },
    { name: 'overhead', label: 'Overhead allocation per fee earner ($)', min: 0, step: 1000 },
    { name: 'chargeableHours', label: 'Chargeable hours per year', min: 1, step: 1 },
    { name: 'targetMargin', label: 'Target margin (%)', min: 0, max: 99, step: 1 },
  ],
  compute: (s) => costOfProduction({ salary: toNumber(s.salary), onCosts: toNumber(s.onCosts), overhead: toNumber(s.overhead), chargeableHours: toNumber(s.chargeableHours), targetMargin: toNumber(s.targetMargin) }),
  outputs: (r) => outTable([outRow('Annual cost', money0(r.annualCost)), outRow('Cost per chargeable hour', `<strong>${money2(r.costPerHour)}</strong>/hr`, 'calc-primary'), outRow('Fee per hour required at target margin', `<strong>${money2(r.feeAtMargin)}</strong>/hr`, 'calc-primary')]) + `<p class="calc-message">To operate with a profit motive you cannot do work for less than cost of production.</p>`,
  printOutputs: (r) => [
    ['Annual cost', money0(r.annualCost)],
    ['Cost per chargeable hour', money2(r.costPerHour) + '/hr'],
    ['Fee per hour required at target margin', money2(r.feeAtMargin) + '/hr'],
    ['Message', 'To operate with a profit motive you cannot do work for less than cost of production.'],
  ],
});

// ---------------------------------------------------------------------------
// 8.3 Fixed Fee: Three Routes to Extra Profit
// ---------------------------------------------------------------------------
const fixedFeeCalc = simpleCalc({
  id: 'fixed-fee-routes',
  title: 'Fixed Fee: Three Routes to Extra Profit',
  section: 'practice-management--s3-1',
  formula: 'Route 1 (work harder):\n  ExtraBilledHours  = P / BR\n  ExtraWorkedHours  = ExtraBilledHours / (c/100)\n  ExtraDays         = ExtraWorkedHours / HoursPerDay\n\nRoute 2 (add resources):\n  ExtraRevenue      = P / (m/100)\n  ExtraBilledHours  = ExtraRevenue / BR\n  ExtraWorkedHours  = ExtraBilledHours / (c/100)\n  ExtraDays         = ExtraWorkedHours / HoursPerDay\n\nRoute 3 (raise price):\n  NewRate           = BR + P / H\n  PercentIncrease   = (NewRate / BR - 1) × 100',
  defaults: FIXED_FEE_DEFAULTS,
  inputs: [
    { name: 'P', label: 'Extra profit wanted (P)', min: 0, step: 1000 },
    { name: 'BR', label: 'Current hourly rate (BR)', min: 1, step: 1 },
    { name: 'H', label: 'Billed hours per year (H)', min: 1, step: 1 },
    { name: 'c', label: 'Chargeable proportion of worked time (c, %)', min: 1, max: 100, step: 1 },
    { name: 'm', label: 'Margin on additional revenue (m, %)', min: 1, max: 100, step: 1 },
    { name: 'hoursPerDay', label: 'Hours per working day', min: 1, max: 24, step: 0.5 },
  ],
  compute: (s) => fixedFeeRoutes({ P: toNumber(s.P), BR: toNumber(s.BR), H: toNumber(s.H), c: toNumber(s.c), m: toNumber(s.m), hoursPerDay: toNumber(s.hoursPerDay) }),
  outputs: (r) =>
    `<div class="table-wrap"><table class="calc-out-table"><thead><tr><th>Route</th><th>What it takes</th></tr></thead><tbody>` +
    `<tr><th scope="row">Work harder</th><td>${num(r.route1.billedHours)} billed hours → ${num(r.route1.workedHours)} worked hours → <strong>${num(r.route1.days)} days</strong></td></tr>` +
    `<tr><th scope="row">Add resources</th><td>${money0(r.route2.extraRevenue)} extra revenue → ${num(r.route2.billedHours)} billed hours → ${num(r.route2.workedHours)} worked hours → <strong>${num(r.route2.days)} days</strong></td></tr>` +
    `<tr><th scope="row">Raise price</th><td><strong>${money0(r.route3.newRate)}/hr, ${num(r.route3.pctIncrease)}%</strong> increase</td></tr></tbody></table></div>`,
  printOutputs: (r) => [
    ['Work harder', `${num(r.route1.billedHours)} billed hours, ${num(r.route1.workedHours)} worked hours, ${num(r.route1.days)} days`],
    ['Add resources', `${money0(r.route2.extraRevenue)} extra revenue, ${num(r.route2.billedHours)} billed hours, ${num(r.route2.workedHours)} worked hours, ${num(r.route2.days)} days`],
    ['Raise price', `${money0(r.route3.newRate)}/hr, ${num(r.route3.pctIncrease)}%`],
  ],
});

// ---------------------------------------------------------------------------
// 8.4 WIP and Debtor Days
// ---------------------------------------------------------------------------
const wipCalc = simpleCalc({
  id: 'wip-debtor-days',
  title: 'WIP and Debtor Days',
  section: 'practice-management--s2-5',
  formula: 'WIPDays     = WIP / (AnnualFees / 365)\nDebtorDays  = Debtors / (AnnualFees / 365)',
  defaults: WIP_DEBTOR_DEFAULTS,
  inputs: [
    { name: 'wip', label: 'WIP balance ($)', min: 0, step: 1000 },
    { name: 'debtors', label: 'Debtors balance ($)', min: 0, step: 1000 },
    { name: 'annualFees', label: 'Annual fees ($)', min: 1, step: 1000 },
  ],
  compute: (s) => wipDebtorDays({ wip: toNumber(s.wip), debtors: toNumber(s.debtors), annualFees: toNumber(s.annualFees) }),
  outputs: (r) =>
    outTable([outRow('WIP days', `<strong>${num(r.wipDays)}</strong>`, 'calc-primary'), outRow('Debtor days', `<strong>${num(r.debtorDays)}</strong>`, 'calc-primary')]) +
    (r.wipWarning ? `<div class="callout callout--warning">${escapeHtml(r.wipWarning)}</div>` : '') +
    (r.debtorWarning ? `<div class="callout callout--warning">${escapeHtml(r.debtorWarning)}</div>` : ''),
  printOutputs: (r) => [
    ['WIP days', num(r.wipDays)],
    ['Debtor days', num(r.debtorDays)],
    ...(r.wipWarning ? [['Warning', escapeHtml(r.wipWarning)]] : []),
    ...(r.debtorWarning ? [['Warning', escapeHtml(r.debtorWarning)]] : []),
  ],
});

// ---------------------------------------------------------------------------
// 8.5 Partner Dilution Model
// ---------------------------------------------------------------------------
const dilutionCalc = simpleCalc({
  id: 'partner-dilution',
  title: 'Partner Dilution Model',
  section: 'partnership-management--s4',
  formula: 'Before:  PPP_before = Profit / Owners\nAfter:   PPP_after  = (Profit + AssociateSalaryAddedBack) / (Owners + NewOwners)\nChange   = PPP_after - PPP_before',
  defaults: DILUTION_DEFAULTS,
  inputs: [
    { name: 'profit', label: 'Firm profit ($)', min: 0, step: 10000 },
    { name: 'owners', label: 'Owners', min: 1, step: 1 },
    { name: 'salaryAddedBack', label: "Associate's salary added back ($)", min: 0, step: 5000 },
    { name: 'newOwners', label: 'New owners', min: 0, step: 1 },
  ],
  compute: (s) => partnerDilution({ profit: toNumber(s.profit), owners: toNumber(s.owners), salaryAddedBack: toNumber(s.salaryAddedBack), newOwners: toNumber(s.newOwners) }),
  outputs: (r) => outTable([outRow('Profit per principal before', money0(r.before)), outRow('Profit per principal after', money0(r.after)), outRow('Change', `<strong>${r.change < 0 ? '-' : ''}${money0(Math.abs(r.change))}</strong>`, 'calc-primary')]),
  printOutputs: (r) => [
    ['Profit per principal before', money0(r.before)],
    ['Profit per principal after', money0(r.after)],
    ['Change', `${r.change < 0 ? '-' : ''}${money0(Math.abs(r.change))}`],
  ],
});

// ---------------------------------------------------------------------------
// 8.6 Lockstep Points Calculator
// ---------------------------------------------------------------------------
const lockstepCalc = {
  id: 'lockstep-points',
  title: 'Lockstep Points Calculator',
  section: 'partnership-management--s5-3',
  position: 'end',
  formula: 'TotalPoints      = Σ points\nValuePerPoint    = Profit / TotalPoints\nDistribution_i   = points_i × ValuePerPoint\nNextTotalPoints  = Σ nextYearPoints\nProfitNeeded     = NextTotalPoints × ValuePerPoint\nGrowthRequired   = ProfitNeeded - Profit',
  defaults: LOCKSTEP_DEFAULTS,
  compute(s) {
    return lockstep({ profit: toNumber(s.profit), partners: s.partners });
  },
  outputs(r) {
    return (
      `<div class="table-wrap"><table class="calc-out-table"><thead><tr><th>Partner</th><th>Points</th><th>Distribution</th><th>Next-year points</th></tr></thead><tbody>${r.distribution.map((d) => `<tr><td>${escapeHtml(d.name)}</td><td>${d.points}</td><td>${money0(d.amount)}</td><td>${d.nextPoints}</td></tr>`).join('')}</tbody></table></div>` +
      outTable([outRow('Total points', r.totalPoints), outRow('Value per point', `<strong>${money0(r.valuePerPoint)}</strong>`, 'calc-primary'), outRow('Next-year total points', r.nextTotalPoints), outRow('Profit needed to hold the point value', money0(r.profitNeeded)), outRow('Growth required', `<strong>${money0(r.growthRequired)}</strong>`, 'calc-primary')])
    );
  },
  mount(container) {
    const render = () => {
      const s = calcState(this.id, this.defaults);
      const rows = s.partners
        .map((p, i) => `<tr><td><input type="text" name="name-${i}" value="${escapeAttr(p.name)}" aria-label="Partner name"></td><td><input type="number" name="points-${i}" min="0" step="1" value="${escapeAttr(p.points)}" aria-label="Points"></td><td><input type="number" name="next-${i}" min="0" step="1" value="${escapeAttr(p.nextPoints)}" aria-label="Next-year points"></td><td><button type="button" class="btn-link partner-del" data-i="${i}" aria-label="Remove partner">remove</button></td></tr>`)
        .join('');
      container.innerHTML = frameHtml(
        this,
        fieldHtml('profit', 'Firm profit ($)', s.profit, { min: 0, step: 10000 }) + `<div class="table-wrap"><table class="calc-in-table"><thead><tr><th>Partner</th><th>Points</th><th>Next-year points</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><button type="button" class="btn btn--small partner-add">Add partner</button>`,
        this.outputs(this.compute(s)),
      );
      const form = container.querySelector('form');
      const sync = () => {
        const v = readForm(form);
        const partners = s.partners.map((p, i) => ({ name: v[`name-${i}`] ?? p.name, points: toNumber(v[`points-${i}`]), nextPoints: toNumber(v[`next-${i}`]) }));
        setCalcState(this.id, { profit: v.profit, partners });
        container.querySelector('.calculator-output').innerHTML = this.outputs(this.compute(calcState(this.id, this.defaults)));
      };
      form.addEventListener('input', sync);
      form.addEventListener('submit', (e) => e.preventDefault());
      form.querySelector('.partner-add').addEventListener('click', () => {
        const cur = calcState(this.id, this.defaults);
        cur.partners.push({ name: `Partner ${String.fromCharCode(65 + cur.partners.length)}`, points: 50, nextPoints: 60 });
        setCalcState(this.id, { partners: cur.partners });
        render();
      });
      form.querySelectorAll('.partner-del').forEach((b) =>
        b.addEventListener('click', () => {
          const cur = calcState(this.id, this.defaults);
          cur.partners.splice(Number(b.dataset.i), 1);
          setCalcState(this.id, { partners: cur.partners });
          render();
        }),
      );
      container.querySelector('.calc-reset').addEventListener('click', () => {
        resetCalcState(this.id);
        render();
      });
    };
    render();
  },
  print() {
    const s = calcState(this.id, this.defaults);
    const r = this.compute(s);
    return printTable(this.title, [['Firm profit', money0(toNumber(s.profit))], ...s.partners.map((p) => [p.name, `${p.points} points (next year ${p.nextPoints})`])], [['Total points', r.totalPoints], ['Value per point', money0(r.valuePerPoint)], ...r.distribution.map((d) => [d.name + ' receives', money0(d.amount)]), ['Next-year total points', r.nextTotalPoints], ['Profit needed', money0(r.profitNeeded)], ['Growth required', money0(r.growthRequired)]], this.formula);
  },
};

// ---------------------------------------------------------------------------
// 8.7 Statutory Deposit Calculator
// ---------------------------------------------------------------------------
const STAT_DEP_WARNING = 'This calculator reflects the methodology described in the guide. The Application Regulation was remade on 1 September 2025 (ss 10 to 15). Verify against the Law Society of NSW Statutory Deposit Calculator before acting. Banking-day deadlines shown here count weekdays only and do not allow for public holidays.';
const statDepCalc = {
  id: 'statutory-deposit',
  title: 'Statutory Deposit Calculator',
  section: 'trust-accounting--s13-4',
  position: 'end',
  formula: 'Base          = LowPrev + SDPrev\nFwd           = LowFwd + SDFwd                    (if provided)\nCandidate     = Base\nif Fwd provided and Fwd < Base:  Candidate = 0.80 × Fwd\nif Candidate < 10000:            Required = 0\nelse:                            Required = ceil(Candidate / 100) × 100\nAction        = Required - SDNow   (positive: deposit; negative: may withdraw; zero: no action)\nDeadline      = 20 banking days (weekdays) after period end date',
  defaults: STATUTORY_DEPOSIT_DEFAULTS,
  scenarios: [
    { value: 'new-account', label: 'New account (no statutory deposit yet)' },
    { value: 'continuing-no-deposit', label: 'Continuing account, no statutory deposit held' },
    { value: 'continuing-with-deposit', label: 'Continuing account with a statutory deposit held' },
  ],
  effective(s) {
    const sc = s.scenario;
    const hideSd = sc === 'new-account' || sc === 'continuing-no-deposit';
    return {
      periodEnd: s.periodEnd || '',
      lowPrev: toNumber(s.lowPrev),
      sdPrev: hideSd ? 0 : toNumber(s.sdPrev),
      lowFwd: s.lowFwd === '' || s.lowFwd === null || s.lowFwd === undefined ? '' : toNumber(s.lowFwd),
      sdFwd: hideSd ? 0 : toNumber(s.sdFwd),
      sdNow: hideSd ? 0 : toNumber(s.sdNow),
      hideSd,
    };
  },
  compute(s) {
    const e = this.effective(s);
    return { ...statutoryDeposit(e), periodValid: !e.periodEnd || isApplicablePeriodEnd(e.periodEnd), e };
  },
  outputs(r) {
    return (
      (r.e.periodEnd && !r.periodValid ? '<div class="callout callout--warning">The applicable period end must be 31 March, 30 June, 30 September or 31 December.</div>' : '') +
      outTable([
        outRow('Base amount (LowPrev + SDPrev)', money0(r.base)),
        outRow('Look-forward sum (LowFwd + SDFwd)', r.fwd === null ? '<span class="muted">not provided</span>' : money0(r.fwd) + (r.usedLookForward ? ' <span class="muted">(lower than base; 80% applied)</span>' : ' <span class="muted">(not lower than base)</span>')),
        outRow('Candidate', money0(r.candidate)),
        outRow('Required statutory deposit', `<strong>${money0(r.required)}</strong>${r.required === 0 ? ' <span class="muted">(candidate below $10,000)</span>' : ''}`, 'calc-primary'),
        outRow('Action', `<strong>${escapeHtml(r.actionText)}</strong>`, 'calc-primary'),
        outRow('Deadline (20 banking days after period end)', r.deadline ? fmtDate(r.deadline) : '<span class="muted">enter a valid period end date</span>'),
      ])
    );
  },
  mount(container) {
    const render = () => {
      const s = calcState(this.id, this.defaults);
      const e = this.effective(s);
      container.innerHTML = frameHtml(
        this,
        `<div class="callout callout--warning calc-warning">${escapeHtml(STAT_DEP_WARNING)}</div>` +
          // DEV-001: the guide (§13) does not itemise the three scenarios; the selector only hides inputs.
          selectHtml('scenario', 'Scenario', s.scenario, this.scenarios) +
          `<p class="dev-note calc-note" data-dev="DEV-001">The scenario selector only hides the statutory-deposit inputs (treated as $0); the guide does not itemise these scenarios.</p>` +
          fieldHtml('periodEnd', 'Applicable period end date (31 Mar, 30 Jun, 30 Sep or 31 Dec)', s.periodEnd, { type: 'date' }) +
          fieldHtml('lowPrev', e.hideSd && s.scenario === 'new-account' ? 'Lowest ADI statement balance during the previous applicable period (LowPrev)' : 'Lowest ADI statement balance during the previous applicable period (LowPrev)', s.lowPrev, { min: 0, step: 100 }) +
          (e.hideSd ? '' : fieldHtml('sdPrev', 'Statutory deposit held on that same day (SDPrev)', s.sdPrev, { min: 0, step: 100 })) +
          fieldHtml('lowFwd', 'Lowest ADI statement balance from period end to the 15th banking day after (LowFwd) - optional', s.lowFwd, { min: 0, step: 100 }) +
          (e.hideSd ? '' : fieldHtml('sdFwd', 'Statutory deposit held on that day (SDFwd) - optional', s.sdFwd, { min: 0, step: 100 })) +
          (e.hideSd ? '' : fieldHtml('sdNow', 'Statutory deposit currently held (SDNow)', s.sdNow, { min: 0, step: 100 })),
        this.outputs(this.compute(s)),
      );
      const form = container.querySelector('form');
      form.addEventListener('input', (ev) => {
        const v = readForm(form);
        setCalcState(this.id, v);
        if (ev.target.name === 'scenario') render();
        else container.querySelector('.calculator-output').innerHTML = this.outputs(this.compute(calcState(this.id, this.defaults)));
      });
      form.addEventListener('submit', (ev) => ev.preventDefault());
      container.querySelector('.calc-reset').addEventListener('click', () => {
        resetCalcState(this.id);
        render();
      });
    };
    render();
  },
  print() {
    const s = calcState(this.id, this.defaults);
    const r = this.compute(s);
    return (
      `<div class="callout callout--warning">${escapeHtml(STAT_DEP_WARNING)}</div>` +
      printTable(
        this.title,
        [['Scenario', (this.scenarios.find((x) => x.value === s.scenario) || {}).label || s.scenario], ['Applicable period end date', s.periodEnd ? fmtDate(s.periodEnd) : ''], ['LowPrev', money0(r.e.lowPrev)], ['SDPrev', money0(r.e.sdPrev)], ['LowFwd', r.e.lowFwd === '' ? 'not provided' : money0(r.e.lowFwd)], ['SDFwd', money0(r.e.sdFwd)], ['SDNow', money0(r.e.sdNow)]],
        [['Base', money0(r.base)], ['Fwd', r.fwd === null ? 'not provided' : money0(r.fwd)], ['Candidate', money0(r.candidate)], ['Required', money0(r.required)], ['Action', escapeHtml(r.actionText)], ['Deadline', r.deadline ? fmtDate(r.deadline) : '']],
        this.formula,
      )
    );
  },
};

// ---------------------------------------------------------------------------
// 8.8 Rule 42 Method Selector
// ---------------------------------------------------------------------------
const RULE42_QUESTIONS = [
  { key: 'inTrustAccount', text: 'Is the money in a general trust account or controlled money account?' },
  { key: 'commercialClient', text: 'Is the client a commercial or government client with a compliant costs agreement authorising withdrawal?' },
  { key: 'reimbursement', text: 'Is this reimbursement of a disbursement the practice has already paid (office account debited)?' },
  { key: 'instructions', text: 'Do you hold instructions authorising this specific withdrawal?' },
];
export function rule42TableRow(method) {
  const t = guideBlocks('trust-accounting--s9-2', 'table')[0];
  if (!t) return null;
  const rows = tableRows(t);
  return { header: rows[0], row: rows.find((r) => new RegExp('^<strong>' + method + '\\.').test(r[0].trim())) || rows[method] };
}
const rule42Calc = {
  id: 'rule-42-method',
  title: 'Rule 42 Method Selector',
  section: 'trust-accounting--s9-2',
  position: 'end',
  formula: '1. Not in a general trust account or controlled money account → Rule 42 does not apply\n2. Commercial or government client with a compliant costs agreement authorising withdrawal → Method 4\n3. Reimbursement of a disbursement already paid (office account debited) → Method 3\n4. Instructions authorising this specific withdrawal → Method 2\n5. Otherwise → Method 1\nMethod 1 earliest withdrawal date = bill date + 7 business days (weekdays)',
  defaults: { inTrustAccount: null, commercialClient: null, reimbursement: null, instructions: null, billDate: '' },
  resolve(s) {
    return rule42Method(s);
  },
  outputs(s) {
    const r = this.resolve(s);
    if (r.notApplicable) return `<div class="callout callout--warning"><strong>Rule 42 does not apply.</strong> Power money and investment of trust money: costs only under the power or the person's instructions.</div>`;
    if (!r.method) return '<p class="muted">Answer the questions above to resolve the method.</p>';
    const row = rule42TableRow(r.method);
    let html = `<p class="calc-result"><strong>Method ${r.method}</strong></p>`;
    if (row) html += rowTableHtml(row.header, [row.row]);
    if (r.method === 1) {
      const earliest = method1EarliestWithdrawal(s.billDate);
      html += outTable([outRow('Earliest withdrawal date (bill date + 7 business days)', earliest ? `<strong>${fmtDate(earliest)}</strong>` : '<span class="muted">enter the bill date</span>', 'calc-primary')]) + `<p class="calc-note muted">Earliest date assumes 7 business days with no objection, counting weekdays only. If an objection is received the 7 business day period no longer applies: see the Wait column above (30 days after the later of the bill date and receipt of an itemised bill, or when the money otherwise becomes legally payable).</p>`;
    }
    return html;
  },
  mount(container) {
    const render = () => {
      const s = calcState(this.id, this.defaults);
      const r = this.resolve(s);
      const visible = (i) => {
        if (i === 0) return true;
        if (s.inTrustAccount !== true) return false;
        for (let k = 1; k < i; k++) if (s[RULE42_QUESTIONS[k].key] !== false) return false;
        return true;
      };
      const qs = RULE42_QUESTIONS.map((q, i) =>
        visible(i)
          ? `<fieldset class="calc-question"><legend>${i + 1}. ${escapeHtml(q.text)}</legend><label><input type="radio" name="${q.key}" value="yes"${s[q.key] === true ? ' checked' : ''}> Yes</label> <label><input type="radio" name="${q.key}" value="no"${s[q.key] === false ? ' checked' : ''}> No</label></fieldset>`
          : '',
      ).join('');
      container.innerHTML = frameHtml(this, qs + (r.method === 1 ? fieldHtml('billDate', 'Bill date', s.billDate, { type: 'date' }) : ''), this.outputs(s));
      const form = container.querySelector('form');
      form.addEventListener('change', (ev) => {
        const patch = {};
        if (ev.target.type === 'radio') {
          patch[ev.target.name] = ev.target.value === 'yes';
          // clear later answers
          const idx = RULE42_QUESTIONS.findIndex((q) => q.key === ev.target.name);
          for (let k = idx + 1; k < RULE42_QUESTIONS.length; k++) patch[RULE42_QUESTIONS[k].key] = null;
        } else patch[ev.target.name] = ev.target.value;
        setCalcState(this.id, patch);
        render();
      });
      form.addEventListener('submit', (ev) => ev.preventDefault());
      container.querySelector('.calc-reset').addEventListener('click', () => {
        resetCalcState(this.id);
        render();
      });
    };
    render();
  },
  print() {
    const s = calcState(this.id, this.defaults);
    const yn = (v) => (v === true ? 'Yes' : v === false ? 'No' : '-');
    const out = [];
    const r = this.resolve(s);
    out.push(['Result', r.notApplicable ? 'Rule 42 does not apply' : r.method ? `Method ${r.method}` : 'Not resolved']);
    if (r.method === 1 && s.billDate) out.push(['Earliest withdrawal date', fmtDate(method1EarliestWithdrawal(s.billDate))]);
    return printTable(this.title, [...RULE42_QUESTIONS.map((q) => [q.text, yn(s[q.key])]), ['Bill date', s.billDate ? fmtDate(s.billDate) : '']], out, this.formula);
  },
};

// ---------------------------------------------------------------------------
// 8.9 Trust Money Classifier
// ---------------------------------------------------------------------------
// Steps follow the guide's section 4.7 list. Question text is taken from the list
// items themselves at runtime (verbatim); the outcome mapping is below.
const CLASSIFIER_STEPS = [
  { i: 0, yesTerminal: null, noTerminal: 'not-trust', label: 'Entrusted in connection with legal services?' },
  { i: 1, yesTerminal: 'billed', label: 'Services already provided and billed?' },
  { i: 2, yesTerminal: 'afsl', label: 'Financial service requiring an AFSL?' },
  { i: 3, cash: true, label: 'Is it cash?' },
  { i: 4, yesTerminal: 'transit', label: 'Instructions to pay or deliver to a third party who is not an associate?' },
  { i: 5, yesTerminal: 'controlled', label: "Written direction to deposit into a non-GTA account under the practice's exclusive control?" },
  { i: 6, yesTerminal: 'direction', label: 'Written direction from a person legally entitled to give it, to deal with the money otherwise than by depositing to the GTA?' },
  { i: 7, yesTerminal: 'power', label: 'Subject to a power to receive or disburse for another?' },
  { i: 8, terminal: 'general', label: 'Otherwise general trust money' },
];
const MATRIX_COLUMN = { general: 1, controlled: 2, transit: 3, direction: 4, power: 5 };
const CATEGORY_NAMES = { general: 'General trust money', controlled: 'Controlled money', transit: 'Transit money', direction: 'Written direction money', power: 'Power money', billed: 'Not trust money (services already provided and billed)', afsl: 'Not trust money (financial service requiring an AFSL)', 'not-trust': 'Not trust money' };
export function classifierSteps() {
  const list = guideBlocks('trust-accounting--s4-7', 'list')[0];
  if (!list) return [];
  const tpl = document.createElement('template');
  tpl.innerHTML = list.html;
  return Array.from(tpl.content.querySelectorAll('li')).map((li) => li.innerHTML);
}
export function matrixRows(category) {
  const t = guideBlocks('trust-accounting--s22-1', 'table')[0];
  if (!t) return null;
  const rows = tableRows(t);
  const col = MATRIX_COLUMN[category];
  if (!col) return null;
  return { header: [rows[0][0], rows[0][col]], rows: rows.slice(1).map((r) => [r[0], r[col]]) };
}
const classifierCalc = {
  id: 'trust-money-classifier',
  title: 'Trust Money Classifier',
  section: 'trust-accounting--s4-7',
  position: 'end',
  formula: 'Walks the decision sequence in section 4.7 in order. The first "yes" (or the first "no" at step 1) resolves the category. Cash (step 4) must go to the GTA (or CMA for controlled money) before anything else (s 143), then the sequence continues.',
  defaults: { answers: {} },
  resolve(answers) {
    const steps = CLASSIFIER_STEPS;
    for (const st of steps) {
      if (st.terminal) return { category: st.terminal, step: st.i, cash: answers[3] === true };
      const a = answers[st.i];
      if (st.cash) {
        if (a === undefined || a === null) return { pending: st.i };
        continue;
      }
      if (a === undefined || a === null) return { pending: st.i };
      if (st.i === 0 && a === false) return { category: 'not-trust', step: 0, cash: false };
      if (st.i !== 0 && a === true) return { category: st.yesTerminal, step: st.i, cash: answers[3] === true };
    }
    return { pending: 0 };
  },
  outputs(answers) {
    const r = this.resolve(answers);
    const stepsHtml = classifierSteps();
    if (r.pending !== undefined) return '<p class="muted">Answer each question in order.</p>';
    let html = `<p class="calc-result">Category: <strong>${escapeHtml(CATEGORY_NAMES[r.category])}</strong></p>`;
    if (stepsHtml[r.step]) html += `<div class="callout callout--practice"><strong>Governing step (section 4.7):</strong> ${stepsHtml[r.step]}</div>`;
    if (r.cash && stepsHtml[3]) html += `<div class="callout callout--warning"><strong>Cash rule (s 143):</strong> ${stepsHtml[3]}</div>`;
    const m = matrixRows(r.category);
    if (m) html += `<p><strong>Records by money type (section 22.1)</strong></p>` + rowTableHtml(m.header, m.rows);
    if (['general', 'controlled', 'transit', 'direction', 'power', 'billed'].includes(r.category)) html += `<p><button type="button" class="btn btn--small classifier-to-walkthrough" data-category="${r.category}" data-cash="${r.cash ? '1' : '0'}">Use this category in the Trust Transaction Walkthrough</button></p>`;
    return html;
  },
  mount(container) {
    const render = () => {
      const s = calcState(this.id, this.defaults);
      const answers = s.answers || {};
      const r = this.resolve(answers);
      const stepsHtml = classifierSteps();
      const maxStep = r.pending !== undefined ? r.pending : r.step;
      const qs = CLASSIFIER_STEPS.filter((st) => !st.terminal && st.i <= maxStep)
        .map((st) => `<fieldset class="calc-question"><legend>${st.i + 1}. ${stepsHtml[st.i] || escapeHtml(st.label)}</legend><label><input type="radio" name="q${st.i}" value="yes"${answers[st.i] === true ? ' checked' : ''}> Yes</label> <label><input type="radio" name="q${st.i}" value="no"${answers[st.i] === false ? ' checked' : ''}> No</label></fieldset>`)
        .join('');
      container.innerHTML = frameHtml(this, qs, this.outputs(answers));
      const form = container.querySelector('form');
      form.addEventListener('change', (ev) => {
        if (ev.target.type !== 'radio') return;
        const i = Number(ev.target.name.slice(1));
        const cur = calcState(this.id, this.defaults).answers || {};
        const next = {};
        for (const [k, v] of Object.entries(cur)) if (Number(k) < i) next[k] = v;
        next[i] = ev.target.value === 'yes';
        setCalcState(this.id, { answers: next });
        render();
      });
      form.addEventListener('submit', (ev) => ev.preventDefault());
      container.querySelector('.calc-reset').addEventListener('click', () => {
        resetCalcState(this.id);
        render();
      });
      container.querySelector('.classifier-to-walkthrough')?.addEventListener('click', (ev) => {
        const cat = ev.target.dataset.category;
        const wt = calcState(walkthroughCalc.id, walkthroughCalc.defaults);
        wt.category = cat;
        if (ev.target.dataset.cash === '1') wt.receipt.form = 'cash';
        setCalcState(walkthroughCalc.id, wt);
        const wtEl = document.getElementById('calc-' + walkthroughCalc.id);
        if (wtEl) walkthroughCalc.mount(wtEl);
        App.navigate('#' + walkthroughCalc.section);
      });
    };
    render();
  },
  print() {
    const s = calcState(this.id, this.defaults);
    const answers = s.answers || {};
    const r = this.resolve(answers);
    const yn = (v) => (v === true ? 'Yes' : v === false ? 'No' : '-');
    return printTable(this.title, CLASSIFIER_STEPS.filter((st) => !st.terminal).map((st) => [st.label, yn(answers[st.i])]), [['Category', r.pending !== undefined ? 'Not resolved' : escapeHtml(CATEGORY_NAMES[r.category])]], this.formula);
  },
};

// ---------------------------------------------------------------------------
// 8.10 Trust Transaction Walkthrough
// ---------------------------------------------------------------------------
const WL = WT_LABELS;
const EVENT_TYPES = [
  { value: 'bill', label: 'Bill issued and costs drawn' },
  { value: 'disbursement', label: 'Disbursement paid from trust' },
  { value: 'reimbursement', label: 'Reimbursement of disbursement (Method 3)' },
  { value: 'transfer', label: 'Transfer to another matter' },
  { value: 'refund', label: 'Refund to client' },
  { value: 'reversal', label: 'Receipt reversal (dishonoured cheque)' },
  { value: 'interest', label: 'Interest credited by ADI in error' },
];
function card(title, bodyHtml, cls = '') {
  return `<section class="record-card ${cls}"><h4 class="record-card-title">${escapeHtml(title)}</h4>${bodyHtml}</section>`;
}
function kv(rows) {
  return `<table class="record-table">${rows.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${v === '' || v === undefined || v === null ? '<span class="muted">[not entered]</span>' : v}</td></tr>`).join('')}</table>`;
}
function note(text, cls = 'record-note') {
  return `<p class="${cls}">${escapeHtml(text)}</p>`;
}
function ol(items) {
  return `<ol class="record-particulars">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ol>`;
}
function d(v) {
  return v ? fmtDate(v) : '';
}
function eh(v) {
  return escapeHtml(v || '');
}
// Source links (author decision, BUILD_NOTES E.35-42): legislation register and guide sections.
const LPUL_URL = (s) => `https://legislation.nsw.gov.au/view/html/inforce/current/act-2014-16a#sec.${s}`;
const LPUGR_URL = (s) => `https://legislation.nsw.gov.au/view/html/inforce/current/sl-2015-0246#sec.${s}`;
const AMLCTF_URL = 'https://www.legislation.gov.au/C2006A00169/latest/text';
function sourcesHtml(items) {
  return `<p class="record-sources">Sources: ${items.map(([label, href]) => `<a href="${escapeAttr(href)}"${href.startsWith('#') ? '' : ' target="_blank" rel="noopener" class="link-legislation"'}>${escapeHtml(label)}</a>`).join(' · ')}</p>`;
}
const SRC = {
  overdraw: [['LPUL s 148', LPUL_URL(148)], ['LPUL s 154', LPUL_URL(154)], ['Trust Accounting §22.2', '#trust-accounting--s22-2'], ['§14.2', '#trust-accounting--s14-2'], ['§8.5', '#trust-accounting--s8-5']],
  interest: [['LPUL s 139', LPUL_URL(139)], ['Application Act s 47', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2014-016#sec.47'], ['Trust Accounting §5.2', '#trust-accounting--s5-2'], ['§10.1', '#trust-accounting--s10-1'], ['§8.6', '#trust-accounting--s8-6']],
  ttr: [['AML/CTF Act 2006 (Cth)', AMLCTF_URL], ['LPUL s 143', LPUL_URL(143)], ['Anti-Money Laundering §16.1', '#anti-money-laundering--s16-1'], ['§24.1', '#anti-money-laundering--s24-1'], ['Trust Accounting §5.1', '#trust-accounting--s5-1']],
  deficiency: [['LPUL s 148', LPUL_URL(148)], ['LPUL s 154', LPUL_URL(154)], ['Trust Accounting §7.2', '#trust-accounting--s7-2'], ['§6.3', '#trust-accounting--s6-3'], ['§14.3', '#trust-accounting--s14-3']],
  cash: [['LPUL s 143', LPUL_URL(143)], ['Trust Accounting §4.7', '#trust-accounting--s4-7'], ['§5.1', '#trust-accounting--s5-1']],
  deposit: [['LPUGR r 37', LPUGR_URL(37)], ['LPUGR r 44(2)', LPUGR_URL(44)], ['Trust Accounting §7.3', '#trust-accounting--s7-3']],
  cmWithdrawal: [['LPUGR r 63', LPUGR_URL(63)], ['LPUGR r 64', LPUGR_URL(64)], ['LPUGR r 42', LPUGR_URL(42)], ['Trust Accounting §10.3', '#trust-accounting--s10-3'], ['§10.4', '#trust-accounting--s10-4'], ['§22.1', '#trust-accounting--s22-1']],
};

const walkthroughCalc = {
  id: 'trust-transaction-walkthrough',
  title: 'Trust Transaction Walkthrough - what gets recorded, where, and for how much',
  section: 'trust-accounting--s7-8',
  position: 'end',
  formula: 'Step 1: the receipt, classified into one of six categories (cash rule s 143 and credit card rule applied).\nStep 2: subsequent events, each generating the records the guide requires.\nGuard rail: any event that would take the trust ledger balance below zero is blocked.',
  defaults: wtInitialState(),
  state() {
    const s = calcState(this.id, this.defaults);
    if (!Array.isArray(s.events)) s.events = [];
    return s;
  },
  // ---- step 1 outputs
  receiptCards(s) {
    const r = s.receipt;
    const amount = toNumber(r.amount);
    const ov = cashOverride(r.form, s.category);
    let html = '';
    if (ov.applies) html += `<div class="callout callout--warning"><strong>Cash rule (s 143).</strong> ${escapeHtml(WL.cashRule2)}${ov.onward ? ' The initial deposit is treated below as a general trust account receipt; the onward dealing is shown as a subsequent payment.' : ''}${sourcesHtml(SRC.cash)}</div>`;
    if (r.form === 'credit card') html += `<div class="callout callout--warning"><strong>Credit card.</strong> ${escapeHtml(WL.creditCard)} (${escapeHtml(WL.creditCardBreach)}: s 146.)${sourcesHtml([['LPUL s 146', LPUL_URL(146)], ['Trust Accounting §6.3', '#trust-accounting--s6-3']])}</div>`;
    if (r.form === 'cash' && amount >= 10000) html += `<div class="callout callout--warning"><strong>Threshold transaction report to AUSTRAC within 10 business days.</strong> ${escapeHtml(WL.ttr)} See <a href="#anti-money-laundering--s16">Anti-Money Laundering guide, section 16</a>.${sourcesHtml(SRC.ttr)}</div>`;
    const cat = ov.applies && ov.onward ? 'general' : s.category;
    if (cat === 'general') html += this.generalCards(s, amount);
    else if (cat === 'controlled') html += this.controlledCards(s, amount);
    else if (cat === 'transit') html += this.transitCards(s);
    else if (cat === 'direction') html += this.directionCards(s);
    else if (cat === 'power') html += this.powerCards(s);
    else if (cat === 'billed') html += this.billedCards(s);
    if (ov.applies && ov.onward) {
      const target = { transit: 'Pay or deliver to the third party per the instructions', direction: 'Deal with the money per the written direction', power: 'Deal with the money under the power' }[s.category];
      html += card('Onward dealing after the cash has been banked to the GTA', note(target) + note({ transit: WL.transitDeal, direction: WL.directionDeal, power: WL.powerRecord }[s.category]) + note('Record as a payment out of the general trust account: ' + WL.paymentMethods), 'record-card--onward');
    }
    return html;
  },
  generalCards(s, amount) {
    const r = s.receipt;
    const dates = r.dateReceived && r.dateMadeOut && r.dateReceived !== r.dateMadeOut ? `${d(r.dateMadeOut)} (made out); ${d(r.dateReceived)} (received)` : d(r.dateMadeOut || r.dateReceived);
    const receiptNo = `R${s.receiptSeq}`;
    const led = wtLedger(s);
    let html = card(
      `${WL.receiptTitle}`,
      kv([
        [WL.receiptParticulars[0], dates],
        [WL.receiptParticulars[1], receiptNo],
        [WL.receiptParticulars[2], money2(amount)],
        [WL.receiptParticulars[3], eh(r.form)],
        [WL.receiptParticulars[4], eh(r.from)],
        [WL.receiptParticulars[5], [r.client, r.matterDesc, r.matterRef].filter(Boolean).map(eh).join(' / ')],
        [WL.receiptParticulars[6], eh(r.reason)],
        [WL.receiptParticulars[7], eh(r.madeOutBy)],
      ]) +
        note(WL.receiptNote1) +
        note(WL.receiptNote2),
    );
    if (r.form !== 'direct deposit') {
      const rows = [['date of deposit', d(r.dateReceived)], ['amount of deposit', money2(amount)], ['the cheques, notes and coins content and the amount of each', r.form === 'cash' ? 'notes and coins ' + money2(amount) : r.form === 'cheque' ? 'cheque ' + money2(amount) : eh(r.form)]];
      if (r.form === 'cheque') rows.push(["the drawer's name", '<span class="muted">[drawer]</span>'], ['the name and branch or BSB of the ADI on which it is drawn', '<span class="muted">[ADI / BSB]</span>'], ['the amount', money2(amount)]);
      html += card(WL.depositTitle, note(WL.depositNote1) + kv(rows) + note(WL.depositParticulars) + note(WL.depositNote2) + sourcesHtml(SRC.deposit));
    }
    // DEV-002: the guide prescribes no column format for the receipts cash book ("Format is a
    // matter for the practice"); the columns below are the r 36 particulars plus the r 44 deposit date and amount.
    html += card(
      'Receipts cash book line (r 44)',
      this.cashBookTable(led.receipts, 'receipts') + note(WL.receiptsCashBook) + note(WL.cashBookTiming) + `<p class="dev-note" data-dev="DEV-002">Column layout is the application's; the guide leaves the format to the practice.</p>`,
    );
    html += card(
      `${WL.ledgerTitle}`,
      note(WL.ledgerHeading) +
        kv([
          ['Name of the person', eh(r.client)],
          ["Person's address", '<span class="muted">[address]</span>'],
          ['Matter reference', eh(r.matterRef)],
          ['Matter description', eh(r.matterDesc)],
        ]) +
        this.ledgerTable(led.entries.slice(0, 1)) +
        note(WL.ledgerReceiptExtra) +
        note(WL.ledgerTiming),
    );
    html += card(WL.controlTitle, note(WL.controlPosting) + kv([['Transaction', WL.postingReceipt[0]], ['Debit', WL.postingReceipt[1]], ['Credit', WL.postingReceipt[2]], ["This receipt's contribution to the monthly total", 'Dr ' + money2(amount)]]));
    html += card(
      `${WL.monthEndTitle} (${WL.monthEndRef})`,
      note(WL.monthEndTwo) +
        `<p class="record-note"><strong>Trial balance line</strong> (${escapeHtml(WL.trialBalanceLine)}):</p>` +
        kv([['Account name', eh(r.client)], ['Matter reference', eh(r.matterRef)], ['Short matter description', eh(r.matterDesc)], ['Month end balance', money2(led.balance)]]) +
        note(`Reconciliation: if the deposit is not yet on the ADI statement at month end - ${WL.reconOutstanding}: outstanding deposit of ${money2(amount)}.`),
    );
    html += card(`${WL.statementTitle} (${WL.statementRef})`, this.ledgerTable(led.entries) + note(WL.statementContent) + note(WL.statementWhen));
    html += card('Timing summary', ol([WL.timingReceipt, WL.timingDeposit, WL.timing5, WL.timing15]));
    return html;
  },
  controlledCards(s, amount) {
    const r = s.receipt;
    const test = cmaNameCompliant(s.cmaName, s.practiceName);
    let html = card(
      WL.cmReceiptTitle,
      kv([
        [WL.cmReceiptParticulars[0], d(r.dateMadeOut || r.dateReceived)],
        [WL.cmReceiptParticulars[1], r.dateReceived !== r.dateMadeOut ? d(r.dateReceived) : '<span class="muted">same</span>'],
        [WL.cmReceiptParticulars[2], `CM${s.receiptSeq}`],
        [WL.cmReceiptParticulars[3], eh(r.form)],
        [WL.cmReceiptParticulars[4], eh(r.from)],
        [WL.cmReceiptParticulars[5], [r.client, r.matterDesc, r.matterRef].filter(Boolean).map(eh).join(' / ')],
        [WL.cmReceiptParticulars[6], eh(s.cmaName)],
        [WL.cmReceiptParticulars[7], eh(r.reason)],
        [WL.cmReceiptParticulars[8], eh(r.madeOutBy)],
        [WL.cmReceiptParticulars[9], money2(amount)],
      ]) + note(WL.cmDirection) + note(WL.cmRetain),
    );
    html += card(
      'CMA account name check (r 61)',
      note(WL.cmNaming) +
        kv([
          ['Account name entered', eh(s.cmaName)],
          ['Result', s.cmaName ? (test.compliant ? '<strong class="ok">compliant</strong>' : `<strong class="bad">not compliant</strong> - ${!test.hasPractice ? 'practice name missing' : ''}${!test.hasPractice && !test.hasExpr ? '; ' : ''}${!test.hasExpr ? '"controlled money account", "CMA" or "CMA/c" missing' : ''}`) : '<span class="muted">enter the account name above</span>'],
        ]),
    );
    html += card(WL.cmMovementTitle, note(WL.cmMovementReceipt) + kv([['the date received', d(r.dateReceived)], ['receipt number', `CM${s.receiptSeq}`], ['date deposited', d(r.dateReceived)], ['name and details of the CMA', eh(s.cmaName)], ['amount deposited', money2(amount)], ['details sufficient to identify the deposit', eh(r.reason)], ['interest received', '<span class="muted">as notified by the ADI</span>']]) + note('Register note: ' + WL.cmRegister));
    html += card(WL.cmListingTitle, kv([['Name', eh(s.cmaName)], ['Number', '<span class="muted">[account number]</span>'], ['Balance', money2(amount)], ['Person on whose behalf held', eh(r.client)], ['Short description of the matter', eh(r.matterDesc)]]) + note(WL.cmListing) + note(WL.cmListingReview));
    html += card(`${WL.statementTitle} (${WL.statementRef})`, note(WL.statementWhen) + note(WL.statementContent));
    const m = matrixRows('controlled');
    if (m) html += card('Records by money type (section 22.1) - Controlled money', rowTableHtml(m.header, m.rows));
    html += card('Interest', note(WL.cmInterest) + note(WL.cmPayments) + sourcesHtml(SRC.interest));
    return html;
  },
  transitCards(s) {
    const r = s.receipt;
    return card('Transit money record (s 140(2))', note(WL.transitRecord) + kv([['Copy of cheque', '<span class="muted">[copy of third-party cheque on file]</span>'], ['Settlement direction / instructions', eh(r.reason)], ['Received from', eh(r.from)], ['Client / matter', [r.client, r.matterRef].filter(Boolean).map(eh).join(' / ')], ['Amount', money2(toNumber(r.amount))]]) + note(WL.transitPractice) + note(WL.transitDeal) + note(WL.transitPoint));
  },
  directionCards(s) {
    const r = s.receipt;
    return card('Written direction money record', note(WL.directionRecord) + kv([['Written direction', '<span class="muted">[original in the directions folder; copy on the matter file]</span>'], ['Copy of cheque', '<span class="muted">[copy on file]</span>'], ['Received from', eh(r.from)], ['Client / matter', [r.client, r.matterRef].filter(Boolean).map(eh).join(' / ')], ['Amount', money2(toNumber(r.amount))]]) + note(WL.directionDeal) + `<div class="callout callout--warning">${escapeHtml(WL.directionOffice)}</div>`);
  },
  powerCards(s) {
    const r = s.receipt;
    return (
      card('Record of dealings (r 55)', note(WL.powerRecord) + kv([['Date', d(r.dateReceived)], ['Dealing', eh(r.reason)], ['Amount', money2(toNumber(r.amount))], ['Person', eh(r.client)]]) + note(WL.powerRetain)) +
      card('Register of Powers and Estates (r 60)', note(WL.powerRegister) + kv([["Donor's name", eh(r.client)], ["Donor's address", '<span class="muted">[address]</span>'], ['Date of the power', '<span class="muted">[date]</span>']])) +
      card('Statement', note('Statement required. ' + WL.powerStatement)) +
      `<div class="callout callout--warning">${escapeHtml(WL.powerCosts)}</div>`
    );
  },
  billedCards(s) {
    return card('Not trust money (s 129(2)(a))', kv([['Situation', escapeHtml(WL.billedRow[0])], ['Answer', escapeHtml(WL.billedRow[1])], ['s 134 notice?', escapeHtml(WL.billedNotice[2])]]) + note('Office receipt only. Do not deposit to trust.') + note(WL.billedIntermix));
  },
  // ---- running views
  ledgerTable(entries) {
    return `<div class="table-wrap ledger-view"><table><thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Particulars</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${entries.map((e) => `<tr><td>${d(e.date)}</td><td>${eh(e.ref)}</td><td>${eh(e.type)}</td><td>${eh(e.particulars)}</td><td>${e.debit ? money2(e.debit) : ''}</td><td>${e.credit ? money2(e.credit) : ''}</td><td>${money2(e.balance)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No entries</td></tr>'}</tbody></table></div>`;
  },
  cashBookTable(lines, kind) {
    if (kind === 'receipts')
      return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Receipt number</th><th>Received from</th><th>Client / matter</th><th>Reason</th><th>Form</th><th>Amount received</th><th>Date deposited</th><th>Amount deposited</th></tr></thead><tbody>${lines.map((l) => `<tr class="${l.negative ? 'negative' : ''}"><td>${d(l.date)}</td><td>${eh(l.ref)}</td><td>${eh(l.from)}</td><td>${[l.client, l.matterRef].filter(Boolean).map(eh).join(' / ')}</td><td>${eh(l.reason)}</td><td>${eh(l.form)}</td><td>${money2(l.amount)}</td><td>${d(l.date)}</td><td>${money2(l.deposited)}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">No entries</td></tr>'}</tbody></table></div>`;
    return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Cheque / EFT reference</th><th>Payee</th><th>Reason</th><th>Amount</th></tr></thead><tbody>${lines.map((l) => `<tr><td>${d(l.date)}</td><td>${eh(l.ref)}</td><td>${eh(l.payee)}</td><td>${eh(l.reason)}</td><td>${money2(l.amount)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No entries</td></tr>'}</tbody></table></div>`;
  },
  eventCards(s) {
    const led = wtLedger(s);
    let html = '';
    s.events.forEach((ev, i) => {
      const amt = toNumber(ev.amount);
      const entry = led.entries.find((e) => e.event === ev) || null;
      const payeeShown = ev.payeeIsAdi ? `[${ev.adi || 'ADI'}] B/C ${ev.payee || '[beneficiary]'}` : ev.payee || '';
      const particulars = ev.method === 'cheque' ? ol(WL.chequeParticulars) : ol(WL.eftParticulars);
      const paymentCard = (title) =>
        card(
          title,
          kv([['Date', d(ev.date)], ['Reference', eh(entry ? entry.ref : '')], ['Payee', eh(payeeShown)], ['Amount', money2(amt)], ['Method', eh(ev.method)], ['Reason', eh(ev.particulars)]]) +
            `<p class="record-note"><strong>Written payment record (r 43) particulars${ev.method === 'cheque' ? ' - cheque' : ' - EFT'}:</strong></p>` +
            particulars +
            note(WL.writtenRecord) +
            (ev.payeeIsAdi ? note(WL.adiPayee) : ''),
        );
      const isCM = s.category === 'controlled';
      const ledgerDebit = isCM ? card('Controlled money movement record - withdrawal (r 64)', note(WL.cmMovementWithdrawal) + kv([['Date and number of the payment', `${d(ev.date)} ${entry ? entry.ref : ''}`], ['Destination / payee', eh(payeeShown)], ['Person / matter', [s.receipt.client, s.receipt.matterRef].filter(Boolean).map(eh).join(' / ')], ['Purpose', eh(ev.particulars)], ['Authorised person', eh(ev.authorisedBy)], ['Amount', money2(amt)]]) + note(WL.cmPayments) + sourcesHtml(SRC.cmWithdrawal)) : card('Trust ledger Debit (r 47)', this.ledgerTable(entry ? [entry] : []) + note(ev.method === 'cheque' ? WL.ledgerChequeExtra : WL.ledgerEftExtra));
      const cashBookLine = isCM ? '' : card('Payments cash book line (r 45)', this.cashBookTable(led.payments.filter((p) => p.event === ev), 'payments') + note(WL.paymentsCashBook) + note(WL.cashBookTiming));
      const controlCr = isCM ? '' : card(WL.controlTitle, kv([['Transaction', WL.postingPayment[0]], ['Debit', WL.postingPayment[1]], ['Credit', WL.postingPayment[2]], ['This payment', 'Cr ' + money2(amt)]]));
      let body = '';
      if (ev.type === 'bill') {
        const w = wtWaitingPeriod(Number(ev.rule42Method), ev.date);
        const row = rule42TableRow(Number(ev.rule42Method));
        body += card(`Rule 42 - Method ${ev.rule42Method}`, (row ? rowTableHtml(row.header, [row.row]) : '') + kv([['Waiting period', escapeHtml(w.text)], ['Earliest withdrawal date', w.earliest ? fmtDate(w.earliest) : '']]));
        body += cashBookLine + ledgerDebit + controlCr + paymentCard('Written payment record (r 43) - to the office account');
        body += `<div class="callout callout--practice"><strong>${escapeHtml(WL.drawPromptly)}.</strong> ${escapeHtml(WL.billNoLongerTrust)}</div>`;
      } else if (ev.type === 'disbursement') {
        body += paymentCard('Payment record (r 43)') + cashBookLine + ledgerDebit + controlCr;
      } else if (ev.type === 'reimbursement') {
        body += card('Method 3 check (r 42(5), r 42(8))', kv([['Date the office account was debited', d(ev.officeDebitDate)], ['Withdrawal date', d(ev.date)], ['Result', '<strong class="ok">permitted</strong> - the office account was debited first']]) + note(WL.method3Rule) + note(WL.method3Pay));
        body += paymentCard('Payment record (r 43) - reimbursement to the office account') + cashBookLine + ledgerDebit + controlCr;
      } else if (ev.type === 'transfer') {
        const j = led.journal.find((x) => x.date === ev.date && x.amount === amt && x.reason === ev.reason) || led.journal[led.journal.length - 1];
        body += card(
          WL.journalTitle,
          kv([
            ['Journal number', eh(j ? j.n : '')],
            ['date of transfer', d(ev.date)],
            ['the ledger transferred from (ledger reference, person\'s name, matter description)', [s.receipt.matterRef, s.receipt.client, s.receipt.matterDesc].filter(Boolean).map(eh).join(' / ')],
            ['the ledger transferred to (same)', [ev.toMatter, ev.toClient, ev.toMatterDesc].filter(Boolean).map(eh).join(' / ')],
            ['particulars identifying the reason', eh(ev.reason)],
            ['the amount to and from each ledger', money2(amt)],
            ['Authorised in writing by', eh(ev.authorisedBy)],
          ]) +
            note(WL.journalParticulars) +
            note(WL.journalAuth) +
            note(WL.journalPermitted) +
            note(WL.postingJournal),
        );
        body += card('Trust ledger Debit on source (r 47)', this.ledgerTable(entry ? [entry] : []) + note(WL.ledgerJournalExtra));
        body += card('Trust ledger Credit on destination (r 47)', this.ledgerTable([{ date: ev.date, ref: j ? j.n : '', type: 'Journal', particulars: `From ${s.receipt.client || '[client]'} ${s.receipt.matterRef || ''} - ${ev.reason || ''}`, debit: 0, credit: amt, balance: amt }]) + note('Destination ledger shown from a nil opening balance.', 'record-note muted'));
      } else if (ev.type === 'refund') {
        body += paymentCard('Payment record (r 43) - refund to client') + cashBookLine + ledgerDebit + controlCr;
        if (entry && entry.balance === 0) body += card('Trust account statement on completion (r 52(4)(a))', this.ledgerTable(led.entries) + note(WL.refundStatement));
        else body += card('Trust account statement', note(WL.statementWhen));
      } else if (ev.type === 'reversal') {
        body += card('Receipts cash book - negative line (r 44)', this.cashBookTable(led.receipts.filter((l) => l.negative), 'receipts') + note(WL.dishonour));
        body += card('Trust ledger Debit (r 47)', this.ledgerTable(entry ? [entry] : []) + kv([['Transaction', WL.postingReceiptReversal[0]], ['Debit', WL.postingReceiptReversal[1]], ['Credit', WL.postingReceiptReversal[2]]]));
        if ((ev.warnings || []).includes('deficiency')) body += `<div class="callout callout--danger"><strong>Deficiency.</strong> The receipt has already been drawn against: deposit office funds into the GTA immediately to remedy the deficiency, issue a receipt, and notify under s 154. (${escapeHtml(WL.noDeficiency)})${sourcesHtml(SRC.deficiency)}</div>`;
      } else if (ev.type === 'interest') {
        body += card('Reconciliation adjusting item', kv([['Amount', money2(amt)], ['Treatment', 'Adjusting item on the reconciliation; not recorded in the cash book or posted to a ledger; ask the ADI to reverse']]) + note(WL.adiErrors) + note(WL.interestError));
      }
      html += `<section class="wt-event"><h4 class="wt-event-title">Event ${i + 1}: ${escapeHtml((EVENT_TYPES.find((t) => t.value === ev.type) || {}).label || ev.type)} <button type="button" class="btn-link wt-event-del" data-i="${i}">remove</button></h4>${body}</section>`;
    });
    return html;
  },
  runningViews(s) {
    const led = wtLedger(s);
    const isCM = s.category === 'controlled';
    return (
      `<h4>Running views</h4>` +
      card(isCM ? 'Movement record (running)' : 'Ledger card (running)', this.ledgerTable(led.entries)) +
      (isCM ? '' : card('Receipts cash book', this.cashBookTable(led.receipts, 'receipts')) + card('Payments cash book', this.cashBookTable(led.payments, 'payments'))) +
      card('Journal', `<div class="table-wrap"><table><thead><tr><th>Journal number</th><th>Date</th><th>From</th><th>To</th><th>Reason</th><th>Amount</th><th>Authorised by</th></tr></thead><tbody>${led.journal.map((j) => `<tr><td>${eh(j.n)}</td><td>${d(j.date)}</td><td>${[j.from.matterRef, j.from.client].filter(Boolean).map(eh).join(' ')}</td><td>${[j.to.matterRef, j.to.client].filter(Boolean).map(eh).join(' ')}</td><td>${eh(j.reason)}</td><td>${money2(j.amount)}</td><td>${eh(j.authorisedBy)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No journal entries</td></tr>'}</tbody></table></div>`)
    );
  },
  eventFormHtml(type, err, errSources) {
    const f = (n, l, o) => fieldHtml(n, l, '', o);
    let fields = f('date', 'Date', { type: 'date' });
    if (type === 'bill') fields += f('amount', 'Amount', { min: 0, step: 0.01 }) + selectHtml('rule42Method', 'Rule 42 method', 1, [1, 2, 3, 4].map((m) => ({ value: m, label: 'Method ' + m }))) + selectHtml('method', 'Cheque or EFT to the office account', 'eft', [{ value: 'eft', label: 'EFT' }, { value: 'cheque', label: 'Cheque' }]);
    else if (type === 'disbursement') fields += f('payee', 'Payee', { type: 'text' }) + `<label class="calc-field calc-field--check"><input type="checkbox" name="payeeIsAdi"> Payee is an ADI (bank cheque)</label>` + f('adi', 'ADI name (if payee is an ADI)', { type: 'text' }) + f('amount', 'Amount', { min: 0, step: 0.01 }) + selectHtml('method', 'Cheque or EFT', 'eft', [{ value: 'eft', label: 'EFT' }, { value: 'cheque', label: 'Cheque' }]) + f('particulars', 'Reason', { type: 'text' });
    else if (type === 'reimbursement') fields += f('amount', 'Amount', { min: 0, step: 0.01 }) + f('officeDebitDate', 'Date the office account was debited', { type: 'date' }) + selectHtml('method', 'Cheque or EFT', 'eft', [{ value: 'eft', label: 'EFT' }, { value: 'cheque', label: 'Cheque' }]) + f('particulars', 'Reason', { type: 'text' });
    else if (type === 'transfer') fields += f('toClient', 'Destination client', { type: 'text' }) + f('toMatter', 'Destination matter reference', { type: 'text' }) + f('toMatterDesc', 'Destination matter description', { type: 'text' }) + f('amount', 'Amount', { min: 0, step: 0.01 }) + f('reason', 'Reason', { type: 'text' }) + f('authorisedBy', 'Authorising person', { type: 'text' });
    else if (type === 'refund') fields += f('amount', 'Amount', { min: 0, step: 0.01 }) + f('payee', 'Account details (name, BSB, account number)', { type: 'text' }) + selectHtml('method', 'Cheque or EFT', 'eft', [{ value: 'eft', label: 'EFT' }, { value: 'cheque', label: 'Cheque' }]);
    else if (type === 'reversal') fields += '<p class="muted">Reverses the receipt in full.</p>';
    else if (type === 'interest') fields += f('amount', 'Amount credited by the ADI', { min: 0, step: 0.01 });
    return `<div class="wt-event-form">${fields}${err ? `<div class="callout callout--danger wt-error">${escapeHtml(err)}${errSources || ''}</div>` : ''}<button type="button" class="btn btn--primary wt-add">Add event</button></div>`;
  },
  mount(container) {
    const render = (opts = {}) => {
      const s = this.state();
      const r = s.receipt;
      const showEvents = s.category === 'general' || s.category === 'controlled' || (r.form === 'cash' && ['transit', 'direction', 'power'].includes(s.category));
      const step1 =
        `<h4>Step 1 - the receipt</h4>` +
        fieldHtml('amount', 'Amount received', r.amount, { min: 0, step: 0.01 }) +
        fieldHtml('dateReceived', 'Date received', r.dateReceived, { type: 'date' }) +
        fieldHtml('dateMadeOut', 'Date receipt made out (if different)', r.dateMadeOut, { type: 'date' }) +
        selectHtml('form', 'Form in which received', r.form, WT_FORMS.map((x) => ({ value: x, label: x }))) +
        fieldHtml('from', 'Received from', r.from, { type: 'text' }) +
        fieldHtml('client', 'Client name', r.client, { type: 'text' }) +
        fieldHtml('matterRef', 'Matter reference', r.matterRef, { type: 'text' }) +
        fieldHtml('matterDesc', 'Matter description', r.matterDesc, { type: 'text' }) +
        fieldHtml('reason', 'Reason for receipt', r.reason, { type: 'text' }) +
        fieldHtml('madeOutBy', 'Name of the person who made out the receipt', r.madeOutBy, { type: 'text' }) +
        selectHtml('category', 'Category', s.category, WT_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))) +
        `<p class="muted calc-note">Not sure of the category? <a href="#trust-accounting--s4-7">Resolve it with the Trust Money Classifier (section 4.7)</a>.</p>` +
        (s.category === 'controlled' ? fieldHtml('practiceName', 'Practice name (for the r 61 name check)', s.practiceName || '', { type: 'text' }) + fieldHtml('cmaName', 'Controlled money account name', s.cmaName, { type: 'text' }) : '');
      const step2 = showEvents
        ? `<h4>Step 2 - subsequent events</h4>` + (s.category === 'billed' ? '' : selectHtml('eventType', 'Event', opts.eventType || 'bill', EVENT_TYPES) + this.eventFormHtml(opts.eventType || 'bill', opts.error, opts.errorBlockedBy === 'overdraw' ? sourcesHtml(SRC.overdraw) : opts.errorBlockedBy === 'method3' ? sourcesHtml([['LPUGR r 42(5)', LPUGR_URL(42)], ['LPUGR r 42(8)', LPUGR_URL(42)], ['Trust Accounting §9.5', '#trust-accounting--s9-5']]) : ''))
        : '';
      container.innerHTML =
        `<div class="calculator-inner calculator--wide"><div class="calculator-head"><h3 class="calculator-title">${escapeHtml(this.title)}</h3><span class="calc-head-actions"><button type="button" class="btn btn--small wt-clear">Clear walkthrough</button> <button type="button" class="btn btn--small calc-reset">Reset to defaults</button></span></div>` +
        `<form class="calculator-form wt-form" autocomplete="off">${step1}</form>` +
        `<div class="calculator-output wt-output"><h4>Records for this receipt</h4>${this.receiptCards(s)}</div>` +
        (showEvents ? `<form class="calculator-form wt-events-form" autocomplete="off">${step2}</form>` : '') +
        `<div class="calculator-output wt-events">${this.eventCards(s)}</div>` +
        `<div class="calculator-output wt-running">${this.runningViews(s)}</div>` +
        formulaHtml(this.formula) +
        `</div>`;
      const form1 = container.querySelector('.wt-form');
      form1.addEventListener('input', (ev) => {
        const v = readForm(form1);
        const cur = this.state();
        const receipt = { ...cur.receipt };
        for (const k of Object.keys(receipt)) if (k in v) receipt[k] = v[k];
        const patch = { receipt, category: v.category, cmaName: v.cmaName ?? cur.cmaName, practiceName: v.practiceName ?? cur.practiceName };
        setCalcState(this.id, patch);
        if (ev.target.name === 'category' || ev.target.name === 'form') render(opts);
        else {
          const st = this.state();
          container.querySelector('.wt-output').innerHTML = '<h4>Records for this receipt</h4>' + this.receiptCards(st);
          container.querySelector('.wt-events').innerHTML = this.eventCards(st);
          container.querySelector('.wt-running').innerHTML = this.runningViews(st);
        }
      });
      form1.addEventListener('submit', (e) => e.preventDefault());
      const form2 = container.querySelector('.wt-events-form');
      if (form2) {
        form2.addEventListener('submit', (e) => e.preventDefault());
        form2.querySelector('select[name=eventType]')?.addEventListener('change', (e) => render({ eventType: e.target.value }));
        form2.querySelector('.wt-add')?.addEventListener('click', () => {
          const v = readForm(form2);
          const type = v.eventType;
          const ev = { type, date: v.date || todayIso(), amount: type === 'reversal' ? toNumber(this.state().receipt.amount) : toNumber(v.amount), method: v.method || 'eft', payee: type === 'bill' ? 'Office account' : v.payee || '', payeeIsAdi: !!v.payeeIsAdi, adi: v.adi || '', particulars: v.particulars || v.reason || (type === 'bill' ? 'Legal costs - bill dated ' + (v.date ? fmtDate(v.date) : '') : type === 'refund' ? 'Refund of unused trust money' : ''), rule42Method: v.rule42Method ? Number(v.rule42Method) : undefined, officeDebitDate: v.officeDebitDate || '', toClient: v.toClient || '', toMatter: v.toMatter || '', toMatterDesc: v.toMatterDesc || '', reason: v.reason || '', authorisedBy: v.authorisedBy || '' };
          const st = this.state();
          const res = wtAddEvent(st, ev);
          if (!res.ok) {
            render({ eventType: type, error: res.error, errorBlockedBy: res.blockedBy });
            container.querySelector('.wt-error')?.scrollIntoView({ block: 'center' });
            return;
          }
          setCalcState(this.id, { events: st.events, chequeSeq: st.chequeSeq, eftSeq: st.eftSeq, journalSeq: st.journalSeq });
          render({ eventType: type });
        });
      }
      container.querySelectorAll('.wt-event-del').forEach((b) =>
        b.addEventListener('click', () => {
          const st = this.state();
          st.events.splice(Number(b.dataset.i), 1);
          setCalcState(this.id, { events: st.events });
          render(opts);
        }),
      );
      container.querySelector('.wt-clear').addEventListener('click', () => {
        const st = this.state();
        const fresh = wtInitialState();
        fresh.receiptSeq = (st.receiptSeq || 1) + 1;
        App.store.update((o) => {
          o.calculators[this.id] = fresh;
        });
        render();
      });
      container.querySelector('.calc-reset').addEventListener('click', () => {
        resetCalcState(this.id);
        render();
      });
    };
    render();
  },
  print() {
    const s = this.state();
    const r = s.receipt;
    return (
      `<div class="calculator-static"><h4 class="calculator-title">${escapeHtml(this.title)}</h4>` +
      kv([['Amount received', money2(toNumber(r.amount))], ['Date received', d(r.dateReceived)], ['Form', eh(r.form)], ['Received from', eh(r.from)], ['Client', eh(r.client)], ['Matter reference', eh(r.matterRef)], ['Matter description', eh(r.matterDesc)], ['Reason', eh(r.reason)], ['Category', escapeHtml((WT_CATEGORIES.find((c) => c.id === s.category) || {}).label || '')]]) +
      this.receiptCards(s) +
      this.eventCards(s).replace(/<button[^>]*>.*?<\/button>/g, '') +
      this.runningViews(s) +
      `</div>`
    );
  },
};

// ---------------------------------------------------------------------------
// 8.11 Supervision Level Selector
// ---------------------------------------------------------------------------
const supervisionCalc = {
  id: 'supervision-level',
  title: 'Supervision Level Selector',
  section: 'people-management-and-supervision--s4-2',
  position: 'end',
  formula: 'Ability low, confidence low → M1\nAbility low, confidence high → M2\nAbility high, confidence low → M3\nAbility high, confidence high → M4\nMeeting cadence: the rows for that level from section 4.4',
  defaults: { ability: 'low', confidence: 'low' },
  compute(s) {
    const level = supervisionLevel(s);
    const t42 = guideBlocks('people-management-and-supervision--s4-2', 'table')[0];
    const t44 = guideBlocks('people-management-and-supervision--s4-4', 'table')[0];
    const rows42 = t42 ? tableRows(t42) : [];
    const rows44 = t44 ? tableRows(t44) : [];
    const row = rows42.find((r) => new RegExp('^<strong>' + level + '</strong>').test(r[0].trim()));
    const cadence = rows44.filter((r) => r[0].includes(level));
    return { level, header42: rows42[0], row, header44: rows44[0], cadence };
  },
  outputs(r) {
    return `<p class="calc-result">Level: <strong>${r.level}</strong></p>` + (r.row ? rowTableHtml(r.header42, [r.row]) : '') + (r.cadence.length ? `<p><strong>Meeting cadence (section 4.4)</strong></p>` + rowTableHtml(r.header44, r.cadence) : '');
  },
  mount(container) {
    const render = () => {
      const s = calcState(this.id, this.defaults);
      container.innerHTML = frameHtml(this, selectHtml('ability', 'Ability', s.ability, [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]) + selectHtml('confidence', 'Confidence', s.confidence, [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]), this.outputs(this.compute(s)));
      const form = container.querySelector('form');
      form.addEventListener('change', () => {
        setCalcState(this.id, readForm(form));
        container.querySelector('.calculator-output').innerHTML = this.outputs(this.compute(calcState(this.id, this.defaults)));
      });
      form.addEventListener('submit', (e) => e.preventDefault());
      container.querySelector('.calc-reset').addEventListener('click', () => {
        resetCalcState(this.id);
        render();
      });
    };
    render();
  },
  print() {
    const s = calcState(this.id, this.defaults);
    const r = this.compute(s);
    return printTable(this.title, [['Ability', s.ability], ['Confidence', s.confidence]], [['Level', r.level], ['Row', r.row ? rowTableHtml(r.header42, [r.row]) : ''], ['Meeting cadence', r.cadence.length ? rowTableHtml(r.header44, r.cadence) : '']], this.formula);
  },
};

// ---------------------------------------------------------------------------
// 8.12 PII Excess Exposure
// ---------------------------------------------------------------------------
const piiCalc = simpleCalc({
  id: 'pii-excess',
  title: 'PII Excess Exposure',
  section: 'risk-management--s10-3',
  formula: 'Standard excess = your excess\nExcess for a claim arising from an unverified payment instruction = 2 × excess',
  defaults: PII_EXCESS_DEFAULTS,
  inputs: [{ name: 'excess', label: 'Your excess amount ($)', min: 0, step: 500 }],
  compute: (s) => piiExcess({ excess: toNumber(s.excess) }),
  outputs: (r) => {
    const bq = guideBlocks('risk-management--s10-3', 'blockquote')[0];
    return outTable([outRow('Standard excess', money0(r.standard)), outRow('Excess for a claim arising from an unverified payment instruction (2 × excess)', `<strong>${money0(r.unverified)}</strong>`, 'calc-primary')]) + (bq ? `<div class="calc-clause">${bq.html}</div>` : '');
  },
  printOutputs: (r) => {
    const bq = guideBlocks('risk-management--s10-3', 'blockquote')[0];
    return [
      ['Standard excess', money0(r.standard)],
      ['Excess for a claim arising from an unverified payment instruction', money0(r.unverified)],
      ['Clause', bq ? bq.html : ''],
    ];
  },
});

// ---------------------------------------------------------------------------
// 8.13 Return Per Salary Dollar reference (chart from the guide's table)
// ---------------------------------------------------------------------------
const returnPerDollarCalc = {
  id: 'return-per-salary-dollar',
  title: 'Return per salary dollar (reference chart)',
  section: 'practice-management--s2-2',
  position: 'end',
  formula: 'Static values from the table in section 2.2; no arithmetic.',
  data() {
    const t = guideBlocks('practice-management--s2-2', 'table')[0];
    if (!t) return [];
    return tableRows(t)
      .slice(1)
      .map((r) => ({ label: stripTags(r[0]), text: stripTags(r[1]), value: toNumber(String(r[1]).replace(/[^0-9.]/g, '')) }));
  },
  mount(container) {
    const rows = this.data();
    const max = Math.max(...rows.map((r) => r.value), 1);
    container.innerHTML = `<div class="calculator-inner"><div class="calculator-head"><h3 class="calculator-title">${escapeHtml(this.title)}</h3></div><div class="bar-chart" role="img" aria-label="Return per salary dollar by level">${rows.map((r) => `<div class="bar-row"><span class="bar-label">${escapeHtml(r.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.round((r.value / max) * 100)}%"></span></span><span class="bar-value">${escapeHtml(r.text)}</span></div>`).join('')}</div>${formulaHtml(this.formula)}</div>`;
  },
  print() {
    const rows = this.data();
    return `<div class="calculator-static"><h4 class="calculator-title">${escapeHtml(this.title)}</h4><table class="calc-print-table"><thead><tr><th>Level</th><th>Return per salary dollar</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.text)}</td></tr>`).join('')}</tbody></table></div>`;
  },
};

// ---------------------------------------------------------------------------
export const CALCULATORS = [profitDriverCalc, costOfProductionCalc, fixedFeeCalc, wipCalc, dilutionCalc, lockstepCalc, statDepCalc, rule42Calc, classifierCalc, walkthroughCalc, supervisionCalc, piiCalc, returnPerDollarCalc];

export function calculatorById(id) {
  return CALCULATORS.find((c) => c.id === id) || null;
}

export function mountCalculators(root) {
  root.querySelectorAll('.calculator[data-calculator]').forEach((el) => {
    if (el.classList.contains('calculator--print')) return;
    const def = calculatorById(el.dataset.calculator);
    if (def) {
      try {
        def.mount(el);
      } catch (e) {
        el.innerHTML = `<p class="callout callout--danger">Calculator failed to render: ${escapeHtml(e.message)}</p>`;
        console.error(e);
      }
    }
  });
}

export function calculatorPrintHtml(id) {
  const def = calculatorById(id);
  if (!def) return '';
  try {
    return def.print();
  } catch (e) {
    return `<p>Calculator print failed: ${escapeHtml(e.message)}</p>`;
  }
}
