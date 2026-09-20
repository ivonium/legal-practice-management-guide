// Secondary pages: landing, glossary, master calendar, citations index, change
// log, settings. Each returns an HTMLElement. Sheet A sections 5.2, 11.4, 13, 14.

const pageCache = new Map();
export function invalidatePageCache(name) {
  if (name) pageCache.delete(name);
  else pageCache.clear();
}

function pageEl(cls, html) {
  const e = el('div', { class: `page ${cls}` });
  e.innerHTML = html;
  return e;
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
export function renderHome() {
  const pack = App.data.pack;
  const o = Layout.overlay;
  const cards = Model.guides
    .map((g) => {
      const card = pack.landing.cards[g.slug] || { html: '' };
      const reading = (o.reading || {})[g.slug] || {};
      const pct = Math.round((reading.progress || 0) * 100);
      const log = (o.changeLog || {})[g.slug] || [];
      const latest = log.length ? log.map((e) => e.date).sort().slice(-1)[0] : null;
      return `<article class="guide-card" data-guide="${escapeAttr(g.slug)}"><h3 class="guide-card-title"><a href="#${escapeAttr(g.slug)}">${escapeHtml(g.title)}</a></h3><p class="guide-card-currency">${g.currency ? 'Law stated as at ' + escapeHtml(g.currency.date) : 'Currency date not stated in source'}${latest ? ` · Change log updated ${escapeHtml(fmtDate(latest))}` : ''}</p><p class="guide-card-desc">${card.html}</p><div class="guide-card-progress"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Reading progress"><div class="progress-fill" style="width:${pct}%"></div></div><span class="muted">${pct}% read${reading.lastAnchor ? ` · <a href="#${escapeAttr(reading.lastAnchor)}">continue</a>` : ''}</span></div><div class="guide-card-actions"><button type="button" class="btn btn--small read-summary-btn" data-guide="${escapeAttr(g.slug)}" aria-haspopup="dialog" aria-controls="summary-dialog">Read summary</button> <a class="btn btn--small btn--primary" href="#${escapeAttr(g.slug)}">Open guide</a></div></article>`;
    })
    .join('');
  const next30 = nextNDays(pack.calendar, todayIso(), 30, o.calendarItems || []);
  const nextHtml = next30.length
    ? `<ul class="next30-list">${next30.map((i) => `<li><time>${escapeHtml(fmtDate(i.date))}</time> ${i.row ? `<a href="#${escapeAttr(i.row.target)}">${i.row.obligationHtml}</a> <span class="muted">(${escapeHtml(i.row.recurrence)})</span>` : `<span class="user-item">${escapeHtml(i.user.text)}</span> <span class="muted">(your item)</span>`}</li>`).join('')}</ul>`
    : '<p class="muted">No dated obligations in the next 30 days.</p>';
  const page = pageEl(
    'landing',
    `<h1 class="landing-title">${escapeHtml(pack.landing.title)}</h1><p class="landing-intro">${pack.landing.intro}</p>` +
      `<div class="guide-cards">${cards}</div>` +
      `<section class="landing-next30"><h2>Next 30 days</h2>${nextHtml}<p><a href="#calendar">Master Compliance Calendar ›</a></p></section>` +
      `<nav class="landing-links" aria-label="Reference pages"><a href="#calendar">Master Compliance Calendar</a><a href="#citations">Citations Index</a><a href="#glossary">Glossary</a><a href="#changelog">Change Log</a><a href="#search" class="focus-search-link">Search</a></nav>`,
  );
  // "Read summary" opens the executive summary as a slide-over (author's answer, DESIGN_NOTES B.4)
  page.querySelectorAll('.read-summary-btn').forEach((btn) => btn.addEventListener('click', () => openSummaryDialog(btn.dataset.guide, btn)));
  return page;
}

// Slide-over executive summary: a native <dialog> so Esc, focus containment and the
// backdrop are provided by the browser; focus returns to the opening button on close.
export function openSummaryDialog(slug, opener) {
  const d = document.getElementById('summary-dialog');
  if (!d) return;
  const g = Model.guide(slug);
  d.querySelector('#summary-dialog-title').textContent = `${g.title} - executive summary`;
  d.querySelector('.slideover-body').innerHTML = `<div class="exec-summary is-open">${execSummaryHtml(slug)}</div><p class="slideover-open"><a class="btn btn--primary" href="#${escapeAttr(slug)}">Open guide</a></p>`;
  d.dataset.guide = slug;
  d.onclose = () => {
    if (opener && document.contains(opener)) opener.focus();
  };
  d.showModal();
  d.querySelector('.slideover-close').focus();
}

// ---------------------------------------------------------------------------
// Glossary
// ---------------------------------------------------------------------------
export function renderGlossary() {
  const pack = App.data.pack;
  const usage = pack.glossaryUsage || {};
  const entries = [...pack.glossary].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const html =
    `<h1>Glossary</h1><p class="muted">${escapeHtml(pack.glossaryNote || '')}</p><p><a href="#back" class="glossary-back btn btn--small">← Back to where you were</a></p>` +
    `<dl class="glossary">${entries
      .map((e) => {
        const guides = (usage[e.term] || []).map((slug) => Model.guide(slug)).filter(Boolean);
        return `<div class="glossary-entry" id="${escapeAttr(e.id)}"><dt>${escapeHtml(e.term)}</dt><dd>${e.html}${guides.length ? `<div class="glossary-guides muted">Appears in: ${guides.map((g) => `<a href="#${escapeAttr(g.slug)}">${escapeHtml(g.title)}</a>`).join(', ')}</div>` : ''}</dd></div>`;
      })
      .join('')}</dl>`;
  const page = pageEl('glossary-page', html);
  page.querySelector('.glossary-back').addEventListener('click', (e) => {
    e.preventDefault();
    App.goBack();
  });
  return page;
}

// ---------------------------------------------------------------------------
// Master compliance calendar
// ---------------------------------------------------------------------------
export function renderCalendar(state = {}) {
  const pack = App.data.pack;
  const rows = pack.calendar;
  const items = Layout.overlay.calendarItems || [];
  const st = { guide: '', category: '', sort: 'n', dir: 1, ...state };
  const categories = [...new Set(rows.map((r) => r.category))];
  const guides = [...new Set(rows.map((r) => r.guide))].map((s) => Model.guide(s)).filter(Boolean);
  const filtered = rows.filter((r) => (!st.guide || r.guide === st.guide) && (!st.category || r.category === st.category));
  const nextDateOf = (r) => {
    const occ = next12Months([r], todayIso());
    return occ.length ? occ[0].date : '9999-12-31';
  };
  const sorters = {
    n: (a, b) => a.n - b.n,
    date: (a, b) => (nextDateOf(a) < nextDateOf(b) ? -1 : nextDateOf(a) > nextDateOf(b) ? 1 : a.n - b.n),
    category: (a, b) => a.category.localeCompare(b.category) || a.n - b.n,
    guide: (a, b) => a.guide.localeCompare(b.guide) || a.n - b.n,
  };
  const sorted = [...filtered].sort((a, b) => sorters[st.sort](a, b) * st.dir);
  const th = (key, label) => `<th><button type="button" class="sort-btn${st.sort === key ? ' is-active' : ''}" data-sort="${key}">${label}${st.sort === key ? (st.dir === 1 ? ' ▲' : ' ▼') : ''}</button></th>`;
  const table = `<div class="table-wrap"><table class="calendar-table"><thead><tr>${th('n', '#')}<th>Obligation</th><th>Recurrence (as supplied)</th>${th('date', 'Interpreted as / next date')}${th('category', 'Category')}${th('guide', 'Guide and section')}<th>Provision</th></tr></thead><tbody>${sorted
    .map((r) => {
      const nd = nextDateOf(r);
      return `<tr><td>${r.n}</td><td>${r.obligationHtml}</td><td><code class="rec">${escapeHtml(r.recurrence)}</code></td><td>${escapeHtml(scheduleLabel(r.schedule))}${nd !== '9999-12-31' ? `<div class="muted">next: ${escapeHtml(fmtDate(nd))}</div>` : ''}</td><td>${escapeHtml(r.category)}</td><td><a href="#${escapeAttr(r.target)}">${escapeHtml(Layout.sectionLabel(r.target))}</a></td><td>${r.provisionHtml}</td></tr>`;
    })
    .join('')}</tbody></table></div>`;
  const timeline = next12Months(rows.filter((r) => filtered.includes(r)), todayIso(), items);
  const byMonth = new Map();
  for (const t of timeline) {
    const k = t.date.slice(0, 7);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(t);
  }
  const timelineHtml = [...byMonth.entries()]
    .map(([k, list]) => {
      const [y, m] = k.split('-').map(Number);
      return `<section class="timeline-month"><h3>${monthName(m)} ${y}</h3><ul>${list.map((t) => `<li><time>${escapeHtml(fmtDate(t.date))}</time> ${t.row ? `<a href="#${escapeAttr(t.row.target)}">${t.row.obligationHtml}</a>${t.label ? ` <span class="muted">(${escapeHtml(t.label)})</span>` : ''}${t.within ? ` <span class="muted">- within ${escapeHtml(t.within)}</span>` : ''} <span class="badge">${escapeHtml(t.row.category)}</span>` : `<span class="user-item">${escapeHtml(t.user.text)}</span> <span class="badge">Your item</span> <button type="button" class="btn-link cal-item-del" data-id="${escapeAttr(t.user.id)}">delete</button>`}</li>`).join('')}</ul></section>`;
    })
    .join('');
  const rules = rulesOnly(filtered);
  const rulesHtml = `<ul class="calendar-rules">${rules.map((r) => `<li><a href="#${escapeAttr(r.target)}">${r.obligationHtml}</a> - <code class="rec">${escapeHtml(r.recurrence)}</code> <span class="badge">${escapeHtml(r.category)}</span> <span class="muted">${r.provisionHtml}</span></li>`).join('')}</ul>`;
  const page = pageEl(
    'calendar-page',
    `<h1>Master Compliance Calendar</h1><p class="muted">${escapeHtml(pack.recurrenceNote || '')}</p>` +
      `<form class="calendar-filters"><label>Guide <select name="guide"><option value="">All guides</option>${guides.map((g) => `<option value="${escapeAttr(g.slug)}"${st.guide === g.slug ? ' selected' : ''}>${escapeHtml(g.title)}</option>`).join('')}</select></label> <label>Category <select name="category"><option value="">All categories</option>${categories.map((c) => `<option value="${escapeAttr(c)}"${st.category === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></label></form>` +
      `<h2>Timeline - next 12 months</h2><div class="calendar-timeline">${timelineHtml || '<p class="muted">No dated items.</p>'}</div>` +
      `<section class="calendar-add"><h3>Add your own dated item</h3><form class="cal-add-form"><label>Date <input type="date" name="date" required></label> <label class="grow">Item <input type="text" name="text" placeholder="e.g. AML/CTF independent evaluation due" required></label> <button type="submit" class="btn btn--small">Add</button></form>${items.length ? `<ul class="cal-items">${items.map((i) => `<li><time>${escapeHtml(fmtDate(i.date))}</time> ${escapeHtml(i.text)} <button type="button" class="btn-link cal-item-del" data-id="${escapeAttr(i.id)}">delete</button></li>`).join('')}</ul>` : ''}</section>` +
      `<h2>Rules and event-driven obligations</h2><p class="muted">Shown as rules rather than dates: "within N days of X", event-driven and ongoing obligations.</p>${rulesHtml}` +
      `<p class="muted">How dated items are expanded: ANNUAL-FIXED with a date recurs on that date each year; QUARTERLY recurs on 31 March, 30 June, 30 September and 31 December; "monthly" recurs on the last day of each month; "during July" is shown on 31 July; "a few weeks before 30 June" is shown on 16 June; "by June 2027" is shown once on 30 June 2027. The "Recurrence (as supplied)" column is the Content Pack text verbatim.</p>` +
      `<h2>All obligations</h2>${table}`,
  );
  page.querySelector('.calendar-filters').addEventListener('change', (e) => {
    const f = e.currentTarget;
    App.replacePage(renderCalendar({ ...st, guide: f.guide.value, category: f.category.value }));
  });
  page.querySelectorAll('.sort-btn').forEach((b) =>
    b.addEventListener('click', () => {
      const key = b.dataset.sort;
      App.replacePage(renderCalendar({ ...st, sort: key, dir: st.sort === key ? -st.dir : 1 }));
    }),
  );
  page.querySelector('.cal-add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    App.store.update((o) => {
      o.calendarItems.push({ id: uuid(), date: f.date.value, text: f.text.value.trim() });
    });
    invalidatePageCache('home');
    App.replacePage(renderCalendar(st));
  });
  page.querySelectorAll('.cal-item-del').forEach((b) =>
    b.addEventListener('click', () => {
      App.store.update((o) => {
        o.calendarItems = o.calendarItems.filter((i) => i.id !== b.dataset.id);
      });
      invalidatePageCache('home');
      App.replacePage(renderCalendar(st));
    }),
  );
  return page;
}

// ---------------------------------------------------------------------------
// Citations index
// ---------------------------------------------------------------------------
export function renderCitations(view = 'instrument') {
  const c = App.data.citations;
  const citeList = (cites) => `<ul class="cite-list">${cites.map((x) => `<li><a href="#${escapeAttr(x.headingId)}">${escapeHtml(x.label)}</a></li>`).join('')}</ul>`;
  let body = '';
  if (view === 'instrument') {
    body = c.instruments
      .map(
        (inst) =>
          `<section class="citation-instrument"><h2>${escapeHtml(inst.name)}${inst.short ? ` <span class="muted">(${escapeHtml(inst.short)})</span>` : ''}${inst.known ? '' : ' <span class="badge">unknown ID</span>'} <code class="muted">${escapeHtml(inst.id)}</code></h2>` +
          (inst.whole.length ? `<div class="citation-provision"><strong>Whole instrument</strong> ${inst.whole.map((w) => `<a href="${escapeAttr(w.href)}" target="_blank" rel="noopener" class="link-legislation">open ↗</a>`).join(' ')}${citeList(inst.whole.flatMap((w) => w.cites))}</div>` : '') +
          `<div class="citation-provisions">${inst.provisions.map((p) => `<div class="citation-provision"><strong>s ${escapeHtml(p.section)}</strong> <a href="${escapeAttr(p.href)}" target="_blank" rel="noopener" class="link-legislation">open ↗</a>${citeList(p.cites)}</div>`).join('')}</div></section>`,
      )
      .join('');
    body += `<section class="citation-instrument"><h2>References without a link in the source</h2><ul class="cite-list">${c.unlinked.map((u) => `<li>${u.html} <span class="badge">no link in source</span> ${u.refs.map((r) => `<a href="#${escapeAttr(r.id)}">${escapeHtml(Layout.sectionLabel(r.id))}</a>`).join(', ')}</li>`).join('')}</ul></section>`;
    body += `<section class="citation-instrument"><h2>Cases</h2><ul class="cite-list">${c.cases.map((k) => `<li>${k.html}</li>`).join('')}</ul></section>`;
  } else {
    body = Model.guides
      .map((g) => {
        const list = c.byGuide[g.slug] || [];
        if (!list.length) return `<section class="citation-guide"><h2>${escapeHtml(g.title)}</h2><p class="muted">No legislation links.</p></section>`;
        const byInst = new Map();
        for (const x of list) {
          if (!byInst.has(x.instrumentId)) byInst.set(x.instrumentId, { name: x.instrumentName, short: x.short, items: [] });
          byInst.get(x.instrumentId).items.push(x);
        }
        return `<section class="citation-guide"><h2>${escapeHtml(g.title)}</h2>${[...byInst.values()].map((i) => `<h3>${escapeHtml(i.name)}</h3><ul class="cite-list">${i.items.map((x) => `<li><a href="${escapeAttr(x.href)}" target="_blank" rel="noopener" class="link-legislation">${x.section ? 's ' + escapeHtml(x.section) : 'whole instrument'}</a> - cited at <a href="#${escapeAttr(x.headingId)}">${escapeHtml(x.label)}</a></li>`).join('')}</ul>`).join('')}</section>`;
      })
      .join('');
  }
  const page = pageEl('citations', `<h1>Citations Index</h1><div class="tabs" role="tablist"><button type="button" class="tab${view === 'instrument' ? ' is-active' : ''}" data-view="instrument">By instrument</button><button type="button" class="tab${view === 'guide' ? ' is-active' : ''}" data-view="guide">By guide</button></div>${body}`);
  page.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => App.replacePage(renderCitations(t.dataset.view))));
  return page;
}

// ---------------------------------------------------------------------------
// Change log page
// ---------------------------------------------------------------------------
export function renderChangeLog() {
  const o = Layout.overlay;
  const diffHtml = (a, b) => wordDiff(a, b).ops.map((op) => (op.type === 'eq' ? escapeHtml(op.text) : op.type === 'del' ? `<del>${escapeHtml(op.text)}</del>` : `<ins>${escapeHtml(op.text)}</ins>`)).join(' ');
  const sections = Model.guides
    .map((g) => {
      const edits = Object.entries(o.edits || {}).filter(([id]) => Model.guideOfAnchor(id) === g.slug);
      const moves = Object.entries(o.moved || {}).filter(([id]) => Model.guideOfAnchor(id) === g.slug);
      const manual = (o.changeLog || {})[g.slug] || [];
      if (!edits.length && !moves.length && !manual.length) return '';
      return (
        `<section class="changelog-guide"><h2>${escapeHtml(g.title)}</h2>` +
        (manual.length ? `<h3>Your entries</h3><ul>${manual.map((e) => `<li><time>${escapeHtml(fmtDate(e.date) || e.date)}</time> ${escapeHtml(e.text)}</li>`).join('')}</ul>` : '') +
        (edits.length
          ? `<h3>Edited blocks</h3>${edits
              .map(([id, e]) => {
                const b = Model.block(id);
                return `<div class="changelog-item"><div class="changelog-meta"><time>${escapeHtml(fmtDateTime(e.editedAt))}</time> · <a href="#${escapeAttr(id)}">${escapeHtml(Layout.sectionLabel(b ? b.node.headingId : id))}</a></div><div class="diff">${diffHtml(b ? b.node.text : '', e.text)}</div></div>`;
              })
              .join('')}`
          : '') +
        (moves.length ? `<h3>Moved blocks</h3><ul>${moves.map(([id, m]) => `<li><time>${escapeHtml(fmtDateTime(m.movedAt))}</time> <a href="#${escapeAttr(id)}">block</a> moved from <em>${escapeHtml(Layout.sectionLabel(m.from, { short: true }))}</em> to <em>${escapeHtml(Layout.sectionLabel(m.to, { short: true }))}</em></li>`).join('')}</ul>` : '') +
        `</section>`
      );
    })
    .join('');
  return pageEl('changelog-page', `<h1>Change Log</h1><p class="muted">Every edited or moved block, with a before / after comparison, plus your own dated entries from each guide's change log.</p>${sections || '<p class="muted">No edits, moves or change log entries yet.</p>'}`);
}

export function changeLogPrintHtml() {
  const page = renderChangeLog();
  return page.innerHTML;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export function renderSettings() {
  const o = Layout.overlay;
  const page = pageEl(
    'settings-page',
    `<h1>Settings</h1>` +
      `<section class="settings-group"><h2>Firm</h2><label>Firm name (used on the print cover page) <input type="text" id="set-firm" value="${escapeAttr(o.settings.firmName || '')}" placeholder="[firm name placeholder]"></label></section>` +
      `<section class="settings-group"><h2>Search and print</h2><label><input type="checkbox" id="set-print-notes"${o.settings.printIncludeNotes ? ' checked' : ''}> Include my notes when printing</label><label>Default search scope <select id="set-scope"><option value="all"${o.settings.searchScope === 'all' ? ' selected' : ''}>All guides</option><option value="guide"${o.settings.searchScope === 'guide' ? ' selected' : ''}>This guide only</option></select></label></section>` +
      `<section class="settings-group"><h2>Your data</h2><p class="muted">Storage: ${escapeHtml(App.store.backend)} · overlay size ${escapeHtml((App.store.serialise().length / 1024).toFixed(1))} KB · last updated ${escapeHtml(fmtDateTime(o.updatedAt))}</p><p><button type="button" class="btn" id="set-export-overlay">Export overlay (JSON)</button> <label class="btn">Import overlay (JSON) <input type="file" id="set-import-overlay" accept="application/json,.json" hidden></label> <button type="button" class="btn btn--primary" id="set-export-file">Export new master file</button></p></section>` +
      `<section class="settings-group settings-danger"><h2>Reset</h2><p>Removes all notes, edits, checklist progress, calculator inputs and calendar items from this browser. Type <code>RESET</code> to confirm.</p><input type="text" id="set-reset-confirm" placeholder="RESET"> <button type="button" class="btn btn--danger" id="set-reset">Reset all notes and edits</button></section>` +
      `<section class="settings-group"><h2>${escapeHtml(App.data.pack.colophon.title)}</h2>${App.data.pack.colophon.paragraphs.map((p) => `<p>${p}</p>`).join('')}<p class="muted">Built ${escapeHtml(App.data.meta.builtAt)}${document.documentElement.dataset.exportedAt ? ` · exported ${escapeHtml(document.documentElement.dataset.exportedAt)}` : ''}.</p></section>`,
  );
  page.querySelector('#set-firm').addEventListener('input', (e) => App.store.update((ov) => (ov.settings.firmName = e.target.value)));
  page.querySelector('#set-print-notes').addEventListener('change', (e) => App.store.update((ov) => (ov.settings.printIncludeNotes = e.target.checked)));
  page.querySelector('#set-scope').addEventListener('change', (e) => {
    App.store.update((ov) => (ov.settings.searchScope = e.target.value));
    App.updateScopeUi();
  });
  page.querySelector('#set-export-overlay').addEventListener('click', () => {
    App.download(`PracticeGuides-overlay-${todayIso()}.json`, App.store.serialise(), 'application/json');
  });
  page.querySelector('#set-import-overlay').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      if (!confirm('Replace your current notes and edits with the imported overlay?')) return;
      await App.store.replace(parsed);
      App.reloadFromOverlay();
      App.toast('Overlay imported.');
    } catch (err) {
      alert('Could not import: ' + err.message);
    }
  });
  page.querySelector('#set-export-file').addEventListener('click', () => App.exportMasterFile());
  page.querySelector('#set-reset').addEventListener('click', async () => {
    if (page.querySelector('#set-reset-confirm').value !== 'RESET') return alert('Type RESET to confirm.');
    await App.store.reset();
    App.reloadFromOverlay();
    App.toast('All notes and edits removed.');
  });
  return page;
}
