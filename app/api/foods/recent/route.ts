import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Most recently logged foods (distinct), for one-tap re-adding.
export async function GET() {
  const entries = await prisma.logEntry.findMany({
    where: { kind: "food", foodId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { foodId: true },
    take: 200,
  });
  const ids: number[] = [];
  for (const e of entries) {
    if (e.foodId !== null && !ids.includes(e.foodId)) ids.push(e.foodId);
    if (ids.length >= 12) break;
  }
  const foods = await prisma.food.findMany({
    where: { id: { in: ids } },
    include: { portions: true },
  });
  foods.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return NextResponse.json(foods);
}
