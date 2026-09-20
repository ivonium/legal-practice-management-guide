// Acceptance test 1 (Sheet A section 18): the concatenated plain text of all
// rendered blocks must equal the plain text of the source markdown after
// markdown stripping, ignoring whitespace. This strip is written independently
// of the markdown parser so that a parser bug that drops or alters text fails.

export function stripMarkdown(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let inFence = false;
  for (let raw of lines) {
    let line = raw;
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    if (/^\s*-{3,}\s*$/.test(line)) continue; // horizontal rule
    if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line)) continue; // table separator
    if (/^#{1,6}\s+/.test(line)) {
      line = line.replace(/^#{1,6}\s+/, '');
    } else {
      line = line.replace(/^(\s*>\s?)+/, '');
      line = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '');
      line = line.replace(/^\[( |x|X)\]\s+/, '');
    }
    if (/^\s*\|/.test(line)) line = line.replace(/\|/g, ' '); // table row cells
    // links: [text](url) -> text
    line = line.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    line = line.replace(/\*/g, '');
    line = line.replace(/`/g, '');
    line = line.replace(/_{3,}/g, ''); // DEV-004: "___" renders as an empty score box
    line = line.replace(/\\([\\`*_{}\[\]()#+\-.!>|])/g, '$1');
    out.push(line);
  }
  return out.join('\n');
}

export function squash(s) {
  return String(s).replace(/\s+/g, '');
}

// Returns null when equal, otherwise a diagnostic object.
export function compareTexts(expected, actual) {
  const a = squash(expected);
  const b = squash(actual);
  if (a === b) return null;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return {
    position: i,
    expectedLength: a.length,
    actualLength: b.length,
    expectedContext: a.slice(Math.max(0, i - 60), i + 80),
    actualContext: b.slice(Math.max(0, i - 60), i + 80),
  };
}

export function renderedTextOf(guide) {
  return guide.nodes
    .map((n) => {
      if (n.kind === 'heading') return n.text;
      if (n.kind === 'block') return n.text;
      return '';
    })
    .join('\n');
}
