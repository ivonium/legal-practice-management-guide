// diagram.js - shared, progressive behaviour for the inlined diagram SVGs
// (HANDOVER_TO_CLAUDE_CODE.md §2.5 and §2.6). Everything here is optional: with the
// script absent, or with none of the hook attributes present, every diagram is
// complete and legible as drawn, which is also the print form.
//
// Hook attributes Claude Design can add to the SVGs (all optional):
//   data-anchor="#trust-accounting--s4-7"   click/Enter navigates to the anchor
//   data-sub="key"  on a trigger, with data-panel="key" on the group it reveals;
//                    panels start hidden on screen unless they carry data-panel-open,
//                    and are always shown in print
//   data-tabs="key" on a group whose children carry data-tab="Label";
//                    a tab strip is drawn above the figure on screen; print shows all
//   data-hover      on a group: hovering it dims its siblings (CSS only)
//   data-fill-cell="key" + data-fill-label="…" (already present in dg-risk-management-10/-11):
//                    an overlay-backed fillable cell

export function fillKey(slotId, cell) {
  return `${slotId}:${cell}`;
}

export function mountDiagrams(root, opts = {}) {
  root.querySelectorAll('.diagram-slot').forEach((fig) => {
    const svg = fig.querySelector('svg');
    if (!svg || fig.dataset.mounted === '1') return;
    fig.dataset.mounted = '1';
    const slotId = fig.id;
    // navigation hooks
    svg.querySelectorAll('[data-anchor]').forEach((g) => {
      const target = g.dataset.anchor;
      if (!target) return;
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'link');
      g.classList.add('dg-link');
      const go = (e) => {
        e.preventDefault();
        App.navigate(target.startsWith('#') ? target : '#' + target);
      };
      g.addEventListener('click', go);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') go(e);
      });
    });
    // drill-down panels
    if (!opts.readOnly) {
      // drill-down: data-panel-open marks the panel shown initially; a trigger shows its
      // panel(s) and hides the rest (source order keeps every panel visible for print)
      const panels = svg.querySelectorAll('[data-panel]');
      panels.forEach((p) => {
        if (!p.hasAttribute('data-panel-open')) p.classList.add('is-hidden');
      });
      svg.querySelectorAll('[data-sub]').forEach((t) => {
        if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '0');
        if (!t.hasAttribute('role')) t.setAttribute('role', 'button');
        t.classList.add('dg-trigger');
        t.setAttribute('aria-expanded', svg.querySelector(`[data-panel="${CSS.escape(t.dataset.sub)}"][data-panel-open]`) ? 'true' : 'false');
        const toggle = (e) => {
          e.preventDefault();
          const key = t.dataset.sub;
          panels.forEach((p) => p.classList.toggle('is-hidden', p.dataset.panel !== key));
          svg.querySelectorAll('[data-sub]').forEach((x) => x.setAttribute('aria-expanded', x.dataset.sub === key ? 'true' : 'false'));
        };
        t.addEventListener('click', toggle);
        t.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') toggle(e);
        });
      });
      // tab views
      svg.querySelectorAll('[data-tabs]').forEach((group) => {
        const tabs = Array.from(group.querySelectorAll('[data-tab]')).filter((t) => t.parentElement.closest('[data-tabs]') === group);
        if (tabs.length < 2) return;
        const strip = el('div', { class: 'diagram-tabs screen-only', role: 'tablist', 'aria-label': fig.dataset.title + ' views' });
        const show = (i) => {
          tabs.forEach((t, k) => t.classList.toggle('is-hidden', k !== i));
          strip.querySelectorAll('button').forEach((b, k) => {
            b.classList.toggle('is-active', k === i);
            b.setAttribute('aria-selected', k === i ? 'true' : 'false');
          });
        };
        tabs.forEach((t, i) => {
          const b = el('button', { type: 'button', class: 'tab diagram-tab', role: 'tab' }, t.dataset.tab);
          b.addEventListener('click', () => show(i));
          strip.append(b);
        });
        fig.insertBefore(strip, svg);
        show(0);
      });
    }
    mountFillCells(fig, svg, opts);
  });
}

// ---- fillable cells (overlay-backed; author's answer G.4)
export function fillValue(key) {
  const f = (Layout.overlay.fills || {})[key];
  return f && typeof f.text === 'string' ? f.text : '';
}

