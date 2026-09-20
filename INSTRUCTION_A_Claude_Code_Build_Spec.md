# INSTRUCTION SHEET A
# Claude Code (Cowork) - Functional Build Specification

## Practice Management Guides - Local Reference Application

Version 1.0 - 12 September 2026

---

## 0. Read this first

You are building a **single-file, self-contained, locally stored HTML application** that presents ten practice management guides for a NSW legal practice, with search, editing, annotation, calculators, checklists and a print-to-PDF path.

**Inputs you will receive:**

| File | Purpose |
|---|---|
| Ten `.md` files (listed at section 2) | The content. **Verbatim. Never alter.** |
| `INSTRUCTION_C_Content_Pack.md` | Executive summaries, glossary, master compliance calendar data, citations index seed. Also verbatim |
| `INSTRUCTION_B_Claude_Design_Brief.md` | For context only at this stage. A designer will later supply a stylesheet and SVG assets against the contract you define at section 16 |

**The build sequence is: you first, design second.** Build everything functional with a clean, neutral stylesheet in which every visual property is a CSS custom property. Leave named slots for diagrams. The designer will override your variables and fill your slots. Do not attempt visual design beyond what is needed to make the application usable and testable.

**Non-negotiable rule.** The markdown content is legal reference material written and verified by a lawyer. **You must not summarise, rephrase, reorder, truncate, "improve", correct or reinterpret any of it.** If something in the content looks wrong, ambiguous or malformed, **leave it exactly as it is and log it in `BUILD_NOTES.md`** for the author's review. The only transformations permitted are those specified in section 4.

---

## 1. Objective

A lawyer will open one HTML file from their local disk in a browser and use it as a living reference for their firm. They will:

- Navigate ten guides and an executive summary landing page
- Search all guides or the current guide
- Add their own notes against any section, and have those notes persist
- Enter an edit mode, amend text, reorder blocks, and have those changes persist
- Use calculators embedded in the guides
- Tick checklists and have progress persist
- Export a new master copy of the file with all notes and edits baked in
- Print the whole thing, or any guide, to a properly paginated A4 PDF with a clickable and page-referenced table of contents

**Deliver a working application first. Aesthetics come from the designer later.**

---

## 2. Inputs and identifiers

### 2.1 The ten guides

| Order | Source file | Guide slug | Display title |
|---|---|---|---|
| 1 | `Practice_Management.md` | `practice-management` | Practice Management |
| 2 | `Trust_Accounting.md` | `trust-accounting` | Trust Accounting |
| 3 | `Anti_Money_Laundering.md` | `anti-money-laundering` | Anti-Money Laundering and Counter-Terrorism Financing |
| 4 | `Risk_Management.md` | `risk-management` | Risk Management |
| 5 | `Cyber_Security.md` | `cyber-security` | Cyber Security and IT |
| 6 | `Stress_Management.md` | `stress-management` | Stress Management and Wellbeing |
| 7 | `Tax_and_Accounting.md` | `tax-and-accounting` | Tax and Accounting |
| 8 | `Attracting_and_Selecting_Talent.md` | `attracting-and-selecting-talent` | Attracting and Selecting Talent |
| 9 | `People_Management_and_Supervision.md` | `people-management-and-supervision` | People Management and Effective Supervision |
| 10 | `Partnership_Management.md` | `partnership-management` | Partnership Management |

Use the guide slug everywhere internally. Use the display title in the UI.

### 2.2 Heading and anchor convention

Guides use numbered headings: `## 9. Taking your costs out - rule 42` and `### 9.2 The four methods`. Some H3 headings are unnumbered (for example `### Abbreviations`, or a numbered action list under a section). Handle both.

**Anchor IDs are deterministic and must never change between builds**, because notes, edits and links depend on them.

| Element | ID pattern | Example |
|---|---|---|
| Guide | `{guide-slug}` | `trust-accounting` |
| H2 with leading number | `{guide-slug}--s{n}` | `trust-accounting--s9` |
| H3 matching `\d+\.\d+` | `{guide-slug}--s{n}-{m}` | `trust-accounting--s9-2` |
| H3 without that pattern | `{guide-slug}--s{parent-n}--{slug-of-text}` | `trust-accounting--s1--abbreviations` |
| H4 and below | parent ID + `--{slug-of-text}` | |
| Content block (paragraph, list, table, blockquote, code) | `{nearest-heading-id}--b{k}` where `k` is the 1-based index of the block within that heading | `trust-accounting--s9-2--b3` |

Slug function: lowercase, strip markdown, replace non-alphanumerics with single hyphens, trim hyphens.

**Content Pack references** use the notation `→ {guide-slug} §{n}` or `§{n}.{m}`. Resolve them to the anchors above.

---

## 3. Architecture

### 3.1 Single self-contained file

- **Output:** `dist/PracticeGuides.html`. One file. All CSS, JS, fonts (subset, base64 or system fallback), content and data inlined. No external requests at runtime. Must work when opened via `file://`.
- **Content model:** parse markdown at build time into a JSON content model (guides → sections → blocks, each with its ID, type and rendered HTML plus a plain-text copy for search). Embed as `<script type="application/json" id="content-model">`.
- **User overlay:** a single JSON object (section 9) held in browser storage and, on export, embedded as `<script type="application/json" id="user-overlay">`. On load, if an embedded overlay exists and storage is empty, seed storage from it.
- **Rendering:** render guides into the DOM from the content model at load. Render the active guide fully; other guides may be rendered lazily on first navigation, but the search index must cover everything from load.

