// Guide rendering - Sheet A section 5.3. Builds the DOM for one guide from the
// content model and the effective layout. Dynamic parts (calculators, notes,
// checklists, edit hooks) are mounted after insertion.

const guideDomCache = new Map();

export function invalidateGuideDom(slug) {
  if (slug) guideDomCache.delete(slug);
  else guideDomCache.clear();
}

export function extrasForSection(sectionId) {
  const out = { start: [], end: [], afterTable: [] };
  for (const c of CALCULATORS) if (c.section === sectionId) out[c.position === 'start' ? 'start' : 'end'].push({ kind: 'calculator', def: c });
  for (const d of DIAGRAM_SLOTS) if (d.section === sectionId) (d.position === 'start' ? out.start : d.position === 'after-table' ? out.afterTable : out.end).push({ kind: 'diagram', def: d });
  return out;
}

function extraHtml(x, mode) {
  if (x.kind === 'diagram') return diagramSlotHtml(x.def);
  if (mode === 'print') return `<div class="calculator calculator--print" data-calculator="${escapeAttr(x.def.id)}">${calculatorPrintHtml(x.def.id)}</div>`;
  return `<div class="calculator" id="calc-${escapeAttr(x.def.id)}" data-calculator="${escapeAttr(x.def.id)}"></div>`;
}

export function renderBlockHtml(node, sectionId, mode = 'screen') {
  if (node.kind === 'hr') return '<hr class="content-hr">';
  const edited = Layout.isEdited(node.id);
  const html = Layout.blockHtml(node);
  const e = Layout.overlay.edits[node.id];
  const cls = `block block--${node.type}${edited ? ' is-edited' : ''}${node.checklist ? ' checklist' : ''}`;
  let meta = '';
  if (edited) meta = `<div class="block-meta"><span class="edited-marker" title="${escapeAttr(fmtDateTime(e.editedAt))}">edited ${escapeHtml(fmtDateTime(e.editedAt))}</span>${mode === 'screen' ? '<button type="button" class="btn btn--small revert-btn" data-block="' + escapeAttr(node.id) + '">Revert to original</button>' : ''}</div>`;
  const tools = mode === 'screen' ? `<div class="block-tools edit-only"><span class="drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</span><button type="button" class="btn btn--small move-btn" data-block="${escapeAttr(node.id)}">Move to…</button></div>` : '';
  return `<div class="${cls}" id="${escapeAttr(node.id)}" data-block="${escapeAttr(node.id)}" data-section="${escapeAttr(sectionId)}" data-type="${escapeAttr(node.type)}">${tools}<div class="block-content">${html}</div>${meta}</div>`;
}

export function renderBlocksHtml(sectionId, mode = 'screen') {
  const nodes = Layout.sectionBlocks(sectionId);
  const extras = extrasForSection(sectionId);
  let out = '';
  for (const x of extras.start) out += extraHtml(x, mode);
  let tableSeen = false;
  for (const n of nodes) {
    out += renderBlockHtml(n, sectionId, mode);
    if (!tableSeen && n.kind === 'block' && n.type === 'table') {
      tableSeen = true;
      for (const x of extras.afterTable) out += extraHtml(x, mode);
    }
  }
  if (!tableSeen) for (const x of extras.afterTable) out += extraHtml(x, mode);
  for (const x of extras.end) out += extraHtml(x, mode);
  return out;
}

function sectionCollapsed(id) {
  return !!(Layout.overlay.collapsed || {})[id];
}

export function renderSectionHtml(sec, mode = 'screen') {
  const lvl = sec.level;
  const tag = `h${Math.min(6, lvl)}`;
  const collapsed = mode === 'screen' && lvl === 2 && sectionCollapsed(sec.id);
  const subs = Layout.subsections(sec);
  const notesArea = `<div class="notes-area" data-anchor="${escapeAttr(sec.id)}"></div>`;
  const toggle = lvl === 2 ? `<button type="button" class="section-toggle" aria-expanded="${collapsed ? 'false' : 'true'}" aria-controls="${escapeAttr(sec.id)}-body" title="${collapsed ? 'Expand section' : 'Collapse section'}"><span class="chev" aria-hidden="true"></span></button>` : '';
  const tools = mode === 'screen' ? `<div class="section-tools screen-only"><button type="button" class="btn-icon notes-btn" data-anchor="${escapeAttr(sec.id)}" title="Notes for this section" aria-label="Notes for this section">✎<span class="note-count" data-anchor="${escapeAttr(sec.id)}"></span></button><button type="button" class="btn btn--small edit-only restore-order-btn" data-section="${escapeAttr(sec.id)}" title="Restore original block order">Restore original order</button></div>` : '';
  const runningHead = mode === 'print' && lvl === 2 ? `<div class="print-running-head" data-dev="DEV-003">${escapeHtml(Model.guide(Model.guideOfAnchor(sec.id)).title)}</div>` : '';
  return (
    `<section class="section section--h${lvl}${collapsed ? ' is-collapsed' : ''}" id="${escapeAttr(sec.id)}" data-section="${escapeAttr(sec.id)}" data-level="${lvl}">` +
    runningHead +
    `<div class="section-head">${toggle}<${tag} class="section-title">${sec.heading.html}</${tag}>${tools}</div>` +
    `<div class="section-body" id="${escapeAttr(sec.id)}-body">` +
    `<div class="blocks" data-section="${escapeAttr(sec.id)}">${renderBlocksHtml(sec.id, mode)}</div>` +
    notesArea +
    (subs.length ? `<div class="subsections">${subs.map((s) => renderSectionHtml(s, mode)).join('')}</div>` : '') +
    `</div></section>`
  );
}

