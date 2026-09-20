// Content model access and the "effective" layout after the user overlay is
// applied (edits, block order, moved blocks, section order). No DOM here.

export const Model = {
  data: null,
  guides: [],
  bySlug: new Map(),
  headings: new Map(), // headingId -> {guide, heading}
  blocks: new Map(), // blockId -> {guide, node}
  trees: new Map(), // slug -> tree
  init(data) {
    this.data = data;
    this.guides = data.guides;
    for (const g of this.guides) {
      this.bySlug.set(g.slug, g);
      for (const h of g.headings) this.headings.set(h.id, { guide: g, heading: h });
      for (const n of g.nodes) if (n.kind === 'block') this.blocks.set(n.id, { guide: g, node: n });
      this.trees.set(g.slug, buildTree(g));
    }
  },
  guide(slug) {
    return this.bySlug.get(slug) || null;
  },
  tree(slug) {
    return this.trees.get(slug);
  },
  heading(id) {
    return this.headings.get(id) || null;
  },
  block(id) {
    return this.blocks.get(id) || null;
  },
  // resolve any anchor (guide, heading, block, checkbox) to its guide slug
  guideOfAnchor(id) {
    if (!id) return null;
    if (this.bySlug.has(id)) return id;
    const h = this.headings.get(id);
    if (h) return h.guide.slug;
    const b = this.blocks.get(id);
    if (b) return b.guide.slug;
    const m = id.match(/^(.*?)--/);
    if (m && this.bySlug.has(m[1])) return m[1];
    return null;
  },
  sectionOf(id) {
    // nearest heading id for a heading/block/checkbox id
    if (this.headings.has(id)) return id;
    const b = this.blocks.get(id);
    if (b) return b.node.headingId;
    const m = id.match(/^(.*)-i\d+$/);
    if (m && this.blocks.has(m[1])) return this.blocks.get(m[1]).node.headingId;
    return null;
  },
  prevNext(slug) {
    const i = this.guides.findIndex((g) => g.slug === slug);
    return { prev: i > 0 ? this.guides[i - 1] : null, next: i >= 0 && i < this.guides.length - 1 ? this.guides[i + 1] : null };
  },
};

// Builds the nested section tree for a guide from the flat node list.
// tree: { guide, preamble:[blocks], sections:[H2 {heading, blocks, children:[H3 {...}]}] }
export function buildTree(guide) {
  const tree = { guide, preamble: [], sections: [], byId: new Map() };
  const stack = []; // current chain of open sections
  for (const n of guide.nodes) {
    if (n.kind === 'heading') {
      if (n.level === 1) continue;
      const sec = { heading: n, id: n.id, level: n.level, blocks: [], children: [], parent: null };
      while (stack.length && stack[stack.length - 1].level >= n.level) stack.pop();
      if (stack.length) {
        sec.parent = stack[stack.length - 1];
        sec.parent.children.push(sec);
      } else tree.sections.push(sec);
      stack.push(sec);
      tree.byId.set(sec.id, sec);
    } else if (n.kind === 'block' || n.kind === 'hr') {
      if (stack.length) stack[stack.length - 1].blocks.push(n);
      else tree.preamble.push(n);
    }
  }
  return tree;
}

export const Layout = {
  store: null,
  init(store) {
    this.store = store;
  },
  get overlay() {
    return this.store.overlay;
  },
  blockHtml(node) {
    const e = this.overlay.edits[node.id];
    return e && typeof e.html === 'string' ? e.html : node.html;
  },
  blockText(node) {
    const e = this.overlay.edits[node.id];
    return e && typeof e.text === 'string' ? e.text : node.text;
  },
  isEdited(id) {
    return !!this.overlay.edits[id];
  },
  // ordered effective block nodes for a section (heading id) or the guide preamble (slug)
  sectionBlocks(sectionId) {
    let base = [];
    const guideSlug = Model.guideOfAnchor(sectionId);
    const tree = Model.tree(guideSlug);
    if (!tree) return [];
    if (sectionId === guideSlug) base = tree.preamble;
    else {
      const sec = tree.byId.get(sectionId);
      if (!sec) return [];
      base = sec.blocks;
    }
    const moved = this.overlay.moved || {};
    const nodes = base.filter((n) => n.kind === 'hr' || !(moved[n.id] && moved[n.id].to !== sectionId));
    // blocks moved in
    for (const [bid, mv] of Object.entries(moved)) {
      if (mv.to === sectionId && !nodes.some((n) => n.id === bid)) {
        const b = Model.block(bid);
        if (b) nodes.push(b.node);
      }
    }
    const order = (this.overlay.order || {})[sectionId];
    if (Array.isArray(order) && order.length) {
      const idx = new Map(order.map((id, i) => [id, i]));
      const blocks = nodes.filter((n) => n.kind === 'block');
      const hrs = nodes.filter((n) => n.kind === 'hr');
      blocks.sort((a, b) => {
        const ia = idx.has(a.id) ? idx.get(a.id) : Infinity;
        const ib = idx.has(b.id) ? idx.get(b.id) : Infinity;
        if (ia === ib) return base.indexOf(a) - base.indexOf(b);
        return ia - ib;
      });
      return [...blocks, ...hrs];
    }
    return nodes;
  },
  originalSectionBlocks(sectionId) {
    const guideSlug = Model.guideOfAnchor(sectionId);
    const tree = Model.tree(guideSlug);
    if (!tree) return [];
    if (sectionId === guideSlug) return tree.preamble;
    const sec = tree.byId.get(sectionId);
    return sec ? sec.blocks : [];
  },
  // ordered top-level sections of a guide (H2) honouring overlay.order[slug]
  guideSections(slug) {
    const tree = Model.tree(slug);
    if (!tree) return [];
    return this.orderSections(tree.sections, slug);
  },
  subsections(sec) {
    return this.orderSections(sec.children, sec.id + '--subsections');
  },
  orderSections(list, key) {
    const order = (this.overlay.order || {})[key];
    if (!Array.isArray(order) || !order.length) return list;
    const idx = new Map(order.map((id, i) => [id, i]));
    return [...list].sort((a, b) => {
      const ia = idx.has(a.id) ? idx.get(a.id) : Infinity;
      const ib = idx.has(b.id) ? idx.get(b.id) : Infinity;
      if (ia === ib) return list.indexOf(a) - list.indexOf(b);
      return ia - ib;
    });
  },
  // human label for a section id: "Trust Accounting › 9.2 The four methods"
  sectionLabel(id, opts = {}) {
    const slug = Model.guideOfAnchor(id);
    const g = Model.guide(slug);
    if (!g) return id;
    const h = Model.heading(id);
    if (!h) return g.title;
    return opts.short ? h.heading.text : `${g.title} › ${h.heading.text}`;
  },
  // all sections of a guide as a flat list [{id, level, text}] in effective order
  flatSections(slug) {
    const out = [];
    const walk = (secs) => {
      for (const s of secs) {
        out.push({ id: s.id, level: s.level, text: s.heading.text, number: s.heading.number });
        walk(this.subsections(s));
      }
    };
    walk(this.guideSections(slug));
    return out;
  },
  noteCount(slug) {
    let n = 0;
    for (const [anchor, list] of Object.entries(this.overlay.notes || {})) if (Model.guideOfAnchor(anchor) === slug) n += (list || []).length;
    return n;
  },
};
