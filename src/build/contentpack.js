// Parses INSTRUCTION_C_Content_Pack.md into structured data. Text is used verbatim;
// only the "→ guide §n" notation is resolved to anchors (Sheet A section 2.2).
import MarkdownIt from 'markdown-it';
import { GUIDES, slugify } from './guides.js';
import { htmlToText } from './parse.js';

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

function inline(s) {
  return md.renderInline(String(s).trim());
}
function plain(s) {
  return htmlToText(inline(s)).replace(/\s+/g, ' ').trim();
}

function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  // split on unescaped pipes; the content pack has no escaped pipes
  return s.split('|').map((c) => c.trim());
}

function parseTable(lines, startIdx) {
  // returns { header, rows, end }
  const header = splitTableRow(lines[startIdx]);
  let i = startIdx + 1;
  if (!/^\s*\|?\s*:?-+/.test(lines[i] || '')) throw new Error('Expected table separator at line ' + (i + 1));
  i++;
  const rows = [];
  while (i < lines.length && /^\s*\|/.test(lines[i])) {
    rows.push(splitTableRow(lines[i]));
    i++;
  }
  return { header, rows, end: i };
}

// "→ guide-slug §n" or "§n.m" -> anchor id
export function resolveRef(ref, headingIds, notes, where) {
  const m = String(ref).trim().match(/^([a-z0-9-]+)\s*§\s*(\d+)(?:\.(\d+))?$/);
  if (!m) {
    notes.push(`[content-pack] Could not parse reference "${ref}" (${where})`);
    return null;
  }
  const id = m[3] ? `${m[1]}--s${m[2]}-${m[3]}` : `${m[1]}--s${m[2]}`;
  if (headingIds && !headingIds.has(id)) {
    notes.push(`[content-pack] Reference "${ref}" (${where}) does not resolve to an existing anchor (${id})`);
    return { id, unresolved: true, slug: m[1], section: m[3] ? `${m[2]}.${m[3]}` : m[2] };
  }
  return { id, slug: m[1], section: m[3] ? `${m[2]}.${m[3]}` : m[2] };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Interpretation of the recurrence codes for the timeline (Sheet A 14.2).
// The verbatim recurrence text is always displayed; this only drives date expansion.
export function interpretRecurrence(rec, notes, rowNo) {
  const r = rec.trim();
  const out = { kind: 'rule', dates: [] };
  const dm = r.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)/);
  const once = r.match(/by\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/);
  if (once) {
    const mi = MONTHS.indexOf(once[1]);
    const last = new Date(Number(once[2]), mi + 1, 0).getDate();
    out.kind = 'once';
    out.dates = [{ year: Number(once[2]), month: mi + 1, day: last }];
    out.label = `By ${once[1]} ${once[2]}`;
  } else if (/^QUARTERLY/.test(r) || /quarterly/i.test(r)) {
    out.kind = 'quarterly';
    out.dates = [
      { month: 3, day: 31 },
      { month: 6, day: 30 },
      { month: 9, day: 30 },
      { month: 12, day: 31 },
    ];
    if (/^ANNUAL-FIXED/.test(r)) notes.push(`[calendar row ${rowNo}] Recurrence "${r}" is coded ANNUAL-FIXED but reads as quarterly; timeline treats it as quarterly`);
    if (/WITHIN\(20, banking days/.test(r)) out.within = '20 banking days after period end';
  } else if (/monthly/i.test(r) && !dm) {
    out.kind = 'monthly';
    if (/^ANNUAL-FIXED/.test(r)) notes.push(`[calendar row ${rowNo}] Recurrence "${r}" is coded ANNUAL-FIXED but reads as monthly; timeline treats it as monthly (month end)`);
  } else if (dm && /^ANNUAL-FIXED/.test(r)) {
    out.kind = 'annual';
    out.dates = [{ month: MONTHS.indexOf(dm[2]) + 1, day: Number(dm[1]) }];
    if (/before/.test(r)) {
      // Author decision (BUILD_NOTES E.5): a concrete date - two weeks before the stated date.
      out.dates = [{ month: MONTHS.indexOf(dm[2]) + 1, day: Number(dm[1]) - 14 }];
      out.label = `A few weeks before ${dm[1]} ${dm[2]} (shown as ${Number(dm[1]) - 14} ${dm[2]})`;
    }
    if (/given in practice/.test(r)) out.label = 'Given in practice mid to late July';
    if (/expected/.test(r)) out.label = 'Expected; confirm the period and date with AUSTRAC';
  } else if (/^ANNUAL-FIXED\(during July\)/.test(r)) {
    // Author decision (BUILD_NOTES E.5): a concrete date - the last day of July.
    out.kind = 'annual';
    out.dates = [{ month: 7, day: 31 }];
    out.label = 'During July (shown as 31 July)';
  } else if (/^ANNUAL-FIXED/.test(r)) {
    out.kind = 'annual-rule';
  } else if (/^WITHIN/.test(r)) {
    out.kind = 'within';
  } else if (/^EVENT/.test(r)) {
    out.kind = 'event';
  } else if (/^ONGOING/.test(r)) {
    out.kind = 'ongoing';
  } else {
    notes.push(`[calendar row ${rowNo}] Unrecognised recurrence code "${r}"; shown as a rule`);
  }
  return out;
}

