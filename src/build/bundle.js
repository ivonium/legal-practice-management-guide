// Minimal bundler: concatenates src/app/*.js in a fixed order into one IIFE,
// strips `export` keywords, and exposes exported names on globalThis.PMG so
// the same code runs in the browser and in Node unit tests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, '..', 'app');

export const APP_FILES = [
  'util.js',
  'store.js',
  'search.js',
  'calendar.js',
  'formulas.js',
  'walkthrough.js',
  'diagrams.js',
  'diagram.js',
  'layout.js',
  'render.js',
  'calculators.js',
  'notes.js',
  'checklists.js',
  'edit.js',
  'pages.js',
  'print.js',
  'main.js',
];

export function bundleApp(opts = {}) {
  const names = new Set();
  const parts = [];
  for (const f of APP_FILES) {
    const p = path.join(APP_DIR, f);
    if (!fs.existsSync(p)) {
      if (opts.allowMissing) continue;
      throw new Error('Missing app file ' + f);
    }
    let src = fs.readFileSync(p, 'utf8');
    src = src.replace(/^export\s+(async\s+)?(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm, (m, a, kw, name) => {
      names.add(name);
      return `${a || ''}${kw} ${name}`;
    });
    if (/^export\s/m.test(src)) throw new Error(`Unsupported export form in ${f}`);
    if (/^import\s/m.test(src)) throw new Error(`Imports are not allowed in app files (${f})`);
    parts.push(`// ---- ${f}\n${src}`);
  }
  const body = parts.join('\n\n');
  const expose = `\nglobalThis.PMG = { ${[...names].join(', ')} };\n`;
  const js = `(function () {\n'use strict';\n${body}\n${expose}})();\n`;
  if (js.includes('</script')) throw new Error('App JS must not contain "</script"');
  return js;
}
