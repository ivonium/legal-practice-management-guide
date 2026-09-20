# BUILD_NOTES.md

Everything encountered during the build that the author should review, with the author's answers of 12 September 2026 and how each was applied. The `Guides/` originals were never changed; author-directed edits are applied to the build inputs in `content/` by `npm run content:apply` (`src/build/author-edits.js`, idempotent) and are listed in section E.

Items the author accepted "for now" carry a `DEV-nnn` ID (see README, "In development markers").

## A. Content anomalies

1. **Practice_Management.md has no "stated as at" line.** ANSWER: the currency date is 12 September 2026. **Applied:** "Stated as at 12 September 2026." appended to the preamble paragraph in `content/Practice_Management.md`; the banner, landing card and print cover now show it (the cover reads "Law stated as at 8 September 2026 to 12 September 2026").
2. **Trust Accounting §4.7 has nine steps, not ten** (Sheet A 8.9 says ten). ANSWER: proceed with 9. **Applied:** no change; the Trust Money Classifier implements the nine steps as written.
3. **Sheet A test 14 refers to a Trust Accounting section 21 checklist**; section 21 is a table and the guide has no checklist items. ANSWER: ignore. The test is run on the Practice Management §10 checklist.
4. **Calendar rows 9 and 53** are coded `ANNUAL-FIXED` but read as monthly / quarterly. ANSWER: keep the timing consistent; make the maths clear. **Applied:** row 9 is monthly (last day of each month), row 53 quarterly (31 Mar, 30 Jun, 30 Sep, 31 Dec). The calendar table and the print calendar now carry an "Interpreted as" column beside the verbatim recurrence code, and the calendar page states the expansion rules in one paragraph.
5. **Vague dates** ("during July", "a few weeks before 30 June", "given in practice mid to late July", "by June 2027"). ANSWER: choose concrete dates; do not use "during July". **Applied:** row 17 (signatory notification) is dated 31 July, labelled "During July (shown as 31 July)"; row 42 (pay 30 June super early) is dated 16 June, labelled "A few weeks before 30 June (shown as 16 June)"; row 16 keeps its 30 June obligation date with the label "Given in practice mid to late July"; row 46 is a once-only item on 30 June 2027; row 33 (AML annual report) is 31 March with the label "Expected; confirm the period and date with AUSTRAC". Rows whose text is only "annually" (45, 47 to 52 except where dated) remain rules without a date because no date is stated anywhere in the guides.
6. **Trust Accounting §23 "Cases"** used literal `|` separators. ANSWER: use commas. **Applied** in `content/Trust_Accounting.md` (now §23.5).
7. **Stress Management §7 `___` placeholders.** ANSWER: more natural placeholders, boxes that can be rendered later. **Applied (DEV-004):** every `___` renders as an empty score box (`<span class="score-box" data-box="{blockId}-boxN">`), including the three "total" lines; the boxes have stable IDs so they can be wired to persisted inputs later. The fidelity test strips `___` from the source before comparing.
8. **Unnumbered H3 headings** (Cyber Security §1 and §11 including "Bonus:", Trust Accounting §1 and §23). ANSWER: no "Bonus"; add numbers. **Applied** in `content/`: Cyber Security "The numbers that frame the problem" → 1.1; the eight actions → 11.1 to 11.8; "Bonus: cross-check with a second model" → "11.9 Cross-check with a second model"; Trust Accounting "Abbreviations" → 1.1, "Three things that changed…" → 1.2, "The two numbers that govern everything" → 1.3, "Legislation" → 23.1, "Law Society of NSW" → 23.2, "Other" → 23.3, "Contacts" → 23.4, "Cases" → 23.5. Anchor IDs follow (for example `trust-accounting--s1-2`, `cyber-security--s11-9`).
9. **Trust Accounting H3 headings containing links** (25 headings, for example "6.1 Establishment ([r 35](…))"). ANSWER: headings must not be hyperlinks; add text below. **Applied** in `content/Trust_Accounting.md`: each heading keeps its plain reference, for example "6.1 Establishment (r 35)", and a line "Provision: [r 35](…)" (or "Provisions: …" when there are several) is inserted immediately beneath it. This becomes the first block of those sections, so the block IDs in those 25 sections are shifted by one (`--b1` is now the Provision line). No notes or edits existed before this change.
10. **People Management §11** had a whole sentence in bold naming the Risk Management guide, so it did not link. ANSWER: make it make sense. **Applied** in `content/`: the sentence keeps its words but the bold now sits on the guide name only ("…is in the **Risk Management** guide at section 8."), and it links to `risk-management--s8`.
11. **Single-letter glossary terms** (L, M, R; also BR, CH). ANSWER: leave them. No change.
12. All legislation instrument IDs in links are in the Content Pack seed; there were no unknown IDs.

