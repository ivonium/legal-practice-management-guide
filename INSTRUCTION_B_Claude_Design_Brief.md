# INSTRUCTION SHEET B
# Claude Design - Visual System and Diagram Brief

## Practice Management Guides - Local Reference Application

Version 1.0 - 12 September 2026

---

## 0. Read this first

You are designing the visual layer for an application that **already works**. Claude Code has built it against Instruction Sheet A. It has a neutral stylesheet in which every visual property is a CSS custom property, a set of stable component class names, and empty `<figure class="diagram-slot">` elements at defined locations.

**You will produce three things:**

1. **A stylesheet** that overrides the variables and styles the components (section 4).
2. **SVG diagrams** for the slots listed in section 6, one file per slot, each with a static print form.
3. **Layout designs** for the landing page and the executive summary panels (section 5).

**You will not:**

- Change any content. Every label in every diagram must be text that appears in the source guides. If a label you need does not exist there, use the nearest wording that does and **flag it** in your hand-off notes. Do not invent.
- Restructure the DOM or rename classes. Work with the contract in Claude Code's `README.md`.
- Add colour for its own sake. The brief is restraint.

**Inputs:** Claude Code's `README.md` (variable list, class list, slot list), the built `dist/PracticeGuides.html`, the three source guides for the diagrams (`Trust_Accounting.md`, `Practice_Management.md`, `Risk_Management.md`), and Instruction Sheet C for the executive summary text.

---

## 1. Who this is for and how it will be used

A solicitor's personal and firm reference. Read on a laptop, occasionally on a tablet, and printed to A4. It will be added to over years. It should feel like a well-made legal reference: quiet, authoritative, easy to scan, and unhurried.

**Two words to keep in mind: subtle and durable.** Nothing that looks fashionable now and dated in three years.

---

## 2. Visual direction

### 2.1 Palette

**Royal purple as the primary, gold as trim. Neither is allowed to dominate.** The page is overwhelmingly paper-white with dark text. Purple carries structure and navigation. Gold is a hairline, a rule, a small accent - never a fill.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#FBFAFD` | `#14111A` | Page background |
| `--color-surface` | `#FFFFFF` | `#1C1824` | Cards, panels |
| `--color-surface-alt` | `#F4F1F8` | `#241F2E` | Alternating table rows, rails |
| `--color-text` | `#1F1A26` | `#ECE8F1` | Body text |
| `--color-text-muted` | `#6B6478` | `#A9A2B6` | Captions, metadata |
| `--color-primary` | `#4B2A85` | `#9C7FD6` | Headings, nav highlight, links on hover, primary buttons |
| `--color-primary-soft` | `#EAE3F4` | `#2E2540` | Selected nav, active states, callout backgrounds |
| `--color-accent` | `#B8952E` | `#D4B45A` | Gold trim: hairlines, rules, small marks, focus rings |
| `--color-accent-soft` | `#F5EFDD` | `#3A3222` | Gold tint for rare emphasis |
| `--color-border` | `#E3DEEA` | `#332C3F` | Borders |
| `--color-link` | `#3F2470` | `#B39DE3` | Links |
| `--color-focus` | `--color-accent` | `--color-accent` | Focus ring |
| `--color-note-bg` / `--color-note-border` | `#FFF9E8` / `#E6CF8B` | `#2A2517` / `#8A7440` | User notes |
| `--color-edit-bg` / `--color-edit-border` | `#EEF7F0` / `#9CC9A8` | `#172519` / `#4C7F58` | Edited blocks |
| `--color-warning-bg` / `--color-warning-border` | `#FFF4E5` / `#E8B86D` | `#2C2214` / `#9C7A3E` | Warnings |
| `--color-danger-bg` / `--color-danger-border` | `#FCEBEB` / `#D98C8C` | `#2D1616` / `#8F4747` | Blocked actions, deficiency warnings |

