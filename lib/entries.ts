import { prisma } from "@/lib/prisma";
import {
  MEALS,
  MASS_UNITS,
  VOLUME_UNITS,
  caloriesFromMacros,
  scaleMacros,
  toGrams,
  type Meal,
  type Unit,
} from "@/lib/nutrition";

export function isMeal(v: unknown): v is Meal {
  return typeof v === "string" && (MEALS as readonly string[]).includes(v);
}

export function isUnit(v: unknown): v is Unit {
  return typeof v === "string" && (v in MASS_UNITS || (VOLUME_UNITS as readonly string[]).includes(v));
}

export function isDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// Compute the stored macro snapshot for a diary entry that references a Food.
export async function computeFoodEntry(foodId: number, unit: Unit, amount: number) {
  const food = await prisma.food.findUnique({
    where: { id: foodId },
    include: { portions: true },
  });
  if (!food) return null;
  const portion = food.portions.find((p) => p.unit === unit);
  if (!(unit in MASS_UNITS) && !portion) return null; // volume unit without a weight
  const grams = toGrams(amount, unit, portion?.gramWeight);
  const macros = scaleMacros(food, grams);
  return { food, grams, ...macros };
}

// Validate a quick-add / custom macro payload (grams of each macro).
export function parseMacroPayload(body: Record<string, unknown>) {
  const out = { protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const key of Object.keys(out) as (keyof typeof out)[]) {
    const v = Number(body[key] ?? 0);
    if (!Number.isFinite(v) || v < 0) return null;
    out[key] = v;
  }
  if (out.fiber > out.carbs) return null; // fiber is part of total carbs
  return { ...out, calories: caloriesFromMacros(out) };
}