### 3.2 Build tooling

- Node.js. Recommended: `markdown-it` (with `markdown-it-anchor` disabled in favour of the ID scheme above, implemented yourself), a small custom renderer plugin to assign block IDs, `esbuild` or equivalent to bundle and inline.
- **`npm run build`** produces `dist/PracticeGuides.html`.
- **`npm run pdf`** produces `dist/PracticeGuides.pdf` via Playwright (section 15).
- **`npm test`** runs the acceptance tests at section 18.
- Commit a `README.md` explaining how to rebuild after the author edits a markdown file.

### 3.3 Browser support

Current Chrome, Edge, Firefox and Safari. Assume the author uses Chrome for PDF export.

---

## 4. Content ingestion rules

Permitted transformations, and only these:

1. **Markdown → HTML** rendering (headings, paragraphs, emphasis, lists, tables, blockquotes, code, links, horizontal rules).
2. **ID assignment** per section 2.2.
3. **Checklist conversion.** Any list item beginning `- [ ]` or `- [x]` becomes an interactive checkbox bound to persistent state (section 12). The label text is unchanged.
4. **Cross-reference linking.** Wherever the text contains a bolded guide name in the form `**Trust Accounting**` or `**Trust Accounting** guide` (and equivalents for all ten display titles, plus the short forms used in the text such as `**Anti-Money Laundering**` and `**Cyber Security**`), wrap it in a link to that guide. Where the sentence also names a section number (for example "section 8 of the **Risk Management** guide" or "**Risk Management** guide at section 9.1"), link to that section anchor. Do not alter the visible text.
5. **Glossary term marking.** Wrap the **first occurrence in each H2 section** of each glossary term (Content Pack part 2) in a `<abbr>` element with the definition as hover text and a click-through to the glossary entry. Match whole words, case-sensitive for abbreviations. Do not mark terms inside headings, links, code or tables.
6. **External link handling.** All `http(s)` links open in a new tab with `rel="noopener"`. Legislation links (`legislation.nsw.gov.au`, `legislation.gov.au`, `austlii`) get a class `link-legislation` and are harvested for the citations index (section 14).
7. **Currency line extraction.** Each guide begins with a line of the form `Law stated as at 8 September 2026.` or `Stated as at 8 September 2026.` (sometimes with additional text). Extract the date for the currency banner (section 13). Leave the line in place.

Nothing else. In particular: no spelling correction, no smart-quote conversion, no reflowing of tables, no removal of "redundant" text, no merging of sections.

---

## 5. Navigation and structure

### 5.1 Layout

Three regions:

- **Left rail (collapsible):** the ten guides as top-level items, each expandable to its H2 headings, each H2 expandable to H3. Current position highlighted. Sticky.
- **Main content:** the active guide, or the landing page.
- **Right rail (collapsible, optional on narrow screens):** the notes panel for the current section (section 10), the "on this page" mini table of contents, and the reading progress indicator.

Top bar: app title, global search box, edit-mode toggle, export button, print button, dark/light indicator (system-driven), settings.

### 5.2 Landing page

Rendered from Content Pack part 1:

- A one-paragraph intro.
- **Ten cards**, one per guide, each showing the display title, the currency date, a one-line description, reading progress, and a **"Read summary"** action that opens that guide's executive summary panel.
- Each **executive summary** is a list of the guide's main areas; every item is a link to the section anchor. The summary text is supplied in the Content Pack and must be used verbatim.
- Below the cards: links to the **Master Compliance Calendar**, **Citations Index**, **Glossary**, **Change Log** and **Search**.

### 5.3 Guide page

- Guide title, currency banner (section 13), executive summary (collapsible, expanded by default on first visit), then the content.
- Every H2 is a **collapsible section** with expand/collapse controls; a guide-level "expand all / collapse all". Collapsed state persists per section.
- **Previous / next guide** links at the bottom.
- **Back to top** control.
- **Breadcrumb**: Home › Guide › Section.

### 5.4 Deep linking

URL hash carries the current anchor (`#trust-accounting--s9-2`). Opening the file with a hash scrolls to that anchor and expands the relevant section. Browser back/forward works.

---

## 6. Search

- **Index:** built at load from the plain-text copies of every block, plus notes (section 10), plus glossary entries. Use a lightweight client-side index (for example FlexSearch or Lunr, bundled). Tokenise on words; support prefix matching; case-insensitive.
- **Scope toggle:** two states, clearly visible next to the search box: **"All guides"** and **"This guide only"**. Default: All guides. The toggle is remembered.
- **Results:** ranked list showing guide name, section heading, a snippet with the matched terms highlighted, and (if the hit is in a note) a "Your note" badge. Clicking a result navigates to the block, expands its section, and highlights the matched terms in the page until the next navigation.
- **Keyboard:** `/` or `Ctrl+K` focuses search; `Esc` clears; arrow keys and `Enter` move through results.
- **Live search** as the user types after two characters; also an explicit search button.
- Search must also work over **edited text** (section 11): index the current effective text, not the original, and re-index the affected block on save.

---

## 7. Executive summaries

