// Checklists - Sheet A section 12. Checkbox ID = block ID + "-i{index}"; state
// persists in overlay.checklists; progress bar and "Reset this list" per list.

export function checklistState(id, defaultChecked) {
  const v = (Layout.overlay.checklists || {})[id];
  if (v === true) return true;
  if (v === false) return false;
  return !!defaultChecked;
}

export function mountChecklists(root) {
  root.querySelectorAll('.block').forEach((block) => {
    const boxes = block.querySelectorAll('input.checklist-box');
    if (!boxes.length) return;
    block.classList.add('checklist');
    boxes.forEach((box) => {
      box.checked = checklistState(box.id, box.dataset.default === '1');
      box.addEventListener('change', () => {
        const id = box.id;
        const def = box.dataset.default === '1';
        App.store.update((o) => {
          if (box.checked === def) delete o.checklists[id];
          else o.checklists[id] = box.checked;
        });
        updateProgress(block);
        // keep other renderings of the same checkbox in sync
        document.querySelectorAll(`input.checklist-box[id="${CSS.escape(id)}"]`).forEach((b) => {
          if (b !== box) b.checked = box.checked;
        });
      });
    });
    let bar = block.querySelector(':scope > .checklist-progress');
    if (!bar) {
      bar = el('div', { class: 'checklist-progress screen-only' });
      block.append(bar);
    }
    updateProgress(block);
  });
}

export function updateProgress(block) {
  const boxes = Array.from(block.querySelectorAll('input.checklist-box'));
  const done = boxes.filter((b) => b.checked).length;
  const bar = block.querySelector(':scope > .checklist-progress');
  if (!bar) return;
  const pct = boxes.length ? Math.round((done / boxes.length) * 100) : 0;
  bar.innerHTML = '';
  bar.append(
    el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(boxes.length), 'aria-valuenow': String(done) }, el('div', { class: 'progress-fill', style: `width:${pct}%` })),
    el('span', { class: 'checklist-progress-text' }, `${done} of ${boxes.length} complete`),
    (() => {
      const b = el('button', { type: 'button', class: 'btn-link reset-list-btn' }, 'Reset this list');
      b.addEventListener('click', () => {
        App.store.update((o) => {
          for (const box of boxes) delete o.checklists[box.id];
        });
        for (const box of boxes) box.checked = box.dataset.default === '1';
        updateProgress(block);
      });
      return b;
    })(),
  );
}