**Proportion rule of thumb:** on any screen, no more than roughly 10% of the visible area should be purple fill, and gold should appear only as lines and small marks. If a screenshot reads as "purple", you have gone too far.

### 2.2 The digital pattern

A **fine-line geometric pattern** - a light circuit-trace or isometric grid motif, hairline weight, in gold at very low opacity (5% to 8% on light, 8% to 12% on dark). Used in exactly three places:

- `--pattern-header`: the top band of the landing page and the guide title band.
- `--pattern-divider`: a short horizontal rule between major sections (H2), 1 px gold line with a small pattern segment at the left end.
- `--pattern-corner`: a small corner ornament on the cover page and executive summary cards.

Supply the pattern as inline SVG data URIs assigned to those three variables. **It must not appear behind body text, in tables, in calculators, or in print body pages.** In print it may appear on the cover page only.

### 2.3 Dark mode

Follows the system preference (already wired). Your dark values must keep body text contrast at WCAG AA. Purple lightens; gold warms; the pattern stays faint.

---

## 3. Typography

| Token | Value | Notes |
|---|---|---|
| `--font-body` | A serif with good screen and print rendering, for example **Source Serif 4** or **Literata**, with `Georgia, serif` fallback | Legal reference feel; excellent for long reading and for print |
| `--font-heading` | A humanist sans, for example **Inter** or **Source Sans 3**, with system fallback | Headings, navigation, UI, tables, calculators |
| `--font-mono` | System monospace | Formulas, code |
| `--fs-base` | 17 px screen, 10.5 pt print | |
| `--lh-body` | 1.6 | |
| `--measure` | 70ch | Maximum body text width |

**Headings:** H1 guide title in `--color-primary`, generous top margin, gold hairline below. H2 with the section number in `--color-text-muted` and a `--pattern-divider` rule above. H3 in `--color-primary`, smaller. **Numbering is part of the heading text; do not hide it.**

**Tables:** full-width, header row in `--color-primary-soft` with `--color-primary` text, hairline borders, zebra rows using `--color-surface-alt`, generous cell padding. Many tables are wide; ensure horizontal scroll on narrow screens and correct wrapping in print.

**Bold lead-ins** are used throughout the guides as practice notes. Style `<strong>` at the start of a paragraph slightly heavier than mid-sentence bold, but do not add a background.

Fonts must be **embedded or subset** into the single file; the app makes no network requests. Coordinate with Claude Code on the mechanism (base64 in the stylesheet is acceptable).

---

## 4. Components

Style against the class list in Claude Code's `README.md`. Priorities:

| Component | Direction |
|---|---|
| `.topbar` | Slim, white, hairline gold bottom border. Search box prominent. Edit and Export as quiet secondary buttons; when edit mode is on, the Edit button and a thin banner turn `--color-edit-border` |
| `.rail-left` | `--color-surface-alt`, guide titles in heading font, current guide in `--color-primary-soft` with a 3 px gold left bar. Section lists indented, small |
| `.rail-right` | Notes and "on this page". Restrained |
| `.guide-card` (landing) | White card, hairline border, `--pattern-corner` top-right at low opacity, title, currency date, one-line description, thin progress bar in purple, "Read summary" as a text button |
| `.exec-summary` | See section 5 |
| `.callout--statute` | Left border 3 px `--color-primary`, `--color-primary-soft` background, serif text; used for statutory and judicial quotations |
| `.callout--practice` | Left border 3 px gold, `--color-accent-soft` background, sparingly |
| `.callout--warning` / danger | As per palette |
| `.callout--currency` | Compact banner under the guide title, `--color-surface-alt`, small text, calendar icon |
| `.note` | `--color-note-bg`, `--color-note-border`, small "Your note · date" label in muted text. Must be unmistakably the user's, not the guide's |
| `.block.is-edited` | Faint `--color-edit-bg`, small "edited · date" tag, "Revert" as a tiny text link |
| `.checklist` | Custom checkbox in purple; progress bar thin, purple, with count |
| `.calculator` | A panel: `--color-surface`, hairline border, heading in sans, inputs in a two-column grid, outputs in a highlighted `--color-primary-soft` strip with the key number large. "Show formula" as a disclosure in monospace |
| `.record-card` (trust walkthrough) | Resembles an actual accounting record: a titled card with the rule number top-right in muted text, a two-column particulars list, and amounts right-aligned in monospace. Ledger and cash book views as proper tables with running balance |
| `.search-results` | Result rows with guide › section breadcrumb in muted text, snippet with `<mark>` highlights in `--color-accent-soft` |
| `.abbr` | Dotted gold underline; hover card in `--color-surface` with hairline border |
| `.calendar-timeline` | Horizontal month strip, items as small purple markers with labels; "next 30 days" panel as a compact list |
| `.citations` | Grouped headings per instrument; provisions as a two-column list; citing sections as small chips |
| `.diagram-slot` | Full content width, figure caption below in muted sans, hairline border, ample white space. Diagrams sit on `--color-surface`, never on the pattern |