Supplied in Content Pack part 1. Render each verbatim. Each bullet is a link resolved from the `→ guide §n` notation. Provide a **"Summary" tab** on each guide page and a **"Read summary"** action on each landing card. Summaries are also included in print (section 15).

---

## 8. Calculators

Each calculator is a self-contained component rendered at a specified anchor, with a **static print rendering** (section 15) showing the current inputs and outputs. All inputs persist in the user overlay. Every calculator has a **Reset to defaults** control and a small **"Show formula"** disclosure that prints the formula exactly as specified here.

**Arithmetic must be exact. Write unit tests for every formula using the worked examples below.**

### 8.1 Profit Driver Calculator

**Place after:** `practice-management--s1-3` (The profit driver equation).

**Formula:**

```
NPPP = (1 + L) × BR × CH × R × M
```

| Input | Label | Default | Range |
|---|---|---|---|
| `L` | Leverage (employed fee earners per equity principal) | 2.5 | 0 to 10, step 0.1 |
| `BR` | Weighted average billing rate ($/hour) | 350 | 50 to 2000 |
| `CH` | Weighted average chargeable hours per fee earner per year | 1100 | 200 to 2500 |
| `R` | Realisation (%) | 85 | 0 to 100 |
| `M` | Profit margin (%) | 35 | 0 to 100 |

**Outputs:**

- `NPPP` formatted as currency, no decimals.
- **Take-home band:** `NPPP × 0.50` to `NPPP × 0.70`, labelled "Likely spendable range (50% to 70%)".
- **Performance band** label: below $350,000 "Average on all five drivers"; $350,000 to $700,000 "Very good on two drivers, one being leverage or price"; above $700,000 "Very good on two, average on the rest, plus a homogeneous culture". (Text from the guide; do not reword.)