## B. Judgement calls and interpretations

13. **Bare URLs linkified** (57), visible text unchanged; the Sources-table legislation URLs are harvested as "whole instrument" citations. ANSWER: OK.
14. **Executive summary `→ guide §n` notation.** ANSWER: normalise graphically and textually. **Applied:** each item is one row: the verbatim item text (linked) on the left and a consistent "§ n" badge (also linked) on the right, on screen, in the landing-card summary and in print. The arrow is not shown.
15. **Callout rule:** blockquotes are `.callout--statute` only when they contain a legislation.nsw.gov.au link or a case-citation pattern; none currently qualify. ANSWER: OK.
16. **Notes placement** after the heading's own blocks, before subsections; guide notes under the currency banner; the right rail shows the current section's notes. ANSWER: OK for now.
17. **Only H2 sections are collapsible.** ANSWER: OK.
18. **Section reorder persistence:** H2 order in `overlay.order[guideSlug]`; H3 order supported under `overlay.order[h2Id + '--subsections']` but with no drag control yet. ANSWER: OK.
19. **"Restore original order"** per section also returns blocks moved into or out of it. ANSWER: OK.
20. **Overlay shape additions:** `calendarItems`, `settings.firmName`. ANSWER: OK.
21. **Statutory deposit scenarios:** the selector only hides inputs; the guide does not itemise the scenarios. ANSWER: OK for now, mark in development. **DEV-001.**
22. **Rule 42 Method 1 note** wording quoting the Wait column. No answer given; unchanged.
23. **Receipts cash book columns** are the application's (the guide leaves the format to the practice). ANSWER: OK for now, mark in development. **DEV-002.**
24. **Business-day and banking-day arithmetic** counts weekdays only. ANSWER: OK for now.
25. **Search** is a purpose-built index. ANSWER: OK for now.
26. **Fonts:** system stacks. ANSWER: OK for now.
27. **Export mechanism** uses a `text/x-shell` script block rather than a `<template>`. ANSWER: OK.
28. **Print header and footer** come from the PDF pipeline and a per-H2 running line; in-browser TOC numbers rely on `target-counter()`. ANSWER: OK for now, mark in development. **DEV-003.**
29. **8.13 chart** is CSS bars; prints as a table. ANSWER: OK for now.
30. **Landing "Read summary"** originally opened inline under the card. Superseded by the slide-over decided in DESIGN_NOTES B.4; see note 46.
31. **Reading progress** from scroll position. ANSWER: OK for now.
32. Only the Trust Accounting banner links to a "what changed" section. ANSWER: OK.
33. Two Sheet B slots after Practice Management §7.5, placed in order. ANSWER: OK.
34. Test 8 "fresh profile" = fresh Playwright context. ANSWER: OK.

## C. Walkthrough (8.10) wording that is not verbatim from the Trust Accounting guide

Every rule reference, particular and warning in the record cards is checked by a unit test against the guide text; the exceptions below use the closest guide wording. ANSWER to 35 to 42 (except 38): OK for now; provide links to the source legislation and guide sections. **Applied:** each of these panels now ends with a "Sources:" line linking the NSW legislation register provisions (opening in a new tab) and the relevant guide sections.

