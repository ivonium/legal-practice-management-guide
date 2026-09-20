# Practice Management Guides - local reference application

A single, self-contained HTML file (`dist/PracticeGuides.html`) that presents ten practice management guides for a NSW legal practice with navigation, search, notes, edit mode, calculators, checklists, a master compliance calendar, a citations index, a glossary and a print-to-PDF path. Built to Instruction Sheet A (functional specification); content from the ten guides and Instruction Sheet C (Content Pack), used verbatim.

Open `dist/PracticeGuides.html` in Chrome, Edge, Firefox or Safari from the local disk. No server, no network requests.

## Layout of this repository

```
content/        the build inputs: the ten guides and INSTRUCTION_C_Content_Pack.md, with the
                author-directed edits of 12 September 2026 applied (BUILD_NOTES.md section E)
src/build/      Node build: markdown parser, content pack parser, citations index, bundler, PDF script
src/app/        browser application (concatenated into one script at build time)
src/styles/     app.css - the neutral stylesheet; every visual property is a CSS variable
design/         Claude Design's deliverables: theme.css (concatenated after app.css at build time),
                diagrams/dg-*.svg (49 assets inlined at build time), patterns/, DESIGN_NOTES.md,
                HANDOVER_TO_CLAUDE_CODE.md
src/shell.html  the HTML shell with placeholders
test/unit/      node:test unit tests (content fidelity, formulas, walkthrough, calendar, search)
test/e2e/       Playwright acceptance tests (Sheet A section 18)
dist/           PracticeGuides.html, PracticeGuides.pdf, build-report.json, pdf-report.json
README.md, TESTS.md, BUILD_NOTES.md
```

## Rebuilding after the author edits a markdown file

1. Edit the guide in `content/` (or copy the new `.md` over the file of the same name in `content/`). The ten file names and their order are fixed in `src/build/guides.js`.
2. Run:

```bash
npm install
```

```bash
npm run build
```

3. `dist/PracticeGuides.html` is rewritten. `dist/build-report.json` lists every anomaly the parser noticed (also summarised in `BUILD_NOTES.md`).
4. To regenerate the PDF (headless Chromium; first run downloads it with `npx playwright install chromium`):

```bash
npm run pdf
```

5. To run all tests (unit + acceptance):

```bash
npm test
```

`Guides/` (one level up) holds the untouched originals. `content/` is what the build reads. The author's answers of 12 September 2026 are applied to `content/` by `npm run content:apply` (`src/build/author-edits.js`); the script is idempotent, so if a guide is re-copied from `Guides/` run it again before building. Every edit it makes is listed in BUILD_NOTES.md section E.

Notes and edits made in the browser live in browser storage (key `pmguides:overlay`, IndexedDB above 4 MB) and in exported master files, not in the build. A rebuild does not touch them: anchor IDs are deterministic (Sheet A 2.2), so notes, edits and links survive rebuilds as long as headings keep their numbers. If a heading is renumbered or removed, notes attached to it become orphaned (they stay in the overlay but are not shown).

Requirements: Node.js 20 or later. Dependencies: `markdown-it` (build), `playwright` and `pdfjs-dist` (PDF and tests only). The output file has no runtime dependencies.

## How the file is put together

- **Content model**: `src/build/parse.js` renders each guide to HTML at build time and assigns the IDs from Sheet A 2.2 (`{guide}--s{n}`, `{guide}--s{n}-{m}`, slug IDs for unnumbered H3s, `{heading}--b{k}` for blocks). Only the seven transformations in Sheet A section 4 are applied. The model is embedded as `<script type="application/json" id="content-model">`.
- **User overlay**: one JSON object (Sheet A 9.1, plus `calendarItems`, `fills` and `settings.firmName`, default "Ivan Law") in `localStorage`, falling back to IndexedDB above 4 MB. On export it is embedded as `<script type="application/json" id="user-overlay">`; on load an embedded overlay seeds empty storage.
- **Export**: the pristine shell is kept in `<script type="text/x-shell" id="pristine-shell">`; the exported file is assembled from the shell, the live (immutable) CSS, JS and content-model blocks and the current overlay. Exported files are themselves exportable.
- **Application**: `src/app/*.js` are concatenated in the order listed in `src/build/bundle.js` into one IIFE. Exported names are also exposed on `globalThis.PMG` for tests. `?print=all` renders the whole print document and sets `html[data-print-ready]`.

