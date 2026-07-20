import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMacroPayload } from "@/lib/entries";
import { caloriesFromMacros, normalizeText } from "@/lib/nutrition";

type Ctx = { params: Promise<{ id: string }> };

// Only user-created custom foods can be deleted; USDA-derived rows are
// managed by the seed pipeline. Past log entries keep their macro snapshots
// (foodId nulls out via onDelete: SetNull).
export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const food = await prisma.food.findUnique({ where: { id } });
  if (!food) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!food.isCustom) {
    return NextResponse.json({ error: "Only custom foods can be deleted" }, { status: 403 });
  }
  await prisma.food.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Edit a custom food's name/macros. Same per-100g / per-serving payload shape
// as POST /api/foods. Past log entries are unaffected — they store their own
// macro snapshot, not a live reference to Food's current values.
export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const food = await prisma.food.findUnique({ where: { id } });
  if (!food) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!food.isCustom) {
    return NextResponse.json({ error: "Only custom foods can be edited" }, { status: 403 });
  }

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
  const updated = await prisma.food.update({
    where: { id },
    data: {
      name,
      searchText: `${normalizeText(name)} custom`,
      ...per100,
      calories: caloriesFromMacros(per100),
    },
    include: { portions: true },
  });
  return NextResponse.json(updated);
}