35. **Guard rail** (spec-mandated sentence). Sources: LPUL s 148, s 154; Trust Accounting §22.2, §14.2, §8.5.
36. **"Interest belongs to the client"** quoted from §5.2. Sources: LPUL s 139; Application Act s 47; Trust Accounting §5.2, §10.1, §8.6.
37. **Threshold transaction report notice.** Sources: AML/CTF Act 2006 (Cth); LPUL s 143; Anti-Money Laundering §16.1, §24.1; Trust Accounting §5.1.
38. **Card titles** composed from rule references and headings. ANSWER: OK for now.
39. **Deficiency warning** on a reversal after funds were drawn. Sources: LPUL s 148, s 154; Trust Accounting §7.2, §6.3, §14.3.
40. **Cash override** for transit / written direction / power money. Sources: LPUL s 143; Trust Accounting §4.7, §5.1.
41. **Deposit record for a cheque** (drawer and ADI/BSB as placeholders). Sources: LPUGR r 37, r 44(2); Trust Accounting §7.3.
42. **Controlled money events** (r 63/r 64 records instead of cash book / ledger). Sources: LPUGR r 63, r 64, r 42; Trust Accounting §10.3, §10.4, §22.1. The credit card warning and the Method 3 block also carry source links (LPUL s 146 / Trust Accounting §6.3; LPUGR r 42(5), r 42(8) / Trust Accounting §9.5).

## D. Build statistics

Rebuilt 13 September 2026 with the design integration (see `dist/build-report.json`): 659 headings, 1,839 content blocks, 41 checklist blocks, 267 legislation links in 11 instruments, 204 glossary marks, 44 cross-reference links (5 to specific sections), 49 diagram slots all carrying inlined assets (249 KB after metadata stripping), 13 calculators, theme applied. Output 2.36 MB; PDF 381 pages.

## E. Author-directed edits applied to `content/` (12 September 2026)

Applied by `src/build/author-edits.js`. Words were changed only where an answer required it (items 6 and 8 to 10 change heading numbers, separators, emphasis or add a "Provision:" line); no sentence of guidance was reworded.

- `Practice_Management.md`: preamble gains "Stated as at 12 September 2026." (A.1)
- `Trust_Accounting.md`: eight H3 headings numbered (A.8); Cases paragraph separators " | " → ", " (A.6); 25 headings stripped of links with a "Provision:" / "Provisions:" line added beneath each (A.9)
- `Cyber_Security.md`: ten H3 headings numbered 1.1 and 11.1 to 11.9, "Bonus" removed (A.8)
- `People_Management_and_Supervision.md`: §11 bold moved from the sentence to the guide name (A.10)

## F. Design integration (13 September 2026, `design/HANDOVER_TO_CLAUDE_CODE.md`)