## Constraints to know

- **Headings are not editable.** Every note, edit, link and checkbox depends on heading-derived IDs, so edit mode makes only content blocks (paragraphs, lists, tables, blockquotes, code) editable. Calculators and diagram slots are not editable either.
- Edits are stored as sanitised HTML (bold, italic, links, lists, table cell text); pasted HTML is stripped to that whitelist.
- "Restore original order" on a section also returns blocks that were moved into or out of it.
- Search is a small built-in index (prefix matching from two characters), rebuilt on load and updated when a block is edited or a note is saved.
- Public holidays are not allowed for in any "business day" or "banking day" calculation; weekdays only, as the calculators say on screen.

## "In development" markers

Items the author has accepted "for now" carry a `DEV-nnn` identifier. Search the source for the ID; on screen the element carries `data-dev="DEV-nnn"` and, where visible, a short "In development" line.

| ID | Where | What |
|---|---|---|
| DEV-001 | `src/app/calculators.js` (Statutory Deposit Calculator) | Scenario selector only hides the statutory-deposit inputs; the guide does not itemise the three scenarios |
| DEV-002 | `src/app/calculators.js` (Walkthrough, receipts cash book card) | Column layout of the receipts cash book line is the application's; the guide leaves the format to the practice |
| DEV-003 | `src/app/print.js`, `src/build/pdf.js`, `.print-running-head` | Print running header and footer come from the PDF pipeline and a per-H2 running line, because Chromium lacks `@page` margin boxes and named strings |
| DEV-004 | `src/build/parse.js` (`scorebox`), `.score-box` | The `___` score placeholders in Stress Management §7 render as empty boxes (`data-box` IDs are allocated per block) ready to be wired to persisted inputs later |

## Keyboard

`/` or `Ctrl+K` focus search · `Esc` clears search / leaves block editing · arrow keys and `Enter` move through results · `Ctrl+E` toggles edit mode.

## Design integration (how the theme and assets are applied)

