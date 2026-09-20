// Application shell, routing, rails, search UI, export - Sheet A sections 3, 5, 6, 9, 17.

export const App = {
  data: null,
  store: null,
  index: null,
  editMode: false,
  currentGuide: null,
  currentSection: null,
  pendingHighlight: null,
  history: [],
  navigate(hash) {
    if (!hash.startsWith('#')) hash = '#' + hash;
    if (location.hash === hash) onRoute();
    else location.hash = hash;
  },
  goBack() {
    const prev = App.history.length > 1 ? App.history[App.history.length - 2] : '#home';
    App.navigate(prev);
  },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => (t.hidden = true), 4000);
  },
  download(name, content, type = 'text/html') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  },
  replacePage(pageEl) {
    const main = document.getElementById('main');
    main.innerHTML = '';
    main.append(pageEl);
  },
  rerenderGuide(slug, anchor) {
    const y = window.scrollY;
    invalidateGuideDom(slug);
    if (App.currentGuide === slug) {
      showGuide(slug, anchor, { keepScroll: true });
      if (!anchor) window.scrollTo(0, y);
    }
    refreshLeftRail();
  },
  reloadFromOverlay() {
    invalidateGuideDom();
    invalidatePageCache();
    rebuildIndex();
    onRoute();
    refreshLeftRail();
  },
  updateScopeUi,
  exportMasterFile,
};

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
export async function boot() {
  const modelEl = document.getElementById('content-model');
  App.data = JSON.parse(modelEl.textContent);
  Model.init(App.data);
  App.store = new Store();
  const embedded = document.getElementById('user-overlay');
  await App.store.load(embedded ? embedded.textContent.trim() : '');
  Layout.init(App.store);
  App.index = new SearchIndex();
  rebuildIndex();
  buildShell();
  App.store.onChange(onStoreChange);
  updateScopeUi();
  const params = new URLSearchParams(location.search);
  if (params.get('print')) {
    const mode = params.get('print') === 'all' ? 'all' : 'guide';
    const slug = params.get('guide') || Model.guides[0].slug;
    enterPrintMode(mode, mode === 'guide' ? slug : undefined);
    document.documentElement.dataset.printReady = '1';
    return;
  }
  window.addEventListener('hashchange', onRoute);
  onRoute();
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('keydown', onGlobalKey);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const setTheme = () => {
    const ind = document.getElementById('theme-indicator');
    if (ind) ind.textContent = mq.matches ? 'Dark' : 'Light';
  };
  setTheme();
  mq.addEventListener('change', setTheme);
  document.documentElement.dataset.ready = '1';
}

export function rebuildIndex() {
  App.index = new SearchIndex();
  for (const g of Model.guides) for (const n of g.nodes) if (n.kind === 'block') App.index.add({ id: n.id, kind: 'block', guide: g.slug, headingId: n.headingId, text: Layout.blockText(n) });
  for (const e of App.data.pack.glossary) App.index.add({ id: 'glossary:' + e.id, kind: 'glossary', guide: null, headingId: e.id, text: `${e.term} - ${e.plain}` });
  indexAllNotes();
  indexAllFills();
}

