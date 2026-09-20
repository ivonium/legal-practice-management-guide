// Loads the content directory and produces the full content model.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDES } from './guides.js';
import { parseGuides } from './parse.js';
import { parseContentPack } from './contentpack.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..', '..');
export const CONTENT_DIR = path.join(ROOT, 'content');

export function loadContentModel() {
  const notes = [];
  const packMd = fs.readFileSync(path.join(CONTENT_DIR, 'INSTRUCTION_C_Content_Pack.md'), 'utf8');
  // glossary terms are needed by the guide parser; parse the pack first without anchors
  const packPre = parseContentPack(packMd, null, []);
  const sources = GUIDES.map((g) => ({ ...g, markdown: fs.readFileSync(path.join(CONTENT_DIR, g.file), 'utf8') }));
  const parsed = parseGuides(sources, packPre.glossary);
  notes.push(...parsed.notes);
  const headingIds = new Set(parsed.headingIds);
  const pack = parseContentPack(packMd, headingIds, notes);
  return { guides: parsed.guides, pack, stats: parsed.stats, headingIds: parsed.headingIds, notes, sources };
}
