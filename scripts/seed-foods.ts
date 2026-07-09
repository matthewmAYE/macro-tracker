// Seed pipeline: builds the unified food database from three USDA FoodData
// Central datasets (SR Legacy, Foundation Foods, FNDDS Survey). Entries that
// describe the same food are merged into one row with averaged per-100g
// values; the UI never exposes which source a number came from.
//
// Run: npm run db:seed  (expects the extracted CSVs under data/fdc/)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { caloriesFromMacros } from "../lib/nutrition";

const DATA_DIR = path.join(process.cwd(), "data", "fdc");

const DATASETS = [
  { dir: "FoodData_Central_sr_legacy_food_csv_2018-04", foodType: "sr_legacy_food", categories: "fdc" },
  { dir: "FoodData_Central_foundation_food_csv_2026-04-30", foodType: "foundation_food", categories: "fdc" },
  { dir: "FoodData_Central_survey_food_csv_2024-10-31", foodType: "survey_fndds_food", categories: "wweia" },
] as const;

// FDC nutrient ids (amounts are per 100 g). Fallbacks cover Foundation foods
// that publish "by summation" carbs or AOAC 2011.25 fiber instead.
const NUTRIENTS = {
  protein: [1003],
  fat: [1004],
  carbs: [1005, 1050],
  fiber: [1079, 2033],
} as const;
const ALL_NUTRIENT_IDS = new Set(Object.values(NUTRIENTS).flat().map(String));

