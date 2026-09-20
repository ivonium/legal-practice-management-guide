// npm run pdf -> dist/PracticeGuides.pdf via Playwright (Sheet A 15.2).
// DEV-003: running header/footer are supplied here (headerTemplate/footerTemplate)
// because Chromium does not support @page margin boxes or named strings.
// Two passes: render, measure the page each heading lands on by extracting the
// PDF text, inject the numbers into the table of contents, render again, then
// verify three sampled headings.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { ROOT } from './load.js';

async function pdfPageTexts(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map((it) => it.str).join(' '));
  }
  return pages;
}

const squash = (s) => String(s).replace(/\s+/g, '').toLowerCase();

export async function makePdf({ out = path.join(ROOT, 'dist', 'PracticeGuides.pdf'), html = path.join(ROOT, 'dist', 'PracticeGuides.html'), log = console.log } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = pathToFileURL(html).href + '?print=all';
  await page.goto(url);
  await page.waitForSelector('html[data-print-ready="1"]', { timeout: 60000 });
  const pdfOpts = {
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    headerTemplate: '<div style="font-size:8pt;color:#555;width:100%;text-align:center;font-family:sans-serif">Practice Management Guides</div>',
    footerTemplate: '<div style="font-size:8pt;color:#555;width:100%;text-align:center;font-family:sans-serif">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    preferCSSPageSize: false,
  };
  // outline (bookmark tree) where supported by this Playwright version
  try {
    pdfOpts.outline = true;
    pdfOpts.tagged = true;
  } catch {}

  // targets: every TOC link and the text of the element it points to
  const targets = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#print-toc .toc-link')).map((a) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      let text = '';
      if (el) {
        const title = el.querySelector('.section-title, .guide-title, h1');
        text = (title || el).textContent;
      }
      return { id, text: text.trim() };
    }),
  );

  const pass = async (label) => {
    let buffer;
    try {
      buffer = await page.pdf(pdfOpts);
    } catch (e) {
      if (/outline|tagged/.test(String(e.message))) {
        delete pdfOpts.outline;
        delete pdfOpts.tagged;
        buffer = await page.pdf(pdfOpts);
      } else throw e;
    }
    const texts = await pdfPageTexts(buffer);
    log(`${label}: ${texts.length} pages`);
    return { buffer, texts };
  };

  // pass 1
  const p1 = await pass('pass 1');
  // find where the TOC ends: first page after the TOC start containing the first guide title
  const tocStart = p1.texts.findIndex((t) => squash(t).includes(squash('Table of Contents')));
  const firstGuideText = squash(targets[0].text);
  let tocEnd = tocStart;
  for (let i = tocStart + 1; i < p1.texts.length; i++) {
    if (squash(p1.texts[i]).includes(firstGuideText) && !squash(p1.texts[i]).includes(squash('Table of Contents'))) {
      tocEnd = i - 1;
      break;
    }
  }
  const locate = (texts, text, fromPage) => {
    const s = squash(text);
    if (!s) return null;
    for (let i = fromPage; i < texts.length; i++) if (squash(texts[i]).includes(s)) return i + 1;
    return null;
  };
  const pageOf = {};
  let cursor = tocEnd + 1;
  for (const t of targets) {
    const p = locate(p1.texts, t.text, Math.max(cursor, tocEnd + 1));
    if (p) {
      pageOf[t.id] = p;
      cursor = p - 1;
    }
  }
  const missing = targets.filter((t) => !pageOf[t.id]).map((t) => t.id);
  if (missing.length) log(`pass 1: could not locate ${missing.length} TOC entries: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
  const inject = (map) => {
    for (const span of document.querySelectorAll('#print-toc .toc-page')) {
      const id = span.getAttribute('data-href').slice(1);
      if (map[id]) span.setAttribute('data-page', String(map[id]));
    }
  };
  await page.evaluate(inject, pageOf);

  // pass 2
  const p2 = await pass('pass 2');
  // verify: page numbers must still match after injecting the numbers (re-locate)
  const pageOf2 = {};
  cursor = tocEnd + 1;
  for (const t of targets) {
    const p = locate(p2.texts, t.text, Math.max(cursor, tocEnd + 1));
    if (p) {
      pageOf2[t.id] = p;
      cursor = p - 1;
    }
  }
  let finalBuffer = p2.buffer;
  let finalTexts = p2.texts;
  let finalMap = pageOf2;
  const drift = targets.filter((t) => pageOf[t.id] && pageOf2[t.id] && pageOf[t.id] !== pageOf2[t.id]);
  if (drift.length) {
    log(`pass 2: ${drift.length} entries shifted after numbering; running pass 3`);
    await page.evaluate(inject, pageOf2);
    const p3 = await pass('pass 3');
    finalBuffer = p3.buffer;
    finalTexts = p3.texts;
    finalMap = {};
    cursor = tocEnd + 1;
    for (const t of targets) {
      const p = locate(p3.texts, t.text, Math.max(cursor, tocEnd + 1));
      if (p) {
        finalMap[t.id] = p;
        cursor = p - 1;
      }
    }
  }
  fs.writeFileSync(out, finalBuffer);

  // Acceptance test 17: three sampled H2 headings - the number printed in the TOC
  // must equal the page on which the heading appears.
  const tocNumbers = await page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('#print-toc .toc-page')).map((s) => [s.getAttribute('data-href').slice(1), Number(s.getAttribute('data-page')) || null])));
  const h2Targets = targets.filter((t) => /--s\d+$/.test(t.id));
  const samples = [h2Targets[0], h2Targets[Math.floor(h2Targets.length / 2)], h2Targets[h2Targets.length - 1]].filter(Boolean);
  const verification = samples.map((t) => ({ id: t.id, text: t.text, tocPage: tocNumbers[t.id], actualPage: finalMap[t.id], ok: tocNumbers[t.id] != null && tocNumbers[t.id] === finalMap[t.id] }));
  for (const v of verification) log(`verify ${v.ok ? 'OK  ' : 'FAIL'} ${v.id}: TOC says page ${v.tocPage}, heading found on page ${v.actualPage}`);
  const allOk = verification.every((v) => v.ok);
  // Acceptance test 18 spot checks: no controls visible, calculators static (evaluated under print media)
  await page.emulateMedia({ media: 'print' });
  const controlsVisible = await page.evaluate(() => {
    const vis = (el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    return Array.from(document.querySelectorAll('#print-root button, #print-root .calculator-form, #print-root .section.is-collapsed')).filter(vis).length;
  });
  const staticCalcs = await page.evaluate(() => document.querySelectorAll('#print-root .calculator--print .calc-print-table, #print-root .calculator--print .calculator-static').length);
  const result = { out, pages: finalTexts.length, tocStart: tocStart + 1, tocEnd: tocEnd + 1, verification, allOk, missingTocEntries: missing, controlsVisible, staticCalculators: staticCalcs, outline: 'outline' in pdfOpts };
  fs.writeFileSync(path.join(ROOT, 'dist', 'pdf-report.json'), JSON.stringify(result, null, 2));
  await browser.close();
  return result;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).replace(/\\/g, '/').endsWith('src/build/pdf.js');
if (isMain) {
  makePdf()
    .then((r) => {
      console.log(`PDF written: ${r.out} (${r.pages} pages). TOC verification ${r.allOk ? 'passed' : 'FAILED'}. Controls visible in print: ${r.controlsVisible}. Static calculators: ${r.staticCalculators}.`);
      process.exit(r.allOk ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
