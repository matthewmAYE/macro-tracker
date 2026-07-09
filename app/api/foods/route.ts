import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMacroPayload } from "@/lib/entries";
import { caloriesFromMacros, normalizeText } from "@/lib/nutrition";

// Create a saved custom food. Macros can be entered per 100 g, or per serving
// together with the serving's gram weight (normalized to per-100g here).
export async function POST(req: Request) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const macros = parseMacroPayload(body);
  if (!macros) return NextResponse.json({ error: "Invalid macros" }, { status: 400 });

  let { protein, carbs, fat, fiber } = macros;
  if (body.per === "serving") {
    const servingGrams = Number(body.servingGrams);
    if (!(servingGrams > 0)) {
      return NextResponse.json({ error: "Serving weight (g) is required" }, { status: 400 });
    }
    const f = 100 / servingGrams;
    protein *= f; carbs *= f; fat *= f; fiber *= f;
  } else if (body.per !== "100g") {
    return NextResponse.json({ error: "per must be '100g' or 'serving'" }, { status: 400 });
  }

  const per100 = { protein, carbs, fat, fiber };
  const food = await prisma.food.create({
    data: {
      name,
      searchText: `${normalizeText(name)} custom`,
      category: "Custom",
      state: "other",
      isCustom: true,
      sourceCount: 1,
      ...per100,
      calories: caloriesFromMacros(per100),
    },
    include: { portions: true },
  });
  return NextResponse.json(food, { status: 201 });
}
