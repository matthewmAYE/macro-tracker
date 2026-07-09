<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Single-user macro/nutrition tracker (MyFitnessPal-style): set daily calorie +
macro targets, log foods from a prestored unified food database, track daily
totals. No auth. Next.js 16 App Router + TypeScript + Tailwind 4, Prisma 7 on
SQLite (`dev.db` at repo root, driver adapter `@prisma/adapter-better-sqlite3`).

## Commands

- `npm run dev` — dev server; `npm run build` / `npm start` — production
- `npm test` — Vitest (single file: `npx vitest run lib/nutrition.test.ts`)
- `npm run db:seed` — rebuild the food database (needs `data/fdc/` CSVs, see below)
- `npx prisma migrate dev` — apply schema changes; client generates to `app/generated/prisma` (gitignored)

## Architecture

- `lib/nutrition.ts` — single source of truth for all nutrition math.
  **Calories are ALWAYS derived from macros using NET carbs**:
  `4×protein + 4×(carbs − fiber) + 9×fat`. Never store or display calories
  computed another way. Unit conversion: mass units are constants; tsp/tbsp/cup
  need a per-food `Portion.gramWeight`.
- `scripts/seed-foods.ts` — offline pipeline. Parses three USDA FoodData
  Central CSV dumps (SR Legacy, Foundation, FNDDS Survey — downloaded to
  `data/fdc/`, gitignored), normalizes to per-100g, merges entries that differ
  only by grade/trim qualifiers ("choice"/"select"/"trimmed to 1/8 fat"...)
  into one row with averaged values (`Food.sourceCount` = member count).
  `Food.searchText` holds the union of every merged member's name tokens plus
  a raw/cooked marker — search matches against it, display uses `Food.name`.
  Quirk: the Survey dataset's `food_nutrient.nutrient_id` column holds legacy
  nutrient numbers (203/204/205/291), translated via `nutrient.csv`.
- `app/api/*` — route handlers; all macro computation for logged entries
  happens server-side (`lib/entries.ts`), and `LogEntry` stores a macro
  snapshot so history survives food edits. `Plan` is a singleton row (id=1).
- `app/page.tsx` — diary + dashboard (client components fetching the API);
  `components/FoodSearchModal.tsx`, `components/QuickAddModal.tsx`;
  `app/plan/page.tsx` — targets editor + Mifflin-St Jeor TDEE suggester.

## Roadmap

Planned work lives in `.claude/roadmap.md` (more food sources, search
aliases, saved custom foods). Check it before proposing new features.

## Conventions

- Raw vs cooked foods are separate entries by design (`Food.state`); never
  merge across cooking methods or lean-only/lean-and-fat variants.
- Dates are local-time `YYYY-MM-DD` strings; meals are
  breakfast/lunch/dinner/snacks (`MEALS` in `lib/nutrition.ts`).
- Fiber ≤ total carbs is validated everywhere macros are accepted.