export function currencyBannerHtml(guide) {
  const link = guide.currencySectionId ? ` <a href="#${escapeAttr(guide.currencySectionId)}" class="currency-link">What changed after the course material was written</a>` : '';
  if (guide.currency) return `<div class="callout callout--currency currency-banner">Law stated as at <strong>${escapeHtml(guide.currency.date)}</strong>.${link}</div>`;
  return `<div class="callout callout--currency currency-banner">Currency date not stated in source.${link}</div>`;
}

export function execSummaryHtml(slug, opts = {}) {
  const s = App.data.pack.summaries[slug];
  if (!s) return '';
  // Author decision (BUILD_NOTES E.14): the "→ guide §n" notation is normalised to a
  // consistent section badge at the end of each item; the item text is verbatim.
  const items = s.items
    .map((it) => `<li><a href="#${escapeAttr(it.target)}" class="summary-link">${it.html}</a><a href="#${escapeAttr(it.target)}" class="summary-ref" aria-label="Go to section ${escapeAttr(it.section)}">§ ${escapeHtml(it.section)}</a></li>`)
    .join('');
  return `<div class="exec-summary-body"><p class="exec-summary-intro">${s.intro}</p><p class="exec-summary-label"><strong>Main areas</strong></p><ol class="exec-summary-list">${items}</ol></div>`;
}

export function renderGuideHtml(slug, mode = 'screen') {
  const g = Model.guide(slug);
  const sections = Layout.guideSections(slug);
  const { prev, next } = Model.prevNext(slug);
  const preambleBlocks = renderBlocksHtml(slug, mode);
  const summaryOpen = mode === 'print' || !((Layout.overlay.reading || {})[slug] || {}).lastRead;
  const header =
    `<header class="guide-header">` +
    (mode === 'screen' ? `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="#home">Home</a> <span class="crumb-sep">›</span> <a href="#${escapeAttr(slug)}" class="crumb-guide">${escapeHtml(g.title)}</a> <span class="crumb-section"></span></nav>` : '') +
    `<h1 class="guide-title">${g.h1 ? g.h1.html : escapeHtml(g.title)}</h1>` +
    `<div class="guide-preamble blocks" data-section="${escapeAttr(slug)}">${preambleBlocks}</div>` +
    currencyBannerHtml(g) +
    (mode === 'screen'
      ? `<details class="changelog changelog--guide" data-guide="${escapeAttr(slug)}"><summary>Change log</summary><div class="changelog-body"></div></details>` +
        `<div class="guide-notes"><div class="notes-area notes-area--guide" data-anchor="${escapeAttr(slug)}" data-label="Guide notes"></div></div>` +
        `<div class="guide-tools screen-only"><div class="tabs" role="tablist"><button type="button" class="tab is-active" role="tab" data-tab="summary" aria-selected="true">Summary</button><button type="button" class="tab" role="tab" data-tab="contents" aria-selected="false">Contents</button></div><div class="guide-actions"><button type="button" class="btn btn--small expand-all-btn">Expand all</button><button type="button" class="btn btn--small collapse-all-btn">Collapse all</button><button type="button" class="btn btn--small print-guide-btn" data-guide="${escapeAttr(slug)}">Print this guide</button><button type="button" class="btn btn--small edit-only restore-guide-order-btn" data-guide="${escapeAttr(slug)}">Restore original section order</button></div></div>`
      : '') +
    `<section class="exec-summary${summaryOpen ? ' is-open' : ''}" data-tabpanel="summary" aria-label="Executive summary"><h2 class="exec-summary-title">Executive summary</h2>${execSummaryHtml(slug)}</section>` +
    (mode === 'screen' ? `<section class="guide-contents" data-tabpanel="contents" hidden><h2 class="exec-summary-title">Contents</h2>${contentsListHtml(slug)}</section>` : '') +
    `</header>`;
  const body = `<div class="guide-body">${sections.map((s) => renderSectionHtml(s, mode)).join('')}</div>`;
  const footer =
    mode === 'screen'
      ? `<footer class="guide-footer"><nav class="prev-next" aria-label="Previous and next guide">${prev ? `<a class="prev-link" href="#${escapeAttr(prev.slug)}">‹ ${escapeHtml(prev.title)}</a>` : '<span></span>'}${next ? `<a class="next-link" href="#${escapeAttr(next.slug)}">${escapeHtml(next.title)} ›</a>` : '<span></span>'}</nav><a href="#top" class="back-to-top">Back to top</a></footer>`
      : '';
  return `<article class="guide" id="${escapeAttr(slug)}" data-guide="${escapeAttr(slug)}">${header}${body}${footer}</article>`;
}

