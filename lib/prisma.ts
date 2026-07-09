import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

// dev.db lives at the project root (see DATABASE_URL in .env). Resolve from
// cwd so the same client works for `next dev` and for scripts.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`,
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
