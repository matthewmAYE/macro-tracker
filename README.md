# macro-tracker

User friendly macro tracker, originally built it for myself to use in bodybuilding comp. Draws from different databases.

Foods come prestored from three USDA FoodData Central datasets (SR Legacy, Foundation Foods, FNDDS Survey). Entries that describe the same food are merged into one listing with **averaged values** — raw and cooked meats are separate listings. Calories are always computed from **net carbs**: `4×protein + 4×(carbs − fiber) + 9×fat`.

## Features

- **Plan** — set daily calorie, protein, carb, fat, and fiber targets (with an optional TDEE-based suggestion).
- **Diary** — search 12,000+ unified foods, pick a serving unit (g, oz, lb, and tsp/tbsp/cup where the food has a defined measure weight) and amount, and log to breakfast/lunch/dinner/snacks.
- **Quick add macros** — enter fat/carbs/protein/fiber directly; calories and net carbs are computed and added to the day.
- **Saved custom foods** — create, edit, or delete your own foods (macros per 100 g or per serving); they're stored in the database, searchable, and loggable in any unit like built-in foods.
- **Dashboard** — consumed vs. remaining for calories and every macro, including net carbs and fiber.

## Setup

```bash
npm install
npx prisma migrate dev          # creates dev.db
npm run db:seed                 # needs data/fdc/ (see below)
npm run dev                     # http://localhost:3000
```

The seed script expects the three USDA CSV bundles extracted under `data/fdc/`. Download from https://fdc.nal.usda.gov/download-datasets.html:

- `FoodData_Central_sr_legacy_food_csv_2018-04`
- `FoodData_Central_foundation_food_csv_2026-04-30`
- `FoodData_Central_survey_food_csv_2024-10-31`

(Newer Foundation/Survey releases work too — update the folder names in `scripts/seed-foods.ts`.)

## Tests

```bash
npm test
```

## TODO / Roadmap

See `.claude/roadmap.md` for detail.

- **Expand food coverage from more sources.** Some common varieties are missing as distinct entries (e.g. cherry tomatoes — only generic "Tomatoes, red, ripe, raw" exists). Candidates: Open Food Facts, FDC Branded Foods, AUSNUT/other national databases — merged through the same averaging pipeline.
- **Search synonyms/aliases — ✅ shipped.** A curated alias layer (`scripts/aliases.ts`) appends colloquial names to `searchText` at seed time (pomelo→pummelo, garbanzo↔chickpea, courgette→zucchini, and ~30 specific beef cuts like top round/london broil, fore shank/osso buco, top sirloin/coulotte — applied equally to raw and cooked rows).
- **Custom food management.** Creation, editing (`PATCH /api/foods/:id`), and deletion are done. Custom portion units (e.g. "1 scoop") remain.
