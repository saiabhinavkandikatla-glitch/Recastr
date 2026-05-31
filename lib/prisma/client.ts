import { PrismaClient } from "@prisma/client";

for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  if (process.env[key]) {
    process.env[key] = process.env[key]?.trim().replace(/^['"]|['"]$/g, "");
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
