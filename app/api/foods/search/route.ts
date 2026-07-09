import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Token-AND search over searchText (which includes every merged source's
// words plus a raw/cooked marker), so "cooked sirloin steak" matches an entry
// whose display name only says "broiled".
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const tokens = q.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);
  const foods = await prisma.food.findMany({
    where: { AND: tokens.map((t) => ({ searchText: { contains: t } })) },
    include: { portions: true },
    take: 120,
  });

  // Rank: whole-word matches first, then multi-source unified entries, then
  // names that start with a query token. Branded items (ALL-CAPS brand
  // prefixes in SR Legacy) rank below generic foods; shorter names break ties.
  const scored = foods
    .map((f) => {
      const words = new Set(f.searchText.split(" "));
      const wholeWords = tokens.filter((t) => words.has(t)).length;
      const nameStarts = tokens.some((t) => f.name.toLowerCase().startsWith(t)) ? 1 : 0;
      const branded = /\b[A-Z][A-Z'&.-]{2,}\b/.test(f.name) ? 1 : 0;
      const multiSource = Math.min(f.sourceCount - 1, 4);
      const custom = f.isCustom ? 8 : 0; // the user's own foods rank first
      return {
        f,
        score: wholeWords * 10 + custom + multiSource * 3 + nameStarts * 2 - branded * 6 - f.name.length / 100,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(({ f }) => f);

  return NextResponse.json(scored);
}
