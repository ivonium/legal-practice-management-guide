# DESIGN_NOTES.md

Claude Design hand-off for Instruction Sheet B. Version 1.0 — 13 September 2026.
Prepared for Ivan Law.

Read with: `Source/README.md` (variable list, class list, slot table), `BUILD_NOTES.md`,
`INSTRUCTION_B_Claude_Design_Brief.md`.

---

## A. What was delivered

```
/design
  theme.css                          all variable overrides + additive component rules + @media print
  patterns/pattern-header.svg        fine diagonal lattice, 30°, gold hairline (also inlined in theme.css)
  patterns/pattern-divider.svg       H2 rule segment
  patterns/pattern-corner.svg        card / cover ornament
  diagrams/dg-*.svg                  49 files, one per slot ID, named exactly as the slot ID
```

Visual references (open in a browser; each is a self-contained HTML file):

| File | What it shows |
|---|---|
| `Practice Guides — Visual System.dc.html` | Landing page: top band, ten guide cards, Next 30 days, reference pages, the executive-summary slide-over, and `dg-trust-accounting-03` in situ |
| `Practice Guides — Guide Page & Components.dc.html` | Guide page with both rails, currency banner, collapsible exec summary, H2 divider rules, all five callouts, tables, a user note, an edited block, checklist, abbr + glossary card, record card, ledger view, search results, and the Statutory Deposit Calculator |
| `Practice Guides — Diagram Set.dc.html` | All 49 diagrams in slot order with their slot IDs and captions |
| `Practice Guides — Print Design.dc.html` | Cover, table of contents, a guide page, a calculator page, each at A4 with 20 mm margins, plus the greyscale proofs |

The references are inline-styled so they render standalone. **`theme.css` is the deliverable for
integration** — it carries the same values against the class contract in `README.md`. No DOM was
restructured and no class was renamed.

---

## B. Things you must decide or action

1. **Fonts are not embedded.** `theme.css` declares `--font-body: 'Source Serif 4 Subset', 'Source
   Serif 4', Georgia, serif` and `--font-heading: 'Source Sans 3 Subset', 'Source Sans 3',
   system-ui…`, with a commented `@font-face` block at the top of the file. I cannot produce woff2
   binaries, so **the build must subset both families and paste base64 data URIs into those two
   `@font-face` rules**. Until that happens the design falls back to Georgia and the system sans and
   still holds together. BUILD_NOTES item 26 records that system stacks were accepted "for now" —
   this replaces that decision if you want the serif.
   ANSWER: Continue with system stacks
2. **`--fs-base` moves from 16px to 17px** and `--measure` from 72ch to 70ch, per Sheet B §3. This
   reflows every page; nothing breaks, but page counts in the PDF will change.
   ANSWER: OK
3. **Two new variables** are introduced, both used by the component rules: `--color-primary-hover`
   (`#5E3AA8` light, `#B094E4` dark) for filled purple controls, and `--color-row-hover` (`#EFEBF7`
   light, `#2A2436` dark) for rail rows and list rows. They sit alongside the README list rather
   than replacing anything. If you would rather not add variables, inline the two hex values.
   ANSWER: Ok
4. **The executive summary is a slide-over in my design; the app opens it inline under the card**
   (BUILD_NOTES item 30, `.guide-card-summary`). Sheet B §5.2 asks for a slide-over. This is
   achievable in CSS alone — `position:fixed` on `.guide-card-summary` plus a backdrop — but it is a
   behaviour change, so I have not put it in `theme.css`. **Your call.** The styling of the panel
   itself is theme-only and applies either way.
   ANSWER: Make this a slide-over. Do not limit to CSS remedies. Use other changes if they would be optimal from a code quality and efficiency perspective and achieve the same intended aim.
5. **Diagram slots.** To apply an asset, replace the `<div class="diagram-placeholder">` inside the
   figure with the file's `<svg>` (keep the `figcaption`), or inline the file at build time from
   `src/app/diagrams.js`. The SVGs carry `role="img"`, no `width`/`height`, and
   `style="display:block;width:100%;height:auto"`, so they scale to the content column.
   ANSWER: This should be done by Claude Code.
6. **Diagram typeface.** Each SVG sets `font-family:'Source Sans 3',system-ui,sans-serif` on the
   root `<svg>`. Inlined into the page they pick up the embedded font; loaded as `<img src>` (as in
   the diagram-set reference) they cannot, and fall back to the system sans. **Inline them.**
7. **Print running header and footer** stay as they are (DEV-003): the PDF pipeline and the per-H2
   `.print-running-head` line. `theme.css` styles both but does not change the mechanism.

---

## C. Labels I could not source verbatim

Sheet B rule 1 is verbatim labels only. These are the departures, all of them structural rather
than substantive.