// A cell is a <g data-fill-cell> wrapping the rect and a "YOUR NOTE" placeholder (round 2
// markup); the foreignObject is injected inside the group, after the rect, so the theme's
// g[data-fill-cell]:has(foreignObject) rule hides the placeholder. A bare rect still works.
function cellRect(cell) {
  return cell.tagName.toLowerCase() === 'rect' ? cell : cell.querySelector('rect');
}
function renderFillText(svg, cell, text) {
  const ns = 'http://www.w3.org/2000/svg';
  const rect = cellRect(cell);
  if (!rect) return;
  const key = rect.id || cell.dataset.fillCell;
  let fo = cell.querySelector(`[data-fill-for="${CSS.escape(key)}"]`) || svg.querySelector(`[data-fill-for="${CSS.escape(key)}"]`);
  if (!text) {
    if (fo) fo.remove();
    return;
  }
  if (!fo) {
    fo = document.createElementNS(ns, 'foreignObject');
    fo.setAttribute('data-fill-for', key);
    fo.setAttribute('x', rect.getAttribute('x'));
    fo.setAttribute('y', rect.getAttribute('y'));
    fo.setAttribute('width', rect.getAttribute('width'));
    fo.setAttribute('height', rect.getAttribute('height'));
    fo.style.pointerEvents = 'none';
    rect.after(fo);
  }
  fo.innerHTML = '';
  const div = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
  div.className = 'diagram-fill-text';
  div.textContent = text;
  fo.append(div);
}

function fillDialog() {
  let d = document.getElementById('fill-dialog');
  if (d) return d;
  d = el('dialog', { id: 'fill-dialog', class: 'fill-dialog', 'aria-labelledby': 'fill-dialog-title' });
  d.innerHTML = `<form method="dialog" class="fill-form"><h2 id="fill-dialog-title" class="fill-dialog-title"></h2><textarea class="fill-text" rows="5" aria-label="Your entry"></textarea><div class="note-editor-actions"><button type="submit" value="save" class="btn btn--small btn--primary">Save</button><button type="submit" value="clear" class="btn btn--small">Clear</button><button type="submit" value="cancel" class="btn btn--small">Cancel</button></div></form>`;
  document.body.append(d);
  return d;
}

export function mountFillCells(fig, svg, opts = {}) {
  const slotId = fig.id;
  const slot = DIAGRAM_SLOTS.find((s) => s.id === slotId);
  svg.querySelectorAll('[data-fill-cell]').forEach((rect) => {
    const key = fillKey(slotId, rect.dataset.fillCell);
    renderFillText(svg, rect, fillValue(key));
    if (opts.readOnly) return;
    rect.classList.add('dg-fill');
    if (!rect.hasAttribute('tabindex')) rect.setAttribute('tabindex', '0');
    if (!rect.hasAttribute('role')) rect.setAttribute('role', 'button');
    if (!rect.hasAttribute('aria-label')) rect.setAttribute('aria-label', (rect.dataset.fillLabel || rect.dataset.fillCell) + ' - your entry');
    const open = (e) => {
      e.preventDefault();
      const d = fillDialog();
      d.querySelector('.fill-dialog-title').textContent = rect.dataset.fillLabel || rect.dataset.fillCell;
      const ta = d.querySelector('.fill-text');
      ta.value = fillValue(key);
      d.returnValue = '';
      d.onclose = () => {
        const v = d.returnValue;
        if (v === 'save' || v === 'clear') {
          const text = v === 'clear' ? '' : ta.value.trim();
          App.store.update((o) => {
            o.fills = o.fills || {};
            if (text) o.fills[key] = { text, updatedAt: nowIso() };
            else delete o.fills[key];
          });
          indexFill(key, slot, text);
          document.querySelectorAll(`.diagram-slot#${CSS.escape(slotId)} svg [data-fill-cell="${CSS.escape(rect.dataset.fillCell)}"]`).forEach((r) => renderFillText(r.ownerSVGElement, r, text));
        }
        rect.focus();
      };
      d.showModal();
      ta.focus();
    };
    rect.addEventListener('click', open);
    rect.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') open(e);
    });
  });
}

export function indexFill(key, slot, text) {
  const id = 'fill:' + key;
  if (!text) return App.index.remove(id);
  const guide = slot ? Model.guideOfAnchor(slot.section) : null;
  App.index.add({ id, kind: 'note', guide, headingId: slot ? slot.section : null, text: `${slot ? slot.title + ': ' : ''}${text}` });
}

export function indexAllFills() {
  for (const [key, f] of Object.entries(Layout.overlay.fills || {})) {
    const slot = DIAGRAM_SLOTS.find((s) => key.startsWith(s.id + ':'));
    indexFill(key, slot, f.text);
  }
}
