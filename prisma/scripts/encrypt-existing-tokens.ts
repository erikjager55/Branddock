/**
 * Rewrap migration for 9.6 M10.
 *
 * Scans Account, ConnectedAccount, and WorkspaceIntegration for OAuth
 * token fields stored as plaintext and encrypts them in-place using the
 * same `encryptToken()` helper the Prisma extension uses at runtime.
 *
 * Idempotent: rows already carrying the `v1:` prefix are skipped.
 *
 * Usage:
 *   TOKEN_ENCRYPTION_KEY="<base64-32-bytes>" \
 *     DATABASE_URL="postgresql://..." \
 *     npx tsx prisma/scripts/encrypt-existing-tokens.ts
 *
 * Runs with a RAW PrismaClient (no extension) so we can see the current
 * on-disk values and write ciphertext directly without double-wrapping.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  encryptToken,
  isEncryptedToken,
  isEncryptionConfigured,
} from "../../src/lib/security/token-crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

interface RewrapResult {
  table: string;
  scanned: number;
  updated: number;
  fieldsPerRow: Array<{ id: string; fields: string[] }>;
}

function needsWrap(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !isEncryptedToken(value);
}

async function rewrapAccounts(): Promise<RewrapResult> {
  const rows = await prisma.account.findMany({
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      idToken: true,
    },
  });

  const result: RewrapResult = {
    table: "account",
    scanned: rows.length,
    updated: 0,
    fieldsPerRow: [],
  };

  for (const row of rows) {
    const data: Record<string, string | null> = {};
    const touched: string[] = [];
    if (needsWrap(row.accessToken)) {
      data.accessToken = encryptToken(row.accessToken);
      touched.push("accessToken");
    }
    if (needsWrap(row.refreshToken)) {
      data.refreshToken = encryptToken(row.refreshToken);
      touched.push("refreshToken");
    }
    if (needsWrap(row.idToken)) {
      data.idToken = encryptToken(row.idToken);
      touched.push("idToken");
    }
    if (touched.length > 0) {
      await prisma.account.update({ where: { id: row.id }, data });
      result.updated += 1;
      result.fieldsPerRow.push({ id: row.id, fields: touched });
    }
  }
  return result;
}

async function rewrapConnectedAccounts(): Promise<RewrapResult> {
  const rows = await prisma.connectedAccount.findMany({
    select: { id: true, accessToken: true, refreshToken: true },
  });

  const result: RewrapResult = {
    table: "connectedAccount",
    scanned: rows.length,
    updated: 0,
    fieldsPerRow: [],
  };

  for (const row of rows) {
    const data: Record<string, string | null> = {};
    const touched: string[] = [];
    if (needsWrap(row.accessToken)) {
      data.accessToken = encryptToken(row.accessToken);
      touched.push("accessToken");
    }
    if (needsWrap(row.refreshToken)) {
      data.refreshToken = encryptToken(row.refreshToken);
      touched.push("refreshToken");
    }
    if (touched.length > 0) {
      await prisma.connectedAccount.update({ where: { id: row.id }, data });
      result.updated += 1;
      result.fieldsPerRow.push({ id: row.id, fields: touched });
    }
  }
  return result;
}

async function rewrapWorkspaceIntegrations(): Promise<RewrapResult> {
  const rows = await prisma.workspaceIntegration.findMany({
    select: { id: true, accessToken: true, refreshToken: true },
  });

  const result: RewrapResult = {
    table: "workspaceIntegration",
    scanned: rows.length,
    updated: 0,
    fieldsPerRow: [],
  };

  for (const row of rows) {
    const data: Record<string, string | null> = {};
    const touched: string[] = [];
    if (needsWrap(row.accessToken)) {
      data.accessToken = encryptToken(row.accessToken);
      touched.push("accessToken");
    }
    if (needsWrap(row.refreshToken)) {
      data.refreshToken = encryptToken(row.refreshToken);
      touched.push("refreshToken");
    }
    if (touched.length > 0) {
      await prisma.workspaceIntegration.update({
        where: { id: row.id },
        data,
      });
      result.updated += 1;
      result.fieldsPerRow.push({ id: row.id, fields: touched });
    }
  }
  return result;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  if (!isEncryptionConfigured()) {
    console.error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate a key with:\n  openssl rand -base64 32\n",
    );
    process.exit(1);
  }

  console.log("Rewrapping OAuth tokens to v1 ciphertext...\n");

  const results: RewrapResult[] = [];
  results.push(await rewrapAccounts());
  results.push(await rewrapConnectedAccounts());
  results.push(await rewrapWorkspaceIntegrations());

  console.log("Summary:");
  for (const r of results) {
    console.log(`  ${r.table}: scanned ${r.scanned}, updated ${r.updated}`);
    for (const row of r.fieldsPerRow) {
      console.log(`    - ${row.id}: ${row.fields.join(", ")}`);
    }
  }
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  console.log(`\nTotal rows updated: ${totalUpdated}`);
}

main()
  .catch((err) => {
    console.error("Rewrap failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
