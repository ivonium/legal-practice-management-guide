# TESTS.md - acceptance tests (Instruction Sheet A section 18)

Run everything with `npm test` (build, unit tests, Playwright acceptance suite). The PDF checks run with `npm run pdf`. Last full run: 13 September 2026, final (after the round 2 fixes, BUILD_NOTES.md notes 53, 58 and 61), Node 24.18, Playwright 1.63 (bundled Chromium), Windows 11.

## Automated results

### Unit tests (`node --test test/unit/*.test.js`) - 34 passed, 0 failed

| # | Test | Result |
|---|---|---|
| 1 | Rendered plain text equals source text after markdown stripping, ignoring whitespace - ten guides, independent stripper | pass (10/10) |
| 2 | Every H2 and numbered H3 in every source file has an anchor per Sheet A 2.2 | pass |
| 3 | Every `→ guide §n` reference in the Content Pack (summaries, calendar, unlinked citations) resolves to an existing anchor | pass |
| 12 | 8.1 Profit Driver: case 1 = $400,881 (band "Very good on two drivers…"), case 2 = $228,690 | pass |
| 12 | 8.2 Cost of Production: $190.91/hr and $293.71/hr | pass |
| 12 | 8.3 Fixed fee: 85.7 / 142.9 / 17.9 days; $100,000 / 285.7 / 476.2 / 59.5 days; $380/hr, 8.6% | pass |
| 12 | 8.4 WIP/debtor days warnings above 40 and 90 days | pass |
| 12 | 8.5 Dilution: 250,000 → 200,000, change -50,000 | pass |
| 12 | 8.6 Lockstep: $2,000/pt; $100,000 / $200,000; 260 pts → $520,000, growth $20,000 | pass |
| 12 | 8.7 Statutory deposit worked example: base 73,600; fwd 57,600; candidate 46,080; required $46,100; "No deposit required; $3,900 may be withdrawn"; deadline 20 weekdays after 30 June 2026 = 28 July 2026; below-threshold and deposit cases | pass |
| 12 | 8.8 Rule 42 decision flow and Method 1 date (+7 weekdays) | pass |
| 12 | 8.11 Supervision level mapping; 8.12 PII excess doubling; weekday arithmetic | pass |
| 13 | Walkthrough engine: $5,000 receipt then $6,000 bill blocked with the overdraw warning; $3,000 bill Method 1 → earliest date = today + 7 weekdays, balance $2,000; Method 3 blocked when office debit date blank/later; cash override; CMA name test | pass |
| - | Every Walkthrough label is a verbatim substring of the Trust Accounting guide (one allowed exception: the spec-mandated overdraw sentence) | pass |
| 15 | Calendar: next 30 days from 10 June 2026 includes the 30 June items and the 16 June super item; 31 July signatory item; quarterly, monthly, once-only and user items expand correctly; interpretation labels | pass |
| 6/7 | Search index: "rule 42" hits Trust Accounting and Tax and Accounting; scoped to Cyber Security returns none; prefix matching; re-index of edited text ("zebrafish") | pass |
| - | Note markdown subset renders safely (no HTML injection); word diff | pass |

### Acceptance suite (`node test/e2e/run.js`, Playwright, file:// URL) - 18 passed, 0 failed

| # | Test | Result |
|---|---|---|
| 4 | Opening the file with `#trust-accounting--s9-2` scrolls to that heading and expands section 9 (tested with section 9 collapsed beforehand) | pass |
| 5 | Prev/next guide links traverse all ten in order and back; browser back works | pass |
| 6 | "rule 42" in All guides hits Trust Accounting and Tax and Accounting; This guide only from Cyber Security returns none; `/` focuses search; Esc clears | pass |
| 7 | Editing a block to add "zebrafish" makes it searchable; result navigates to and highlights the block | pass |
| 8 | Note persists across reload; Export produces `PracticeGuides-YYYY-MM-DD.html` with `data-exported-at`; opened in a fresh browser profile the note is present; the exported file exports again | pass |
| 9 | Edit persists across reload; "Revert to original" restores the exact original HTML and persists | pass |
| 10 | Two blocks reordered by real drag-and-drop; reload; order persists; "Restore original order" restores and removes the overlay entry | pass |
| 11 | A 4.5 MB note triggers the IndexedDB fallback (localStorage cleared), survives reload, and migrates back to localStorage when deleted | pass |
| 12 | Calculator UI: defaults show $400,881; case 2 inputs show $228,690; scenario saved; inputs persist across reload; reset; cost of production and statutory deposit outputs and warning | pass |
| 13 | Walkthrough UI: $6,000 bill blocked with red panel (s 148, s 154), event not added; $3,000 Method 1 bill shows earliest date = today + 7 weekdays; running ledger balance $2,000.00 | pass |
| 14 | Three items ticked; reload; "3 of 28 complete"; reset. Run on Practice Management §10 because Trust Accounting has no checklist (see BUILD_NOTES) | pass |
| 15 | Landing "Next 30 days" panel; calendar page (55 rows with the "Interpreted as" column), category filter, user-added dated item appears in the timeline | pass |
| 16 | Citations index: `act-2014-16a` s 34 cites Trust Accounting §3.1 and People Management §11; natural sort 34 < 35 < 91E < 95A; cases listed; reverse view | pass |
| 18 | `?print=all` under print media: 10 guides, 0 collapsed sections, 0 visible controls, 25 static calculator tables, 0 live calculators, TOC with 100+ entries, cover, colophon, note labelled, 49 diagram slots, app shell hidden | pass |
| - | Glossary: first occurrence per H2 marked with `<abbr>` (definition in `title`), none inside tables or headings, click-through to the entry and back link | pass |
| - | Cross references resolve to `#practice-management--s6` and (People Management §11) `#risk-management--s8`; no links inside headings; legislation links `target=_blank rel=noopener`; currency banners including Practice Management (12 September 2026); collapsed state persists; expand all; change log entry appears on the Change Log page and the landing card | pass |
| - | Move a block to another section (persists, listed in the change log); reorder H2 sections (persists); restore guide order; settings reset clears the overlay | pass |
| - | Design integration: theme variables applied; "Read summary" opens the slide-over dialog with the 20 Trust Accounting items, focus moves in, Esc closes and focus returns to the button; all 14 Risk Management diagrams inlined with no placeholders, no duplicate ids in the document, no C2PA metadata; a fillable cell saves, persists across reload, is searchable with the "Your note" badge and prints; print document has 49 SVGs and "Prepared for Ivan Law" | pass |