**Buttons:** primary = purple fill, white text, small radius. Secondary = white, purple text, hairline border. Danger = per palette. No gradients, no shadows beyond `--shadow-sm`.

**Focus:** 2 px gold ring. Visible always.

---

## 5. Landing page and executive summaries

### 5.1 Landing page

Top band with `--pattern-header` at low opacity, the title, a one-line description, and the "Law stated as at" range. Then the **ten guide cards** in a responsive grid (two or three columns). Then a row of four utility links (Master Compliance Calendar, Citations Index, Glossary, Change Log) and the **"Next 30 days"** compliance panel.

### 5.2 Executive summary panel

Appears (a) as a slide-over when "Read summary" is chosen on a card and (b) at the top of each guide page, collapsible.

Design: guide title; a short verbatim intro paragraph (from Sheet C); then the **main areas as a numbered list of links**, each with a one-line descriptor, in two columns on wide screens. A small gold rule above and below. The list must be **obviously clickable** - underline on hover, arrow glyph at the right of each row.

Provide a print variant: the ten summaries collected after the cover page and before the table of contents, one per page or two per page depending on length.

---

## 6. Diagram specifications

**General rules for every diagram:**

- **Deliver as SVG**, `viewBox` sized for a 960 px content column, scaling fluidly. Text as real text (not paths) so it is searchable and printable.
- **Use the palette:** purple for primary shapes and flow lines, gold for emphasis marks and decision-branch labels, muted text for annotations, white or `--color-surface` fills. No other hues except the warning/danger tokens where the content is a warning.
- **Every label verbatim from the source guide.** Section references in the spec below tell you where.
- **Interactivity** is limited to what SVG plus a small script can do inside the figure: hover to reveal an annotation, click a node to expand a detail panel beneath the figure, click a node to navigate to the section anchor, and tab views. Coordinate the small script with Claude Code; keep it self-contained.
- **Static print form:** every diagram must render fully legible with no interaction, all annotations visible (or the most important ones), in monochrome-safe contrast. Provide a `data-print` variant or ensure the default state is print-ready.
- **Caption:** the title below, in muted sans.

Slot IDs are fixed; do not rename.

### 6.1 Trust Accounting

