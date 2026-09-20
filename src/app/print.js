// DEV-003: print running header/footer. Chrome supports neither @page margin boxes
// nor named strings, so the PDF pipeline (src/build/pdf.js) supplies the header and
// "Page X of Y" footer and each H2 carries a .print-running-head line (below).
// Print and PDF - Sheet A section 15. Builds a print-only document tree
// (cover, landing summary, table of contents, guides, glossary, calendar,
// citations, change log appendix, colophon) into #print-root.

function guideDates() {
  const dates = Model.guides.map((g) => g.currency && g.currency.iso).filter(Boolean).sort();
  return { earliest: dates[0] || null, latest: dates[dates.length - 1] || null };
}

export function coverHtml() {
  const { earliest, latest } = guideDates();
  const firm = (Layout.overlay.settings || {}).firmName || 'Ivan Law';
  const exported = document.documentElement.dataset.exportedAt || App.data.meta.builtAt;
  return `<section class="print-cover"><h1 class="print-cover-title">${escapeHtml(App.data.pack.landing.title)}</h1><p class="print-cover-firm">Prepared for ${escapeHtml(firm)}</p><p class="print-cover-date">Export date: ${escapeHtml(fmtDate(todayIso()))}${exported ? ` (file exported ${escapeHtml(String(exported).slice(0, 10))})` : ''}</p><p class="print-cover-currency">Law stated as at ${earliest === latest ? escapeHtml(fmtDate(latest)) : `${escapeHtml(fmtDate(earliest))} to ${escapeHtml(fmtDate(latest))}`}${Model.guides.some((g) => !g.currency) ? ' (one guide states no currency date)' : ''}</p></section>`;
}

export function landingSummaryHtml() {
  const pack = App.data.pack;
  return `<section class="print-landing"><h1>${escapeHtml(pack.landing.title)}</h1><p>${pack.landing.intro}</p><table class="print-guide-table"><thead><tr><th>Guide</th><th>Law stated as at</th><th>Description</th></tr></thead><tbody>${Model.guides.map((g) => `<tr><td>${escapeHtml(g.title)}</td><td>${g.currency ? escapeHtml(g.currency.date) : 'not stated'}</td><td>${(pack.landing.cards[g.slug] || {}).html || ''}</td></tr>`).join('')}</tbody></table></section>`;
}

export function tocHtml(slugs) {
  const entries = [];
  for (const slug of slugs) {
    const g = Model.guide(slug);
    // Markup contract for the designer's TOC rules: li is the flex row, the link and the
    // page number are siblings, the leader is drawn by li::after. The page number span
    // carries data-href for target-counter() and data-page for the measured pass.
    const entry = (id, text) => `<a class="toc-link" href="#${escapeAttr(id)}"><span class="toc-text">${escapeHtml(text)}</span></a><span class="toc-page" data-href="#${escapeAttr(id)}" data-page=""></span>`;
    entries.push(`<li class="toc-guide">${entry(slug, g.title)}</li><li class="toc-sub"><ol>${Layout.guideSections(slug)
      .map((s) => `<li class="toc-h2">${entry(s.id, s.heading.text)}</li>`)
      .join('')}</ol></li>`);
  }
  const extra = ['glossary', 'calendar', 'citations', 'changelog-appendix', 'colophon'].map((id) => ({ id, label: { glossary: 'Glossary', calendar: 'Master Compliance Calendar', citations: 'Citations Index', 'changelog-appendix': 'Change Log', colophon: 'About these guides' }[id] }));
  return `<section class="print-toc" id="print-toc"><h1>Table of Contents</h1><ol class="toc">${entries.join('')}${extra.map((x) => `<li class="toc-guide"><a class="toc-link" href="#print-${escapeAttr(x.id)}"><span class="toc-text">${escapeHtml(x.label)}</span></a><span class="toc-page" data-href="#print-${escapeAttr(x.id)}" data-page=""></span></li>`).join('')}</ol></section>`;
}

