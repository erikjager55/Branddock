import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { withTokenEncryption } from "./security/token-encryption-extension";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured in .env");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

function createPrismaClient() {
  const base = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
  // 9.6 M10: transparent AES-256-GCM encryption of OAuth tokens on
  // Account, ConnectedAccount, and WorkspaceIntegration. See
  // src/lib/security/token-encryption-extension.ts.
  return withTokenEncryption(base);
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
