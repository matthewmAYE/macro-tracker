import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plan = await prisma.plan.findUnique({ where: { id: 1 } });
  return NextResponse.json(plan);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const fields = ["calories", "protein", "carbs", "fat", "fiber"] as const;
  const data: Record<string, number> = {};
  for (const f of fields) {
    const v = Number(body[f]);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: `Invalid ${f}` }, { status: 400 });
    }
    data[f] = v;
  }
  const plan = await prisma.plan.upsert({
    where: { id: 1 },
    create: { id: 1, ...(data as { calories: number; protein: number; carbs: number; fat: number; fiber: number }) },
    update: data,
  });
  return NextResponse.json(plan);
}