export function contentsListHtml(slug) {
  const secs = Layout.guideSections(slug);
  return `<ol class="contents-list">${secs
    .map((s) => {
      const subs = Layout.subsections(s);
      return `<li><a href="#${escapeAttr(s.id)}">${escapeHtml(s.heading.text)}</a>${subs.length ? `<ol>${subs.map((x) => `<li><a href="#${escapeAttr(x.id)}">${escapeHtml(x.heading.text)}</a></li>`).join('')}</ol>` : ''}</li>`;
    })
    .join('')}</ol>`;
}

export function getGuideElement(slug, force = false) {
  if (!force && guideDomCache.has(slug)) return guideDomCache.get(slug);
  const tpl = document.createElement('template');
  tpl.innerHTML = renderGuideHtml(slug, 'screen');
  const article = tpl.content.firstElementChild;
  mountGuideDynamics(article);
  guideDomCache.set(slug, article);
  return article;
}

export function mountGuideDynamics(article) {
  const slug = article.dataset.guide;
  mountCalculators(article);
  mountDiagrams(article);
  mountNotes(article);
  mountChecklists(article);
  renderGuideChangeLog(article, slug);
  // section toggles
  article.querySelectorAll('.section-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('.section');
      setSectionCollapsed(sec.id, !sec.classList.contains('is-collapsed'));
    });
  });
  article.querySelector('.expand-all-btn')?.addEventListener('click', () => article.querySelectorAll('.section--h2').forEach((s) => setSectionCollapsed(s.id, false)));
  article.querySelector('.collapse-all-btn')?.addEventListener('click', () => article.querySelectorAll('.section--h2').forEach((s) => setSectionCollapsed(s.id, true)));
  article.querySelector('.print-guide-btn')?.addEventListener('click', () => printGuide(slug));
  article.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      article.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      article.querySelectorAll('[data-tabpanel]').forEach((p) => {
        const on = p.dataset.tabpanel === tab.dataset.tab;
        p.hidden = !on;
        p.classList.toggle('is-open', on);
      });
    });
  });
  const summary = article.querySelector('.exec-summary');
  if (summary) {
    summary.hidden = false;
    // collapsible: expanded by default on first visit
    const title = summary.querySelector('.exec-summary-title');
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    const toggle = () => summary.classList.toggle('is-open');
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
    title.setAttribute('aria-expanded', summary.classList.contains('is-open') ? 'true' : 'false');
  }
  mountEditHooks(article);
}

export function setSectionCollapsed(id, collapsed) {
  document.querySelectorAll(`.section[data-section="${CSS.escape(id)}"]`).forEach((sec) => {
    sec.classList.toggle('is-collapsed', collapsed);
    const btn = sec.querySelector(':scope > .section-head .section-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.title = collapsed ? 'Expand section' : 'Collapse section';
    }
  });
  App.store.update((o) => {
    if (collapsed) o.collapsed[id] = true;
    else delete o.collapsed[id];
  });
}

// Expand every ancestor section of an element/anchor so it is visible
export function expandAncestors(el) {
  let sec = el.closest ? el.closest('.section') : null;
  while (sec) {
    if (sec.classList.contains('is-collapsed')) setSectionCollapsed(sec.id, false);
    sec = sec.parentElement ? sec.parentElement.closest('.section') : null;
  }
}

export function renderGuideChangeLog(article, slug) {
  const det = article.querySelector('.changelog--guide .changelog-body');
  if (!det) return;
  const entries = (Layout.overlay.changeLog || {})[slug] || [];
  det.innerHTML =
    `<ul class="changelog-entries">${entries.map((e, i) => `<li><time>${escapeHtml(fmtDate(e.date) || e.date)}</time> ${escapeHtml(e.text)} <button type="button" class="btn-link changelog-del" data-i="${i}" aria-label="Delete entry">delete</button></li>`).join('') || '<li class="muted">No entries yet.</li>'}</ul>` +
    `<form class="changelog-form"><label>Date <input type="date" name="date" value="${todayIso()}" required></label> <label class="grow">Entry <input type="text" name="text" placeholder="Updated s 13 after Law Society circular of …" required></label> <button type="submit" class="btn btn--small">Add entry</button></form>`;
  det.querySelector('.changelog-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    App.store.update((o) => {
      (o.changeLog[slug] = o.changeLog[slug] || []).push({ date: f.date.value, text: f.text.value.trim() });
    });
    renderGuideChangeLog(article, slug);
    invalidatePageCache('home');
  });
  det.querySelectorAll('.changelog-del').forEach((b) =>
    b.addEventListener('click', () => {
      App.store.update((o) => o.changeLog[slug].splice(Number(b.dataset.i), 1));
      renderGuideChangeLog(article, slug);
    }),
  );
}
