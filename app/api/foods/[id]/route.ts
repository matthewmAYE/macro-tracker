import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
