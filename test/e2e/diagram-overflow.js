// Text-overflow probe for the inlined diagrams (HANDOVER §5.2): renders every guide at the
// real system-ui metrics and reports any <text> whose box runs past its diagram's viewBox
// or past the right edge of the box it sits in (the nearest preceding <rect> sibling).
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(pathToFileURL(path.join(ROOT, 'dist', 'PracticeGuides.html')).href + '?print=all');
await page.waitForSelector('html[data-print-ready="1"]');
const report = await page.evaluate(() => {
  const out = [];
  for (const svg of document.querySelectorAll('#print-root .diagram-slot svg')) {
    const slot = svg.dataset.slot;
    const vb = svg.viewBox.baseVal;
    const issues = [];
    for (const t of svg.querySelectorAll('text')) {
      if (t.closest('.is-hidden')) continue;
      let bb;
      try {
        bb = t.getBBox();
      } catch {
        continue;
      }
      if (!bb.width) continue;
      const txt = t.textContent.trim().slice(0, 60);
      if (bb.x + bb.width > vb.x + vb.width + 1) issues.push({ text: txt, over: 'viewBox', by: Math.round(bb.x + bb.width - vb.width) });
      // nearest preceding rect sibling within the same group
      let r = t.previousElementSibling;
      while (r && r.tagName.toLowerCase() !== 'rect') r = r.previousElementSibling;
      if (r) {
        const rx = Number(r.getAttribute('x'));
        const rw = Number(r.getAttribute('width'));
        const ry = Number(r.getAttribute('y'));
        const rh = Number(r.getAttribute('height'));
        const inside = Number.isFinite(rx) && Number.isFinite(rw) && Number.isFinite(ry) && Number.isFinite(rh) && bb.x >= rx - 1 && bb.x < rx + rw && bb.y >= ry - 1 && bb.y + bb.height <= ry + rh + 1;
        if (inside && bb.x + bb.width > rx + rw + 2) issues.push({ text: txt, over: 'box', by: Math.round(bb.x + bb.width - (rx + rw)) });
      }
    }
    if (issues.length) out.push({ slot, issues });
  }
  return out;
});
await browser.close();
if (!report.length) console.log('No diagram text overflows its viewBox or box at system-ui metrics.');
for (const r of report) {
  console.log(`${r.slot}: ${r.issues.length} issue(s)`);
  for (const i of r.issues.slice(0, 6)) console.log(`  - "${i.text}" exceeds ${i.over} by ${i.by}px`);
}
