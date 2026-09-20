// Diagram asset processing for build-time inlining (HANDOVER_TO_CLAUDE_CODE.md §2.3).
// - strips the C2PA <metadata> manifest and its namespace (not needed at runtime)
// - prefixes every id that is not already slot-scoped, and every url(#…)/href="#…"
//   reference to it, so that 49 inlined diagrams cannot collide (marker id="a")
// - adds an accessible name and a data-slot attribute on the root <svg>
import fs from 'node:fs';
import path from 'node:path';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function processSvg(svg, slotId, title) {
  let s = String(svg);
  s = s.replace(/<metadata>[\s\S]*?<\/metadata>/g, '').replace(/\s+xmlns:c2pa="[^"]*"/g, '');
  if (/<script[\s>]/i.test(s)) throw new Error(`${slotId}: <script> inside SVG is not allowed`);
  if (/\bhref="https?:/i.test(s)) throw new Error(`${slotId}: external reference inside SVG`);
  const ids = [...new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))].filter((id) => !id.startsWith(slotId));
  for (const id of ids) {
    const nid = `${slotId}-${id}`;
    s = s.replace(new RegExp(`\\sid="${esc(id)}"`, 'g'), ` id="${nid}"`);
    s = s.replace(new RegExp(`url\\(#${esc(id)}\\)`, 'g'), `url(#${nid})`);
    s = s.replace(new RegExp(`href="#${esc(id)}"`, 'g'), `href="#${nid}"`);
  }
  s = s.replace(/<svg\s/, `<svg data-slot="${slotId}" aria-label="${title.replace(/"/g, '&quot;')}" `);
  return s.trim();
}

export function loadDiagramAssets(dir, slots, notes) {
  const out = {};
  const allIds = new Map();
  if (!fs.existsSync(dir)) {
    notes.push(`[diagrams] Asset directory ${dir} not found; all 49 slots render placeholder lists`);
    return out;
  }
  for (const slot of slots) {
    const p = path.join(dir, `${slot.id}.svg`);
    if (!fs.existsSync(p)) {
      notes.push(`[diagrams] No asset for slot ${slot.id}; placeholder list rendered`);
      continue;
    }
    const svg = processSvg(fs.readFileSync(p, 'utf8'), slot.id, slot.title);
    for (const m of svg.matchAll(/\sid="([^"]+)"/g)) {
      if (allIds.has(m[1])) throw new Error(`Duplicate SVG id "${m[1]}" in ${slot.id} and ${allIds.get(m[1])}`);
      allIds.set(m[1], slot.id);
    }
    out[slot.id] = svg;
  }
  const extra = fs.readdirSync(dir).filter((f) => f.endsWith('.svg') && !slots.some((s) => `${s.id}.svg` === f));
  for (const f of extra) notes.push(`[diagrams] Asset ${f} does not match any slot ID; ignored`);
  return out;
}
