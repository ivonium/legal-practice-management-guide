// Citations index - Sheet A section 14.3. Built at build time from the harvested
// legislation links and the Content Pack part 4 seed.

export function parseCitation(href) {
  try {
    const u = new URL(href);
    const host = u.hostname.toLowerCase();
    if (host.endsWith('legislation.nsw.gov.au')) {
      const m = u.pathname.match(/\/view\/(?:html|whole)\/(?:inforce|repealed)\/[^/]+\/([a-z]+-\d{4}-[0-9a-z]+)/i);
      const sec = (u.hash || '').match(/#sec\.([0-9A-Za-z.]+)/);
      return { instrumentId: m ? m[1] : u.pathname, section: sec ? sec[1] : null, host };
    }
    if (host.endsWith('legislation.gov.au')) {
      const m = u.pathname.match(/^\/([A-Z]\d{4}[A-Z]\d{5})/i) || u.pathname.match(/^\/Details\/([A-Z0-9]+)/i);
      const sec = (u.hash || '').match(/#sec\.([0-9A-Za-z.]+)/) || (u.hash || '').match(/#_Toc|#s(\d+)/);
      return { instrumentId: m ? m[1] : u.pathname, section: sec && sec[1] ? sec[1] : null, host };
    }
    if (host.includes('austlii')) {
      const m = u.pathname.match(/\/([a-z0-9_]+)\/(?:s(\d+[a-z]*)\.html)?$/i);
      return { instrumentId: m ? m[1] : u.pathname, section: m && m[2] ? m[2] : null, host };
    }
  } catch {}
  return null;
}

export function naturalSectionKey(sec) {
  const m = String(sec).match(/^(\d+)([A-Za-z]*)(?:\.(.*))?$/);
  if (!m) return [Number.MAX_SAFE_INTEGER, String(sec)];
  return [Number(m[1]), m[2] || '', m[3] || ''];
}
export function compareSections(a, b) {
  const ka = naturalSectionKey(a);
  const kb = naturalSectionKey(b);
  for (let i = 0; i < 3; i++) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

export function buildCitationsIndex(citations, seed, headingLookup, notes) {
  const instruments = new Map();
  const known = new Map(seed.instruments.map((i) => [i.id, i]));
  const unknownIds = new Set();
  for (const c of citations) {
    const p = parseCitation(c.href);
    if (!p) continue;
    let inst = instruments.get(p.instrumentId);
    if (!inst) {
      const k = known.get(p.instrumentId);
      if (!k) unknownIds.add(p.instrumentId);
      inst = { id: p.instrumentId, name: k ? k.name : p.instrumentId, short: k ? k.short : null, known: !!k, provisions: new Map(), whole: new Map() };
      instruments.set(p.instrumentId, inst);
    }
    const key = p.section || '';
    const target = key ? inst.provisions : inst.whole;
    let prov = target.get(key);
    if (!prov) {
      prov = { section: p.section, href: c.href.split('#')[0] + (p.section ? '#sec.' + p.section : ''), cites: new Map() };
      target.set(key, prov);
    }
    const hid = c.headingId;
    if (!prov.cites.has(hid)) {
      const lbl = headingLookup(hid);
      prov.cites.set(hid, { headingId: hid, guide: c.guide, label: lbl.label, guideTitle: lbl.guideTitle, section: lbl.section, linkText: c.text });
    }
  }
  for (const id of unknownIds) notes.push(`[citations] Unknown instrument ID "${id}" in a legislation link; displayed as the raw ID`);
  const order = seed.instruments.map((i) => i.id);
  const list = [...instruments.values()].sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return a.id.localeCompare(b.id);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const out = list.map((inst) => ({
    id: inst.id,
    name: inst.name,
    short: inst.short,
    known: inst.known,
    whole: [...inst.whole.values()].map((p) => ({ href: p.href, cites: [...p.cites.values()] })),
    provisions: [...inst.provisions.values()]
      .sort((a, b) => compareSections(a.section, b.section))
      .map((p) => ({ section: p.section, href: p.href, cites: [...p.cites.values()] })),
  }));
  // reverse view: by guide
  const byGuide = {};
  for (const inst of out) {
    for (const p of [...inst.provisions, ...inst.whole.map((w) => ({ ...w, section: null }))]) {
      for (const c of p.cites) {
        (byGuide[c.guide] = byGuide[c.guide] || []).push({ instrumentId: inst.id, instrumentName: inst.name, short: inst.short, section: p.section, href: p.href, headingId: c.headingId, label: c.label, sectionNo: c.section });
      }
    }
  }
  for (const list of Object.values(byGuide)) list.sort((a, b) => order.indexOf(a.instrumentId) - order.indexOf(b.instrumentId) || compareSections(a.section || '0', b.section || '0'));
  return { instruments: out, unlinked: seed.unlinked, cases: seed.cases, byGuide, unknownIds: [...unknownIds] };
}