function onStoreChange(state) {
  const ind = document.getElementById('saved-indicator');
  if (!ind) return;
  if (state === 'pending') {
    ind.textContent = 'Saving…';
    ind.dataset.state = 'pending';
  } else if (state === 'saved') {
    ind.textContent = 'Saved';
    ind.dataset.state = 'saved';
  } else if (state === 'error') {
    ind.textContent = 'Save failed';
    ind.dataset.state = 'error';
  }
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
function buildShell() {
  const app = document.getElementById('app');
  app.innerHTML =
    `<header class="topbar" role="banner"><button type="button" class="btn-icon rail-toggle" id="rail-left-toggle" aria-label="Toggle navigation" aria-expanded="true">☰</button><a class="app-title" href="#home">Practice Management Guides</a>` +
    `<form class="search" role="search" id="search-form"><label for="search-input" class="visually-hidden">Search</label><input type="search" id="search-input" placeholder="Search (press / or Ctrl+K)" autocomplete="off" aria-autocomplete="list" aria-controls="search-results" aria-expanded="false"><div class="search-scope" role="group" aria-label="Search scope"><button type="button" class="scope-btn" data-scope="all">All guides</button><button type="button" class="scope-btn" data-scope="guide">This guide only</button></div><button type="submit" class="btn btn--small" id="search-btn">Search</button><div class="search-results" id="search-results" role="listbox" hidden></div></form>` +
    `<div class="topbar-actions"><button type="button" class="btn btn--small" id="edit-toggle" aria-pressed="false" title="Edit mode (Ctrl+E)">Edit</button><button type="button" class="btn btn--small" id="export-btn" title="Export a new master file with your notes and edits">Export</button><div class="menu"><button type="button" class="btn btn--small" id="print-btn" aria-haspopup="true" aria-expanded="false">Print ▾</button><div class="menu-list" id="print-menu" hidden><button type="button" id="print-guide">Print this guide</button><button type="button" id="print-all">Print everything</button></div></div><span class="theme-indicator" id="theme-indicator" title="Colour scheme follows your system setting"></span><a class="btn btn--small" href="#settings" id="settings-link">Settings</a><span class="saved-indicator" id="saved-indicator" role="status" aria-live="polite"></span></div></header>` +
    `<div class="edit-banner" id="edit-banner" hidden role="status">Edit mode - changes save automatically; use Export to create a new master file</div>` +
    `<div class="app-body"><nav class="rail-left" id="rail-left" aria-label="Guides"></nav><main class="main" id="main" tabindex="-1"></main><aside class="rail-right" id="rail-right" aria-label="This page"></aside></div>` +
    `<div class="toast" id="toast" role="status" hidden></div>` +
    `<dialog class="summary-slideover" id="summary-dialog" aria-labelledby="summary-dialog-title"><div class="slideover-head"><h2 class="slideover-title" id="summary-dialog-title">Executive summary</h2><button type="button" class="btn btn--small slideover-close" aria-label="Close summary">Close</button></div><div class="slideover-body"></div></dialog>`;
  const summaryDialog = document.getElementById('summary-dialog');
  summaryDialog.querySelector('.slideover-close').addEventListener('click', () => summaryDialog.close());
  summaryDialog.addEventListener('click', (e) => {
    if (e.target === summaryDialog) summaryDialog.close(); // backdrop click
    if (e.target.closest('a[href^="#"]')) summaryDialog.close(); // following a link
  });
  document.getElementById('edit-toggle').addEventListener('click', () => setEditMode(!App.editMode));
  document.getElementById('export-btn').addEventListener('click', exportMasterFile);
  const printBtn = document.getElementById('print-btn');
  const printMenu = document.getElementById('print-menu');
  printBtn.addEventListener('click', () => {
    printMenu.hidden = !printMenu.hidden;
    printBtn.setAttribute('aria-expanded', printMenu.hidden ? 'false' : 'true');
  });
  document.getElementById('print-guide').addEventListener('click', () => {
    printMenu.hidden = true;
    if (App.currentGuide) printGuide(App.currentGuide);
    else App.toast('Open a guide first to print it.');
  });
  document.getElementById('print-all').addEventListener('click', () => {
    printMenu.hidden = true;
    printEverything();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu')) printMenu.hidden = true;
    if (!e.target.closest('.search')) hideResults();
  });
  document.getElementById('rail-left-toggle').addEventListener('click', (e) => {
    const collapsed = document.body.classList.toggle('rail-left-collapsed');
    e.currentTarget.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
  buildSearchUi();
  refreshLeftRail();
  refreshRightRail();
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------
export function onRoute() {
  const hash = location.hash || '#home';
  App.history.push(hash);
  if (App.history.length > 50) App.history.shift();
  clearHighlights();
  const main = document.getElementById('main');
  const [path, query] = hash.slice(1).split('?');
  const showPage = (name, factory) => {
    App.currentGuide = null;
    App.currentSection = null;
    let page = pageCacheGet(name);
    if (!page) {
      page = factory();
      pageCacheSet(name, page);
    }
    main.innerHTML = '';
    main.append(page);
    window.scrollTo(0, 0);
    refreshLeftRail();
    refreshRightRail();
    document.title = `${name === 'home' ? 'Practice Management Guides' : name[0].toUpperCase() + name.slice(1) + ' - Practice Management Guides'}`;
  };
  if (path === '' || path === 'home' || path === 'top') return showPage('home', renderHome);
  if (path === 'glossary') return showPage('glossary', renderGlossary);
  if (path.startsWith('glossary/')) {
    showPage('glossary', renderGlossary);
    const id = path.slice('glossary/'.length);
    const t = document.getElementById(id);
    if (t) {
      t.scrollIntoView({ block: 'center' });
      t.classList.add('is-target');
    }
    return;
  }
  if (path === 'calendar') return showPage('calendar', () => renderCalendar());
  if (path === 'citations') return showPage('citations', () => renderCitations());
  if (path === 'changelog') return showPage('changelog', renderChangeLog);
  if (path === 'settings') {
    invalidatePageCache('settings');
    return showPage('settings', renderSettings);
  }
  if (path === 'search') {
    showPage('home', renderHome);
    const q = new URLSearchParams(query || '').get('q');
    const inp = document.getElementById('search-input');
    if (q) inp.value = q;
    inp.focus();
    if (q) runSearch();
    return;
  }
  if (path === 'back') return App.goBack();
  const slug = Model.guideOfAnchor(path);
  if (slug) return showGuide(slug, path === slug ? null : path);
  showPage('home', renderHome);
}

function pageCacheGet(name) {
  if (name !== 'glossary') return null; // only the glossary is cached; other pages reflect overlay changes
  return pageCache.get(name);
}
function pageCacheSet(name, page) {
  pageCache.set(name, page);
}

export function showGuide(slug, anchor, opts = {}) {
  const main = document.getElementById('main');
  const g = Model.guide(slug);
  const article = getGuideElement(slug);
  if (main.firstElementChild !== article) {
    main.innerHTML = '';
    main.append(article);
  }
  App.currentGuide = slug;
  document.title = `${g.title} - Practice Management Guides`;
  refreshLeftRail();
  App.store.update((o) => {
    o.reading[slug] = { ...(o.reading[slug] || {}), lastRead: nowIso() };
  });
  if (anchor) {
    const target = document.getElementById(anchor);
    if (target) {
      expandAncestors(target);
      target.scrollIntoView({ block: 'start' });
      target.classList.add('is-target');
      setTimeout(() => target.classList.remove('is-target'), 3000);
      if (App.pendingHighlight) {
        highlightIn(target, App.pendingHighlight);
        App.pendingHighlight = null;
      }
    }
  } else if (!opts.keepScroll) window.scrollTo(0, 0);
  updateCurrentSection(true);
}

// ---------------------------------------------------------------------------
// Scroll tracking, reading progress, right rail
// ---------------------------------------------------------------------------
let scrollTimer = null;
function onScroll() {
  if (!App.currentGuide) return;
  if (scrollTimer) return;
  scrollTimer = setTimeout(() => {
    scrollTimer = null;
    updateCurrentSection();
  }, 150);
}
const persistReading = debounce((slug, data) => {
  App.store.update((o) => {
    o.reading[slug] = { ...(o.reading[slug] || {}), ...data };
  });
}, 1000);

function updateCurrentSection(force) {
  const article = document.querySelector('#main .guide');
  if (!article) return;
  const top = document.querySelector('.topbar').offsetHeight + 8;
  let current = null;
  for (const sec of article.querySelectorAll('.section')) {
    const r = sec.getBoundingClientRect();
    if (r.top <= top + 40) current = sec.id;
    else break;
  }
  const rect = article.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
  const bar = document.getElementById('reading-progress-fill');
  if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  const label = document.getElementById('reading-progress-text');
  if (label) label.textContent = `${Math.round(progress * 100)}% read`;
  persistReading(App.currentGuide, { progress, lastAnchor: current || App.currentGuide });
  if (current !== App.currentSection || force) {
    App.currentSection = current;
    refreshRightRail();
    refreshLeftRail();
    const crumb = article.querySelector('.crumb-section');
    if (crumb) crumb.innerHTML = current ? `<span class="crumb-sep">›</span> <a href="#${escapeAttr(current)}">${escapeHtml(Layout.sectionLabel(current, { short: true }))}</a>` : '';
  }
}

export function refreshRightRail() {
  const rail = document.getElementById('rail-right');
  if (!rail) return;
  if (!App.currentGuide) {
    rail.innerHTML = '';
    return;
  }
  const slug = App.currentGuide;
  const sections = Layout.guideSections(slug);
  const cur = App.currentSection;
  const curH2 = cur ? (Model.heading(cur)?.heading.h2Id || cur) : null;
  const reading = (Layout.overlay.reading || {})[slug] || {};
  const pct = Math.round((reading.progress || 0) * 100);
  rail.innerHTML =
    `<div class="rail-section rail-progress"><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Reading progress"><div class="progress-fill" id="reading-progress-fill" style="width:${pct}%"></div></div><span class="muted" id="reading-progress-text">${pct}% read</span></div>` +
    `<div class="rail-section rail-notes"><h3>Notes${cur ? ` <span class="muted">- ${escapeHtml(Layout.sectionLabel(cur, { short: true }))}</span>` : ''}</h3><div class="notes-area notes-area--rail" data-anchor="${escapeAttr(cur || slug)}"></div></div>` +
    `<div class="rail-section rail-toc"><h3>On this page</h3><ol class="mini-toc">${sections.map((s) => `<li class="${s.id === curH2 ? 'is-current' : ''}"><a href="#${escapeAttr(s.id)}">${escapeHtml(s.heading.text)}</a>${s.id === curH2 && Layout.subsections(s).length ? `<ol>${Layout.subsections(s).map((x) => `<li class="${x.id === cur ? 'is-current' : ''}"><a href="#${escapeAttr(x.id)}">${escapeHtml(x.heading.text)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}</ol></div>`;
  renderNotesArea(rail.querySelector('.notes-area'));
}

export function refreshLeftRail() {
  const rail = document.getElementById('rail-left');
  if (!rail) return;
  const cur = App.currentGuide;
  const curSec = App.currentSection;
  const curH2 = curSec ? (Model.heading(curSec)?.heading.h2Id || curSec) : null;
  const items = Model.guides
    .map((g) => {
      const open = g.slug === cur;
      const notes = Layout.noteCount(g.slug);
      const secs = open
        ? `<ol class="rail-sections"${App.editMode ? ' data-guide="' + escapeAttr(g.slug) + '"' : ''}>${Layout.guideSections(g.slug)
            .map((s) => {
              const isCur = s.id === curH2;
              const subs = Layout.subsections(s);
              return `<li class="rail-h2${isCur ? ' is-current' : ''}" data-section="${escapeAttr(s.id)}"${App.editMode ? ' draggable="true"' : ''}><a href="#${escapeAttr(s.id)}">${escapeHtml(s.heading.text)}</a>${subs.length ? `<button type="button" class="rail-expand" aria-expanded="${isCur ? 'true' : 'false'}" aria-label="Show subsections">${isCur ? '−' : '+'}</button><ol class="rail-h3"${isCur ? '' : ' hidden'}>${subs.map((x) => `<li class="${x.id === curSec ? 'is-current' : ''}"><a href="#${escapeAttr(x.id)}">${escapeHtml(x.heading.text)}</a></li>`).join('')}</ol>` : ''}</li>`;
            })
            .join('')}</ol>`
        : '';
      return `<li class="rail-guide${open ? ' is-open is-current' : ''}" data-guide="${escapeAttr(g.slug)}"><a href="#${escapeAttr(g.slug)}">${escapeHtml(g.title)}</a>${notes ? `<span class="badge badge--notes" title="${notes} notes">${notes}</span>` : ''}${secs}</li>`;
    })
    .join('');
  rail.innerHTML = `<ol class="rail-guides">${items}</ol><ul class="rail-links"><li><a href="#calendar">Compliance Calendar</a></li><li><a href="#citations">Citations Index</a></li><li><a href="#glossary">Glossary</a></li><li><a href="#changelog">Change Log</a></li></ul>`;
  rail.querySelectorAll('.rail-expand').forEach((b) =>
    b.addEventListener('click', () => {
      const list = b.nextElementSibling;
      list.hidden = !list.hidden;
      b.setAttribute('aria-expanded', list.hidden ? 'false' : 'true');
      b.textContent = list.hidden ? '+' : '−';
    }),
  );
  if (App.editMode) mountRailReorder(rail);
}

function mountRailReorder(rail) {
  const list = rail.querySelector('.rail-sections[data-guide]');
  if (!list) return;
  let dragging = null;
  list.addEventListener('dragstart', (e) => {
    dragging = e.target.closest('.rail-h2');
    if (!dragging) return;
    e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    if (!dragging) return;
    const over = e.target.closest('.rail-h2');
    if (!over || over === dragging) return;
    e.preventDefault();
    const r = over.getBoundingClientRect();
    list.insertBefore(dragging, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
  });
  list.addEventListener('drop', (e) => e.preventDefault());
  list.addEventListener('dragend', () => {
    if (!dragging) return;
    const ids = Array.from(list.querySelectorAll(':scope > .rail-h2')).map((li) => li.dataset.section);
    dragging = null;
    reorderGuideSections(list.dataset.guide, ids);
  });
}

// ---------------------------------------------------------------------------
// Search UI
// ---------------------------------------------------------------------------
let resultsState = { items: [], active: -1 };
function buildSearchUi() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch();
  });
  let t = null;
  input.addEventListener('input', () => {
    clearTimeout(t);
    if (input.value.trim().length >= 2) t = setTimeout(runSearch, 120);
    else hideResults();
  });
  input.addEventListener('keydown', (e) => {
    const box = document.getElementById('search-results');
    if (e.key === 'Escape') {
      input.value = '';
      hideResults();
      input.blur();
      return;
    }
    if (box.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = resultsState.items.length;
      if (!n) return;
      resultsState.active = e.key === 'ArrowDown' ? (resultsState.active + 1) % n : (resultsState.active - 1 + n) % n;
      box.querySelectorAll('.search-result').forEach((r, i) => r.classList.toggle('is-active', i === resultsState.active));
      box.querySelector('.search-result.is-active')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && resultsState.active >= 0) {
      e.preventDefault();
      openResult(resultsState.items[resultsState.active]);
    }
  });
  form.querySelectorAll('.scope-btn').forEach((b) =>
    b.addEventListener('click', () => {
      App.store.update((o) => (o.settings.searchScope = b.dataset.scope));
      updateScopeUi();
      if (input.value.trim().length >= 2) runSearch();
    }),
  );
}
export function updateScopeUi() {
  const scope = (Layout.overlay.settings || {}).searchScope || 'all';
  document.querySelectorAll('.scope-btn').forEach((b) => {
    const on = b.dataset.scope === scope;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function hideResults() {
  const box = document.getElementById('search-results');
  if (box) box.hidden = true;
  document.getElementById('search-input')?.setAttribute('aria-expanded', 'false');
  resultsState = { items: [], active: -1 };
}
export function runSearch() {
  const input = document.getElementById('search-input');
  const q = input.value.trim();
  const box = document.getElementById('search-results');
  if (q.length < 1) return hideResults();
  const scope = (Layout.overlay.settings || {}).searchScope || 'all';
  const t0 = performance.now();
  const results = App.index.search(q, { guide: scope === 'guide' && App.currentGuide ? App.currentGuide : null, limit: 40 });
  const ms = performance.now() - t0;
  resultsState = { items: results, active: results.length ? 0 : -1, query: q };
  box.innerHTML = results.length
    ? results
        .map((r, i) => {
          const doc = r.doc;
          const g = doc.guide ? Model.guide(doc.guide) : null;
          const head = doc.kind === 'glossary' ? 'Glossary' : doc.headingId ? Layout.sectionLabel(doc.headingId, { short: true }) : '';
          return `<div class="search-result${i === 0 ? ' is-active' : ''}" role="option" data-i="${i}"><div class="search-result-meta">${g ? `<span class="search-guide">${escapeHtml(g.title)}</span>` : ''}${head ? ` <span class="search-section">${escapeHtml(head)}</span>` : ''}${doc.kind === 'note' ? ' <span class="note-badge">Your note</span>' : ''}</div><div class="search-snippet">${makeSnippet(doc.text, r.terms)}</div></div>`;
        })
        .join('') + `<div class="search-footer muted">${results.length} result${results.length === 1 ? '' : 's'} · ${scope === 'guide' && App.currentGuide ? 'this guide' : 'all guides'} · ${ms.toFixed(0)} ms</div>`
    : `<div class="search-empty muted">No results${scope === 'guide' && App.currentGuide ? ' in this guide' : ''}.</div>`;
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  box.querySelectorAll('.search-result').forEach((r) => r.addEventListener('click', () => openResult(resultsState.items[Number(r.dataset.i)])));
}
function openResult(r) {
  if (!r) return;
  const doc = r.doc;
  hideResults();
  App.pendingHighlight = r.terms;
  if (doc.kind === 'glossary') return App.navigate('#glossary/' + doc.headingId);
  if (doc.kind === 'note') return App.navigate('#' + doc.headingId);
  App.navigate('#' + doc.id);
}

// term highlighting in the page until the next navigation
export function highlightIn(root, terms) {
  const scope = root.classList.contains('block') ? root : root;
  const re = new RegExp('(' + terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('script, style, .calculator') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (!re.test(n.nodeValue)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = re.exec(n.nodeValue))) {
      frag.append(document.createTextNode(n.nodeValue.slice(last, m.index)));
      const mark = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = m[0];
      frag.append(mark);
      last = m.index + m[0].length;
    }
    frag.append(document.createTextNode(n.nodeValue.slice(last)));
    n.replaceWith(frag);
  }
}
export function clearHighlights() {
  document.querySelectorAll('mark.search-hit').forEach((m) => {
    const parent = m.parentNode;
    m.replaceWith(document.createTextNode(m.textContent));
    parent.normalize();
  });
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
function onGlobalKey(e) {
  const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('search-input').focus();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    setEditMode(!App.editMode);
    return;
  }
  if (e.key === '/' && !inField) {
    e.preventDefault();
    document.getElementById('search-input').focus();
    return;
  }
  if (e.key === 'Escape' && !inField) {
    const inp = document.getElementById('search-input');
    inp.value = '';
    hideResults();
  }
}

// glossary abbr click-through and generic delegated clicks
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const abbr = e.target.closest('abbr.abbr[data-glossary]');
    if (abbr && !e.target.closest('a')) {
      e.preventDefault();
      App.navigate('#glossary/' + abbr.dataset.glossary);
    }
  });
  document.addEventListener('keydown', (e) => {
    const abbr = e.target.closest && e.target.closest('abbr.abbr[data-glossary]');
    if (abbr && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      App.navigate('#glossary/' + abbr.dataset.glossary);
    }
  });
}

// ---------------------------------------------------------------------------
// Export a new master file - Sheet A 9.3
// ---------------------------------------------------------------------------
export function unescapeShell(s) {
  return s.replace(/<\\\//g, '</');
}
export function escapeShell(s) {
  return s.replace(/<\//g, '<\\/');
}
export function assembleFile(overlayJson, exportedAt) {
  const shell = unescapeShell(document.getElementById('pristine-shell').textContent);
  const fill = {
    SHELL: escapeShell(shell),
    APP_CSS: document.getElementById('app-css').textContent,
    APP_JS: document.getElementById('app-js').textContent,
    CONTENT_MODEL: document.getElementById('content-model').textContent,
    OVERLAY: escapeShell(overlayJson),
    EXPORTED_AT: exportedAt,
    BUILT_AT: document.documentElement.dataset.builtAt || '',
  };
  return shell.replace(/\{\{(SHELL|APP_CSS|APP_JS|CONTENT_MODEL|OVERLAY|EXPORTED_AT|BUILT_AT)\}\}/g, (m, k) => fill[k]);
}
export function exportMasterFile() {
  App.store.saveDebounced.flush();
  const overlay = App.store.serialise();
  const exportedAt = nowIso();
  const html = assembleFile(overlay, exportedAt);
  App.download(`PracticeGuides-${todayIso()}.html`, html, 'text/html');
  App.toast('Replace your saved file with this one to lock in your notes and edits.');
  alert('Replace your saved file with this one to lock in your notes and edits.');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
  else boot();
}
