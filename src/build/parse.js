// Markdown -> content model. Implements Instruction Sheet A sections 2.2 and 4.
// Only the transformations listed in section 4 are performed. Nothing is
// summarised, corrected, reordered or dropped; the fidelity test (test 1)
// checks that the rendered text equals the source text.
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token.mjs';
import { GUIDES, CROSS_REF_NAMES, slugify } from './guides.js';

const LEGISLATION_HOSTS = ['legislation.nsw.gov.au', 'legislation.gov.au'];

export function isLegislationHref(href) {
  try {
    const u = new URL(href);
    const host = u.hostname.toLowerCase();
    return LEGISLATION_HOSTS.some((h) => host === h || host.endsWith('.' + h)) || host.includes('austlii');
  } catch {
    return false;
  }
}

export function htmlToText(html) {
  return decodeEntities(
    String(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|tr|h[1-6]|blockquote|div|pre|td|th)>/gi, '$&\n')
      .replace(/<[^>]+>/g, ''),
  );
}

export function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function makeMd() {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false });
  // Bare URLs are linkified only when they carry an explicit http(s) scheme.
  // Visible text is unchanged. Logged in BUILD_NOTES.
  md.linkify.set({ fuzzyLink: false, fuzzyEmail: false, fuzzyIP: false });
  md.linkify.add('ftp:', null);
  md.linkify.add('//', null);
  md.linkify.add('mailto:', null);
  // Keep the visible text of a linkified URL exactly as written in the source
  // (the default decodes %20 etc. in the displayed text).
  md.normalizeLinkText = (s) => s;
  return md;
}

// ---------------------------------------------------------------------------
// Heading identification (Sheet A 2.2)
// ---------------------------------------------------------------------------
function headingInfo(level, text, guideSlug, ctx, notes) {
  const t = text.trim();
  if (level === 1) return { id: guideSlug, number: null, kind: 'h1' };
  if (level === 2) {
    const m = t.match(/^(\d+)\.\s+/);
    if (m) {
      const n = Number(m[1]);
      if (ctx.lastH2 !== null && n !== ctx.lastH2 + 1) {
        notes.push(`[${guideSlug}] H2 numbering jumps from ${ctx.lastH2} to ${n}: "${t}"`);
      }
      return { id: `${guideSlug}--s${n}`, number: String(n), kind: 'h2' };
    }
    notes.push(`[${guideSlug}] Unnumbered H2 "${t}" - given slug-based ID`);
    return { id: `${guideSlug}--${slugify(t)}`, number: null, kind: 'h2' };
  }
  if (level === 3) {
    const m = t.match(/^(\d+)\.(\d+)\b/);
    if (m) {
      const n = Number(m[1]);
      const mm = Number(m[2]);
      if (ctx.lastH2 !== null && n !== ctx.lastH2) {
        notes.push(`[${guideSlug}] H3 "${t}" is numbered ${n}.${mm} but sits under H2 ${ctx.lastH2}; ID uses the heading's own numbers`);
      }
      return { id: `${guideSlug}--s${n}-${mm}`, number: `${n}.${mm}`, kind: 'h3' };
    }
    const parent = ctx.lastH2 !== null ? `${guideSlug}--s${ctx.lastH2}` : guideSlug;
    return { id: `${parent}--${slugify(t)}`, number: null, kind: 'h3' };
  }
  // H4 and below: parent id + slug of text
  return { id: `${ctx.parentIdForDeep}--${slugify(t)}`, number: null, kind: 'h' + level };
}

// ---------------------------------------------------------------------------
// Inline processing helpers (cross references and glossary marking)
// ---------------------------------------------------------------------------
function inlineText(children) {
  return children.map((c) => (c.type === 'text' || c.type === 'code_inline' ? c.content : c.type === 'softbreak' || c.type === 'hardbreak' ? '\n' : '')).join('');
}

function makeToken(md, type, tag, nesting) {
  return new Token(type, tag, nesting);
}

