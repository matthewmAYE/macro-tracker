// Core nutrition math shared by the app, API routes, and the seed pipeline.

export type Macros = {
  protein: number;
  carbs: number; // total carbs, incl. fiber
  fat: number;
  fiber: number;
};

export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type Meal = (typeof MEALS)[number];

export const MASS_UNITS = { g: 1, oz: 28.3495, lb: 453.592 } as const;
export const VOLUME_UNITS = ["tsp", "tbsp", "cup"] as const;
export type MassUnit = keyof typeof MASS_UNITS;
export type VolumeUnit = (typeof VOLUME_UNITS)[number];
export type Unit = MassUnit | VolumeUnit;

// Calories are always derived from macros using NET carbs (total − fiber),
// per the app's convention: 4 kcal/g protein, 4 kcal/g net carbs, 9 kcal/g fat.
export function caloriesFromMacros(m: Macros): number {
  const netCarbs = Math.max(0, m.carbs - m.fiber);
  return 4 * m.protein + 4 * netCarbs + 9 * m.fat;
}

export function netCarbs(m: { carbs: number; fiber: number }): number {
  return Math.max(0, m.carbs - m.fiber);
}

// Convert an amount in a given unit to grams. Volume units need the food's
// portion gram weight for ONE unit of that measure (e.g. 1 tbsp = 16 g).
export function toGrams(
  amount: number,
  unit: Unit,
  portionGramWeight?: number,
): number {
  if (unit in MASS_UNITS) return amount * MASS_UNITS[unit as MassUnit];
  if (portionGramWeight === undefined) {
    throw new Error(`No portion weight available for unit "${unit}"`);
  }
  return amount * portionGramWeight;
}

// Scale per-100g macros to a gram amount, recomputing calories from the
// scaled macros so rounding stays consistent with the net-carb formula.
export function scaleMacros(per100g: Macros, grams: number): Macros & { calories: number } {
  const f = grams / 100;
  const scaled = {
    protein: per100g.protein * f,
    carbs: per100g.carbs * f,
    fat: per100g.fat * f,
    fiber: per100g.fiber * f,
  };
  return { ...scaled, calories: caloriesFromMacros(scaled) };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
