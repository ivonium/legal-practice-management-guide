// npm run build -> dist/PracticeGuides.html (single self-contained file).
import fs from 'node:fs';
import path from 'node:path';
import { loadContentModel, ROOT } from './load.js';
import { buildCitationsIndex } from './citations.js';
import { bundleApp } from './bundle.js';
import { GUIDES } from './guides.js';
import { loadDiagramAssets } from './svg.js';
import vm from 'node:vm';

export function escapeShell(s) {
  return s.replace(/<\//g, '<\\/');
}

export function build({ overlay = null, exportedAt = '' } = {}) {
  const t0 = Date.now();
  const model = loadContentModel();
  const notes = [...model.notes];

  // citations index (Sheet A 14.3)
  const headingLookup = (hid) => {
    const g = model.guides.find((x) => x.slug === (hid.includes('--') ? hid.split('--')[0] : hid));
    const h = g && g.headings.find((x) => x.id === hid);
    if (!g) return { label: hid, guideTitle: '', section: '' };
    if (!h) return { label: g.title, guideTitle: g.title, section: '' };
    const sec = h.number ? '§' + h.number : h.text;
    return { label: `${g.title} ${sec}`, guideTitle: g.title, section: h.number || h.text };
  };
  const citations = buildCitationsIndex(model.stats.citations, model.pack.citationsSeed, headingLookup, notes);

  // glossary usage: term -> guides in which it was marked
  const glossaryUsage = {};
  for (const m of model.stats.glossaryMarks) {
    const slug = m.sectionId.split('--')[0];
    (glossaryUsage[m.term] = glossaryUsage[m.term] || []).includes(slug) || glossaryUsage[m.term].push(slug);
  }
  model.pack.glossaryUsage = glossaryUsage;

  // diagram assets (design/diagrams/dg-*.svg), inlined and id-scoped
  const slotSrc = fs.readFileSync(path.join(ROOT, 'src', 'app', 'diagrams.js'), 'utf8').replace(/^export /gm, '');
  const slots = vm.runInNewContext(slotSrc + ';DIAGRAM_SLOTS', { escapeAttr: (s) => s, escapeHtml: (s) => s });
  const diagrams = loadDiagramAssets(path.join(ROOT, 'design', 'diagrams'), slots, notes);

  const builtAt = new Date().toISOString();
  const data = {
    meta: { builtAt, version: 1, guides: GUIDES.map((g) => ({ slug: g.slug, title: g.title, file: g.file })) },
    guides: model.guides,
    pack: model.pack,
    citations,
    diagrams,
  };
  const contentJson = escapeShell(JSON.stringify(data));
  const shell = fs.readFileSync(path.join(ROOT, 'src', 'shell.html'), 'utf8');
  // theme.css (Claude Design) is concatenated after app.css so its :root overrides win
  const themePath = path.join(ROOT, 'design', 'theme.css');
  const theme = fs.existsSync(themePath) ? '\n/* ==== design/theme.css ==== */\n' + fs.readFileSync(themePath, 'utf8') : '';
  if (!theme) notes.push('[theme] design/theme.css not found; neutral stylesheet only');
  const css = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'app.css'), 'utf8') + theme;
  if (css.includes('</style')) throw new Error('CSS must not contain </style');
  const js = bundleApp();
  const fill = {
    SHELL: escapeShell(shell),
    APP_CSS: css,
    APP_JS: js,
    CONTENT_MODEL: contentJson,
    OVERLAY: escapeShell(overlay ? JSON.stringify(overlay) : ''),
    EXPORTED_AT: exportedAt,
    BUILT_AT: builtAt,
  };
  const html = shell.replace(/\{\{(SHELL|APP_CSS|APP_JS|CONTENT_MODEL|OVERLAY|EXPORTED_AT|BUILT_AT)\}\}/g, (m, k) => fill[k]);
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  const out = path.join(ROOT, 'dist', 'PracticeGuides.html');
  fs.writeFileSync(out, html);
  // build report for BUILD_NOTES.md
  const report = {
    builtAt,
    outputBytes: html.length,
    notes,
    stats: {
      xrefs: model.stats.xrefs,
      glossaryMarks: model.stats.glossaryMarks.length,
      checklists: model.stats.checklists.length,
      citations: model.stats.citations.length,
      unknownInstrumentIds: citations.unknownIds,
      headings: model.headingIds.length,
      blocks: model.guides.reduce((n, g) => n + g.nodes.filter((x) => x.kind === 'block').length, 0),
      diagramsInlined: Object.keys(diagrams).length,
      diagramBytes: Object.values(diagrams).reduce((n, s) => n + s.length, 0),
      theme: !!theme,
    },
    ms: Date.now() - t0,
  };
  fs.writeFileSync(path.join(ROOT, 'dist', 'build-report.json'), JSON.stringify(report, null, 2));
  return { out, report };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).replace(/\\/g, '/').endsWith('src/build/build.js');
if (isMain) {
  const { out, report } = build();
  console.log(`Built ${out} (${(report.outputBytes / 1024 / 1024).toFixed(2)} MB) in ${report.ms} ms`);
  console.log(`Headings ${report.stats.headings}, blocks ${report.stats.blocks}, citations ${report.stats.citations}, glossary marks ${report.stats.glossaryMarks}`);
  if (report.notes.length) {
    console.log('Notes:');
    for (const n of report.notes) console.log(' - ' + n);
  }
}
