// Client-side search index - Sheet A section 6. Word tokens, prefix matching,
// case-insensitive, ranked. Pure functions; unit-tested in Node.

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

export class SearchIndex {
  constructor() {
    this.docs = new Map(); // id -> doc {id, kind, guide, headingId, text, title, tokens}
    this.postings = new Map(); // token -> Map(docId -> count)
    this.sortedTokens = null;
  }

  add(doc) {
    if (this.docs.has(doc.id)) this.remove(doc.id);
    const tokens = tokenize(doc.text);
    const counts = new Map();
    for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
    this.docs.set(doc.id, { ...doc, length: tokens.length });
    for (const [t, c] of counts) {
      let p = this.postings.get(t);
      if (!p) {
        p = new Map();
        this.postings.set(t, p);
        this.sortedTokens = null;
      }
      p.set(doc.id, c);
    }
  }

  remove(id) {
    const doc = this.docs.get(id);
    if (!doc) return;
    for (const t of new Set(tokenize(doc.text))) {
      const p = this.postings.get(t);
      if (p) {
        p.delete(id);
        if (!p.size) {
          this.postings.delete(t);
          this.sortedTokens = null;
        }
      }
    }
    this.docs.delete(id);
  }

  tokensWithPrefix(prefix) {
    if (!this.sortedTokens) this.sortedTokens = [...this.postings.keys()].sort();
    const arr = this.sortedTokens;
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < prefix) lo = mid + 1;
      else hi = mid;
    }
    const out = [];
    for (let i = lo; i < arr.length && arr[i].startsWith(prefix); i++) out.push(arr[i]);
    return out;
  }

  // options: { guide: slug|null, limit }
  search(query, options = {}) {
    const qTokens = tokenize(query);
    if (!qTokens.length) return [];
    const scores = new Map(); // docId -> {score, matchedTerms:Set}
    qTokens.forEach((qt, qi) => {
      const isLast = qi === qTokens.length - 1;
      const candidates = qt.length >= 2 ? this.tokensWithPrefix(qt) : this.postings.has(qt) ? [qt] : [];
      const perDoc = new Map();
      for (const tok of candidates) {
        const exact = tok === qt;
        const weight = exact ? 1 : Math.max(0.3, qt.length / tok.length) * 0.8;
        for (const [docId, count] of this.postings.get(tok)) {
          const prev = perDoc.get(docId) || { w: 0, toks: new Set() };
          prev.w = Math.max(prev.w, weight * (1 + Math.log(count)));
          prev.toks.add(tok);
          perDoc.set(docId, prev);
        }
      }
      for (const [docId, v] of perDoc) {
        const s = scores.get(docId) || { score: 0, matched: 0, terms: new Set() };
        s.score += v.w;
        s.matched++;
        for (const t of v.toks) s.terms.add(t);
        scores.set(docId, s);
      }
      void isLast;
    });
    const phrase = qTokens.join(' ');
    const results = [];
    for (const [docId, s] of scores) {
      const doc = this.docs.get(docId);
      if (!doc) continue;
      if (options.guide && doc.guide !== options.guide) continue;
      // require every query term to match for multi-term queries
      if (qTokens.length > 1 && s.matched < qTokens.length) continue;
      let score = s.score;
      if (qTokens.length > 1 && doc.text.toLowerCase().includes(phrase)) score += 2;
      if (doc.kind === 'note') score += 0.5;
      if (doc.kind === 'glossary') score += 0.75;
      score = score / Math.sqrt(1 + doc.length / 200);
      results.push({ doc, score, terms: [...s.terms] });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, options.limit || 50);
  }
}

// Build a snippet of `text` around the first matched term, with matches wrapped in <mark>.
export function makeSnippet(text, terms, width = 160) {
  const t = String(text || '');
  const lower = t.toLowerCase();
  let first = -1;
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i !== -1 && (first === -1 || i < first)) first = i;
  }
  let start = first === -1 ? 0 : Math.max(0, first - Math.floor(width / 3));
  let end = Math.min(t.length, start + width);
  if (start > 0) {
    const sp = t.lastIndexOf(' ', start);
    if (sp > 0 && start - sp < 20) start = sp + 1;
  }
  if (end < t.length) {
    const sp = t.indexOf(' ', end);
    if (sp !== -1 && sp - end < 20) end = sp;
  }
  const slice = t.slice(start, end);
  return (start > 0 ? '…' : '') + highlightTerms(slice, terms) + (end < t.length ? '…' : '');
}

export function highlightTerms(text, terms) {
  const esc = escapeHtml(text);
  if (!terms || !terms.length) return esc;
  const sorted = [...terms].filter(Boolean).sort((a, b) => b.length - a.length);
  const re = new RegExp('(' + sorted.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  return esc.replace(re, '<mark>$1</mark>');
}