| Slot ID | Placed after | Title | Type and content |
|---|---|---|---|
| `dg-trust-accounting-01` | §2.1 | **Where the obligations live** | Layered block diagram: Uniform Law (NSW) as applied by Application Act s 4 → LPUL Ch 4 Pt 4.2 (ss 127-168) → LPUGR Ch 4 Pt 4.2 (rr 33-69) and Pt 4.6 (rr 91E-95A) → Application Act ss 11, 14, 46-47 → Application Regulation Pt 3 → ASCR rr 12.3, 37 → Solicitors Rules r 6. Use the table in §2.1 for labels. Hover shows the "Trust content" column text. |
| `dg-trust-accounting-02` | §3.2 | **Section 34 and section 35** | Two-panel diagram: s 34 "Responsibilities of principals" (two limbs) and s 35 "Liability of principals" (two limbs, with limb (b) highlighted in gold as "the operative one"). Arrow from any practice breach to each principal. Labels from §3.1 and §3.2. |
| `dg-trust-accounting-03` | §4.7 | **Decision sequence for each receipt** | Interactive flowchart of the ten-step sequence, exactly as ordered in §4.7, with the cash rule (step 4) shown as a gold gate. Each terminal node names the category and links to its records row in §22.1. Clicking a node opens the provision link. This is the flagship diagram; make it clear enough to print on one A4 page. |
| `dg-trust-accounting-04` | §5 (after the table) | **The five categories at a glance** | Five columns (General trust money, Controlled money, Transit, Written direction, Power) plus Investment, each showing: trigger, what you must do, records, statement required. Content from the §5 table. Tabs on screen; full grid in print. |
| `dg-trust-accounting-05` | §6.3 | **The four absolute prohibitions** | Four bold panels: No intermixing (s 146), No deficiency (s 148, with the penalty text), No false names (s 147(3)), No borrowing from clients (ASCR r 12.3). Static. |
| `dg-trust-accounting-06` | §7.1 | **The record architecture** | Four horizontal layers from the guide's structure: Source records → Books of prime entry → Book of summary → Reports, with the general trust account examples in each (from Sheet A §8.4's source in the guide: receipts, cheque butts, EFT authorisations, deposit slips, ADI statements / receipts cash book, payments cash book, transfer journal / trust ledger accounts / reconciliation, trial balance). Hover on a layer reveals the function text. |
| `dg-trust-accounting-07` | §7.2 | **Money in: from receipt to ledger** | Swimlane flow: Receipt (r 36) → Deposit record (r 37) → Receipts cash book (r 44) within 5 working days → Trust ledger credit (r 47) within 5 working days → Control account monthly → Month end (r 48). Show the timing badges. Companion to the Transaction Walkthrough calculator. |
| `dg-trust-accounting-08` | §7.4 | **Money out: cheque or EFT only** | Flow: Authorised signatory (r 43(2)) → Cheque (crossed "not negotiable", specified payee, practice name and "law practice trust account") or EFT (internal reference, confirmation printed) → Written payment record (r 43(3)) → Payments cash book (r 45) within 5 working days → Trust ledger debit (r 47). Side panel: the prohibited methods (cash, ATM, telephone). |
| `dg-trust-accounting-09` | §7.6 | **Double entry postings** | The posting table from §7.6 as a diagram: five transaction types with Debit/Credit arrows between Control account and Trust ledger account, and the journal as a lateral arrow between two ledgers with "no effect on the control account". |
| `dg-trust-accounting-10` | §8 (top) | **Month end in one page** | Two-branch diagram: Trial balance (r 48(2)(b)) tests internal records against each other; ADI reconciliation (r 48(2)(a)) tests internal records against the bank. Each branch ends with the "failure means" text from §8.1. Deadline badge: 15 working days. Below, the reconciliation format lines from §8.3 as a mini form. |
| `dg-trust-accounting-11` | §9.2 | **Rule 42: the four methods** | Decision flow that mirrors the Method Selector calculator: the five questions in Sheet A §8.8 as diamonds, terminating in Method 1 to 4 panels, each panel carrying the "Requirement" and "Wait" text from the §9.2 table. |
| `dg-trust-accounting-12` | §10.1 | **Controlled money flow** | Flow: Written direction (s 139(1), 7 years) → Establish CMA with an ADI, name per r 61 → Controlled money receipt (r 62) → Movement record and register (r 64) → Monthly listing within 15 working days, principal-reviewed (r 64(9)) → Withdrawals only per direction / r 42 / court order, cheque or EFT only, no BPAY (r 63) → Statement (r 52). Side note: "interest belongs to the client". |
| `dg-trust-accounting-13` | §13.2 | **Statutory deposit: the calculation** | Stepwise diagram: Lowest ADI balance in previous applicable period + statutory deposit that day = Base → 15-banking-day look-forward; if lower, 80% → below $10,000 = nil → round up to next $100 → deposit within 20 banking days. Include the quarter-end dates. Companion to the calculator. |
| `dg-trust-accounting-14` | §14.3 | **Irregularity: what to do** | Five-step vertical flow from §14.3: Stop → Make it good → Report → Take advice → Recover. Side panel: "Report it even if you have already fixed it". Danger-token styling. |
| `dg-trust-accounting-15` | §15.1 | **The annual cycle** | Circular timeline: 1 April trust year begins → 31 March year ends → 30 April Part A (every practice) → 31 May Part B and External Examiner's Report → 30 June trust account statements (given mid to late July) → July signatory notification → quarterly statutory deposit reviews marked. Content from §15.1 and §21. |
| `dg-trust-accounting-16` | §20 | **What examiners actually find** | Horizontal bar chart of the breach counts table in §20 (317, 218, 175 …), rules as labels. Static. Below it, the one-line pattern statement from the guide. |