// Cross reference linking (rule 4.4). Operates on the children of an inline token.
function applyCrossRefs(md, children, headingIds, thisGuide, stats) {
  const out = [];
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.type === 'strong_open' && children[i + 1] && children[i + 1].type === 'text' && children[i + 2] && children[i + 2].type === 'strong_close') {
      const name = children[i + 1].content.trim();
      const slug = CROSS_REF_NAMES[name];
      if (slug && children[i + 1].content === name) {
        // Look for a section number near the reference.
        let target = slug;
        const after = children[i + 3] && children[i + 3].type === 'text' ? children[i + 3].content : '';
        const before = out.length && out[out.length - 1].type === 'text' ? out[out.length - 1].content : '';
        let sec = null;
        let m = after.match(/^\s*guide(?:,)?\s*(?:at|,)?\s*section\s+(\d+)(?:\.(\d+))?/i);
        if (!m) m = before.match(/section\s+(\d+)(?:\.(\d+))?\s+of\s+the\s*$/i);
        if (m) {
          const cand = m[2] ? `${slug}--s${m[1]}-${m[2]}` : `${slug}--s${m[1]}`;
          if (headingIds.has(cand)) sec = cand;
          else stats.notes.push(`[${thisGuide}] Cross reference to "${name}" section ${m[1]}${m[2] ? '.' + m[2] : ''} does not resolve to an anchor (${cand}); linked to the guide instead`);
        }
        if (sec) target = sec;
        const lo = makeToken(md, 'link_open', 'a', 1);
        lo.attrs = [['href', '#' + target], ['class', 'xref']];
        const lc = makeToken(md, 'link_close', 'a', -1);
        out.push(c, lo, children[i + 1], lc, children[i + 2]);
        stats.xrefs.push({ guide: thisGuide, name, target });
        i += 2;
        continue;
      }
    }
    out.push(c);
  }
  return out;
}

function wordBoundaryOk(s, start, end) {
  const isWord = (ch) => /[A-Za-z0-9]/.test(ch);
  const beforeCh = start > 0 ? s[start - 1] : '';
  const afterCh = end < s.length ? s[end] : '';
  return !(beforeCh && isWord(beforeCh)) && !(afterCh && isWord(afterCh));
}

// Glossary term marking (rule 4.5). Marks the first occurrence in each H2 section.
// `terms` is sorted longest-first. `marked` is the per-H2 set.
function applyGlossary(md, children, terms, marked, sectionId, stats) {
  const out = [];
  let linkDepth = 0;
  for (const c of children) {
    if (c.type === 'link_open') linkDepth++;
    if (c.type === 'link_close') linkDepth--;
    if (c.type !== 'text' || linkDepth > 0) {
      out.push(c);
      continue;
    }
    let text = c.content;
    // Find earliest match among unmarked terms; loop until none.
    let pieces = [];
    let cursor = 0;
    for (;;) {
      let best = null;
      for (const term of terms) {
        if (marked.has(term.term)) continue;
        let idx = text.indexOf(term.term, cursor);
        while (idx !== -1 && !wordBoundaryOk(text, idx, idx + term.term.length)) idx = text.indexOf(term.term, idx + 1);
        if (idx !== -1 && (best === null || idx < best.idx || (idx === best.idx && term.term.length > best.term.term.length))) best = { idx, term };
      }
      if (!best) break;
      if (best.idx > cursor) pieces.push({ type: 'text', content: text.slice(cursor, best.idx) });
      pieces.push({ type: 'abbr', content: best.term.term, term: best.term });
      marked.add(best.term.term);
      stats.glossaryMarks.push({ term: best.term.term, sectionId });
      cursor = best.idx + best.term.term.length;
    }
    if (!pieces.length) {
      out.push(c);
      continue;
    }
    if (cursor < text.length) pieces.push({ type: 'text', content: text.slice(cursor) });
    for (const p of pieces) {
      if (p.type === 'text') {
        const t = makeToken(md, 'text', '', 0);
        t.content = p.content;
        out.push(t);
      } else {
        const o = makeToken(md, 'abbr_open', 'abbr', 1);
        o.attrs = [
          ['class', 'abbr'],
          ['title', p.term.plain],
          ['data-term', p.term.term],
          ['data-glossary', 'g-' + slugify(p.term.term)],
          ['tabindex', '0'],
        ];
        const t = makeToken(md, 'text', '', 0);
        t.content = p.content;
        const cl = makeToken(md, 'abbr_close', 'abbr', -1);
        out.push(o, t, cl);
      }
    }
  }
  return out;
}