43. **Stylesheet.** `design/theme.css` is concatenated after `src/styles/app.css` into the single `<style id="app-css">` block at build time, so its `:root` overrides win. The two new variables `--color-primary-hover` and `--color-row-hover` are accepted into the contract (DESIGN_NOTES B.3, answer OK) and listed in the README. `--fs-base` 17px and `--measure` 70ch reflowed the PDF (381 pages; TOC re-measured and verified).
44. **Fonts.** DESIGN_NOTES B.1 answer: "Continue with system stacks". No fonts are embedded; the commented `@font-face` block in `theme.css` is left as delivered and the file still makes no network requests. The theme's font variables are also left as delivered, so the body renders in Georgia (a system serif) and headings, UI, tables and the 49 diagrams in `system-ui`. This supersedes HANDOVER §2.2. If a sans body is preferred instead, override `--font-body` in `theme.css`.
45. **Diagram assets.** All 49 `design/diagrams/dg-*.svg` files are inlined at build time (`src/build/svg.js`) in place of the placeholder lists; the figcaption is the README slot title. Processing: the C2PA `<metadata>` manifest (379 KB of the 623 KB set) and its namespace are stripped; every `id` not already scoped to the slot is prefixed with the slot ID, together with its `url(#…)` and `href="#…"` references, so the 45 `marker id="a"` and 32 `id="ag"` definitions cannot collide (the build fails on any duplicate id across the set); `data-slot` and `aria-label` (the slot title) are added to the root `<svg>`. A missing asset falls back to the placeholder list and is logged.
46. **Executive summary slide-over.** DESIGN_NOTES B.4 answer: slide-over, not limited to CSS. Implemented as a native `<dialog class="summary-slideover">` opened with `showModal()`: Esc closes, focus is contained and returns to the "Read summary" button on close, the backdrop is `::backdrop`, backdrop click and following a link close it. The in-card `.guide-card-summary` panel no longer exists, so section 11a of `theme.css` (which targets it) is dormant; `app.css` carries equivalent panel styling using the theme tokens. **For Claude Design:** retarget or delete §11a (`dialog.summary-slideover`, `.slideover-head`, `.slideover-title`, `.slideover-body`, `.slideover-close`).
47. **Fillable diagram cells** (G.4 answer: yes). Every `[data-fill-cell]` in `dg-risk-management-10` (4 cells) and `-11` (24 cells) is an overlay-backed input: click or Enter opens a small dialog with a textarea labelled by `data-fill-label`; the saved text renders inside the cell as a `<foreignObject>` (wrapping), persists in `overlay.fills["{slotId}:{cell}"] = { text, updatedAt }`, is searchable with the "Your note" badge, prints, and is included in the exported master file. The "YOUR NOTE" label drawn in the SVG stays visible beneath a filled cell; Claude Design may want to hide it when `foreignObject` is present.
48. **Diagram interactions** (G.3 answer: yes). `src/app/diagram.js` is bundled into the file (rather than shipped as `design/diagrams/diagram.js`) and is progressive: with no hook attributes present every diagram is complete and static, which is also the print form. Hook attribute names, for Claude Design to add across the set: `data-anchor="#anchor-id"` (click or Enter navigates), `data-sub="key"` on a trigger with `data-panel="key"` on the group it reveals (panels start hidden on screen unless `data-panel-open`; always shown in print), `data-tabs` on a group whose children carry `data-tab="Label"` (a tab strip is drawn above the figure on screen; print shows all), and `data-hover` on groups whose siblings should dim on hover (CSS only). Print CSS neutralises all of them.
49. **`dg-trust-accounting-06` layer names (G.1)** - resolved, sourced. The four names come from the Law Society of NSW, *Legal Accounting Handbook: Trust Money and Trust Records*, 9th edition (March 2024), section 6.2 "General Trust Account Records", which states "The following broad headings are useful to describe the function of the various records" and then uses the headings 6.2.1 Source Records, 6.2.2 Books of Prime Entry, 6.2.3 Book of Summary (the trust ledger account: "Its function is a book of summary") and 6.2.4 Reports (the reconciliation and trial balance). The examples in each layer of the diagram match that section. The Handbook is the guide's stated working reference (Trust Accounting §2.3). No change to the diagram; optionally Claude Design may add "Legal Accounting Handbook §6.2" to the diagram's eyebrow or caption.
50. **Firm name (G.5).** `settings.firmName` defaults to "Ivan Law" and the print cover reads "Prepared for Ivan Law".
51. **Table of contents markup** was restructured to the contract the theme's print rules expect: each `li` is the flex row, the link and the page number are siblings, and the dotted leader is drawn by `li::after`. `target-counter()` now reads `data-href` on the page-number span. The measured pass in `src/build/pdf.js` was updated accordingly and verified.
52. **Checks from HANDOVER §3.** Duplicate marker IDs: none (build-enforced and tested). Repeated table headers: `print-color-adjust: exact` is in the theme. TOC page numbers: re-measured. **Gold focus ring on the purple top bar:** `--color-focus` `#b8952e` against `--color-primary` `#4b2a85` is roughly 2.3:1, so the ring is faint on the band; flagged for Claude Design (a white or `--color-primary-soft` ring inside `.topbar` would fix it).

### Items that need Claude Design again