| Where | Wording used | Source and reason |
|---|---|---|
| `dg-trust-accounting-03` | Entry eyebrow "TRUST MONEY · SECTION 4.7" | Composed from the heading. §4.7 has **nine** steps, not the ten Sheet B §6.1 describes — BUILD_NOTES A.2 confirms nine is correct, so the diagram has nine and step 4 is the gold cash gate |
| `dg-trust-accounting-03`, terminal nodes | "Not trust money", "Transit money", "Controlled money", "Written direction money", "Power money", "Otherwise general trust money" | Verbatim from the numbered steps; the bolded category name in each step is used as the node label |
| `dg-trust-accounting-01` | Top band "Uniform Law (NSW) as applied by Application Act s 4" | From Sheet B §6.1's own description of the layer; the §2.1 table's first row reads "LPUL Ch 4 Pt 4.2, ss 127-168". Both appear |
| `dg-trust-accounting-06` | Layer names "Source records / Books of prime entry / Book of summary / Reports" | **Sourced** (Claude Code, 13 September 2026, BUILD_NOTES F.49): Law Society of NSW, *Legal Accounting Handbook: Trust Money and Trust Records*, 9th ed (March 2024) § 6.2 "General Trust Account Records", headings 6.2.1 Source Records, 6.2.2 Books of Prime Entry, 6.2.3 Book of Summary, 6.2.4 Reports. The Handbook reference is now on the diagram (round 2) |
| `dg-trust-accounting-07` | Node "Control account" with the badge "monthly" | §7.6: "post cash book totals to the control account monthly" |
| `dg-trust-accounting-09` | Column headers "TRANSACTION / DEBIT / CREDIT" | Verbatim from the §7.6 table |
| `dg-trust-accounting-13` | Panel "APPLICABLE PERIOD ENDS" listing the four dates | Composed label; the dates and the definition are verbatim from §13.2 |
| `dg-trust-accounting-15` | Ring label "The trust year" | Composed; "The trust year is 1 April to 31 March (s 155(1))" is verbatim inside it. "During July" is shown as the guide words it — BUILD_NOTES A.5 dates it 31 July in the calendar, which is **not** reproduced on the diagram |
| `dg-risk-management-02` | Bar lengths | Run-off ("free and unlimited") and the cyber policy ($50,000) have no comparable scale against $2m/$20m, so run-off is drawn as a dashed full-width bar rather than a measured one. The figures themselves are verbatim |
| `dg-risk-management-05` | Sub-cause tables shown in full in print; click-to-drill on screen | Round 2: `data-sub` / `data-panel` hooks added and driven by the app's `diagram.js` (BUILD_NOTES F.48). The print form shows all four sub-tables; on screen the diagram opens on the largest cause and each segment or legend row reveals its table |
| `dg-risk-management-10`, `dg-risk-management-11` | "YOUR NOTE" cells | Composed label for the blank column Sheet B specifies. They are drawn in the note tokens (`--color-note-bg` / `--color-note-border`) with a dashed border to read as fillable. **Wired** (round 2): each cell is an overlay-backed input driven by the app's `diagram.js` (BUILD_NOTES F.47); the placeholder hides once a cell is filled |
| `dg-practice-management-03` | Tags "MARKET" / "INTERNAL" | Verbatim from the "Constraint" column of the §1.5 table |
| `dg-practice-management-06` | Marker labels "LOCK-UP" / "LEAK" / "LOSS" | Verbatim from §1.10's bullets ("Lock-up in WIP", "Leak at chargeable time", "Loss at fees rendered") |
| `dg-practice-management-09` | Axis label "matter prices"; the distribution curve | Composed axis label. The three marker labels, the three outcome statements and "68% within one standard deviation, 95% within two" are verbatim from §3.2 |
| `dg-practice-management-12` | Axis labels "HIGH / LOW ATTRACTIVENESS", "HIGH / LOW GROWTH" | From the §7.5 table's own row and column headers |
| Record card, guide-page reference | "Sample payer", "Sample maker", "001482", "$45,000.00", ledger rows | Illustrative values, not guide content. Marked as such on the reference page. The **field names** are the eight required particulars from §7.2, verbatim |
| Landing cards, guide-page reference | Reading percentages (34%, 12%, 8%) | Illustrative UI state |
| Next 30 days, landing reference | Dates 21 September and 30 September 2026 | Derived from the §21 calendar rows ("Within 15 working days of month end", "Monthly", "Within 20 banking days of 31 Mar / 30 Jun / 30 Sep / 31 Dec"); the obligation text and provisions are verbatim |

---

## D. Judgement calls

1. **Purple is a fill on the top bar.** Sheet B §2.1 caps purple at roughly 10% of the visible area.
   A 56 px band on a 900 px-tall viewport is about 6%, and it does the structural work the brief
   asks of purple. Everything below the bar is paper-white. If a screenshot ever reads as "purple",
   the bar is the thing to reconsider first.
2. **Gold carries no type.** The brief allows gold as "a small accent", but at 10–13 px gold on
   white measures about 2.8:1, which fails AA. So gold is confined to rules, hairlines, the step-4
   gate, branch markers and corner ornaments; every glyph that was gold in my first pass moved to
   `--color-primary` or `--color-text-muted`.
