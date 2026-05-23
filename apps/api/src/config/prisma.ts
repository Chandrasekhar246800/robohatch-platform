import { PrismaClient, Prisma } from "@prisma/client";
import { env } from './env';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (env.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export Prisma namespace for types
export { Prisma };