- Add the interaction hooks (note 48) across the set: `data-anchor` on the nine step groups and terminals of `dg-trust-accounting-03`, `data-tabs`/`data-tab` grouping in `dg-trust-accounting-04`, `data-sub`/`data-panel` in `dg-risk-management-05`, `data-hover` where hover emphasis is wanted.
- Retarget or delete `theme.css` §11a to the dialog classes (note 46).
- Focus ring colour on the purple top bar (note 52).
- Optional: hide the "YOUR NOTE" label when a cell is filled (note 47); a source line for `dg-trust-accounting-06` (note 49).
- No font-metric review is needed because no fonts are embedded (note 44).

### Round 2 (HANDOVER §4, integrated 13 September 2026)

53. **Theme §11a now targets the dialog.** The equivalent panel styling was removed from `app.css`; only the functional rule (summary body visible inside the dialog) and a safeguard remain. **Defect found in §11a, for Claude Design:** `dialog.summary-slideover { display: flex }` is not scoped to `[open]`, so a closed dialog overrides the browser's `display: none`, occupies the right 760 px of every page and intercepts clicks (nine acceptance tests timed out). **Fixed by Claude Code on the author's instruction (13 September 2026):** the rule in `design/theme.css` now reads `dialog.summary-slideover[open]`; the `app.css` safeguard `dialog:not([open]) { display: none !important }` is kept as defence in depth.
54. **Focus ring on the purple band** (white ring; gold on the white search field and the active scope button) accepted as delivered.
55. **Fillable cells** are now `<g data-fill-cell>` groups; the app injects the `<foreignObject>` inside the group, after the rect, so the theme's `:has(foreignObject)` rule hides the "YOUR NOTE" placeholder. Verified by the acceptance test (save, reload, search, print).
56. **Interaction hooks** integrated as delivered: `data-anchor` on the nine steps and eight terminals of `dg-trust-accounting-03` (step 4, the cash gate, has no terminal, as intended); `data-tabs`/`data-tab` on the six columns of `dg-trust-accounting-04` (tab strip rendered inside the figure above the SVG, styled by theme §15b); `data-sub`/`data-panel` in `dg-risk-management-05` with `comms` open initially; `data-hover` on `dg-trust-accounting-01` and `-06`. `diagram.js` was adjusted so `data-panel-open` is the initial state (a trigger shows its own panel and hides the others) and so tab buttons carry the theme's `.diagram-tab` class. The remaining seven `data-hover` candidates were not requested; hover there would only emphasise text already on the face.
57. **`dg-trust-accounting-06`** now carries the Legal Accounting Handbook § 6.2 reference in its eyebrow and a source line. DESIGN_NOTES section C was amended by Claude Code (rows for `-06`, `dg-risk-management-05` and the fillable cells) as the handover asked.
58. **Leaked commentary in two diagrams, for Claude Design:** `dg-risk-management-10` and `-11` render a footnote as visible diagram text: "Each cell in the right column carries an id and data-fill-cell attribute for the notes overlay; its drawn placeholder carries class="fill-placeholder" and hides when the cell is filled." That is an implementation note, not guide content, and it printed. **Fixed by Claude Code on the author's instruction (13 September 2026):** in both SVGs the footnote now keeps its guide-verbatim first sentence ("Document and review annually, ideally away from the office." from §9.2; "The three highlighted rows are the current live ones." from §9.4) followed by "Click a cell to add your own entry."; the second line was removed.
59. **Text overflow at system-ui metrics** (HANDOVER §5.2): `test/e2e/diagram-overflow.js` renders every inlined diagram at the real metrics and measures each `<text>` against its viewBox and its enclosing box. Result: no overflow in any of the 49 diagrams; no wrap widths need adjusting.
60. Rebuilt and re-verified: 34 unit tests, 18 acceptance tests, PDF 381 pages with the three sampled TOC pages matching.
61. **Finalised 13 September 2026.** No items remain open with Claude Design. Optional future work only: hover emphasis on seven further diagrams (HANDOVER §4.4), the four DEV items, and the H3 drag reorder control (note 18).
