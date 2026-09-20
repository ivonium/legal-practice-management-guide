// Author-directed edits to the build inputs in content/ (BUILD_NOTES.md section E,
// answers of 12 September 2026). The Guides/ originals are never touched. The
// script is idempotent: `node src/build/author-edits.js` applies whatever is not
// yet applied and prints a log of what changed.
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_DIR } from './load.js';

const log = [];
function edit(file, fn) {
  const p = path.join(CONTENT_DIR, file);
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(p, after);
    log.push(`${file}: updated`);
  } else log.push(`${file}: already applied`);
}
function replaceOnce(src, from, to, note) {
  if (src.includes(to)) return src;
  if (!src.includes(from)) throw new Error('Expected text not found: ' + from.slice(0, 80));
  log.push('  - ' + note);
  return src.replace(from, to);
}

// Answer 1: Practice Management currency date is 12 September 2026.
edit('Practice_Management.md', (s) =>
  replaceOnce(s, 'business planning, ethics, and business development and marketing.\n', 'business planning, ethics, and business development and marketing. Stated as at 12 September 2026.\n', 'Added "Stated as at 12 September 2026." to the preamble'),
);

// Answers 6, 8, 9: Trust Accounting
edit('Trust_Accounting.md', (s) => {
  const renames = [
    ['### Abbreviations', '### 1.1 Abbreviations'],
    ['### Three things that changed after the course material was written', '### 1.2 Three things that changed after the course material was written'],
    ['### The two numbers that govern everything', '### 1.3 The two numbers that govern everything'],
    ['### Legislation', '### 23.1 Legislation'],
    ['### Law Society of NSW', '### 23.2 Law Society of NSW'],
    ['### Other', '### 23.3 Other'],
    ['### Contacts', '### 23.4 Contacts'],
    ['### Cases', '### 23.5 Cases'],
  ];
  for (const [a, b] of renames) s = replaceOnce(s, a + '\n', b + '\n', `Numbered H3 "${a.slice(4)}" as "${b.slice(4)}"`);
  // Answer 6: commas instead of pipes in the Cases paragraph
  const casesFrom = '*Re Mayes and Legal Practitioners Act* [1974] 1 NSWLR 19 | *Bridges v Law Society of New South Wales* [1983] 2 NSWLR 361 | *Somers*, Supreme Court of the ACT, No SC1912 of 1978 | *Matter of James Lloyd Hutchison*, Legal Profession Disciplinary Reports No 1, 1993 | *Matter No 15 of 1986*, Solicitors\' Statutory Committee';
  const casesTo = casesFrom.replace(/ \| /g, ', ');
  s = replaceOnce(s, casesFrom, casesTo, 'Cases paragraph (§23.5): " | " separators replaced with ", "');
  // Answer 9: headings must not contain links; links move to a "Provision:" line below
  const lines = s.split('\n');
  const out = [];
  for (const line of lines) {
    if (/^### /.test(line) && /\]\(/.test(line)) {
      const links = [...line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
      const heading = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
      out.push(heading, '', `Provision${links.length > 1 ? 's' : ''}: ${links.map((m) => `[${m[1]}](${m[2]})`).join(', ')}`);
      log.push(`  - Heading "${heading.slice(4)}": ${links.length} link(s) moved to a Provision line beneath`);
    } else out.push(line);
  }
  return out.join('\n');
});

// Answer 8: Cyber Security - number the unnumbered H3s, no "Bonus"
edit('Cyber_Security.md', (s) => {
  s = replaceOnce(s, '### The numbers that frame the problem\n', '### 1.1 The numbers that frame the problem\n', 'Numbered "The numbers that frame the problem" as 1.1');
  for (let n = 1; n <= 8; n++) {
    const re = new RegExp(`^### ${n}\\. (.*)$`, 'm');
    const m = s.match(re);
    if (m) {
      s = s.replace(re, `### 11.${n} ${m[1]}`);
      log.push(`  - Numbered "${n}. ${m[1]}" as 11.${n}`);
    }
  }
  s = replaceOnce(s, '### Bonus: cross-check with a second model\n', '### 11.9 Cross-check with a second model\n', '"Bonus: cross-check with a second model" numbered as 11.9 (Bonus removed)');
  return s;
});

// Answer 10: People Management §11 - bold the guide name only so the cross reference resolves
edit('People_Management_and_Supervision.md', (s) =>
  replaceOnce(
    s,
    '**The full treatment, including the supervision structure, file review discipline, remote supervision and the disciplinary cases, is in the Risk Management guide at section 8.** The essential points:',
    'The full treatment, including the supervision structure, file review discipline, remote supervision and the disciplinary cases, is in the **Risk Management** guide at section 8. The essential points:',
    '§11: sentence-level bold replaced by bold on the guide name (words unchanged) so the sentence links to Risk Management section 8',
  ),
);

console.log(log.join('\n'));
