import { PrismaClient } from "../generated/prisma";

// Keep a single PrismaClient instance during development to avoid exhausting connections
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}