### 6.2 Practice Management

| Slot ID | Placed after | Title | Type and content |
|---|---|---|---|
| `dg-practice-management-01` | §1.2 | **What a winning firm looks like** | Four-quadrant panel: Appropriate structure for each practice group; Get the people puzzle right; Pricing; Have a point of difference. Sub-bullets from §1.2. Static. |
| `dg-practice-management-02` | §1.3 | **The profit driver equation** | The equation rendered large: Net profit per principal = (1 + L) × BR × CH × R × M, each factor as a labelled tile; hover shows the "What it is" and "Notes" text from the §1.3 table. Companion to the calculator. |
| `dg-practice-management-03` | §1.5 | **Where to intervene** | Two-part: (a) the five drivers as tiles tagged "Market" or "Internal" with the "Usable?" text; (b) the three performance bands as a horizontal scale ($350k / $350k-$700k / $700k+) with the "What it takes" text. |
| `dg-practice-management-04` | §1.6 | **Leverage: the denominator problem** | Illustration of the worked example: five fee earners over two principals = 2.5; promote one → four over three = 1.33. Two simple figures with the arithmetic beneath. Static. |
| `dg-practice-management-05` | §1.7 | **Battery hen versus free range** | Two-column contrast card using the two column texts from §1.7 verbatim, with the one-line rule beneath: "Free range people for as long as you can, then battery hen them." |
| `dg-practice-management-06` | §1.10 | **The money go round** | The cash flow diagram described in §1.10: Bank account at centre; inflows from Owners and Loans; outflows to Equipment, Drawings (→ Tax), Salaries and overheads; the production chain WIP → Fees rendered → Debtors → Bank; with Lock-up markers on WIP and Debtors, Leak marker on chargeable time, Loss markers on Fees rendered, Bad debts and Disbursements. Hover shows the control text from §1.10. |
| `dg-practice-management-07` | §1.11 | **Why firms do not change** | Four panels with the reason and "How it sounds" text. Static. |
| `dg-practice-management-08` | §1.12 | **The nine non-financial predictors** | A scorecard layout of the nine statements with a 1 to 5 tick scale beside each (interactive on screen, persisted via Claude Code's checklist mechanism if feasible; otherwise visual only). |
| `dg-practice-management-09` | §3.2 | **Why most clients must pay more under fixed fees** | A normal-distribution curve of matter prices with three markers: cheapest, average, highest, and the three outcome statements from §3.2 beneath. Annotation: "68% within one standard deviation, 95% within two". |
| `dg-practice-management-10` | §3.1 | **Three routes to $30,000** | Three-column comparison from the §3.1 table (Work harder / Add resources / Raise price) with the day counts and the price change. Companion to the calculator. |
| `dg-practice-management-11` | §7.3 | **The four-step business plan** | A → B → C → D loop: Where you are today; Where you want to be in 12 months; The strategies to get you from A to B; Actions for each strategy. Beside it the KRO cube: Service mix / Client mix / Practice mix. Content from §7.3 and §7.4. |
| `dg-practice-management-12` | §7.5 | **Portfolio matrix** | 2×2: Stars, Question marks, Cash cows, Dogs with the descriptors from §7.5; axes "Attractiveness" and "Growth". Below, the three questions: is there demand, do I have a strength, am I passionate. |
| `dg-practice-management-13` | §7.5 | **Three horizons** | Three ascending curves labelled Horizon 1 (0 to 12 months), Horizon 2 (1 to 5 years), Horizon 3 (long term) with the "Typical content" text from the table. |
| `dg-practice-management-14` | §7.6 | **Twelve ways to build top line growth** | Three columns (Existing clients / New clients / New products) with items 1 to 11, and item 12 "Reduce, stop or divest" set apart, arrows left to right with the note that growth gets harder and more expensive moving right. |
| `dg-practice-management-15` | §8.2 | **The paramount duty** | Centre node "Duty to the court and the administration of justice (ASCR r 3.1)"; four surrounding nodes for the four Cs: Courts, Clients, Colleagues, Communities; the north-point question from §8.3 beneath. |
| `dg-practice-management-16` | §8.5 | **Instructions: the three-box test** | Three gates in sequence, Lawful → Proper → Competent, with the question under each from the §8.5 table, and the rule text "If all three boxes are ticked, the rule says you must follow." |
| `dg-practice-management-17` | §9.6 | **The four pillars of practice growth** | Four vertical pillars with the Question and Outcome rows from the §9.6 table; the marketing-versus-BD distinction beneath. |
| `dg-practice-management-18` | §9.12 | **Client pathways** | Five-stage path: Entice → Enter → Engage → Exit → Extend, with the descriptor for each from §9.12 and the focusing question. |
| `dg-practice-management-19` | §9.15 | **Importance versus urgency** | The 2×2 from §9.15 with the note "BD lives in box 2. Decide when." |

### 6.3 Risk Management

| Slot ID | Placed after | Title | Type and content |
|---|---|---|---|
| `dg-risk-management-01` | §1 | **The four numbers** | Four large figure tiles: 37% / 42% / 23% / >90% with their captions from §1. Static. |
| `dg-risk-management-02` | §2.2 | **The cover** | Stacked bars: $2 million primary; up to $20 million with top up; free unlimited run-off on the primary; free group cyber policy up to $50,000. Note: top-up run-off must be arranged separately. |
| `dg-risk-management-03` | §2.6 | **Zakka v Elias** | Simple decision diagram: Work done in the course of the practice → covered. Work done unsupervised, outside the practice, for a non-client, free of charge → "a frolic of her own" → not covered; personal exposure. Then the three-point practical fix from §2.6. |
| `dg-risk-management-04` | §3.1 | **Claims by area of law** | Horizontal bar or donut of the §3.1 table (Conveyancing 37%, Litigation 25%, General commercial 10%, Family 10%, Wills and estates 10%, Mortgages 5%, Leases 2%, Sale of business 1%). Static. |
| `dg-risk-management-05` | §4.1 | **Causes of claims** | Donut of the §4.1 breakdown (42 / 23 / 16 / 16 / 3) with **click-to-drill** into the sub-cause tables in §4.2 to §4.5. In print, show the top-level donut and the four sub-tables. |
| `dg-risk-management-06` | §5.1 | **File note rules** | Four rule cards from §5.1: no time limit; date it today; never backdate; a note today beats nothing in 2032. Static. |
| `dg-risk-management-07` | §6 | **Clients who bite** | Seven tiles, one per client type, with the "risk" text from the §6 table; click reveals the handling text from §6.1 to §6.6. |
| `dg-risk-management-08` | §6.3 | **Transferred file due diligence** | Vertical checklist flow of the eight steps in §6.3, ending with "If the answer is yes, you are the third firm". |
| `dg-risk-management-09` | §8.6 | **Supervision structure** | Six-part structure from §8.6 (Identify the right person; Explain and assign roles; Develop rapport; Make time; Carry out regular file reviews; Use checklists) with their sub-items. Hover reveals the sub-items; print shows all. |
| `dg-risk-management-10` | §9.2 | **Vision, mission, values, goals** | Four-row structured panel from the §9.2 table with a "Your practice" column left blank for the user's note (link to the notes mechanism). |
| `dg-risk-management-11` | §9.4 | **Horizon gazing** | The eight-row table from §9.4 rendered as a fillable grid (Emerging developments / Challenges / Budget impacts / Opportunities), rows 3 to 5 highlighted in gold as "current live ones". Fillable cells persist via the notes mechanism if Claude Code supports it; otherwise static. |
| `dg-risk-management-12` | §10.3 | **The double excess** | A single strong panel: the clause text from §10.3 and the four verification controls beneath. Danger token border. |
| `dg-risk-management-13` | §10.4 | **Cyber security response plan** | Nine-step vertical flow from the §10.4 table (Risk based assessment → Asset audit → Vulnerability assessment → Expert advice → Risk framework and governance → Accountability → Cyber security policies → Monitoring and review → Cyber incident management → Record keeping). Hover reveals the "Steps" text. |
| `dg-risk-management-14` | §10.1 | **Cyber-assisted fraud claims** | Dual-axis bar chart of the §10.1 table (number and $ incurred by year). Static. |

---

## 7. Print design

- **A4 portrait, 20 mm margins.** Body serif at 10.5 pt, headings sans.
- **Cover page:** title, "Prepared for [firm name]", export date, currency range, `--pattern-corner` ornaments and a single gold rule. This is the only place the pattern appears in print.
- **Running header:** guide title, small sans, muted. **Running footer:** "Page X of Y" right, document title left.
- **Table of contents:** two levels (guide, H2), dot leaders, page numbers right, purple guide titles.
- **Section starts:** each H2 on a new page with the gold divider rule.
- **Diagrams:** static SVG, full width, caption beneath; never split across pages.
- **Calculators:** rendered as a bordered table of inputs and outputs.
- **Notes:** the note style must survive greyscale printing - use the border and label, not colour alone.
- **Tables:** repeat header rows across page breaks.
- Provide a **greyscale check**: the whole document must remain fully legible printed in black and white.

---

## 8. Deliverables and hand-off

```
/design
  theme.css                 overrides for every variable in Claude Code's README, plus component rules
  fonts/                    subset font files and the @font-face declarations (or a note on the base64 approach)
  patterns/                 the three pattern SVGs
  diagrams/                 one SVG per slot ID, named exactly as the slot ID; plus diagram.js if any shared interaction script
  landing.html              static layout reference for the landing page and executive summary panel
  DESIGN_NOTES.md           every label you could not source verbatim (with the wording used and where it came from),
                            every judgement call, and a screenshot set: landing, a guide page, a calculator,
                            the trust walkthrough, search results, edit mode, a note, dark mode, a printed page
```

Hand back to Claude Code for integration and the acceptance tests in Sheet A section 18.

---

## 9. Rules

1. **Verbatim labels only.** If it is not in the guide, do not write it on the diagram.
2. **Subtle.** Purple structures, gold trims. White wins.
3. **Print first.** If it does not work on paper in greyscale, it does not work.
4. **Do not touch the DOM contract.** Variables and classes only.
5. **Flag everything you were unsure about** in `DESIGN_NOTES.md`. Silence is worse than a question.

---

*End of Instruction Sheet B.*
