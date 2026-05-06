/**
 * Snapshot hashing — canonical stringify + SHA-256.
 *
 * Used by call-tracker to dedupe BrandContextSnapshot and AICallSnapshot
 * by content-hash. Deterministic: identical content → identical hash,
 * regardless of object key order.
 */

import { createHash } from "node:crypto";

/**
 * Canonical JSON stringify. Sorted keys, no whitespace.
 * Result is deterministic for the same input value.
 *
 * Handles:
 * - Objects (recursively, with sorted keys)
 * - Arrays (preserve order — order is semantic)
 * - Primitives (numbers, strings, booleans, null)
 * - undefined → omitted (matches JSON behavior)
 *
 * Throws on circular references, BigInt, functions, symbols.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "undefined") return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot canonicalize non-finite number");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") {
    throw new Error("Cannot canonicalize BigInt");
  }
  if (typeof value === "function" || typeof value === "symbol") {
    throw new Error(`Cannot canonicalize ${typeof value}`);
  }

  if (Array.isArray(value)) {
    const parts = value.map((v) => canonicalStringify(v));
    return `[${parts.join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "undefined") continue; // skip undefined (JSON semantics)
      parts.push(`${JSON.stringify(k)}:${canonicalStringify(v)}`);
    }
    return `{${parts.join(",")}}`;
  }

  throw new Error(`Cannot canonicalize value of type ${typeof value}`);
}

/**
 * SHA-256 hex digest of a UTF-8 string.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Convenience: canonical-stringify + sha256.
 * Returns hex digest of the canonical form.
 */
export function hashContent(value: unknown): string {
  return sha256(canonicalStringify(value));
}