export function parseContentPack(markdown, headingIds, notes) {
  const lines = markdown.split(/\r?\n/);
  const findLine = (re, from = 0) => {
    for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i;
    return -1;
  };

  // ---- Part 1: landing page and executive summaries
  const p1 = findLine(/^## Part 1/);
  const p2 = findLine(/^## Part 2/);
  const p3 = findLine(/^## Part 3/);
  const p4 = findLine(/^## Part 4/);
  const p5 = findLine(/^## Part 5/);
  const endLine = findLine(/^\*End of Instruction Sheet C/);

  // 1.0 landing intro
  const l10 = findLine(/^### 1\.0/, p1);
  const landingTitleLine = findLine(/^\*\*.+\*\*$/, l10);
  const landingTitle = plain(lines[landingTitleLine].replace(/^\*\*|\*\*$/g, ''));
  // intro paragraph: the next non-empty line after title
  let li = landingTitleLine + 1;
  while (!lines[li].trim()) li++;
  const introLines = [];
  while (lines[li].trim()) introLines.push(lines[li++]);
  const landingIntro = inline(introLines.join(' '));
  const cardTableStart = findLine(/^\| Guide \| Description \|/, li);
  const cardTable = parseTable(lines, cardTableStart);
  const cards = {};
  for (const row of cardTable.rows) {
    const g = GUIDES.find((x) => x.title === row[0]);
    if (!g) {
      notes.push(`[content-pack] Card description row "${row[0]}" does not match a guide title`);
      continue;
    }
    cards[g.slug] = { html: inline(row[1]), text: plain(row[1]) };
  }

  // 1.1 - 1.10 summaries
  const summaries = {};
  for (let k = 1; k <= 10; k++) {
    const start = findLine(new RegExp(`^### 1\\.${k} `), p1);
    if (start === -1) {
      notes.push(`[content-pack] Executive summary 1.${k} not found`);
      continue;
    }
    const heading = lines[start].replace(/^### 1\.\d+\s+/, '').replace(/\s+-\s+executive summary$/, '');
    const g = GUIDES.find((x) => x.title === heading);
    if (!g) {
      notes.push(`[content-pack] Executive summary heading "${heading}" does not match a guide title`);
      continue;
    }
    let i = start + 1;
    while (!lines[i].trim()) i++;
    const intro = [];
    while (lines[i].trim() && !/^\*\*Main areas\*\*/.test(lines[i])) intro.push(lines[i++]);
    while (!/^\*\*Main areas\*\*/.test(lines[i])) i++;
    i++;
    const items = [];
    while (i < lines.length && !/^---/.test(lines[i]) && !/^### /.test(lines[i])) {
      const m = lines[i].match(/^(\d+)\.\s+(.*?)\s*→\s*([a-z0-9-]+\s*§\s*[\d.]+)\s*$/);
      if (m) {
        const ref = resolveRef(m[3], headingIds, notes, `summary ${g.slug} item ${m[1]}`);
        items.push({ n: Number(m[1]), html: inline(m[2]), text: plain(m[2]), ref: m[3].trim(), target: ref ? ref.id : null, section: ref ? ref.section : null, unresolved: !!(ref && ref.unresolved) });
      } else if (lines[i].trim()) {
        notes.push(`[content-pack] Unparsed line in summary ${g.slug}: "${lines[i]}"`);
      }
      i++;
    }
    summaries[g.slug] = { intro: inline(intro.join(' ')), introText: plain(intro.join(' ')), items };
  }

  // ---- Part 2: glossary
  const gNote = lines.slice(p2 + 1, p3).find((l) => /^Terms are matched/.test(l)) || '';
  const gTable = parseTable(lines, findLine(/^\| Term \| Definition \|/, p2));
  const glossary = gTable.rows.map((row) => ({
    term: row[0].replace(/^`|`$/g, '').trim(),
    id: 'g-' + slugify(row[0]),
    html: inline(row[1]),
    plain: plain(row[1]),
  }));

  // ---- Part 3: calendar
  const recNote = lines.slice(p3 + 1, p4).find((l) => /^Recurrence codes/.test(l)) || '';
  const cTable = parseTable(lines, findLine(/^\| # \| Obligation \|/, p3));
  const calendar = cTable.rows.map((row) => {
    const n = Number(row[0]);
    const refRaw = row[4];
    const ref = resolveRef(refRaw, headingIds, notes, `calendar row ${n}`);
    return {
      n,
      obligation: row[1],
      obligationHtml: inline(row[1]),
      recurrence: row[2],
      category: row[3],
      guideRef: refRaw,
      guide: ref ? ref.slug : null,
      section: ref ? ref.section : null,
      target: ref ? ref.id : null,
      provision: row[5],
      provisionHtml: inline(row[5]),
      schedule: interpretRecurrence(row[2], notes, n),
    };
  });

  // ---- Part 4: citations seed
  const iTable = parseTable(lines, findLine(/^\| Register ID/, p4));
  const instruments = iTable.rows.map((row) => ({ id: row[0].replace(/`/g, '').trim(), name: row[1].trim(), short: row[2].trim() }));
  const unlinkedStart = findLine(/^\*\*Unlinked references\*\*/, p4);
  const casesStart = findLine(/^\*\*Cases\*\*/, p4);
  const unlinked = [];
  for (let i = unlinkedStart + 1; i < casesStart; i++) {
    const m = lines[i].match(/^-\s+(.*)$/);
    if (!m) continue;
    // "Body: refs (guide §n, §m)"
    const text = m[1].trim();
    const refsM = text.match(/\(([^()]*§[^()]*)\)\s*$/);
    const body = refsM ? text.slice(0, refsM.index).trim() : text;
    const refs = [];
    if (refsM) {
      // e.g. "tax-and-accounting §10, §12, §13" or "anti-money-laundering §19; cyber-security §6"
      let currentSlug = null;
      for (const part of refsM[1].split(/[;,]/)) {
        const p = part.trim();
        const mm = p.match(/^(?:([a-z0-9-]+)\s*)?§\s*([\d.]+)$/);
        if (!mm) continue;
        if (mm[1]) currentSlug = mm[1];
        if (!currentSlug) continue;
        const r = resolveRef(`${currentSlug} §${mm[2]}`, headingIds, notes, `unlinked reference "${body}"`);
        if (r) refs.push(r);
      }
    }
    unlinked.push({ text: body, html: inline(body), refs });
  }
  const cases = [];
  for (let i = casesStart + 1; i < p5; i++) {
    const m = lines[i].match(/^-\s+(.*)$/);
    if (m) cases.push({ html: inline(m[1]), text: plain(m[1]) });
  }

  // ---- Part 5: colophon
  const colophonLines = lines.slice(p5 + 1, endLine).filter((l) => !/^---\s*$/.test(l));
  const paras = [];
  let cur = [];
  for (const l of colophonLines) {
    if (!l.trim()) {
      if (cur.length) paras.push(cur.join(' '));
      cur = [];
    } else cur.push(l);
  }
  if (cur.length) paras.push(cur.join(' '));
  const colophon = { title: plain(paras[0].replace(/^\*\*|\*\*$/g, '')), paragraphs: paras.slice(1).map((p) => inline(p)) };

  return {
    landing: { title: landingTitle, intro: landingIntro, cards },
    summaries,
    glossary,
    glossaryNote: gNote,
    calendar,
    recurrenceNote: recNote,
    citationsSeed: { instruments, unlinked, cases },
    colophon,
  };
}
