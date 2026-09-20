// Master compliance calendar expansion - Sheet A section 14.2. Pure functions.
// rows: content pack calendar rows with `schedule` interpreted at build time.

// Expand dated occurrences within [fromIso, toIso] inclusive.
export function expandCalendar(rows, fromIso, toIsoDate, userItems = []) {
  const from = parseIso(fromIso);
  const to = parseIso(toIsoDate);
  const out = [];
  const inRange = (iso) => iso >= fromIso && iso <= toIsoDate;
  const years = [];
  for (let y = from.y; y <= to.y; y++) years.push(y);
  for (const row of rows) {
    const s = row.schedule || { kind: 'rule', dates: [] };
    if (s.kind === 'annual' || s.kind === 'quarterly') {
      for (const y of years) for (const d of s.dates) {
        const day = Math.min(d.day, lastDayOfMonth(y, d.month));
        const iso = toIso(y, d.month, day);
        if (inRange(iso)) out.push({ date: iso, row, label: s.label || null, within: s.within || null });
      }
    } else if (s.kind === 'monthly') {
      for (const y of years) for (let m = 1; m <= 12; m++) {
        const iso = toIso(y, m, lastDayOfMonth(y, m));
        if (inRange(iso)) out.push({ date: iso, row, label: 'Month end', within: null });
      }
    } else if (s.kind === 'once') {
      for (const d of s.dates) {
        const iso = toIso(d.year, d.month, d.day);
        if (inRange(iso)) out.push({ date: iso, row, label: s.label || null, within: null });
      }
    }
  }
  for (const item of userItems) {
    if (item && item.date && inRange(item.date)) out.push({ date: item.date, row: null, user: item, label: null, within: null });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.row ? a.row.n : 9999) - (b.row ? b.row.n : 9999)));
  return out;
}

// Plain-language statement of how a recurrence code is expanded (BUILD_NOTES E.4).
export function scheduleLabel(schedule) {
  const s = schedule || { kind: 'rule' };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = (x) => `${x.day} ${MON[x.month - 1]}`;
  if (s.kind === 'annual') return `Annual: ${s.dates.map(d).join(', ')}${s.label ? ` (${s.label})` : ''}`;
  if (s.kind === 'quarterly') return `Quarterly: ${s.dates.map(d).join(', ')}${s.within ? `, then within ${s.within}` : ''}`;
  if (s.kind === 'monthly') return 'Monthly: last day of each month';
  if (s.kind === 'once') return `Once: ${s.dates.map((x) => `${x.day} ${MON[x.month - 1]} ${x.year}`).join(', ')}`;
  if (s.kind === 'within') return 'Within a period after a trigger (not dated)';
  if (s.kind === 'event') return 'On an event (not dated)';
  if (s.kind === 'ongoing') return 'Ongoing (not dated)';
  if (s.kind === 'annual-rule') return 'Annual, date set by the practice (not dated)';
  return 'Rule (not dated)';
}

export function rulesOnly(rows) {
  return rows.filter((r) => !['annual', 'quarterly', 'monthly', 'once'].includes((r.schedule || {}).kind));
}

export function nextNDays(rows, todayIso, n, userItems = []) {
  return expandCalendar(rows, todayIso, addDays(todayIso, n), userItems);
}

export function next12Months(rows, todayIso, userItems = []) {
  const p = parseIso(todayIso);
  const end = toIso(p.y + 1, p.m, Math.min(p.d, lastDayOfMonth(p.y + 1, p.m)));
  return expandCalendar(rows, todayIso, end, userItems);
}