// DEV-004: "___" placeholders become score boxes (author decision, BUILD_NOTES E.7).
function applyScoreBoxes(md, children) {
  const out = [];
  for (const c of children) {
    if (c.type !== 'text' || !c.content.includes('___')) {
      out.push(c);
      continue;
    }
    const parts = c.content.split(/_{3,}/);
    parts.forEach((p, i) => {
      if (p) {
        const t = makeToken(md, 'text', '', 0);
        t.content = p;
        out.push(t);
      }
      if (i < parts.length - 1) out.push(makeToken(md, 'scorebox', 'span', 0));
    });
  }
  return out;
}

// Checklist conversion (rule 4.3): list items beginning "[ ] " or "[x] ".
function applyChecklist(md, tokens, blockId, stats) {
  let idx = 0;
  let converted = 0;
  const labels = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== 'list_item_open') continue;
    // find the first inline in this item
    let j = i + 1;
    while (j < tokens.length && tokens[j].type !== 'inline' && tokens[j].type !== 'list_item_close') j++;
    if (j >= tokens.length || tokens[j].type !== 'inline') continue;
    const inline = tokens[j];
    const first = inline.children[0];
    if (!first || first.type !== 'text') continue;
    const m = first.content.match(/^\[( |x|X)\]\s+/);
    if (!m) continue;
    const checked = m[1].toLowerCase() === 'x';
    first.content = first.content.slice(m[0].length);
    const cbId = `${blockId}-i${idx}`;
    const cb = makeToken(md, 'checkbox', '', 0);
    cb.attrs = [['id', cbId], ['checked', checked ? '1' : '0']];
    inline.children.unshift(cb);
    t.attrJoin('class', 'checklist-item');
    t.attrSet('data-checkbox', cbId);
    labels.push({ id: cbId, text: inlineText(inline.children).trim(), defaultChecked: checked });
    idx++;
    converted++;
  }
  if (converted) stats.checklists.push({ blockId, count: converted });
  return labels;
}

