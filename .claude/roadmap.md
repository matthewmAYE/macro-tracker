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

## 2. Search synonym/alias layer

Some "missing" foods are actually spelling/naming misses: *pomelo* IS seeded as **"Pummelo, raw"**. Add a curated alias map (pomelo→pummelo, garbanzo→chickpea, courgette→zucchini, ...) appended to `Food.searchText` at seed time so colloquial names match. Cheap, high impact — do this before ingesting new sources.

## 3. Saved custom foods — ✅ shipped (2026-07-09)

Implemented: `Food.isCustom` rows created via `POST /api/foods` (macros per
100 g or per serving + serving weight), searchable with a rank boost, badge in
the search modal, delete via `DELETE /api/foods/:id` (custom-only, 403
otherwise). The seed pipeline preserves custom foods when re-seeding. The
unnamed quick-add flow is unchanged.

Remaining follow-ups:
- Edit UI for existing custom foods (PATCH endpoint + form).
- Custom portion units (e.g. "1 scoop = 31 g") so volume-style logging works
  for user foods.