- **`design/theme.css`** is appended after `app.css` inside the single `<style id="app-css">` block by `npm run build`. Edit the theme, rebuild. If the file is absent the neutral stylesheet is used alone.
- **`design/diagrams/dg-*.svg`** are inlined into the content model by `src/build/svg.js`: the C2PA metadata is stripped, every `id` is prefixed with the slot ID (with its `url(#…)`/`href` references) so 49 inlined diagrams never collide, and `aria-label` and `data-slot` are added. A slot without an asset shows the placeholder node list. Do not use `<img src>`.
- **Fonts:** none are embedded (author's decision, BUILD_NOTES note 44). The theme's stacks fall back to Georgia and `system-ui`.
- **Diagram behaviour** (`src/app/diagram.js`, bundled) is progressive. Optional hook attributes: `data-anchor="#id"` (navigate), `data-sub="key"` + `data-panel="key"` (drill-down; hidden on screen until triggered, always printed), `data-tabs` + `data-tab="Label"` (tab strip on screen, all shown in print), `data-hover` (siblings dim), and `data-fill-cell` + `data-fill-label` (overlay-backed fillable cell, stored in `overlay.fills["{slotId}:{cell}"]`, searchable, printed).
- **Executive summary slide-over** is a native `<dialog class="summary-slideover">` (`#summary-dialog`): `.slideover-head`, `.slideover-title`, `.slideover-body`, `.slideover-close`. Its appearance is owned by `design/theme.css` section 11a; `app.css` keeps only a safeguard (`dialog:not([open]) { display: none !important }`).
- **Diagram text overflow probe:** `node test/e2e/diagram-overflow.js` (after a build) measures every diagram label at real font metrics and lists any that run past its box.

## Hand-off to the designer

Override the variables below (light values on `:root`, dark values under `@media (prefers-color-scheme: dark)`), add rules against the component classes, and drop SVG assets into `design/diagrams/`. Do not restructure the DOM. Colour contrast must stay at AA. The current values below are the neutral defaults in `app.css`; `design/theme.css` overrides them (purple `#4b2a85`, gold `#b8952e`, 17px base, 70ch measure) and adds two variables, `--color-primary-hover` (`#5e3aa8` light, `#b094e4` dark) and `--color-row-hover` (`#efebf7` light, `#2a2436` dark).

### CSS variables (neutral defaults in app.css)

| Variable | Light value | Dark value |
|---|---|---|
| `--color-bg` | `#f6f6f4` | `#15171a` |
| `--color-surface` | `#ffffff` | `#1e2126` |
| `--color-surface-alt` | `#eeeeea` | `#262a30` |
| `--color-text` | `#1c1c1c` | `#e6e6e3` |
| `--color-text-muted` | `#5f5f5f` | `#a3a3a0` |
| `--color-primary` | `#2b3f6b` | `#9db3e6` |
| `--color-primary-soft` | `#dfe5f2` | `#2a3550` |
| `--color-accent` | `#8a6d1f` | `#d9b95a` |
| `--color-accent-soft` | `#f3ecd6` | `#3a3320` |
| `--color-border` | `#d4d4cf` | `#3a3f47` |
| `--color-link` | `#1f4e9e` | `#8fb4ff` |
| `--color-link-visited` | `#5a3d8a` | `#c2a6ea` |
| `--color-focus` | `#e08a00` | `#ffb14a` |
| `--color-note-bg` | `#fff8dc` | `#2f2b1a` |
| `--color-note-border` | `#e3c96a` | `#8a7830` |
| `--color-edit-bg` | `#eef7ee` | `#1d2e1d` |
| `--color-edit-border` | `#7db07d` | `#4d8a4d` |
| `--color-warning-bg` | `#fff4e0` | `#3a2d16` |
| `--color-warning-border` | `#e2a23a` | `#b07a2a` |
| `--color-danger-bg` | `#fbe7e7` | `#3d1f1f` |
| `--color-danger-border` | `#c94040` | `#c95050` |
| `--color-success` | `#2e7d32` | `#6fbf73` |
| `--font-body` | `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | (same) |
| `--font-heading` | `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | (same) |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace` | (same) |
| `--fs-base` | `16px` | (same) |
| `--fs-sm` | `0.875rem` | (same) |
| `--fs-lg` | `1.125rem` | (same) |
| `--fs-h1` | `1.75rem` | (same) |
| `--fs-h2` | `1.4rem` | (same) |
| `--fs-h3` | `1.15rem` | (same) |
| `--fs-h4` | `1rem` | (same) |
| `--lh-body` | `1.55` | (same) |
| `--measure` | `72ch` | (same) |
| `--space-1` | `0.25rem` | (same) |
| `--space-2` | `0.5rem` | (same) |
| `--space-3` | `0.75rem` | (same) |
| `--space-4` | `1rem` | (same) |
| `--space-5` | `1.5rem` | (same) |
| `--space-6` | `2rem` | (same) |
| `--space-7` | `3rem` | (same) |
| `--space-8` | `4rem` | (same) |
| `--radius-sm` | `3px` | (same) |
| `--radius-md` | `6px` | (same) |
| `--radius-lg` | `10px` | (same) |
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.08)` | `0 1px 2px rgba(0, 0, 0, 0.5)` |
| `--shadow-md` | `0 4px 14px rgba(0, 0, 0, 0.12)` | `0 4px 14px rgba(0, 0, 0, 0.6)` |
| `--pattern-header` | `none` | (same) |
| `--pattern-divider` | `none` | (same) |
| `--pattern-corner` | `none` | (same) |
| `--rail-width` | `280px` | (same) |
| `--toolbar-height` | `56px` | (same) |
| `--color-primary-hover` (theme.css only) | `#5e3aa8` | `#b094e4` |
| `--color-row-hover` (theme.css only) | `#efebf7` | `#2a2436` |

`--pattern-header` is applied as `background-image` on `.topbar`; `--pattern-divider` on `.section--h2`; `--pattern-corner` on `.guide-card`.

### Component classes

Shell: `.app-shell`, `.topbar`, `.topbar-actions`, `.edit-banner`, `.app-body`, `.rail-left`, `.rail-right`, `.main`, `.toast`, `.saved-indicator`, `.theme-indicator`.
Rails: `.rail-guides`, `.rail-guide`, `.rail-sections`, `.rail-h2`, `.rail-h3`, `.rail-links`, `.rail-section`, `.rail-notes`, `.rail-toc`, `.mini-toc`, `.rail-progress`.
Search: `.search`, `.search-scope`, `.scope-btn`, `.search-results`, `.search-result`, `.search-snippet`, `.note-badge`, `mark.search-hit`.
Landing: `.landing`, `.landing-title`, `.landing-intro`, `.guide-cards`, `.guide-card`, `.guide-card-summary`, `.landing-next30`, `.landing-links`.
Guide: `.guide`, `.guide-header`, `.breadcrumb`, `.guide-title`, `.guide-preamble`, `.currency-banner` (`.callout--currency`), `.changelog`, `.guide-notes`, `.guide-tools`, `.tabs`/`.tab`, `.exec-summary` (`.is-open`), `.exec-summary-list`, `.guide-contents`, `.guide-body`, `.guide-footer`, `.prev-next`, `.back-to-top`.
Sections and blocks: `.section` (`.section--h2`, `.section--h3`, `.is-collapsed`), `.section-head`, `.section-toggle`, `.section-title`, `.section-tools`, `.section-body`, `.subsections`, `.blocks`, `.block` (`.block--paragraph`, `.block--list`, `.block--table`, `.block--blockquote`, `.block--code`, `.is-edited`, `.is-editing-block`, `.is-dragging`), `.block-content`, `.block-meta`, `.edited-marker`, `.block-tools`, `.drag-handle`, `.table-wrap`, `hr.content-hr`, `.callout` with `.callout--statute`, `.callout--practice`, `.callout--warning`, `.callout--danger`, `.callout--currency`.
Notes: `.notes-area` (`.notes-area--guide`, `.notes-area--rail`, `.has-notes`), `.note`, `.note-meta`, `.note-body`, `.note-editor`, `.add-note-btn`, `.notes-btn`, `.note-count`.
Checklists: `.checklist`, `.checklist-item`, `.checklist-box`, `.checklist-label`, `.checklist-progress`, `.progress`, `.progress-fill`.
Glossary: `abbr.abbr`, `.glossary`, `.glossary-entry`, `.glossary-back`.
Calculators: `.calculator` (`.calculator--print`, `.calculator--wide`), `.calculator-inner`, `.calculator-head`, `.calculator-title`, `.calculator-form`, `.calc-field`, `.calc-question`, `.calculator-output`, `.calc-out-table`, `.calc-primary`, `.calc-formula`, `.calculator-static`, `.calc-print-table`, `.scenario-table`, `.bar-chart`, `.record-card`, `.record-table`, `.record-note`, `.ledger-view`, `.wt-event`, `.wt-error`.
Pages: `.page`, `.calendar-table`, `.calendar-timeline`, `.timeline-month`, `.calendar-rules`, `.calendar-add`, `.citations`, `.citation-instrument`, `.citation-provision`, `.citation-guide`, `.cite-list`, `.changelog-page`, `.changelog-item`, `.diff`, `.settings-page`, `.settings-group`.
Print: `.print-root`, `.print-cover`, `.print-landing`, `.print-toc`, `.toc`, `.toc-link`, `.toc-page`, `.print-section`, `.print-running-head`, `.print-colophon`, `.print-only`, `.screen-only`, `.edit-only`.

### Diagram slots

Each slot is `<figure class="diagram-slot has-asset" id="{slot-id}" data-title="…" data-diagram-type="…">` containing the inlined `<svg data-slot="{slot-id}" aria-label="…">` and a `<figcaption>` with the title. To replace an asset, overwrite `design/diagrams/{slot-id}.svg` and rebuild. A slot without an asset renders `<div class="diagram-placeholder">` with the node list from Sheet B. Slot definitions (IDs, sections, node lists) live in `src/app/diagrams.js`.

| Slot ID | Placed in section (anchor) | Position | Title |
|---|---|---|---|
| `dg-trust-accounting-01` | `trust-accounting--s2-1` | end | Where the obligations live |
| `dg-trust-accounting-02` | `trust-accounting--s3-2` | end | Section 34 and section 35 |
| `dg-trust-accounting-03` | `trust-accounting--s4-7` | end | Decision sequence for each receipt |
| `dg-trust-accounting-04` | `trust-accounting--s5` | after-table | The five categories at a glance |
| `dg-trust-accounting-05` | `trust-accounting--s6-3` | end | The four absolute prohibitions |
| `dg-trust-accounting-06` | `trust-accounting--s7-1` | end | The record architecture |
| `dg-trust-accounting-07` | `trust-accounting--s7-2` | end | Money in: from receipt to ledger |
| `dg-trust-accounting-08` | `trust-accounting--s7-4` | end | Money out: cheque or EFT only |
| `dg-trust-accounting-09` | `trust-accounting--s7-6` | end | Double entry postings |
| `dg-trust-accounting-10` | `trust-accounting--s8` | start | Month end in one page |
| `dg-trust-accounting-11` | `trust-accounting--s9-2` | end | Rule 42: the four methods |
| `dg-trust-accounting-12` | `trust-accounting--s10-1` | end | Controlled money flow |
| `dg-trust-accounting-13` | `trust-accounting--s13-2` | end | Statutory deposit: the calculation |
| `dg-trust-accounting-14` | `trust-accounting--s14-3` | end | Irregularity: what to do |
| `dg-trust-accounting-15` | `trust-accounting--s15-1` | end | The annual cycle |
| `dg-trust-accounting-16` | `trust-accounting--s20` | end | What examiners actually find |
| `dg-practice-management-01` | `practice-management--s1-2` | end | What a winning firm looks like |
| `dg-practice-management-02` | `practice-management--s1-3` | end | The profit driver equation |
| `dg-practice-management-03` | `practice-management--s1-5` | end | Where to intervene |
| `dg-practice-management-04` | `practice-management--s1-6` | end | Leverage: the denominator problem |
| `dg-practice-management-05` | `practice-management--s1-7` | end | Battery hen versus free range |
| `dg-practice-management-06` | `practice-management--s1-10` | end | The money go round |
| `dg-practice-management-07` | `practice-management--s1-11` | end | Why firms do not change |
| `dg-practice-management-08` | `practice-management--s1-12` | end | The nine non-financial predictors |
| `dg-practice-management-09` | `practice-management--s3-2` | end | Why most clients must pay more under fixed fees |
| `dg-practice-management-10` | `practice-management--s3-1` | end | Three routes to $30,000 |
| `dg-practice-management-11` | `practice-management--s7-3` | end | The four-step business plan |
| `dg-practice-management-12` | `practice-management--s7-5` | end | Portfolio matrix |
| `dg-practice-management-13` | `practice-management--s7-5` | end | Three horizons |
| `dg-practice-management-14` | `practice-management--s7-6` | end | Twelve ways to build top line growth |
| `dg-practice-management-15` | `practice-management--s8-2` | end | The paramount duty |
| `dg-practice-management-16` | `practice-management--s8-5` | end | Instructions: the three-box test |
| `dg-practice-management-17` | `practice-management--s9-6` | end | The four pillars of practice growth |
| `dg-practice-management-18` | `practice-management--s9-12` | end | Client pathways |
| `dg-practice-management-19` | `practice-management--s9-15` | end | Importance versus urgency |
| `dg-risk-management-01` | `risk-management--s1` | end | The four numbers |
| `dg-risk-management-02` | `risk-management--s2-2` | end | The cover |
| `dg-risk-management-03` | `risk-management--s2-6` | end | Zakka v Elias |
| `dg-risk-management-04` | `risk-management--s3-1` | end | Claims by area of law |
| `dg-risk-management-05` | `risk-management--s4-1` | end | Causes of claims |
| `dg-risk-management-06` | `risk-management--s5-1` | end | File note rules |
| `dg-risk-management-07` | `risk-management--s6` | end | Clients who bite |
| `dg-risk-management-08` | `risk-management--s6-3` | end | Transferred file due diligence |
| `dg-risk-management-09` | `risk-management--s8-6` | end | Supervision structure |
| `dg-risk-management-10` | `risk-management--s9-2` | end | Vision, mission, values, goals |
| `dg-risk-management-11` | `risk-management--s9-4` | end | Horizon gazing |
| `dg-risk-management-12` | `risk-management--s10-3` | end | The double excess |
| `dg-risk-management-13` | `risk-management--s10-4` | end | Cyber security response plan |
| `dg-risk-management-14` | `risk-management--s10-1` | end | Cyber-assisted fraud claims |

"end" means after the section's own blocks (and calculators), before its subsections; "start" means before the first block; "after-table" means immediately after the section's first table.

### Calculators and where they sit

| Calculator (Sheet A) | Element ID | Section |
|---|---|---|
| 8.1 Profit Driver | `calc-profit-driver` | `practice-management--s1-3` |
| 8.2 Cost of Production | `calc-cost-of-production` | `practice-management--s4-4` |
| 8.3 Fixed Fee routes | `calc-fixed-fee-routes` | `practice-management--s3-1` |
| 8.4 WIP and Debtor Days | `calc-wip-debtor-days` | `practice-management--s2-5` |
| 8.5 Partner Dilution | `calc-partner-dilution` | `partnership-management--s4` |
| 8.6 Lockstep Points | `calc-lockstep-points` | `partnership-management--s5-3` |
| 8.7 Statutory Deposit | `calc-statutory-deposit` | `trust-accounting--s13-4` |
| 8.8 Rule 42 Method Selector | `calc-rule-42-method` | `trust-accounting--s9-2` |
| 8.9 Trust Money Classifier | `calc-trust-money-classifier` | `trust-accounting--s4-7` |
| 8.10 Trust Transaction Walkthrough | `calc-trust-transaction-walkthrough` | `trust-accounting--s7-8` |
| 8.11 Supervision Level Selector | `calc-supervision-level` | `people-management-and-supervision--s4-2` |
| 8.12 PII Excess Exposure | `calc-pii-excess` | `risk-management--s10-3` |
| 8.13 Return per salary dollar | `calc-return-per-salary-dollar` | `practice-management--s2-2` |

## Print

"Print this guide" and "Print everything" (top bar) build a print-only document (`#print-root`), hide the application and call the browser print dialog. `npm run pdf` opens `dist/PracticeGuides.html?print=all` in headless Chromium, renders A4 with 20 mm margins and a page-number footer, measures which page each heading lands on, writes those numbers into the table of contents and renders again, then verifies three sampled headings (result in `dist/pdf-report.json`). In-browser printing relies on `target-counter()` for TOC page numbers where the browser supports it.