### PDF (`npm run pdf`) - passed

| # | Check | Result |
|---|---|---|
| 17 | `dist/PracticeGuides.pdf` produced: 381 pages, A4, 20 mm margins, "Page X of Y" footer, bookmark outline requested (`outline: true`) | pass |
| 17 | TOC page numbers for three sampled H2 headings match the pages on which they appear: `practice-management--s1` p9, `cyber-security--s8` p220, `partnership-management--s11` p358 | pass |
| 18 | In the print document (print media): 0 visible controls, 25 static calculator renderings, all sections expanded | pass |
| - | Diagram text overflow probe (`node test/e2e/diagram-overflow.js`): every label in the 49 inlined diagrams measured at system-ui metrics; none runs past its viewBox or its box | pass |

## Manual checklist (not automated)

Tick these in a browser before hand-off:

- [ ] Open `dist/PracticeGuides.html` from disk in Chrome, Edge, Firefox and Safari. Landing page renders; no console errors.
- [ ] Dark mode: switch the OS colour scheme; the indicator in the top bar changes and the palette follows.
- [ ] Narrow window (< 800 px): rails hide; the ☰ button toggles the left rail; content remains readable; tables scroll horizontally inside their wrappers.
- [ ] Keyboard only: Tab reaches every control; visible focus ring; `Ctrl+K`, `/`, `Esc`, `Ctrl+E` work; arrow keys and Enter in search results; Enter/Space on a glossary `abbr` opens the entry.
- [ ] Screen reader spot check: landmarks (banner, navigation, main, complementary), "Saved" indicator announced, collapsible sections announce expanded/collapsed.
- [ ] Hover a marked glossary term: the definition appears as a tooltip.
- [ ] Right rail: notes panel follows the section in view; "On this page" highlights the current H2/H3; reading progress advances while scrolling and is shown on the landing card.
- [ ] Notes: add, edit, delete; markdown subset renders; note count badge in the left rail; notes appear in search with the "Your note" badge.
- [ ] Edit mode: floating toolbar (bold, italic, link, list); paste from Word strips formatting to the whitelist; Esc leaves the block; "edited" marker and Revert; drag handle reorder; "Move to…" select; left-rail H2 drag reorder in edit mode.
- [ ] Trust Transaction Walkthrough: try each category (controlled money name check, transit, written direction, power, already billed), cash of $10,000 or more shows the AUSTRAC report notice, credit card shows the s 146 warning, each event type renders its records, "Clear walkthrough" increments the receipt number.
- [ ] Trust Money Classifier: answer "cash" = yes and finish at Transit; the s 143 instruction shows; "Use this category in the Walkthrough" carries the category across.
- [ ] Rule 42 Method Selector: each path; Method 1 date input.
- [ ] Statutory Deposit: switch scenarios; invalid period-end date shows a warning.
- [ ] Master calendar: sort by date, category, guide; filter by guide; add and delete own items; rows link to sections.
- [ ] Citations index: instrument links open the legislation register in a new tab; citing-section links land on the right heading.
- [ ] Settings: export overlay JSON, import it into a fresh browser profile, "Reset all notes and edits" requires typing RESET.
- [ ] Print this guide (Chrome): one guide, expanded, calculators static, notes labelled "Your note" when the setting is on; page breaks before each H2; external URLs printed after link text.
- [ ] Print everything (Chrome): cover, landing summary, table of contents (page numbers appear where `target-counter` is supported), all guides, glossary, calendar, citations, change log appendix (when notes included), colophon.
- [ ] Open `dist/PracticeGuides.pdf`: clickable TOC entries, bookmark tree in the viewer's sidebar, page footer "Page X of Y".
