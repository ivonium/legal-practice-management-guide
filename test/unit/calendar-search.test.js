import test from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers.js';
import { loadContentModel } from '../../src/build/load.js';

const A = loadApp();
const model = loadContentModel();

test('test 15: next 30 days includes 30 June items when today is in June', () => {
  const items = A.nextNDays(model.pack.calendar, '2026-06-10', 30);
  const june30 = items.filter((i) => i.date === '2026-06-30');
  assert.ok(june30.length >= 2, 'expected 30 June rows');
  assert.ok(june30.some((i) => /Financial year ends/.test(i.row.obligation)));
  assert.ok(june30.some((i) => /Trust account statements/.test(i.row.obligation)));
  // author decision E.5: "a few weeks before 30 June" is shown on 16 June
  assert.ok(items.some((i) => i.date === '2026-06-16' && /30 June super/.test(i.row.obligation)));
  // author decision E.5: "during July" is shown on 31 July
  const july = A.nextNDays(model.pack.calendar, '2026-07-05', 30);
  assert.ok(july.some((i) => i.date === '2026-07-31' && /signatories/.test(i.row.obligation)));
  assert.ok(A.scheduleLabel(model.pack.calendar[8].schedule).startsWith('Monthly'));
  assert.ok(A.scheduleLabel(model.pack.calendar[52].schedule).startsWith('Quarterly'));
  assert.ok(!items.some((i) => i.date < '2026-06-10' || i.date > '2026-07-10'));
});

test('calendar: quarterly, monthly, once and user items', () => {
  const y = A.next12Months(model.pack.calendar, '2026-09-12', [{ id: 'u1', date: '2027-02-01', text: 'AML independent evaluation' }]);
  assert.ok(y.some((i) => i.row && /Statutory deposit/.test(i.row.obligation) && i.date === '2026-12-31'));
  assert.ok(y.some((i) => i.row && /Back up/.test(i.row.obligation) && i.date === '2026-09-30'));
  assert.ok(y.some((i) => i.row && /PSI/.test(i.row.obligation) && i.date === '2027-06-30'));
  assert.ok(y.some((i) => i.user && i.date === '2027-02-01'));
  assert.ok(A.rulesOnly(model.pack.calendar).length > 20);
});

test('search: "rule 42" hits Trust Accounting and Tax and Accounting; scoped search in Cyber Security returns none', () => {
  const idx = new A.SearchIndex();
  for (const g of model.guides) for (const n of g.nodes) if (n.kind === 'block') idx.add({ id: n.id, kind: 'block', guide: g.slug, headingId: n.headingId, text: n.text });
  const all = idx.search('rule 42');
  const guides = new Set(all.map((r) => r.doc.guide));
  assert.ok(guides.has('trust-accounting'));
  assert.ok(guides.has('tax-and-accounting'));
  assert.equal(idx.search('rule 42', { guide: 'cyber-security' }).length, 0);
  // prefix matching
  assert.ok(idx.search('reconcil').length > 0);
  // edited text re-index
  idx.add({ id: 'x', kind: 'block', guide: 'trust-accounting', headingId: 'h', text: 'the zebrafish swims' });
  assert.equal(idx.search('zebrafish')[0].doc.id, 'x');
  idx.remove('x');
  assert.equal(idx.search('zebrafish').length, 0);
});

test('note markdown subset renders safely', () => {
  const html = A.renderNoteMarkdown('Hello **bold** and *it*\n\n- one\n- [link](https://x.y)\n<script>alert(1)</script>');
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>it<\/em>/);
  assert.match(html, /<ul><li>one<\/li><li><a href="https:\/\/x.y" target="_blank" rel="noopener">link<\/a><\/li><\/ul>/);
  assert.ok(!html.includes('<script>'));
});

test('word diff', () => {
  const d = A.wordDiff('the quick brown fox', 'the slow brown fox jumps');
  assert.deepEqual(
    d.ops.map((o) => o.type + ':' + o.text),
    ['eq:the', 'del:quick', 'ins:slow', 'eq:brown fox', 'ins:jumps'],
  );
});
