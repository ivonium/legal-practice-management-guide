// Edit mode - Sheet A section 11. Content blocks become contenteditable; edits,
// block order and moves persist in the overlay. Headings, calculators and
// diagrams are not editable.

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'A', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'CODE', 'PRE', 'BLOCKQUOTE', 'ABBR', 'INPUT', 'LABEL', 'DIV', 'MARK', 'HR', 'SPAN']);
const TAG_MAP = { B: 'STRONG', I: 'EM' };
const ALLOWED_ATTRS = { A: ['href', 'class', 'target', 'rel'], ABBR: ['class', 'title', 'data-term', 'data-glossary', 'tabindex'], INPUT: ['type', 'class', 'id', 'data-default', 'checked'], LABEL: ['for', 'class'], DIV: ['class'], BLOCKQUOTE: ['class'], OL: ['start'], TH: ['style'], TD: ['style'], MARK: [] };

export function sanitizeHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = (node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      let tag = child.tagName;
      if (TAG_MAP[tag]) {
        const rep = document.createElement(TAG_MAP[tag]);
        while (child.firstChild) rep.append(child.firstChild);
        child.replaceWith(rep);
        walk(rep);
        continue;
      }
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') {
        child.remove();
        continue;
      }
      if (tag === 'INPUT' && child.getAttribute('type') !== 'checkbox') {
        child.remove();
        continue;
      }
      if (tag === 'DIV' && !/\btable-wrap\b/.test(child.className)) {
        // unwrap
        walk(child);
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      if (tag === 'SPAN' || tag === 'MARK') {
        walk(child);
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      if (!ALLOWED_TAGS.has(tag)) {
        walk(child);
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      const allowed = ALLOWED_ATTRS[tag] || [];
      for (const attr of Array.from(child.attributes)) {
        if (!allowed.includes(attr.name)) child.removeAttribute(attr.name);
        else if (attr.name === 'href' && !/^(https?:\/\/|#|mailto:)/i.test(attr.value)) child.removeAttribute('href');
        else if (attr.name === 'class' && tag === 'A' && !/^(xref|link-legislation|link-external)( |$)/.test(attr.value)) child.removeAttribute('class');
      }
      if (tag === 'A' && /^https?:/i.test(child.getAttribute('href') || '')) {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener');
      }
      walk(child);
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

let editing = null; // {blockEl, original}

export function setEditMode(on) {
  App.editMode = !!on;
  document.body.classList.toggle('is-editing', App.editMode);
  const btn = document.getElementById('edit-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', App.editMode ? 'true' : 'false');
    btn.classList.toggle('is-active', App.editMode);
  }
  const banner = document.getElementById('edit-banner');
  if (banner) banner.hidden = !App.editMode;
  if (!App.editMode && editing) stopEditing(true);
  refreshLeftRail();
}

function toolbarEl() {
  let tb = document.getElementById('edit-toolbar');
  if (tb) return tb;
  tb = el('div', { id: 'edit-toolbar', class: 'edit-toolbar', role: 'toolbar', 'aria-label': 'Formatting' });
  const mk = (label, title, fn) => {
    const b = el('button', { type: 'button', class: 'btn btn--small', title }, label);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', fn);
    return b;
  };
  tb.append(
    mk('B', 'Bold', () => document.execCommand('bold')),
    mk('I', 'Italic', () => document.execCommand('italic')),
    mk('Link', 'Insert link', () => {
      const url = prompt('Link URL (https://… or #anchor)');
      if (url) document.execCommand('createLink', false, url);
    }),
    mk('• List', 'Bullet list', () => document.execCommand('insertUnorderedList')),
    mk('Done', 'Finish editing (Esc)', () => stopEditing(true)),
  );
  document.body.append(tb);
  return tb;
}

function positionToolbar(blockEl) {
  const tb = toolbarEl();
  tb.hidden = false;
  const r = blockEl.getBoundingClientRect();
  tb.style.top = `${Math.max(8, r.top + window.scrollY - tb.offsetHeight - 6)}px`;
  tb.style.left = `${r.left + window.scrollX}px`;
}

export function startEditing(blockEl) {
  if (!App.editMode) return;
  if (editing && editing.blockEl === blockEl) return;
  if (editing) stopEditing(true);
  const content = blockEl.querySelector(':scope > .block-content');
  if (!content) return;
  editing = { blockEl, original: content.innerHTML };
  content.contentEditable = 'true';
  content.spellcheck = true;
  blockEl.classList.add('is-editing-block');
  content.focus();
  positionToolbar(blockEl);
  content.addEventListener('paste', onPaste);
  content.addEventListener('blur', onBlur);
  content.addEventListener('keydown', onKey);
}

function onPaste(e) {
  e.preventDefault();
  const html = e.clipboardData.getData('text/html');
  const text = e.clipboardData.getData('text/plain');
  const clean = html ? sanitizeHtml(html) : escapeHtml(text).replace(/\n/g, '<br>');
  document.execCommand('insertHTML', false, clean);
}
function onBlur(e) {
  // ignore blur caused by the toolbar
  setTimeout(() => {
    if (editing && document.activeElement !== editing.blockEl.querySelector('.block-content') && !document.getElementById('edit-toolbar')?.contains(document.activeElement)) stopEditing(true);
  }, 50);
}
function onKey(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    stopEditing(true);
  }
}

export function stopEditing(save) {
  if (!editing) return;
  const { blockEl, original } = editing;
  const content = blockEl.querySelector(':scope > .block-content');
  content.removeEventListener('paste', onPaste);
  content.removeEventListener('blur', onBlur);
  content.removeEventListener('keydown', onKey);
  content.contentEditable = 'false';
  blockEl.classList.remove('is-editing-block');
  const tb = document.getElementById('edit-toolbar');
  if (tb) tb.hidden = true;
  editing = null;
  const clean = sanitizeHtml(content.innerHTML);
  if (!save || clean === original) {
    content.innerHTML = original;
    return;
  }
  content.innerHTML = clean;
  saveBlockEdit(blockEl.dataset.block, clean);
}

export function saveBlockEdit(blockId, html) {
  const b = Model.block(blockId);
  if (!b) return;
  const text = stripTags(html);
  const editedAt = nowIso();
  App.store.update((o) => {
    if (html === b.node.html) delete o.edits[blockId];
    else o.edits[blockId] = { html, text, editedAt };
  });
  App.index.add({ id: blockId, kind: 'block', guide: b.guide.slug, headingId: b.node.headingId, text: Layout.blockText(b.node) });
  document.querySelectorAll(`.block[data-block="${CSS.escape(blockId)}"]`).forEach((blk) => {
    blk.classList.toggle('is-edited', Layout.isEdited(blockId));
    let meta = blk.querySelector(':scope > .block-meta');
    if (Layout.isEdited(blockId)) {
      if (!meta) {
        meta = el('div', { class: 'block-meta' });
        blk.append(meta);
      }
      meta.innerHTML = `<span class="edited-marker">edited ${escapeHtml(fmtDateTime(editedAt))}</span><button type="button" class="btn btn--small revert-btn" data-block="${escapeAttr(blockId)}">Revert to original</button>`;
    } else if (meta) meta.remove();
    mountChecklists(blk.parentElement || blk);
  });
  invalidatePageCache('changelog');
}

export function revertBlock(blockId) {
  const b = Model.block(blockId);
  if (!b) return;
  App.store.update((o) => {
    delete o.edits[blockId];
  });
  App.index.add({ id: blockId, kind: 'block', guide: b.guide.slug, headingId: b.node.headingId, text: b.node.text });
  document.querySelectorAll(`.block[data-block="${CSS.escape(blockId)}"]`).forEach((blk) => {
    blk.querySelector(':scope > .block-content').innerHTML = b.node.html;
    blk.classList.remove('is-edited');
    blk.querySelector(':scope > .block-meta')?.remove();
    mountChecklists(blk.parentElement);
  });
  invalidatePageCache('changelog');
}

// ---- reordering within a section (drag and drop)
let dragBlockId = null;
function persistOrder(blocksEl) {
  const sectionId = blocksEl.dataset.section;
  const ids = Array.from(blocksEl.querySelectorAll(':scope > .block')).map((b) => b.dataset.block);
  const original = Layout.originalSectionBlocks(sectionId).filter((n) => n.kind === 'block').map((n) => n.id);
  const moved = Layout.overlay.moved || {};
  const originalEffective = [...original.filter((id) => !(moved[id] && moved[id].to !== sectionId)), ...Object.keys(moved).filter((id) => moved[id].to === sectionId && !original.includes(id))];
  App.store.update((o) => {
    if (ids.join('|') === originalEffective.join('|')) delete o.order[sectionId];
    else o.order[sectionId] = ids;
  });
}

export function mountEditHooks(article) {
  article.addEventListener('click', (e) => {
    const revert = e.target.closest('.revert-btn');
    if (revert) {
      e.preventDefault();
      revertBlock(revert.dataset.block);
      return;
    }
    const move = e.target.closest('.move-btn');
    if (move) {
      e.preventDefault();
      openMoveMenu(move.dataset.block, move);
      return;
    }
    const restore = e.target.closest('.restore-order-btn');
    if (restore) {
      e.preventDefault();
      restoreSectionOrder(restore.dataset.section);
      return;
    }
    const restoreGuide = e.target.closest('.restore-guide-order-btn');
    if (restoreGuide) {
      e.preventDefault();
      restoreGuideOrder(restoreGuide.dataset.guide);
      return;
    }
    if (!App.editMode) return;
    if (e.target.closest('a, button, input, select, textarea, .calculator, .diagram-slot, .notes-area, .block-tools, .block-meta, abbr')) return;
    const block = e.target.closest('.block');
    if (block && block.closest('.blocks')) startEditing(block);
  });
  // drag and drop
  article.addEventListener('dragstart', (e) => {
    const handle = e.target.closest && e.target.closest('.drag-handle');
    if (!handle || !App.editMode) {
      e.preventDefault();
      return;
    }
    const block = handle.closest('.block');
    dragBlockId = block.dataset.block;
    block.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragBlockId);
  });
  article.addEventListener('dragover', (e) => {
    if (!dragBlockId) return;
    const over = e.target.closest && e.target.closest('.block');
    const dragging = article.querySelector(`.block[data-block="${CSS.escape(dragBlockId)}"]`);
    if (!over || !dragging || over === dragging || over.parentElement !== dragging.parentElement) return;
    e.preventDefault();
    const r = over.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    over.parentElement.insertBefore(dragging, before ? over : over.nextSibling);
  });
  article.addEventListener('drop', (e) => {
    if (!dragBlockId) return;
    e.preventDefault();
    const dragging = article.querySelector(`.block[data-block="${CSS.escape(dragBlockId)}"]`);
    if (dragging) persistOrder(dragging.parentElement);
  });
  article.addEventListener('dragend', () => {
    const dragging = article.querySelector('.block.is-dragging');
    if (dragging) {
      dragging.classList.remove('is-dragging');
      persistOrder(dragging.parentElement);
    }
    dragBlockId = null;
  });
}

function openMoveMenu(blockId, anchorBtn) {
  const b = Model.block(blockId);
  if (!b) return;
  const slug = b.guide.slug;
  const current = anchorBtn.closest('.block').dataset.section;
  const sections = Layout.flatSections(slug);
  const sel = el('select', { class: 'move-select', 'aria-label': 'Move block to section' }, el('option', { value: '' }, 'Move to…'), ...sections.map((s) => el('option', { value: s.id, disabled: s.id === current }, `${'  '.repeat(s.level - 2)}${s.text}`)));
  sel.addEventListener('change', () => {
    if (sel.value) moveBlock(blockId, current, sel.value);
    sel.remove();
  });
  sel.addEventListener('blur', () => sel.remove());
  anchorBtn.after(sel);
  sel.focus();
}

export function moveBlock(blockId, fromSection, toSection) {
  const b = Model.block(blockId);
  const originalSection = b.node.headingId;
  App.store.update((o) => {
    if (toSection === originalSection) delete o.moved[blockId];
    else o.moved[blockId] = { from: originalSection, to: toSection, movedAt: nowIso() };
    // update order arrays
    if (Array.isArray(o.order[fromSection])) o.order[fromSection] = o.order[fromSection].filter((id) => id !== blockId);
    const dest = Layout.sectionBlocks(toSection).filter((n) => n.kind === 'block').map((n) => n.id);
    if (!dest.includes(blockId)) dest.push(blockId);
    o.order[toSection] = dest;
  });
  App.rerenderGuide(b.guide.slug, toSection);
  invalidatePageCache('changelog');
}

export function restoreSectionOrder(sectionId) {
  const slug = Model.guideOfAnchor(sectionId);
  App.store.update((o) => {
    delete o.order[sectionId];
    for (const [bid, mv] of Object.entries(o.moved)) {
      if (mv.from === sectionId || mv.to === sectionId) {
        delete o.moved[bid];
        if (Array.isArray(o.order[mv.to])) o.order[mv.to] = o.order[mv.to].filter((id) => id !== bid);
      }
    }
  });
  App.rerenderGuide(slug, sectionId);
  invalidatePageCache('changelog');
}

export function restoreGuideOrder(slug) {
  App.store.update((o) => {
    delete o.order[slug];
    for (const k of Object.keys(o.order)) if (k.startsWith(slug + '--') && k.endsWith('--subsections')) delete o.order[k];
  });
  App.rerenderGuide(slug, slug);
}

export function reorderGuideSections(slug, ids) {
  const original = Model.tree(slug).sections.map((s) => s.id);
  App.store.update((o) => {
    if (ids.join('|') === original.join('|')) delete o.order[slug];
    else o.order[slug] = ids;
  });
  App.rerenderGuide(slug, null);
}
