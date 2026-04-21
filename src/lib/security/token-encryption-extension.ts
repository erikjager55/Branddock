import type { PrismaClient } from "@prisma/client";
import { encryptToken, decryptToken } from "./token-crypto";

/**
 * Prisma Client extension that transparently encrypts OAuth token fields
 * on write and decrypts them on read (9.6 M10).
 *
 * Wired in `src/lib/prisma.ts` so that every consumer of the shared prisma
 * client — including Better Auth's prismaAdapter, our API route handlers,
 * and `syncOAuthTokensToWorkspace` — sees plaintext in memory and
 * ciphertext on disk without code changes at call sites.
 *
 * Fields covered:
 *  - Account.{accessToken,refreshToken,idToken}   (Better Auth login tokens)
 *  - ConnectedAccount.{accessToken,refreshToken}  (Settings > Integrations)
 *  - WorkspaceIntegration.{accessToken,refreshToken}  (per-workspace API tokens)
 *
 * Not covered (by design):
 *  - Account.password          (scrypt-hashed, not reversible)
 *  - Session.token             (Better Auth rotates; low value to encrypt)
 *  - Verification.value        (short-lived one-time codes)
 */

const ENCRYPTED_FIELDS = {
  account: ["accessToken", "refreshToken", "idToken"] as const,
  connectedAccount: ["accessToken", "refreshToken"] as const,
  workspaceIntegration: ["accessToken", "refreshToken"] as const,
} satisfies Record<string, readonly string[]>;

type ModelKey = keyof typeof ENCRYPTED_FIELDS;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function encryptFields(
  fields: readonly string[],
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const field of fields) {
    if (field in out) {
      const v = out[field];
      if (v == null || typeof v === "string") {
        out[field] = encryptToken(v ?? null);
      } else if (isPlainObject(v) && "set" in v) {
        // Prisma update syntax: { set: value }
        const inner = v as { set?: unknown };
        if (typeof inner.set === "string" || inner.set === null) {
          out[field] = { ...v, set: encryptToken(inner.set as string | null) };
        }
      }
      // Other operators (increment/decrement/etc.) don't apply to string fields.
    }
  }
  return out;
}

function encryptWriteArgs(
  fields: readonly string[],
  args: unknown,
): unknown {
  if (!isPlainObject(args)) return args;
  const next: Record<string, unknown> = { ...args };

  // create / update / upsert.create / upsert.update accept `data`
  if ("data" in next) {
    const d = next.data;
    if (Array.isArray(d)) {
      next.data = d.map((row) =>
        isPlainObject(row) ? encryptFields(fields, row) : row,
      );
    } else if (isPlainObject(d)) {
      next.data = encryptFields(fields, d);
    }
  }
  // upsert-specific
  if ("create" in next && isPlainObject(next.create)) {
    next.create = encryptFields(fields, next.create);
  }
  if ("update" in next && isPlainObject(next.update)) {
    next.update = encryptFields(fields, next.update);
  }
  return next;
}

function decryptFields<T>(fields: readonly string[], row: T): T {
  if (!isPlainObject(row)) return row;
  const out: Record<string, unknown> = row;
  for (const field of fields) {
    if (field in out) {
      const v = out[field];
      if (typeof v === "string" || v === null) {
        out[field] = decryptToken(v as string | null);
      }
    }
  }
  return row;
}

function decryptResult<T>(fields: readonly string[], result: T): T {
  if (result == null) return result;
  if (Array.isArray(result)) {
    return result.map((r) => decryptFields(fields, r)) as unknown as T;
  }
  if (isPlainObject(result)) {
    // createMany returns { count }, no row to decrypt
    const keys = Object.keys(result);
    if (keys.length === 1 && keys[0] === "count") return result;
    return decryptFields(fields, result);
  }
  return result;
}

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
]);

function buildHooks(fields: readonly string[]) {
  return {
    async $allOperations({
      operation,
      args,
      query,
    }: {
      operation: string;
      args: unknown;
      query: (args: unknown) => Promise<unknown>;
    }) {
      const transformedArgs = WRITE_OPERATIONS.has(operation)
        ? encryptWriteArgs(fields, args)
        : args;
      const result = await query(transformedArgs);
      return decryptResult(fields, result);
    },
  };
}

/**
 * Apply the token-encryption query extension to a PrismaClient instance.
 *
 * Returns the extended client. Type inference on call sites keeps working
 * because Prisma's $extends preserves the model delegates.
 */
export function withTokenEncryption<T extends PrismaClient>(client: T) {
  return client.$extends({
    name: "token-encryption",
    query: {
      account: buildHooks(ENCRYPTED_FIELDS.account),
      connectedAccount: buildHooks(ENCRYPTED_FIELDS.connectedAccount),
      workspaceIntegration: buildHooks(ENCRYPTED_FIELDS.workspaceIntegration),
    },
  });
}

export const TOKEN_ENCRYPTED_FIELDS = ENCRYPTED_FIELDS;
export type { ModelKey };