// ---------------------------------------------------------------------------
// Renderer rules
// ---------------------------------------------------------------------------
function installRenderer(md, ctx) {
  const r = md.renderer;
  const defaultLinkOpen = r.rules.link_open || ((tokens, idx, o, e, self) => self.renderToken(tokens, idx, o));
  r.rules.link_open = (tokens, idx, options, env, self) => {
    const t = tokens[idx];
    const href = t.attrGet('href') || '';
    if (/^https?:\/\//i.test(href)) {
      t.attrSet('target', '_blank');
      t.attrSet('rel', 'noopener');
      if (isLegislationHref(href)) {
        t.attrJoin('class', 'link-legislation');
        if (env && env.citations) {
          // link text is the following text tokens up to link_close
          let text = '';
          for (let k = idx + 1; k < tokens.length && tokens[k].type !== 'link_close'; k++) if (tokens[k].type === 'text') text += tokens[k].content;
          env.citations.push({ href, text, headingId: env.headingId, guide: env.guide, blockId: env.blockId });
        }
      } else {
        t.attrJoin('class', 'link-external');
      }
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };
  r.rules.abbr_open = (tokens, idx, options, env, self) => self.renderToken(tokens, idx, options);
  r.rules.abbr_close = (tokens, idx, options, env, self) => self.renderToken(tokens, idx, options);
  r.rules.checkbox = (tokens, idx) => {
    const t = tokens[idx];
    const id = t.attrGet('id');
    const checked = t.attrGet('checked') === '1';
    return `<input type="checkbox" class="checklist-box" id="${escapeHtml(id)}" data-default="${checked ? '1' : '0'}"${checked ? ' checked' : ''}> <label for="${escapeHtml(id)}" class="checklist-label">`;
  };
  // close the label at the end of the inline of a checklist item
  const defaultLiClose = r.rules.list_item_close || ((tokens, idx, o, e, self) => self.renderToken(tokens, idx, o));
  r.rules.list_item_close = (tokens, idx, options, env, self) => defaultLiClose(tokens, idx, options, env, self);
  const defaultInline = r.renderInline.bind(r);
  r.renderInline = function (tokens, options, env) {
    let html = defaultInline(tokens, options, env);
    if (tokens.length && tokens[0].type === 'checkbox') html += '</label>';
    return html;
  };
  // blockquote callout rule (Sheet A 16.2)
  const defaultBqOpen = r.rules.blockquote_open || ((tokens, idx, o, e, self) => self.renderToken(tokens, idx, o));
  r.rules.blockquote_open = (tokens, idx, options, env, self) => {
    // find matching close and inspect content
    let depth = 0;
    let statute = false;
    for (let k = idx; k < tokens.length; k++) {
      if (tokens[k].type === 'blockquote_open') depth++;
      if (tokens[k].type === 'blockquote_close') {
        depth--;
        if (depth === 0) break;
      }
      if (tokens[k].type === 'inline') {
        for (const c of tokens[k].children) {
          if (c.type === 'link_open' && /legislation\.nsw\.gov\.au/i.test(c.attrGet('href') || '')) statute = true;
          if (c.type === 'text' && /\[\d{4}\]\s+[A-Z][A-Za-z]*\s+\d+|\(\d{4}\)\s+\d+\s+[A-Z]{2,}/.test(c.content)) statute = true;
        }
      }
    }
    if (statute) tokens[idx].attrJoin('class', 'callout callout--statute');
    return defaultBqOpen(tokens, idx, options, env, self);
  };
  // DEV-004: score placeholders. The author asked for the "___" score placeholders
  // (Stress Management §7) to render as boxes that can be wired to inputs later.
  r.rules.scorebox = (tokens, idx, options, env) => {
    env.boxCount = (env.boxCount || 0) + 1;
    const id = `${env.blockId || env.headingId || 'box'}-box${env.boxCount}`;
    return `<span class="score-box" data-box="${escapeHtml(id)}" data-dev="DEV-004" role="textbox" aria-label="Score"></span>`;
  };
  // tables wrapped for horizontal scrolling
  const defaultTableOpen = r.rules.table_open || ((tokens, idx, o, e, self) => self.renderToken(tokens, idx, o));
  const defaultTableClose = r.rules.table_close || ((tokens, idx, o, e, self) => self.renderToken(tokens, idx, o));
  r.rules.table_open = (tokens, idx, options, env, self) => '<div class="table-wrap">' + defaultTableOpen(tokens, idx, options, env, self);
  r.rules.table_close = (tokens, idx, options, env, self) => defaultTableClose(tokens, idx, options, env, self) + '</div>';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function parseGuides(sources, glossaryTerms, options = {}) {
  // sources: [{slug, file, title, markdown}]
  const notes = [];
  const md = makeMd();
  const stats = { notes, xrefs: [], glossaryMarks: [], checklists: [], citations: [] };
  installRenderer(md, {});

  const terms = [...glossaryTerms]
    .map((g) => ({ term: g.term, plain: g.plain }))
    .sort((a, b) => b.term.length - a.term.length);

  // Phase 1: tokenise and collect heading ids for all guides
  const parsed = sources.map((src) => {
    const tokens = md.parse(src.markdown, {});
    return { ...src, tokens };
  });
  const headingIds = new Set();
  const headingMeta = new Map();
  for (const g of parsed) {
    const ctx = { lastH2: null, parentIdForDeep: g.slug };
    for (let i = 0; i < g.tokens.length; i++) {
      const t = g.tokens[i];
      if (t.type !== 'heading_open' || t.level !== 0) continue;
      const level = Number(t.tag.slice(1));
      const text = inlineText(g.tokens[i + 1].children);
      const info = headingInfo(level, text, g.slug, ctx, []);
      if (level === 2) ctx.lastH2 = info.number !== null ? Number(info.number) : ctx.lastH2;
      if (level <= 3) ctx.parentIdForDeep = info.id;
      if (headingIds.has(info.id)) notes.push(`[${g.slug}] Duplicate heading ID ${info.id} for "${text}" - second occurrence suffixed`);
      headingIds.add(info.id);
      headingMeta.set(info.id, { guide: g.slug, level, text });
    }
  }

  // Phase 2: build content model
  const guides = parsed.map((g) => {
    const ctx = { lastH2: null, parentIdForDeep: g.slug };
    const nodes = [];
    const headings = [];
    let currentHeadingId = g.slug;
    let currentH2Id = null;
    let blockCounter = 0;
    let markedInSection = new Set();
    const seenIds = new Set();
    const tokens = g.tokens;
    let h1 = null;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.level !== 0) continue;
      if (t.type === 'heading_open') {
        const level = Number(t.tag.slice(1));
        const inline = tokens[i + 1];
        const text = inlineText(inline.children).trim();
        const info = headingInfo(level, text, g.slug, ctx, notes);
        let id = info.id;
        if (seenIds.has(id)) {
          let k = 2;
          while (seenIds.has(`${id}-${k}`)) k++;
          id = `${id}-${k}`;
        }
        seenIds.add(id);
        if (level === 2) {
          ctx.lastH2 = info.number !== null ? Number(info.number) : ctx.lastH2;
          currentH2Id = id;
          markedInSection = new Set();
        }
        if (level <= 3) ctx.parentIdForDeep = id;
        const env = { guide: g.slug, headingId: id, citations: stats.citations, blockId: null };
        const html = md.renderer.renderInline(inline.children, md.options, env);
        const node = { kind: 'heading', level, id, number: info.number, html, text, h2Id: level === 2 ? id : currentH2Id };
        if (level === 1) {
          h1 = { html, text };
          node.id = g.slug;
        }
        nodes.push(node);
        if (level >= 2) headings.push({ id, level, number: info.number, text, html, h2Id: node.h2Id });
        currentHeadingId = level === 1 ? g.slug : id;
        blockCounter = 0;
        i += 2;
        continue;
      }
      if (t.type === 'hr') {
        nodes.push({ kind: 'hr', headingId: currentHeadingId });
        continue;
      }
      // block: find matching close
      let end = i;
      let type = t.type;
      if (t.nesting === 1) {
        const closeType = t.type.replace(/_open$/, '_close');
        for (let k = i + 1; k < tokens.length; k++) {
          if (tokens[k].type === closeType && tokens[k].level === 0) {
            end = k;
            break;
          }
        }
        type = t.type.replace(/_open$/, '');
      }
      const slice = tokens.slice(i, end + 1);
      blockCounter++;
      const blockId = `${currentHeadingId}--b${blockCounter}`;
      const blockType = { paragraph: 'paragraph', bullet_list: 'list', ordered_list: 'list', table: 'table', blockquote: 'blockquote', fence: 'code', code_block: 'code' }[type] || type;
      const isTable = type === 'table';
      // inline transformations
      let checklist = [];
      if (type === 'bullet_list' || type === 'ordered_list') checklist = applyChecklist(md, slice, blockId, stats);
      for (const tk of slice) {
        if (tk.type !== 'inline') continue;
        tk.children = applyScoreBoxes(md, tk.children);
        tk.children = applyCrossRefs(md, tk.children, headingIds, g.slug, stats);
        if (!isTable) tk.children = applyGlossary(md, tk.children, terms, markedInSection, currentH2Id || g.slug, stats);
      }
      const env = { guide: g.slug, headingId: currentHeadingId, citations: stats.citations, blockId };
      const html = md.renderer.render(slice, md.options, env).trim();
      const text = htmlToText(html).replace(/\s+/g, ' ').trim();
      const node = { kind: 'block', id: blockId, type: blockType, html, text, headingId: currentHeadingId, h2Id: currentH2Id };
      if (checklist.length) node.checklist = checklist;
      nodes.push(node);
      i = end;
    }

    // currency line (rule 4.7): look at the first paragraph block before the first H2
    let currency = null;
    for (const n of nodes) {
      if (n.kind === 'heading' && n.level === 2) break;
      if (n.kind === 'block' && n.type === 'paragraph') {
        const m = n.text.match(/(?:[Ll]aw (?:and guidance )?)?[Ss]tated as at (\d{1,2}) ([A-Z][a-z]+) (\d{4})/);
        if (m) {
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const mi = months.indexOf(m[2]);
          currency = { date: `${m[1]} ${m[2]} ${m[3]}`, iso: `${m[3]}-${String(mi + 1).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`, line: n.text, blockId: n.id };
          break;
        }
      }
    }
    if (!currency) notes.push(`[${g.slug}] No "stated as at" currency line found in the guide preamble; currency banner will read "Currency date not stated in source"`);
    // link to currency material (section 13): heading containing "changed"
    const currencySection = headings.find((h) => /changed/i.test(h.text)) || null;

    return {
      slug: g.slug,
      title: g.title,
      file: g.file,
      order: g.order,
      h1,
      currency,
      currencySectionId: currencySection ? currencySection.id : null,
      headings,
      nodes,
    };
  });

  return { guides, notes, stats, headingIds: [...headingIds] };
}
