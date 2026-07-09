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

## 3. Saved custom foods

Today custom foods are one-off `LogEntry` rows (kind `"custom"`) — not reusable. Rework:

- Let the user create a **saved custom food**: name + per-100g macros (or per-serving with a serving weight), stored as a `Food` row (add something like `Food.custom = true`, `sourceCount = 0` or a `source` discriminator).
- Saved custom foods appear in search and recents like any other food, support units/amounts, and can be edited/deleted from a small management UI.
- Keep the existing quick-add (unnamed, one-off) flow as-is.
- Migration consideration: existing `kind="custom"` log entries stay valid snapshots; no backfill needed.