function glossaryPrintHtml() {
  const entries = [...App.data.pack.glossary].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  return `<section class="print-section" id="print-glossary"><h1>Glossary</h1><dl class="glossary">${entries.map((e) => `<div class="glossary-entry"><dt>${escapeHtml(e.term)}</dt><dd>${e.html}</dd></div>`).join('')}</dl></section>`;
}
function calendarPrintHtml() {
  const rows = App.data.pack.calendar;
  return `<section class="print-section" id="print-calendar"><h1>Master Compliance Calendar</h1><table class="calendar-table"><thead><tr><th>#</th><th>Obligation</th><th>Recurrence (as supplied)</th><th>Interpreted as</th><th>Category</th><th>Guide and section</th><th>Provision</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.n}</td><td>${r.obligationHtml}</td><td>${escapeHtml(r.recurrence)}</td><td>${escapeHtml(scheduleLabel(r.schedule))}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(Layout.sectionLabel(r.target))}</td><td>${r.provisionHtml}</td></tr>`).join('')}</tbody></table>${(Layout.overlay.calendarItems || []).length ? `<h2>Your items</h2><ul>${Layout.overlay.calendarItems.map((i) => `<li>${escapeHtml(fmtDate(i.date))} - ${escapeHtml(i.text)}</li>`).join('')}</ul>` : ''}</section>`;
}
function citationsPrintHtml() {
  const c = App.data.citations;
  return `<section class="print-section" id="print-citations"><h1>Citations Index</h1>${c.instruments
    .map((inst) => `<h2>${escapeHtml(inst.name)}${inst.short ? ` (${escapeHtml(inst.short)})` : ''}</h2>${inst.provisions.map((p) => `<p><strong>s ${escapeHtml(p.section)}</strong> - ${p.cites.map((x) => escapeHtml(x.label)).join('; ')}</p>`).join('')}${inst.whole.length ? `<p><strong>Whole instrument</strong> - ${inst.whole.flatMap((w) => w.cites).map((x) => escapeHtml(x.label)).join('; ')}</p>` : ''}`)
    .join('')}<h2>References without a link in the source</h2><ul>${c.unlinked.map((u) => `<li>${u.html} - ${u.refs.map((r) => escapeHtml(Layout.sectionLabel(r.id))).join('; ')}</li>`).join('')}</ul><h2>Cases</h2><ul>${c.cases.map((k) => `<li>${k.html}</li>`).join('')}</ul></section>`;
}
function colophonHtml() {
  const col = App.data.pack.colophon;
  return `<section class="print-section print-colophon" id="print-colophon"><h1>${escapeHtml(col.title)}</h1>${col.paragraphs.map((p) => `<p>${p}</p>`).join('')}<p class="muted">Law stated as at the date shown at the head of each guide. Generated ${escapeHtml(fmtDate(todayIso()))}.</p></section>`;
}

export function buildPrintRoot(mode, slug) {
  const root = document.getElementById('print-root');
  const includeNotes = !!(Layout.overlay.settings || {}).printIncludeNotes;
  const slugs = mode === 'all' ? Model.guides.map((g) => g.slug) : [slug];
  let html = '';
  if (mode === 'all') html += coverHtml() + landingSummaryHtml() + tocHtml(slugs);
  for (const s of slugs) html += renderGuideHtml(s, 'print');
  if (mode === 'all') {
    html += glossaryPrintHtml() + calendarPrintHtml() + citationsPrintHtml();
    if (includeNotes) html += `<section class="print-section" id="print-changelog-appendix"><h1>Appendix - Change Log</h1>${changeLogPrintHtml()}</section>`;
    else html += `<section class="print-section" id="print-changelog-appendix" hidden></section>`;
    html += colophonHtml();
  }
  root.innerHTML = html;
  // notes
  if (includeNotes) root.querySelectorAll('.notes-area').forEach((a) => renderNotesArea(a));
  else root.querySelectorAll('.notes-area').forEach((a) => a.remove());
  root.querySelectorAll('.add-note-btn, .note-actions').forEach((b) => b.remove());
  // checklists with state
  root.querySelectorAll('input.checklist-box').forEach((box) => {
    box.checked = checklistState(box.id, box.dataset.default === '1');
    box.disabled = true;
  });
  root.querySelectorAll('.section').forEach((s) => s.classList.remove('is-collapsed'));
  mountDiagrams(root, { readOnly: true });
  return root;
}

let printing = null;
export function enterPrintMode(mode, slug) {
  const root = buildPrintRoot(mode, slug);
  const main = document.getElementById('main');
  printing = { mode, slug, mainChildren: Array.from(main.childNodes) };
  main.innerHTML = '';
  document.body.classList.add('is-printing');
  document.documentElement.dataset.printMode = mode;
  return root;
}
export function exitPrintMode() {
  if (!printing) return;
  const main = document.getElementById('main');
  main.innerHTML = '';
  for (const n of printing.mainChildren) main.append(n);
  document.getElementById('print-root').innerHTML = '';
  document.body.classList.remove('is-printing');
  delete document.documentElement.dataset.printMode;
  printing = null;
}

export function printGuide(slug) {
  enterPrintMode('guide', slug);
  setTimeout(() => window.print(), 50);
}
export function printEverything() {
  enterPrintMode('all');
  setTimeout(() => window.print(), 50);
}

if (typeof window !== 'undefined') {
  window.addEventListener('afterprint', () => {
    if (!new URLSearchParams(location.search).get('print')) exitPrintMode();
  });
}
