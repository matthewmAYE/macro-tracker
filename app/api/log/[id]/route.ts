import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFoodEntry, isMeal, isUnit, parseMacroPayload } from "@/lib/entries";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  await prisma.logEntry.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Edit an entry. Food entries accept unit/amount/meal (macros recomputed);
// quick/custom entries accept meal and raw macros.
export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const entry = await prisma.logEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const meal = body.meal ?? entry.meal;
  if (!isMeal(meal)) return NextResponse.json({ error: "Invalid meal" }, { status: 400 });

  if (entry.kind === "food" && entry.foodId !== null) {
    const unit = body.unit ?? entry.unit;
    const amount = Number(body.amount ?? entry.amount);
    if (!isUnit(unit) || !(amount > 0)) {
      return NextResponse.json({ error: "Invalid unit or amount" }, { status: 400 });
    }
    const computed = await computeFoodEntry(entry.foodId, unit, amount);
    if (!computed) return NextResponse.json({ error: "Unsupported unit" }, { status: 400 });
    const { grams, protein, carbs, fat, fiber, calories } = computed;
    const updated = await prisma.logEntry.update({
      where: { id },
      data: { meal, unit, amount, grams, protein, carbs, fat, fiber, calories },
    });
    return NextResponse.json(updated);
  }

  const macros = parseMacroPayload({
    protein: body.protein ?? entry.protein,
    carbs: body.carbs ?? entry.carbs,
    fat: body.fat ?? entry.fat,
    fiber: body.fiber ?? entry.fiber,
  });
  if (!macros) return NextResponse.json({ error: "Invalid macros" }, { status: 400 });
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : entry.name;
  const updated = await prisma.logEntry.update({
    where: { id },
    data: { meal, name, ...macros },
  });
  return NextResponse.json(updated);
}
