// Notes - Sheet A section 10. Per section (H2/H3) and per guide; multiple notes,
// timestamped, editable, deletable; minimal markdown; indexed for search.

export function notesFor(anchor) {
  return (Layout.overlay.notes || {})[anchor] || [];
}

export function noteDocId(noteId) {
  return 'note:' + noteId;
}

export function indexNote(anchor, note) {
  const slug = Model.guideOfAnchor(anchor);
  App.index.add({ id: noteDocId(note.id), kind: 'note', guide: slug, headingId: anchor, noteId: note.id, text: note.text });
}

export function addNote(anchor, text) {
  const note = { id: uuid(), text, createdAt: nowIso(), updatedAt: nowIso() };
  App.store.update((o) => {
    (o.notes[anchor] = o.notes[anchor] || []).push(note);
  });
  indexNote(anchor, note);
  refreshNotes(anchor);
  return note;
}

export function updateNote(anchor, id, text) {
  App.store.update((o) => {
    const n = (o.notes[anchor] || []).find((x) => x.id === id);
    if (n) {
      n.text = text;
      n.updatedAt = nowIso();
    }
  });
  const n = notesFor(anchor).find((x) => x.id === id);
  if (n) indexNote(anchor, n);
  refreshNotes(anchor);
}

export function deleteNote(anchor, id) {
  App.store.update((o) => {
    o.notes[anchor] = (o.notes[anchor] || []).filter((x) => x.id !== id);
    if (!o.notes[anchor].length) delete o.notes[anchor];
  });
  App.index.remove(noteDocId(id));
  refreshNotes(anchor);
}

function noteEditorEl(anchor, existing) {
  const ta = el('textarea', { class: 'note-editor-text', rows: 4, placeholder: 'Your note (plain text; **bold**, *italics*, - bullets and [links](https://…) are supported)', 'aria-label': 'Note text' }, existing ? existing.text : '');
  const save = el('button', { type: 'button', class: 'btn btn--small btn--primary' }, existing ? 'Save' : 'Add note');
  const cancel = el('button', { type: 'button', class: 'btn btn--small' }, 'Cancel');
  const wrap = el('div', { class: 'note-editor' }, ta, el('div', { class: 'note-editor-actions' }, save, cancel));
  const finish = () => wrap.remove();
  save.addEventListener('click', () => {
    const text = ta.value.trim();
    if (!text) return finish();
    if (existing) updateNote(anchor, existing.id, text);
    else addNote(anchor, text);
    finish();
  });
  cancel.addEventListener('click', finish);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      finish();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save.click();
  });
  setTimeout(() => ta.focus(), 0);
  return wrap;
}

export function noteCardEl(anchor, note, opts = {}) {
  const body = el('div', { class: 'note-body', html: renderNoteMarkdown(note.text) });
  const meta = el('div', { class: 'note-meta' }, el('span', { class: 'note-badge' }, 'Your note'), ' ', el('time', { datetime: note.updatedAt }, fmtDateTime(note.updatedAt)), note.updatedAt !== note.createdAt ? ' (edited)' : '');
  const editBtn = el('button', { type: 'button', class: 'btn-link' }, 'Edit');
  const delBtn = el('button', { type: 'button', class: 'btn-link btn-link--danger' }, 'Delete');
  const actions = el('div', { class: 'note-actions screen-only' }, editBtn, ' ', delBtn);
  const card = el('div', { class: 'note', 'data-note': note.id, 'data-anchor': anchor }, meta, body, actions);
  if (opts.link) card.prepend(el('a', { class: 'note-anchor-link', href: '#' + anchor }, Layout.sectionLabel(anchor)));
  editBtn.addEventListener('click', () => {
    body.replaceWith(noteEditorEl(anchor, note));
  });
  delBtn.addEventListener('click', () => {
    if (confirm('Delete this note?')) deleteNote(anchor, note.id);
  });
  return card;
}

export function renderNotesArea(area) {
  const anchor = area.dataset.anchor;
  const list = notesFor(anchor);
  area.innerHTML = '';
  area.classList.toggle('has-notes', list.length > 0);
  const label = area.dataset.label || null;
  if (label && list.length) area.append(el('div', { class: 'notes-area-label' }, label));
  for (const n of list) area.append(noteCardEl(anchor, n));
  const addBtn = el('button', { type: 'button', class: 'btn-link add-note-btn screen-only', 'data-anchor': anchor }, list.length ? '+ Add another note' : label ? '+ Add a guide note' : '+ Add a note');
  addBtn.addEventListener('click', () => {
    if (area.querySelector('.note-editor')) return;
    area.insertBefore(noteEditorEl(anchor, null), addBtn);
  });
  area.append(addBtn);
}

export function mountNotes(root) {
  root.querySelectorAll('.notes-area').forEach(renderNotesArea);
  root.querySelectorAll('.notes-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const anchor = btn.dataset.anchor;
      const sec = btn.closest('.section');
      if (sec && sec.classList.contains('is-collapsed')) setSectionCollapsed(sec.id, false);
      const area = root.querySelector(`.notes-area[data-anchor="${CSS.escape(anchor)}"]`);
      if (area) {
        area.scrollIntoView({ block: 'center', behavior: 'smooth' });
        area.querySelector('.add-note-btn')?.click();
      }
    });
  });
  updateNoteCounts(root);
}

export function refreshNotes(anchor) {
  document.querySelectorAll(`.notes-area[data-anchor="${CSS.escape(anchor)}"]`).forEach(renderNotesArea);
  updateNoteCounts(document);
  refreshRightRail();
  refreshLeftRail();
}

export function updateNoteCounts(root) {
  root.querySelectorAll('.note-count').forEach((c) => {
    const n = notesFor(c.dataset.anchor).length;
    c.textContent = n ? String(n) : '';
  });
}

export function indexAllNotes() {
  for (const [anchor, list] of Object.entries(Layout.overlay.notes || {})) for (const n of list) indexNote(anchor, n);
}