**Test case 1 (established firm):** L=2.5, BR=350, CH=1100, R=85, M=35 → NPPP = 3.5 × 350 × 1100 × 0.85 × 0.35 = **$400,881** (the guide says "roughly $401,000"; display the exact figure and the guide's rounding is fine).

**Test case 2 (part-time sole practice):** L=0, BR=500, CH=726, R=90, M=70 → 1 × 500 × 726 × 0.90 × 0.70 = **$228,690** (guide: "roughly $229,000").

**Scenario table:** allow the user to save up to five named scenarios side by side.

### 8.2 Cost of Production Calculator

**Place after:** `practice-management--s4-4` (Understanding cost of production).

**Formula:**

```
AnnualCost = Salary × (1 + OnCosts/100) + OverheadAllocation
CostPerChargeableHour = AnnualCost / ChargeableHours
FeeAtTargetMargin = CostPerChargeableHour / (1 - TargetMargin/100)
```

| Input | Default |
|---|---|
| Salary | 120,000 |
| On-costs (%) - super, leave, insurance | 25 |
| Overhead allocation per fee earner ($) | 60,000 |
| Chargeable hours per year | 1100 |
| Target margin (%) | 35 |

**Outputs:** cost per chargeable hour; fee per hour required at target margin; and the message "To operate with a profit motive you cannot do work for less than cost of production" (from the guide).

**Test:** 120,000 × 1.25 + 60,000 = 210,000; / 1100 = **$190.91/hr**; / 0.65 = **$293.71/hr**.

### 8.3 Fixed Fee: Three Routes to Extra Profit

**Place after:** `practice-management--s3-1` (The profit argument).

Reproduces the worked comparison in the guide.

| Input | Default |
|---|---|
| Extra profit wanted (`P`) | 30,000 |
| Current hourly rate (`BR`) | 350 |
| Billed hours per year (`H`) | 1000 |
| Chargeable proportion of worked time (`c`, %) | 60 |
| Margin on additional revenue (`m`, %) | 30 |
| Hours per working day | 8 |

**Formulas:**

```
Route 1 (work harder):
  ExtraBilledHours  = P / BR
  ExtraWorkedHours  = ExtraBilledHours / (c/100)
  ExtraDays         = ExtraWorkedHours / HoursPerDay

Route 2 (add resources):
  ExtraRevenue      = P / (m/100)
  ExtraBilledHours  = ExtraRevenue / BR
  ExtraWorkedHours  = ExtraBilledHours / (c/100)
  ExtraDays         = ExtraWorkedHours / HoursPerDay

Route 3 (raise price):
  NewRate           = BR + P / H
  PercentIncrease   = (NewRate / BR - 1) × 100
```

**Test with defaults:** Route 1: 85.7 billed hrs → 142.9 worked hrs → **17.9 days**. Route 2: $100,000 → 285.7 billed → 476.2 worked → **59.5 days**. Route 3: **$380/hr, 8.6%**. (Guide: 85 hours / 142 hours / 18 days; 476 hours / 60 days; $380 / 8.5%.)

### 8.4 WIP and Debtor Days

**Place after:** `practice-management--s2-5` (Improving profit and cash flow).

```
WIPDays     = WIP / (AnnualFees / 365)
DebtorDays  = Debtors / (AnnualFees / 365)
```

Inputs: WIP balance, debtors balance, annual fees. Flags: WIP days above 40 → warning "The guide recommends WIP below 40 days of production equivalent". Debtor days above 90 → warning "90-plus is unacceptable unless there is a business rationale".

### 8.5 Partner Dilution Model

**Place after:** `partnership-management--s4` (The dilution problem).

```
Before:  PPP_before = Profit / Owners
After:   PPP_after  = (Profit + AssociateSalaryAddedBack) / (Owners + NewOwners)
Change   = PPP_after - PPP_before
```

Inputs: Profit (500,000), Owners (2), Associate salary added back (100,000), New owners (1).
**Test:** 250,000 → 200,000, change **-50,000**.

### 8.6 Lockstep Points Calculator

**Place after:** `partnership-management--s5-3` (The growth mechanism).

Inputs: Firm profit; a table of partners with name and points (default: Partner A 100, Partner B 100, New partner 50); next-year points for each.

```
TotalPoints      = Σ points
ValuePerPoint    = Profit / TotalPoints
Distribution_i   = points_i × ValuePerPoint
NextTotalPoints  = Σ nextYearPoints
ProfitNeeded     = NextTotalPoints × ValuePerPoint
GrowthRequired   = ProfitNeeded - Profit
```

**Test:** 500,000 / 250 = $2,000/pt; new partner $100,000, incumbents $200,000 each; next year 260 pts → profit needed $520,000, growth **$20,000**.

### 8.7 Statutory Deposit Calculator

**Place after:** `trust-accounting--s13-4` (Practical mechanics).

**Carry this warning verbatim at the top of the component:** "This calculator reflects the methodology described in the guide. The Application Regulation was remade on 1 September 2025 (ss 10 to 15). Verify against the Law Society of NSW Statutory Deposit Calculator before acting. Banking-day deadlines shown here count weekdays only and do not allow for public holidays."

Inputs:

| Input | Notes |
|---|---|
| Applicable period end date | Must be 31 Mar, 30 Jun, 30 Sep or 31 Dec |
| Lowest ADI statement balance during the **previous** applicable period (`LowPrev`) | |
| Statutory deposit held on that same day (`SDPrev`) | |
| Lowest ADI statement balance from period end to the 15th banking day after (`LowFwd`) | Optional |
| Statutory deposit held on that day (`SDFwd`) | Optional |
| Statutory deposit currently held (`SDNow`) | |

```
Base          = LowPrev + SDPrev
Fwd           = LowFwd + SDFwd                    (if provided)
Candidate     = Base
if Fwd provided and Fwd < Base:  Candidate = 0.80 × Fwd
if Candidate < 10000:            Required = 0
else:                            Required = ceil(Candidate / 100) × 100
Action        = Required - SDNow   (positive: deposit; negative: may withdraw; zero: no action)
Deadline      = 20 banking days (weekdays) after period end date
```

**Test (from the guide's worked example):** LowPrev 23,600; SDPrev 50,000 → Base 73,600. LowFwd 7,600; SDFwd 50,000 → Fwd 57,600 < 73,600 → Candidate 46,080 → Required **$46,100**. SDNow 50,000 → Action **nil** (may withdraw $3,900; display "No deposit required; $3,900 may be withdrawn").

Also show a "Scenario" selector reflecting the guide's three scenarios (new account / continuing with no deposit / continuing with deposit) that hides irrelevant inputs.

### 8.8 Rule 42 Method Selector

**Place after:** `trust-accounting--s9-2` (The four methods).

A short decision flow, not arithmetic:

1. Is the money in a general trust account or controlled money account? (No → "Rule 42 does not apply. Power money and investment of trust money: costs only under the power or the person's instructions.")
2. Is the client a commercial or government client with a compliant costs agreement authorising withdrawal? (Yes → **Method 4**.)
3. Is this reimbursement of a disbursement the practice has **already paid** (office account debited)? (Yes → **Method 3**.)
4. Do you hold instructions authorising this specific withdrawal? (Yes → **Method 2**.)
5. Otherwise → **Method 1**.

For the resolved method display, verbatim from the guide's section 9.2 table: what must be sent first and the waiting period. Add a date input: for Method 1 compute "earliest withdrawal date" as bill date + 7 business days (weekdays), with a note that an objection resets the analysis.

### 8.9 Trust Money Classifier

**Place after:** `trust-accounting--s4-7` (Decision sequence for each receipt).

Walks the ten-step sequence in that section as yes/no questions, using the guide's wording. Output: the category, the governing provision links, and the row from the section 22.1 records matrix for that category. **Cash rule:** if the user indicates cash, insert the s 143 step and show the GTA-first instruction.

### 8.10 Trust Transaction Walkthrough

**Place after:** `trust-accounting--s7-8` (Trust transfer journal), as a full-width panel titled **"Trust Transaction Walkthrough - what gets recorded, where, and for how much"**. This is the most important calculator. Build it carefully.

**Purpose.** The user enters a receipt of money and optional subsequent events, and the component shows every record that must be created, with populated fields and amounts, and a running ledger.

**Step 1 - the receipt.** Inputs: amount; date received; form (cash / cheque / direct deposit / credit card); received from; client name; matter reference; matter description; reason for receipt. Then the category, either chosen directly or resolved via the Classifier (8.9). Categories: General trust money; Controlled money; Transit money; Written direction money; Power money; Money for services already billed (not trust money).

**Cash override:** if form = cash and category is Transit, Written direction or Power → display the s 143 rule and treat the initial deposit as a GTA receipt, then show the onward dealing as a subsequent payment. If form = cash and category = Controlled → deposit goes to the CMA.

**Credit card override:** display the guide's warning that the whole amount must be credited to the trust account with fees debited to office, and that a credit card payment to the office account followed by a transfer is a breach of s 146.

**Cash of $10,000 or more:** display "Threshold transaction report to AUSTRAC within 10 business days" with a link to `anti-money-laundering--s16`.

**Output for General trust money** (render as a stack of "record cards", each labelled with its rule):

1. **Trust receipt (r 36)** - all eight particulars populated from inputs; receipt number auto-incremented within the session; note "made out as soon as practicable; original to payer on request". If date received differs from date made out, show both.
2. **Deposit record (r 37)** - shown only if form ≠ direct deposit; for cheque, show drawer, bank/BSB fields; note "in duplicate; not butt-style".
3. **Receipts cash book line (r 44)** - columns per the guide's suggested format; amount deposited column; note "within 5 working days".
4. **Trust ledger account (r 47)** - heading (name, address placeholder, matter ref, matter description) and a **Credit** entry of the amount with running balance; note "within 5 working days; balance after each transaction".
5. **Control account** - Dr the monthly total (show this receipt's contribution).
6. **Month end (r 48)** - trial balance line for this ledger; reconciliation note: "If deposit not yet on the ADI statement at month end: outstanding deposit of $X".
7. **Trust account statement (r 52)** - the line that will appear; note when statements are due (completion / request / 30 June).
8. **Timing summary** - receipt ASAP; deposit ASAP; cash book 5 wd; ledger 5 wd; reconciliation and trial balance 15 wd after month end.

**Output for Controlled money:** controlled money receipt (r 62, ten particulars); CMA account name check with the r 61 naming requirement and a "compliant / not compliant" test on a user-entered account name (must contain practice name and one of "controlled money account", "CMA", "CMA/c"); controlled money movement record entry; register note; monthly listing line; statement note. No cash book, no ledger, no trial balance. Interest note: "interest belongs to the client".

**Output for Transit money:** the s 140(2) brief-particulars record (with the fields the guide lists: copy of cheque, settlement direction); "no receipt, no cash book, no ledger, no statement"; 7-year retention; "pay or deliver within the period specified, else as soon as practicable".

**Output for Written direction money:** direction retained 7 years after finalisation; copy of cheque; "no receipt, no cash book, no ledger, no statement"; reminder that a direction to pay into the office account is not permissible (s 146).

**Output for Power money:** record of dealings (r 55) entry; Register of Powers and Estates (r 60) entry with donor name/address/date fields; statement required; "costs cannot be taken under rule 42".

**Output for Money already billed:** "Not trust money (s 129(2)(a)). Office receipt only. No s 134 notice required. Do not deposit to trust."

**Step 2 - subsequent events** (General trust money and Controlled money only). The user may add any number, in order:

| Event | Inputs | Records generated |
|---|---|---|
| **Bill issued and costs drawn** | Bill date; amount; rule 42 method (from 8.8) | Waiting period computed; **Payments cash book line (r 45)**; **Trust ledger Debit** with new balance; control account Cr; **written payment record (r 43)** particulars for a cheque or EFT to the office account; reminder "once billed for services provided, this is no longer trust money; withdraw promptly (s 146)" |
| **Disbursement paid from trust** | Payee; amount; cheque or EFT; reason | Payment record (r 43) particulars; payments cash book line; ledger Debit; if payee is an ADI, payee shown as "[ADI] B/C [beneficiary]" |
| **Reimbursement of disbursement (Method 3)** | Amount; date office account was debited | Blocked with the guide's rule if the office debit date is blank or later than the withdrawal date; otherwise payment records as above |
| **Transfer to another matter** | Destination client/matter; amount; reason; authorising person | **Trust transfer journal (r 46)** entry with from/to particulars, consecutive journal number; ledger Debit on source, Credit on destination; note "no effect on the control account"; note "must be authorised in writing" |
| **Refund to client** | Amount; account details | Payment records; ledger Debit to nil; **trust account statement on completion (r 52(4)(a))** |
| **Receipt reversal (dishonoured cheque)** | | Receipts cash book **negative** line; ledger **Debit**; if funds already drawn against: display **deficiency** warning, "deposit office funds to the GTA immediately; issue a receipt; notify under s 154" |
| **Interest credited by ADI in error** | Amount | Show as reconciliation adjusting item; "do not record in cash book or ledger; ask the ADI to reverse" |

**Guard rails:** any event that would take the ledger balance below zero must be **blocked** with a red panel: "This would overdraw the client's trust ledger. A debit balance is a breach even by $1 (s 148) and an irregularity requiring notification (s 154)." Do not allow the event to be added.

**Running views:** a **ledger card** (all entries, running balance) and a **cash book** (receipts and payments lines) that accumulate across events, plus a **journal** list. A "Clear walkthrough" control.

**Verbatim-only labels.** Every rule reference, particular name and warning must be text that appears in the Trust Accounting guide. If you need a label that does not exist there, use the closest guide wording and log it in `BUILD_NOTES.md`.

### 8.11 Supervision Level Selector

**Place after:** `people-management-and-supervision--s4-2`. Inputs: ability (low/high), confidence (low/high). Output: M1 to M4 row from the guide's table, plus the meeting cadence row from section 4.4. Static logic, no arithmetic.

### 8.12 PII Excess Exposure

**Place after:** `risk-management--s10-3` (The double excess). Input: your excess amount. Output: standard excess; excess for a claim arising from an unverified payment instruction = 2 × excess; the clause text from the guide.

### 8.13 Return Per Salary Dollar reference

**Place after:** `practice-management--s2-2`. Not a calculator; render the guide's table as a small chart (bar) using the static values. Print as a table.

---

## 9. Persistence and the user overlay

### 9.1 The overlay object

One JSON document. Shape:

```json
{
  "version": 1,
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "notes":      { "<anchorId>": [ { "id": "uuid", "text": "...", "createdAt": "ISO", "updatedAt": "ISO" } ] },
  "edits":      { "<blockId>":  { "html": "...", "text": "...", "editedAt": "ISO" } },
  "order":      { "<sectionId>": [ "<blockId>", "..." ] },
  "moved":      { "<blockId>":  { "from": "<sectionId>", "to": "<sectionId>", "movedAt": "ISO" } },
  "checklists": { "<checkboxId>": true },
  "calculators":{ "<calculatorId>": { "...inputs" } },
  "collapsed":  { "<sectionId>": true },
  "reading":    { "<guideSlug>": { "lastAnchor": "...", "progress": 0.42, "lastRead": "ISO" } },
  "changeLog":  { "<guideSlug>": [ { "date": "ISO", "text": "..." } ] },
  "settings":   { "searchScope": "all", "printIncludeNotes": true }
}
```

### 9.2 Storage

- Primary: `localStorage` key `pmguides:overlay`. If serialised size exceeds 4 MB, fall back to IndexedDB (same object). Detect and migrate automatically.
- **Save on every change**, debounced 500 ms. Show a small "Saved" indicator.
- On load: if storage has an overlay, use it. Else if the file has an embedded overlay, seed storage from it. Else start empty.
- Provide **Export overlay (JSON)** and **Import overlay (JSON)** in settings, in addition to the full-file export below.

### 9.3 Export a new master file

Top-bar **Export** button:

1. Serialise the current overlay.
2. Take the original HTML of the running application (keep a pristine copy of the document source in a `<template>` at build time), replace the embedded overlay block with the current overlay, and update a `data-exported-at` attribute on `<html>`.
3. Trigger a download named `PracticeGuides-YYYY-MM-DD.html`.
4. Show the instruction: "Replace your saved file with this one to lock in your notes and edits."

The exported file must be fully functional and must itself be exportable again.

### 9.4 Reset

Settings → "Reset all notes and edits" with a typed confirmation. Also per-block "Revert to original" (section 11) and per-note delete.

---

## 10. Notes

- **Per section:** every H2 and H3 has a notes area, reachable from a "Notes" icon beside the heading and from the right rail when that section is in view. Multiple notes per section, each timestamped, editable, deletable.
- **Per guide:** a guide-level notes area at the top of each guide.
- **Editor:** a plain textarea supporting a minimal markdown subset (paragraphs, bold, italics, bullet lists, links). Render on blur. No HTML input.
- **Display:** rendered inline immediately after the section heading's content, in a visually distinct "Your note" block with the date. Also listed in the right rail.
- **Search:** notes are indexed (section 6) and results carry a "Your note" badge.
- **Print:** included when `settings.printIncludeNotes` is true, styled distinctly.
- **Count badge** on the left rail showing how many notes each guide has.

---

## 11. Edit mode

### 11.1 Entering and leaving

Top-bar toggle **Edit**. When on: a persistent banner "Edit mode - changes save automatically; use Export to create a new master file"; block outlines appear on hover; drag handles appear.

### 11.2 Editing text

- Each **content block** (paragraph, list, table, blockquote) becomes `contenteditable` on click.
- Allowed formatting: bold, italic, links, list items, table cell text. Provide a minimal floating toolbar. Strip any pasted HTML down to that whitelist.
- On blur, save the block's HTML and plain text to `overlay.edits[blockId]` and re-index for search.
- Edited blocks show a subtle **"edited"** marker with the date and a **"Revert to original"** control (restores from the content model and deletes the overlay entry).
- **Headings are not editable** (they anchor everything). Log this constraint in the README.
- **Calculators and diagrams are not editable** in this mode.

### 11.3 Repositioning

- Blocks can be **dragged to reorder within their section**. Persist the resulting order in `overlay.order[sectionId]`.
- Blocks can be **moved to another section** via a "Move to…" control listing sections in the same guide. Persist in `overlay.moved[blockId]` and update both sections' `order`. The block keeps its original ID.
- Sections (H2/H3) can be **reordered within a guide** via drag in the left rail while in edit mode. Persist as `overlay.order[guideSlug]`.
- Provide **"Restore original order"** per section and per guide.

### 11.4 Change log

An automatically maintained **Change Log page** listing, per guide, every edited or moved block with date, the section, and a "before / after" text comparison (simple word-level diff). Also the user's manual change log entries (section 13). Included in print as an appendix if notes are included.

---

## 12. Checklists

- Every `- [ ]` item becomes a checkbox. Checkbox ID = block ID + `-i{index}`.
- State persists. Each list shows a **progress bar** ("6 of 14 complete") and a "Reset this list" control.
- Print renders the boxes with their current state (☑ / ☐).

---

## 13. Currency banner and change log

- Each guide page shows a banner: "Law stated as at {date extracted per 4.7}". If the guide has a section titled "Three things that changed…" or similar currency material, link to it from the banner.
- Beneath the banner, a **"Change log"** disclosure where the user can add dated free-text entries ("Updated s 13 after Law Society circular of …"). Persist in `overlay.changeLog[guideSlug]`.
- The landing page shows, for each guide, the currency date and the date of the most recent change-log entry.

---

## 14. Glossary, master calendar, citations index

### 14.1 Glossary

- Data: Content Pack part 2. Render a **Glossary page** (alphabetical, with the guides in which each term appears).
- In-text marking per rule 4.5. Hover shows the definition; click goes to the glossary entry; a back link returns.

### 14.2 Master Compliance Calendar

- Data: Content Pack part 3. Each row has an obligation, a recurrence rule, the guide and section, a category, and a provision link.
- Render as (a) a **table** sortable by date/category/guide and (b) a **timeline** of the next 12 months from today's system date, expanding recurrence rules (annual fixed dates; quarterly dates; "within N days of X" shown as a rule rather than a date).
- **"Next 30 days"** panel on the landing page.
- Filter by guide and by category. Each row links to the section.
- Allow the user to **add their own dated items** (persisted) - for example their own AML independent evaluation date once known.

### 14.3 Citations Index

- Harvest every link whose host is `legislation.nsw.gov.au`, `legislation.gov.au` or contains `austlii`. Parse the instrument ID and any `#sec.N` anchor.
- Map instrument IDs to names using Content Pack part 4. Unknown IDs: display the raw ID and log to `BUILD_NOTES.md`.
- Render a **Citations Index page**: grouped by instrument, then by section number ascending (natural sort: 6, 34, 35, 91E, 95A). For each provision: the outbound link, and the list of guide sections that cite it, each linked.
- Also render a reverse view: by guide, the provisions that guide cites.

---

## 15. Print and PDF

### 15.1 Print stylesheet

- `@media print`: hide navigation rails, top bar, search, toolbars, edit controls, drag handles, "Reset" buttons.
- **Expand all collapsed sections** for print regardless of screen state (use a print-mode flag applied before printing).
- **A4 portrait**, 20 mm margins. Use `@page` with running header (guide display title) and footer (page number "Page X of Y") using paged-media counters. Where the browser does not support named-string headers, fall back to a repeated small header line at each H2.
- Page-break rules: H2 starts a new page; avoid breaks inside tables, blockquotes, record cards and calculator panels; keep headings with the next block.
- **Calculators:** render a static table of the current inputs and outputs and the formula. No controls.
- **Diagrams:** render the designer's static SVG (section 16); before design assets exist, render the placeholder list.
- **Notes:** included if the setting is on, styled distinctly and labelled "Your note".
- **Checklists:** rendered with state.
- **Links:** external links show the URL in a smaller line after the link text (`a[href^="http"]::after`).
- Provide **"Print this guide"** and **"Print everything"** actions.

### 15.2 Table of contents for PDF

Printing the whole document must produce, after a cover page and the landing summary, a **Table of Contents** with page numbers for every guide and H2, and clickable entries. Two mechanisms; implement both:

1. **In-browser print:** use CSS `target-counter(attr(href url), page)` for page numbers where supported (Chrome supports it in print). Entries are links, so the PDF is clickable.
2. **`npm run pdf` (Playwright, headless Chromium):** open `dist/PracticeGuides.html` with `?print=all`, wait for render, call `page.pdf()` with `displayHeaderFooter`, `format: 'A4'`, margins as above, and `outline: true` where the Playwright version supports it so the PDF has a bookmark tree. Verify that the TOC page numbers match by extracting text from the generated PDF and checking three sampled headings against their reported pages. Log the result.

### 15.3 Cover and colophon

- **Cover page:** title, "Prepared for [firm name placeholder]", export date, "Law stated as at" summary (the earliest and latest currency dates across guides).
- **Colophon (last page):** the Sources section is already in each guide; the colophon states that the guides were prepared from the FMRC practice management course materials, session transcripts, the Law Society of NSW's publications, and the NSW legislation register, with a currency statement. Use the text supplied in Content Pack part 5.

---

## 16. CSS variable contract and diagram slots

### 16.1 Variables

Define every visual property as a custom property on `:root`, and give every component a stable class name. The designer will override the variables and may add rules against the class names, but **will not restructure the DOM**. Minimum set:

```
--color-bg, --color-surface, --color-surface-alt, --color-text, --color-text-muted,
--color-primary, --color-primary-soft, --color-accent, --color-accent-soft,
--color-border, --color-link, --color-link-visited, --color-focus,
--color-note-bg, --color-note-border, --color-edit-bg, --color-edit-border,
--color-warning-bg, --color-warning-border, --color-danger-bg, --color-danger-border,
--color-success,
--font-body, --font-heading, --font-mono,
--fs-base, --fs-sm, --fs-lg, --fs-h1, --fs-h2, --fs-h3, --fs-h4, --lh-body, --measure,
--space-1 … --space-8, --radius-sm, --radius-md, --radius-lg,
--shadow-sm, --shadow-md,
--pattern-header, --pattern-divider, --pattern-corner   (each a CSS image or "none")
--rail-width, --toolbar-height
```

Provide both light and dark value sets (`prefers-color-scheme: dark`), with dark values chosen for readability only; the designer will refine.

### 16.2 Component classes

`.app-shell`, `.rail-left`, `.rail-right`, `.topbar`, `.landing`, `.guide-card`, `.exec-summary`, `.guide`, `.section` (with `.is-collapsed`), `.block`, `.block.is-edited`, `.note`, `.note-editor`, `.callout` with modifiers `.callout--statute`, `.callout--practice`, `.callout--warning`, `.callout--currency`, `.table-wrap`, `.checklist`, `.checklist-progress`, `.calculator`, `.calculator-output`, `.record-card`, `.ledger-view`, `.search`, `.search-results`, `.glossary`, `.abbr`, `.calendar-table`, `.calendar-timeline`, `.citations`, `.changelog`, `.diagram-slot`, `.print-only`, `.screen-only`.

Callout detection: the markdown uses blockquotes for judicial quotations and bold lead-ins for practice notes. Do **not** invent callout classes by guessing at content; render blockquotes as `.callout--statute` only where the blockquote contains a `legislation.nsw.gov.au` link or a case citation pattern, otherwise as a plain blockquote. Log the rule you implement.

### 16.3 Diagram slots

Insert an empty `<figure class="diagram-slot" id="{slot-id}" data-title="…">` at each location listed in **Instruction Sheet B, section 6** (the designer's diagram specifications). Until assets arrive, render inside the slot a plain bulleted list of the diagram's nodes as given in Sheet B, so the site is complete and printable without design assets. When assets arrive, the designer's SVG is inserted as the figure content; the `<figcaption>` carries the title; the static print version is the same SVG.

Slot IDs follow the pattern `dg-{guide-slug}-{nn}` and are enumerated in Sheet B.

---

## 17. Accessibility, keyboard and performance

- Semantic landmarks; skip link; visible focus; ARIA labels on toggles and the search; `aria-expanded` on collapsibles; `role="status"` for the "Saved" indicator.
- Colour contrast AA against the neutral palette; the designer must preserve it.
- Keyboard: all controls reachable; `Ctrl+K` search; `Ctrl+E` toggles edit mode; `Esc` exits editing of a block.
- Performance: initial render under 1.5 s on a mid-range laptop; search results under 100 ms for typical queries. Lazy-render inactive guides if needed, but the search index and the print path must cover all content.
- No telemetry, no network calls.

---

## 18. Acceptance tests

Automate what you can (Playwright); document the rest as a manual checklist in `TESTS.md`. All must pass before hand-off.

**Content fidelity**
1. For each guide, the concatenated plain text of all rendered blocks equals the plain text of the source markdown after markdown stripping, ignoring whitespace differences. Any diff fails the build.
2. Every H2 and numbered H3 in every source file has an anchor matching section 2.2.
3. Every `→ guide §n` reference in the Content Pack resolves to an existing anchor.

**Navigation**
4. Opening the file with `#trust-accounting--s9-2` scrolls to that heading, expanded.
5. Prev/next guide links traverse all ten in order.

**Search**
6. Searching "rule 42" in All guides returns hits in Trust Accounting and Tax and Accounting; "This guide only" from Cyber Security returns none.
7. After editing a block to add the word "zebrafish", searching returns that block.

**Notes and edits**
8. Add a note, reload: note persists. Export, open the exported file in a fresh profile: note present.
9. Edit a block, reload: edit persists; "Revert to original" restores exact original HTML.
10. Reorder two blocks; reload; order persists; "Restore original order" works.
11. Overlay above 4 MB triggers IndexedDB fallback without data loss.

**Calculators**
12. All test cases in section 8 produce the stated outputs.
13. Trust Transaction Walkthrough: a $5,000 GTA receipt, then a $6,000 bill is **blocked** with the overdraw warning. A $5,000 receipt, then $3,000 bill (Method 1, bill date today) shows earliest withdrawal date = today + 7 weekdays and ledger balance $2,000.

**Checklists**
14. Tick three items in the Trust Accounting section 21 list; reload; progress bar reads correctly.

**Calendar and index**
15. Master calendar "next 30 days" includes 30 June items when today is in June.
16. Citations index lists `act-2014-16a` section 34 with at least Trust Accounting §3.1 and People Management §11 as citing sections.

**Print**
17. `npm run pdf` produces a PDF; the TOC page numbers for three sampled H2 headings match the pages on which they appear.
18. In the PDF, all sections are expanded, no controls are visible, and each calculator shows a static input/output table.

---

## 19. Deliverables

```
/src           source (parser, renderer, components, styles, tests)
/content       the ten .md files and INSTRUCTION_C_Content_Pack.md (read-only copies)
/dist          PracticeGuides.html, PracticeGuides.pdf
README.md      how to rebuild after editing a markdown file; how to apply design assets
TESTS.md       manual test checklist and automated test results
BUILD_NOTES.md every content anomaly encountered, every judgement call, every unresolved reference
```

**Hand-off to the designer:** `README.md` must include the full list of CSS variables with their current values, the component class list, and the diagram slot list with slot IDs and the section each sits in, so the designer can work without reading the source.

---

*End of Instruction Sheet A.*