3. **The pattern is a 30° diagonal lattice** at 0.6 px, gold, 20–22% stroke opacity on light and
   30% on dark, in exactly the three permitted places. On the purple top bar it uses the lighter
   `#D4B45A` at 38% so the lines remain visible against the fill; on white it uses `#B8952E`.
   Topbar controls carry a solid purple fill so the lattice stops at their edges.
4. **The "§ n" chip, not an arrow.** Sheet B §5.2 asks for an arrow glyph at the right of each
   executive-summary row. The app renders a "§ n" badge instead (BUILD_NOTES item 14), so the design
   styles the badge. It is also the more useful of the two — it tells you where the row goes.
5. **Table headers are `--color-primary-soft` with `--color-primary` text**, as directed. In print
   the header background is forced with `print-color-adjust: exact` and the text drops to black, so
   repeated header rows stay legible in greyscale.
6. **Notes print on border weight and an uppercase label**, with the yellow removed (`background:
   #fff !important`). They are unmistakable in colour on screen and still unmistakable in black and
   white.
7. **Diagram sizing.** Every SVG is authored on a 960-wide viewBox with a 30 px side margin and a
   gold rule under the eyebrow, so the set reads as one family. `dg-trust-accounting-03` is 960 ×
   960 — it prints within one A4 page with the 20 mm margin, as Sheet B requires of the flagship.
8. **No interactivity was built into the diagrams.** Sheet B allows hover annotations, click-to-
   expand and tab views, and asks separately that every diagram be fully legible with no
   interaction. Rather than build two states, I built the print state and made it the only state:
   nothing is hidden behind a hover. Where Sheet B specifically wanted interaction — `-03` node
   links, `-04` tabs, `-05` drill-down, `-07` tiles, `-09` hover, `-13` hover — the content is all on
   the face of the diagram, and the interaction can be layered on later with `diagram.js` without
   redrawing anything.
9. **`dg-practice-management-13`** (Three horizons) and `-12` (Portfolio matrix) both sit after §7.5
   and are drawn as two separate diagrams in the order the README lists them (BUILD_NOTES item 33).

---

## E. Accessibility and contrast

Checked against the light palette on `--color-bg` / `--color-surface`:

| Pair | Ratio |
|---|---|
| `--color-text` `#1F1A26` on `#FFFFFF` | 15.9:1 |
| `--color-text-muted` `#6B6478` on `#FFFFFF` | 5.5:1 |
| `--color-primary` `#4B2A85` on `#FFFFFF` | 10.1:1 |
| `--color-primary` on `--color-primary-soft` `#EAE3F4` | 8.0:1 |
| white on `--color-primary` | 10.1:1 |
| `--color-link` `#3F2470` on `#FFFFFF` | 11.9:1 |

Dark mode keeps `--color-text` `#ECE8F1` on `#14111A` at about 15:1 and `--color-primary` `#9C7FD6`
on `#1C1824` at about 6.3:1. The focus ring is a 2 px gold outline with a 2 px offset, always
visible, which reads against both the white surfaces and the purple bar.

`--color-accent` `#B8952E` on white is 2.8:1 — decorative only, never type, never a border that
carries meaning on its own.

---

## F. Screenshot set

Sheet B §8 asks for screenshots of the landing page, a guide page, a calculator, the trust
walkthrough, search results, edit mode, a note, dark mode and a printed page. All nine states are
**live** in the four reference files rather than captured as images:

| State | Where |
|---|---|
| Landing | `Visual System` |
| Guide page, note, edited block | `Guide Page & Components` |
| Calculator | `Guide Page & Components` → §13.4, interactive |
| Trust walkthrough | `Guide Page & Components` → §7.8 record card and ledger view |
| Search results | `Guide Page & Components` → type two characters in the search field |
| Edit mode | either file → the **Edit** button in the top bar |
| Dark mode | either file → the `theme` tweak |
| Printed page | `Print Design` — four pages plus greyscale proofs |

---

## G. Open questions for you

1. Confirm the four layer names in `dg-trust-accounting-06` (section C).
ANSWER: Claude Code try to find the origin and basis for these and complete yourself. Otherwise compile the finished product for me and list this as an outstanding with a clear instruction on what this is and what needs to be done.
2. Slide-over or inline for the executive summary (section B.4).
ANSWER:Slide-over, as above.
3. Do you want the optional diagram interactions built (section D.8)? They need a small shared
   `diagram.js`, coordinated with Claude Code.
ANSWER: Yes, and throw back to Claude Design if necessary after integrating the instructions above.
4. Should the fillable cells in `dg-risk-management-10` and `-11` be wired to the notes overlay?
   That is app work.
ANSWER: Yes
5. Confirm the firm name renders as "Ivan Law" on the cover and in `settings.firmName`.
ANSWER: OK

List any changes that may require further input from claude design.
