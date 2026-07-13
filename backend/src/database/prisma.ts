import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../config/env";

export type TransactionClient = Prisma.TransactionClient;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.IS_PROD
        ? ["error", "warn"]
        : ["query", "error", "warn"]
  });

if (!env.IS_PROD) {
  globalForPrisma.prisma = prisma;
}

const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, closing Prisma`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

export default prisma;
