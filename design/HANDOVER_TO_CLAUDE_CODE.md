# HANDOVER_TO_CLAUDE_CODE.md

Claude Design → Claude Code. 13 September 2026. Practice Management Guides, Ivan Law.

Read with `design/DESIGN_NOTES.md` (the author's answers are in section G) and `README.md`.

---

## 1. What to integrate

```
design/theme.css                   load AFTER src/styles/app.css; overrides variables, adds rules
design/patterns/*.svg              reference copies; the same three patterns are already inlined
                                   as data URIs in theme.css, so nothing needs to be fetched
design/diagrams/dg-*.svg           49 files, named exactly as the slot IDs
```

No DOM was restructured and no class was renamed. Everything below is CSS, an asset drop, or app
work explicitly flagged as such.

---

## 2. Do these in order

### 2.1 Stylesheet

Concatenate `theme.css` after `app.css` into the single `<style id="app-css">` block (or add a
second style block — the cascade is what matters, not the packaging). It must load after, because it
overrides `:root`.

**Note two additions to the variable list in README:** `--color-primary-hover` and
`--color-row-hover`, both defined in `theme.css` for light and dark. If you would rather not grow
the contract, inline their values; nothing else depends on them.

**Expect the reflow.** `--fs-base` goes 16px → 17px and `--measure` 72ch → 70ch per Sheet B §3.
Every page count and every TOC page number changes. This is intended.

### 2.2 Fonts — the one thing I could not do

`theme.css` opens with a commented `@font-face` block for two families:

- `Source Serif 4 Subset` — body, weights 400–700
- `Source Sans 3 Subset` — headings, UI, tables, calculators, and all 49 diagrams

I cannot produce woff2 binaries. **Subset both families and paste base64 data URIs into those two
rules**, then uncomment the block. The file must still make no network requests.

Subset to Latin plus the characters the guides actually use: `§ › ‹ ▾ ▸ ✎ ✓ × — – ‚ " " ' ' $ %`.
Until this is done the design falls back to Georgia and the system sans and holds together; this
supersedes BUILD_NOTES item 26.

### 2.3 Diagram assets

Replace each slot's `<div class="diagram-placeholder">` with the file's `<svg>`, keeping the
`<figcaption>`. Cleanest route is at build time from `src/app/diagrams.js`.

**Inline the SVG — do not use `<img src>`.** Each file sets
`font-family:'Source Sans 3',system-ui,sans-serif` on the root `<svg>`; inlined it inherits the
embedded font, referenced as an image it cannot and falls back to the system sans.

Each file carries `role="img"`, no `width`/`height`, and
`style="display:block;width:100%;height:auto"`, so it fills the content column and scales. The
`figcaption` text to use for each slot is the title already in the README slot table.

**One collision to watch:** several files define a `<marker id="a">` or `id="ag"` for their
arrowheads. Inlining more than one diagram into the same document makes those IDs non-unique.
Prefix them per slot at build time (`a` → `dg-trust-accounting-03-a`, and the matching
`marker-end="url(#…)"`), or wrap each diagram in its own shadow root. **This is the only thing in
the set that will actually break if ignored.**

### 2.4 Executive summary — slide-over (author's answer to G.2)

Already done in CSS: section 11a of `theme.css` turns `.guide-card > .guide-card-summary:not([hidden])`
into a fixed right-hand panel with its own backdrop, drawn by the panel's `::before` so no extra
element is needed. The app keeps rendering it as a child of the card and keeps toggling `[hidden]`.
Print is neutralised back to static flow.

Two optional app-side niceties, both small, neither required for the visual to be correct:

1. `Esc` closes the open panel (the app already binds `Esc` for search and block editing).
2. While a panel is open, move focus into it and return focus to the triggering
   `.read-summary-btn` on close.

### 2.5 Fillable diagram cells (author's answer to G.4 — yes)

`dg-risk-management-10` and `dg-risk-management-11` have been regenerated so every fillable cell is
addressable:

| Diagram | Cell IDs | Count |
|---|---|---|
| `dg-risk-management-10` | `dg-risk-management-10-cell-{vision\|mission\|values\|goals}` | 4 |
| `dg-risk-management-11` | `dg-risk-management-11-cell-{row}-{challenges\|budget-impacts\|opportunities}` where row is `legal-practice-overall`, `practice-areas`, `technology-ai`, `cyber-crime`, `regulatory-reforms`, `recruitment`, `education-training`, `other` | 24 |

Every cell also carries `data-fill-cell="{key}"` and a human-readable `data-fill-label`, so you can
enumerate them without hard-coding the list.

Suggested wiring, matching the `data-box` approach already used for DEV-004 score boxes: treat each
cell as an overlay-backed input keyed `{slotId}:{data-fill-cell}`, render the saved value as a
`<text>` inside the cell (or a `<foreignObject>` if you want wrapping), and use `data-fill-label` for
the accessible name. The dashed note-coloured border is already the affordance.

### 2.6 Diagram interactions (author's answer to G.3 — yes)

Build the shared `design/diagrams/diagram.js`, self-contained, no dependencies, progressive: **the
diagrams must remain fully legible and complete with the script absent or failed**, because that is
also the print form. Nothing is currently hidden behind a hover.

What Sheet B §6 asks for, per slot:

| Slot | Interaction | What it needs from the SVG |
|---|---|---|
| `dg-trust-accounting-01` | hover a layer reveals its "Trust content" text | the text is already on the face; hover can emphasise instead |
| `dg-trust-accounting-03` | click a node → navigate to the provision / the §22.1 records row | needs `data-anchor` on the nine step groups and the terminals |
| `dg-trust-accounting-04` | tabs on screen, full grid in print | needs the six column groups wrapped and labelled |
| `dg-trust-accounting-06` | hover a layer reveals the function text | as -01 |
| `dg-trust-accounting-09`, `-13` | hover reveals detail | as -01 |
| `dg-practice-management-02` | hover a factor tile shows its "What it is" / "Notes" text | both already visible; hover can emphasise |
| `dg-practice-management-06` | hover shows the control text from §1.10 | the controls line is already on the face |
| `dg-risk-management-05` | click a donut segment drills into its sub-cause table | needs `data-sub` linking segment → panel |
| `dg-risk-management-07` | click a tile reveals the handling text from §6.1–6.6 | handling text already on the face |
| `dg-risk-management-09`, `-13` | hover reveals sub-items | already on the face |

**I have not added those `data-anchor` / `data-sub` hooks yet** — they depend on how you want
`diagram.js` to find its targets. Tell me the attribute names you want and I will add them across
the set in one pass; that is the "throw back to Claude Design" the author anticipated.

### 2.7 `dg-trust-accounting-06` layer names (author's answer to G.1)

The four layer names — **Source records / Books of prime entry / Book of summary / Reports** — come
from Sheet B §6.1, not from the Trust Accounting guide, which sets out the same records in §7
without those headings. The author has asked you to trace the origin and basis and complete it
yourself if you can (the Law Society's *Legal Accounting Handbook: Trust Money and Trust Records*,
9th ed. March 2024, cited at §2.3, is the likely source of the terminology).

**If you cannot source it, do not change the diagram.** Ship it and carry it as an outstanding item
in BUILD_NOTES, in these terms:

> `dg-trust-accounting-06` labels the record architecture in four layers — Source records, Books of
> prime entry, Book of summary, Reports. Those four names are from Instruction Sheet B §6.1 and are
> not used verbatim anywhere in `Trust_Accounting.md`, which describes the same records in §7. The
> examples inside each layer, and the s 147 keeping obligation quoted beneath, are verbatim.
> **Needed:** either a source for the four names in the guides or the Legal Accounting Handbook, or
> replacement wording drawn from §7. A one-line answer unblocks it; the diagram geometry does not
> change.

### 2.8 Firm name (G.5)

"Ivan Law" on the print cover and in `settings.firmName`. Confirmed.

---

## 3. Then rebuild and check

```bash
npm run build
npm test            # Sheet A section 18 acceptance tests
npm run pdf         # regenerates with the new type scale
```

Four things a rebuild can plausibly break, none of them subtle:

1. **Duplicate `marker` IDs** across inlined diagrams (§2.3). Symptom: arrowheads vanish from every
   diagram but the first.
2. **The gold focus ring on the purple top bar.** `--color-focus` is gold with a 2px offset; confirm
   it is visible on the search field, the scope buttons and every top-bar button.
3. **Repeated table headers in print.** The purple-soft header background relies on
   `print-color-adjust: exact`; without it Chromium drops the fill and the repeated rows lose their
   distinction in greyscale.
4. **TOC page numbers.** The type scale changed, so the measured pass in `src/build/pdf.js` must run
   again; stale numbers will fail the three sampled-heading check in `pdf-report.json`.

---

## 4. Round 2 — answers to BUILD_NOTES section F

Delivered 13 September 2026 against notes 46, 47, 48, 49 and 52. Re-drop `design/` and rebuild.

### 4.1 `theme.css` §11a retargeted to the dialog (note 46)

§11a no longer mentions `.guide-card-summary`. It now styles `dialog.summary-slideover`,
`.slideover-head`, `.slideover-title`, `.slideover-close` and `.slideover-body`, using
`::backdrop` rather than a drawn pseudo-element. The dialog is a flex column so the head stays put
and only `.slideover-body` scrolls; the two-column list kicks in at 900px inside the panel. Print
hides the dialog and its backdrop outright, since summaries print in the collected set after the
cover. Nothing in §11a assumes any behaviour — Esc, focus containment and backdrop click stay yours.

If your `app.css` panel styling now overlaps this, delete yours and keep §11a: it is the themed one.

### 4.2 Focus ring on the purple band (note 52)

Added beside the top-bar rules:

- `.topbar :focus-visible` → 2px **white** ring, 2px offset. White on `--color-primary` is 10.1:1.
- `.topbar .search input:focus-visible` and `.topbar .scope-btn.is-active:focus-visible` → back to
  the 2px **gold** ring, because those two sit on white where white would be invisible and gold is
  2.8:1 against it.

Everything outside the band keeps the gold ring from section 5. No variable changed.

### 4.3 "YOUR NOTE" placeholder hides when filled (note 47)

`dg-risk-management-10` and `-11` regenerated. Each cell is now a **group**, not a bare rect:

```
<g data-fill-cell="vision" data-fill-label="Vision — your practice" role="button" tabindex="0">
  <rect id="dg-risk-management-10-cell-vision" .../>
  <text class="fill-placeholder" ...>YOUR NOTE</text>
</g>
```

Your `[data-fill-cell]` selector still matches, and the group gives you a container to inject the
`<foreignObject>` into. `theme.css` §15a then does the rest:
`g[data-fill-cell]:has(foreignObject) .fill-placeholder { display: none }`. Also in §15a: a hover
tint, a focus ring, and body-font styling for the injected `foreignObject`.

**One thing to check on your side:** inject the `foreignObject` *inside* the group, as a sibling of
the rect. If it lands outside, `:has()` will not fire and the placeholder will sit under the text.

### 4.4 Interaction hooks (note 48)

Hook attributes added, exactly as you named them.

| Slot | Hooks |
|---|---|
| `dg-trust-accounting-03` | 9 step groups, each `<g data-step="n" data-anchor="#trust-accounting--s…" role="link" tabindex="0" aria-label>`; 8 terminal outcome boxes wrapped as `<g data-anchor="#trust-accounting--s22-1">`. **Step 4 has no terminal** — it is the cash gate and continues to step 5 — so 9 steps and 8 terminals is correct, not an omission |
| `dg-trust-accounting-04` | `<g data-tabs>` around six `<g data-tab="General|Controlled|Transit|Written direction|Power|Investment">`. Each tab group holds its own header cell and all four band cells, so switching tabs is a show/hide of one group |
| `dg-risk-management-05` | four `<g data-sub="comms|law|docs|systems">` — on the donut segment **and** on the matching legend row, so either is a trigger — and four `<g data-panel="…">` sub-tables. `comms` carries `data-panel-open` so the diagram opens on the largest cause rather than empty. The fifth segment ("Other") has no sub-table in the guide and is deliberately inert |
| `dg-trust-accounting-01` | `<g data-hover>` around seven per-instrument groups |
| `dg-trust-accounting-06` | `<g data-hover>` around four per-layer groups |

`theme.css` §15b carries the visual states: pointer cursor and a purple stroke on `[data-anchor]`
hover, focus rings on both, sibling dimming to 38% for `[data-hover]`, and the `.diagram-tabs` /
`.diagram-tab` strip styled for your tab control (including `[aria-selected="true"]`). The whole of
§15b is neutralised in `@media print`: tabs hidden, panels and tabs forced visible, dimming off.

Every one of these five files is still complete and legible with `diagram.js` absent — that was the
constraint and it holds. Panels start visible in source; hiding the non-open ones on screen is
`diagram.js`'s job, which is why print needs no extra work.

**Not added:** `data-hover` on `dg-trust-accounting-09` and `-13`, `dg-practice-management-02`
and `-06`, `dg-risk-management-07`, `-09` and `-13`. On all seven the detail Sheet B wanted a hover
to *reveal* is already printed on the face, so hover would be emphasis only. Each needs its drawing
units wrapped in per-item groups, which is a redraw of the file. Say the word and I will do the
seven in one pass.

### 4.5 `dg-trust-accounting-06` source line (note 49)

Thank you for sourcing it. The Handbook reference is now on the diagram in both places:

- eyebrow: `TRUST ACCOUNTING · SECTIONS 7.1 AND 7.6 · LEGAL ACCOUNTING HANDBOOK § 6.2`
- a muted line under the s 147 statement: *Layer names: Law Society of NSW, Legal Accounting
  Handbook: Trust Money and Trust Records, 9th ed (March 2024) § 6.2.*

DESIGN_NOTES section C should be amended to move this row from "could not source verbatim" to
sourced; I have left your copy of that file alone.

### 4.6 Fonts (note 44)

Understood — system stacks, nothing embedded. The commented `@font-face` block stays in `theme.css`
as dormant documentation should you ever revisit it. No action for either of us.

---

## 5. Changes that may still need Claude Design again

1. **`data-hover` on the remaining seven slots** (§4.4). On request; one pass.
2. **Any diagram whose text overflows** once rendered at the real `system-ui` metrics. All 49 were
   laid out with character-width estimates for Source Sans 3, and `system-ui` is a different face on
   every platform. Send slot IDs and a screenshot and I will adjust the wrap widths.
3. **Tab strip placement for `dg-trust-accounting-04`.** I have styled `.diagram-tabs` as a strip
   above the figure. If you render it elsewhere, tell me and I will restyle.
4. **The two new variables** if you ever decide to inline them instead (§2.1).
5. **Print page furniture**, if DEV-003 is revisited.
