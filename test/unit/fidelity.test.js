// Acceptance tests 1-3 (Sheet A section 18): content fidelity, anchors, references.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContentModel } from '../../src/build/load.js';
import { stripMarkdown, compareTexts, renderedTextOf } from '../../src/build/fidelity.js';

const model = loadContentModel();

for (const g of model.guides) {
  test(`test 1: rendered text equals source text - ${g.slug}`, () => {
    const src = model.sources.find((s) => s.slug === g.slug).markdown;
    const diff = compareTexts(stripMarkdown(src), renderedTextOf(g));
    assert.equal(diff, null, diff ? `Mismatch at ${diff.position}\n  expected: …${diff.expectedContext}…\n  actual:   …${diff.actualContext}…` : '');
  });
}

test('test 2: every H2 and numbered H3 in every source file has a matching anchor', () => {
  const ids = new Set(model.headingIds);
  for (const s of model.sources) {
    for (const line of s.markdown.split(/\r?\n/)) {
      let m = line.match(/^## (\d+)\.\s/);
      if (m) assert.ok(ids.has(`${s.slug}--s${m[1]}`), `${s.slug}--s${m[1]} missing for "${line}"`);
      m = line.match(/^### (\d+)\.(\d+)\b/);
      if (m) assert.ok(ids.has(`${s.slug}--s${m[1]}-${m[2]}`), `${s.slug}--s${m[1]}-${m[2]} missing for "${line}"`);
    }
  }
});

test('test 3: every → guide §n reference in the Content Pack resolves', () => {
  const bad = model.notes.filter((n) => /does not resolve/.test(n));
  assert.deepEqual(bad, []);
  const ids = new Set(model.headingIds);
  for (const [slug, s] of Object.entries(model.pack.summaries)) for (const it of s.items) assert.ok(it.target && ids.has(it.target), `${slug} item ${it.n}: ${it.ref}`);
  for (const row of model.pack.calendar) assert.ok(row.target && ids.has(row.target), `calendar row ${row.n}: ${row.guideRef}`);
});
