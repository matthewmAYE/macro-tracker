import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFoodEntry, isDate, isMeal, isUnit, parseMacroPayload } from "@/lib/entries";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date");
  if (!isDate(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const entries = await prisma.logEntry.findMany({
    where: { date },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { kind, date, meal } = body;
  if (!isDate(date) || !isMeal(meal)) {
    return NextResponse.json({ error: "Invalid date or meal" }, { status: 400 });
  }

  if (kind === "food") {
    const foodId = Number(body.foodId);
    const amount = Number(body.amount);
    if (!Number.isInteger(foodId) || !isUnit(body.unit) || !(amount > 0)) {
      return NextResponse.json({ error: "Invalid food entry" }, { status: 400 });
    }
    const computed = await computeFoodEntry(foodId, body.unit, amount);
    if (!computed) {
      return NextResponse.json({ error: "Unknown food or unsupported unit" }, { status: 400 });
    }
    const { food, grams, protein, carbs, fat, fiber, calories } = computed;
    const entry = await prisma.logEntry.create({
      data: {
        date, meal, kind, foodId, name: food.name, unit: body.unit, amount, grams,
        protein, carbs, fat, fiber, calories,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (kind === "quick" || kind === "custom") {
    const macros = parseMacroPayload(body);
    if (!macros) return NextResponse.json({ error: "Invalid macros" }, { status: 400 });
    const name =
      kind === "custom" && typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Quick add";
    const entry = await prisma.logEntry.create({
      data: { date, meal, kind, name, ...macros },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
}