// Comma-separated name segments that only describe grade/trim/commodity
// variants. Entries differing only by these are nutritionally near-identical,
// so they merge into one averaged food. "lean only" vs "lean and fat" is NOT
// stripped — those differ materially.
const STRIP_SEGMENTS = new Set(["select", "choice", "prime", "all grades", "usda commodity"]);
const STRIP_PATTERNS = [/^trimmed to [\d/ ]+["']? ?fat$/, /^includes usda commodity/];

const RAW_WORDS = new Set(["raw", "uncooked"]);
const COOKED_WORDS = new Set([
  "cooked", "roasted", "broiled", "grilled", "braised", "fried", "baked",
  "boiled", "stewed", "simmered", "steamed", "poached", "microwaved",
  "toasted", "scrambled", "heated", "rotisserie", "smoked", "barbecued",
]);

type SourceFood = {
  desc: string;
  category: string;
  macros: { protein: number; carbs: number; fat: number; fiber: number };
  portions: Map<string, number[]>; // unit -> grams per 1 unit, per portion row
};

function parseCsv(file: string): string[][] {
  const text = fs.readFileSync(file, "utf8");
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function indexed(rows: string[][]): { header: Record<string, number>; body: string[][] } {
  const header: Record<string, number> = {};
  rows[0].forEach((h, i) => (header[h] = i));
  return { header, body: rows.slice(1) };
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

function splitSegments(desc: string): { kept: string[]; state: string } {
  const kept: string[] = [];
  for (const seg of desc.split(",").map((s) => s.trim()).filter(Boolean)) {
    const n = normalize(seg);
    if (STRIP_SEGMENTS.has(n) || STRIP_PATTERNS.some((p) => p.test(n))) continue;
    kept.push(seg);
  }
  const words = new Set(normalize(kept.join(" ")).split(" "));
  let state = "other";
  if ([...words].some((w) => RAW_WORDS.has(w))) state = "raw";
  else if ([...words].some((w) => COOKED_WORDS.has(w))) state = "cooked";
  return { kept, state };
}

function parsePortionDescription(text: string): { unit: string; qty: number } | null {
  const m = /^(\d+(?:\.\d+)?|\d+\/\d+)\s+(cup|tablespoon|tbsp|teaspoon|tsp)s?\b/i.exec(text.trim());
  if (!m) return null;
  const qty = m[1].includes("/")
    ? Number(m[1].split("/")[0]) / Number(m[1].split("/")[1])
    : Number(m[1]);
  const unit = { cup: "cup", tablespoon: "tbsp", tbsp: "tbsp", teaspoon: "tsp", tsp: "tsp" }[
    m[2].toLowerCase() as "cup" | "tablespoon" | "tbsp" | "teaspoon" | "tsp"
  ];
  return qty > 0 ? { unit, qty } : null;
}

function loadDataset(ds: (typeof DATASETS)[number]): SourceFood[] {
  const dir = path.join(DATA_DIR, ds.dir);
  const read = (name: string) => indexed(parseCsv(path.join(dir, name)));

  // Categories
  const categoryById = new Map<string, string>();
  if (ds.categories === "wweia") {
    const { header, body } = read("wweia_food_category.csv");
    for (const r of body)
      categoryById.set(r[header.wweia_food_category], r[header.wweia_food_category_description]);
  } else {
    const { header, body } = read("food_category.csv");
    for (const r of body) categoryById.set(r[header.id], r[header.description]);
  }

  // Foods of the right data_type
  const foods = new Map<string, SourceFood>();
  {
    const { header, body } = read("food.csv");
    for (const r of body) {
      if (r[header.data_type] !== ds.foodType) continue;
      foods.set(r[header.fdc_id], {
        desc: r[header.description],
        category: categoryById.get(r[header.food_category_id]) ?? "Other",
        macros: { protein: NaN, carbs: NaN, fat: NaN, fiber: NaN },
        portions: new Map(),
      });
    }
  }

  // Nutrients (first id in each fallback list wins). The survey dataset's
  // food_nutrient.nutrient_id column holds legacy nutrient numbers (203, 204,
  // ...) instead of FDC ids, so translate through nutrient.csv when needed.
  {
    const nbrToId = new Map<string, string>();
    const nut = read("nutrient.csv");
    for (const r of nut.body) {
      const nbr = r[nut.header.nutrient_nbr];
      if (nbr) nbrToId.set(String(Number(nbr)), r[nut.header.id]);
    }
    const { header, body } = read("food_nutrient.csv");
    const seen = new Map<string, Map<keyof typeof NUTRIENTS, number>>(); // fdc -> macro -> id-rank used
    for (const r of body) {
      const food = foods.get(r[header.fdc_id]);
      let nid = r[header.nutrient_id];
      if (!ALL_NUTRIENT_IDS.has(nid)) nid = nbrToId.get(nid) ?? nid;
      if (!food || !ALL_NUTRIENT_IDS.has(nid)) continue;
      const amount = Number(r[header.amount]);
      if (!Number.isFinite(amount)) continue;
      for (const key of Object.keys(NUTRIENTS) as (keyof typeof NUTRIENTS)[]) {
        const rank = (NUTRIENTS[key] as readonly number[]).indexOf(Number(nid));
        if (rank === -1) continue;
        const fdcSeen = seen.get(r[header.fdc_id]) ?? new Map();
        const prev = fdcSeen.get(key);
        if (prev === undefined || rank < prev) {
          food.macros[key] = amount;
          fdcSeen.set(key, rank);
          seen.set(r[header.fdc_id], fdcSeen);
        }
      }
    }
  }

  // Portions → grams per single tsp/tbsp/cup
  {
    const unitNameById = new Map<string, string>();
    const mu = read("measure_unit.csv");
    for (const r of mu.body) unitNameById.set(r[mu.header.id], r[mu.header.name]);
    const { header, body } = read("food_portion.csv");
    for (const r of body) {
      const food = foods.get(r[header.fdc_id]);
      if (!food) continue;
      const gramWeight = Number(r[header.gram_weight]);
      if (!(gramWeight > 0)) continue;
      let unit: string | undefined, qty = Number(r[header.amount]);
      const unitName = unitNameById.get(r[header.measure_unit_id]);
      if (unitName === "cup" || unitName === "tablespoon" || unitName === "teaspoon") {
        unit = { cup: "cup", tablespoon: "tbsp", teaspoon: "tsp" }[unitName];
        if (!(qty > 0)) qty = 1;
      } else {
        // Survey rows put the measure in free text ("1 cup", "2 tablespoons")
        const parsed = parsePortionDescription(r[header.portion_description] ?? "");
        if (parsed) ({ unit, qty } = parsed);
      }
      if (!unit) continue;
      const perUnit = gramWeight / qty;
      if (!food.portions.has(unit)) food.portions.set(unit, []);
      food.portions.get(unit)!.push(perUnit);
    }
  }

  return [...foods.values()].filter(
    (f) => Number.isFinite(f.macros.protein) && Number.isFinite(f.macros.fat) && Number.isFinite(f.macros.carbs),
  );
}

async function main() {
  const all: { food: SourceFood; kept: string[]; state: string; key: string }[] = [];
  for (const ds of DATASETS) {
    const foods = loadDataset(ds);
    console.log(`${ds.dir}: ${foods.length} usable foods`);
    for (const food of foods) {
      const { kept, state } = splitSegments(food.desc);
      all.push({ food, kept, state, key: normalize(kept.join(" ")) });
    }
  }

  // Merge identical canonical keys across (and within) sources
  const groups = new Map<string, typeof all>();
  for (const item of all) {
    if (!groups.has(item.key)) groups.set(item.key, []);
    groups.get(item.key)!.push(item);
  }

  // Re-seeding replaces only USDA-derived rows. User-created custom foods
  // (and all log entries — they carry macro snapshots) are preserved;
  // LogEntry.foodId of replaced foods nulls out via onDelete: SetNull.
  await prisma.portion.deleteMany({ where: { food: { isCustom: false } } });
  await prisma.food.deleteMany({ where: { isCustom: false } });

  const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / ns.length;
  let inserted = 0, merged = 0;
  const rows = [...groups.values()].map((members) => {
    if (members.length > 1) merged++;
    const macros = {
      protein: avg(members.map((m) => m.food.macros.protein)),
      carbs: avg(members.map((m) => m.food.macros.carbs)),
      fat: avg(members.map((m) => m.food.macros.fat)),
      fiber: avg(members.map((m) => (Number.isFinite(m.food.macros.fiber) ? m.food.macros.fiber : 0))),
    };
    // Shortest cleaned description reads best; search over every member's
    // tokens plus the state word so "cooked sirloin steak" matches entries
    // whose own name only says "broiled".
    const display = members
      .map((m) => m.kept.join(", "))
      .sort((a, b) => a.length - b.length)[0];
    const tokens = new Set<string>();
    for (const m of members) for (const t of normalize(m.food.desc).split(" ")) tokens.add(t);
    const state = members.map((m) => m.state).find((s) => s !== "other") ?? "other";
    if (state !== "other") tokens.add(state === "cooked" ? "cooked" : "raw");

    const portionAgg = new Map<string, number[]>();
    for (const m of members)
      for (const [unit, weights] of m.food.portions)
        portionAgg.set(unit, [...(portionAgg.get(unit) ?? []), ...weights]);

    return {
      name: display,
      searchText: [...tokens].join(" "),
      category: members[0].food.category,
      state,
      sourceCount: members.length,
      ...macros,
      calories: caloriesFromMacros(macros),
      portions: [...portionAgg.entries()].map(([unit, ws]) => ({ unit, gramWeight: avg(ws) })),
    };
  });

  for (let i = 0; i < rows.length; i += 200) {
    await prisma.$transaction(
      rows.slice(i, i + 200).map((row) => {
        const { portions, ...food } = row;
        return prisma.food.create({
          data: { ...food, portions: { create: portions } },
        });
      }),
    );
    inserted += Math.min(200, rows.length - i);
    if (inserted % 2000 === 0) console.log(`inserted ${inserted}/${rows.length}`);
  }

  console.log(`Done: ${rows.length} unified foods (${merged} merged from multiple entries)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
