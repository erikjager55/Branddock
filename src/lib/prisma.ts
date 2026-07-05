import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { withTokenEncryption } from "./security/token-encryption-extension";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured in .env");
}

// Serverless (Vercel): elke lambda-instance houdt een eigen pool → cap 'max'
// laag zodat veel gelijktijdige instances Neon's connection-limiet niet
// uitputten; korte idleTimeout zodat bevroren instances hun connectie loslaten.
// Gebruik de Neon POOLED endpoint (PgBouncer) in DATABASE_URL.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const pool = new pg.Pool({
  connectionString,
  max: isServerless ? 3 : 10,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 10_000,
});
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
