# Roadmap / TODO

Planned work, in priority order. Keep this in sync with the TODO section in README.md.

## 1. Expand food coverage from additional sources

Gaps found in the current 3-dataset USDA seed (SR Legacy + Foundation + FNDDS Survey):

- **Missing distinct varieties**: e.g. *cherry tomatoes* — only generic "Tomatoes, red, ripe, raw" exists. Specialty fruits/veg varieties are thin in USDA generic data.
- Candidate sources to ingest through `scripts/seed-foods.ts`'s existing normalize→merge→average pipeline:
  - **Open Food Facts** (open data, ~3.5M products, has produce entries)
  - **FDC Branded Foods** dataset (large, but noisy serving data — normalize to per-100g)
  - National databases (AUSNUT, McCance/CoFID) if licensing allows
- Keep the merge rules: per-100g normalization, raw/cooked stay separate, averaged values with `sourceCount` tracking.

## 2. Search synonym/alias layer — ✅ shipped (2026-07-21)

Implemented: `scripts/aliases.ts` exports a curated `ALIASES` map (canonical
USDA phrase → colloquial synonyms) and a pure `expandAliases()` function.
`scripts/seed-foods.ts` runs it per merged food group, appending matched
synonyms to `Food.searchText` only (never to the display `name`). Aliases
attach identically to raw and cooked rows, so e.g. "cooked ribeye" and "grilled
london broil" both resolve to the correct cooked-weight macros.

~65 entries total, weighted toward beef cuts (~30): round primal (top round →
london broil, bottom round → silverside, eye of round), loin primal (top
sirloin → coulotte/picanha, tenderloin → filet mignon, strip steak → NY
strip), rib primal (rib eye → ribeye/delmonico, prime rib → standing rib
roast), chuck primal (flat iron ↔ top blade, denver steak, chuck eye), plate/
flank/brisket (skirt steak → fajita meat, hanger steak → onglet, short ribs →
flanken/kalbi), shanks (fore/hind shank ↔ osso buco), and ground beef →
hamburger/mince. Plus produce/dairy/staples aliases (pomelo↔pummelo,
garbanzo↔chickpea, courgette→zucchini, etc.).

Tested in `scripts/aliases.test.ts` (data-shape guards + `expandAliases`
behavior, including a dedicated raw-vs-cooked beef case).

## 3. Saved custom foods — ✅ shipped (2026-07-09), edit UI ✅ shipped (2026-07-21)

Implemented: `Food.isCustom` rows created via `POST /api/foods` (macros per
100 g or per serving + serving weight), searchable with a rank boost, badge in
the search modal, delete via `DELETE /api/foods/:id` (custom-only, 403
otherwise). The seed pipeline preserves custom foods when re-seeding. The
unnamed quick-add flow is unchanged.

Edit: `PATCH /api/foods/:id` (custom-only, same per-100g/per-serving payload
shape as create; recomputes `searchText`/`calories`). `FoodSearchModal`
reuses its existing create-food panel in an edit mode (pre-filled per-100g
values, "Save changes" instead of "Save food"), with an "edit food" button
next to "delete food" on the selected custom-food detail view. Past
`LogEntry` rows are unaffected — they store their own macro snapshot.

Remaining follow-up:
- Custom portion units (e.g. "1 scoop = 31 g") so volume-style logging works
  for user foods.
