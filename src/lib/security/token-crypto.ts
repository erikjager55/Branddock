import crypto from "crypto";

/**
 * Field-level encryption for OAuth tokens at rest (9.6 M10).
 *
 * Uses AES-256-GCM with a 32-byte master key from `TOKEN_ENCRYPTION_KEY`
 * (base64-encoded). Ciphertext format:
 *
 *     v1:<base64-iv>:<base64-tag>:<base64-ciphertext>
 *
 * The `v1:` prefix lets us rotate to new key/algorithm versions without
 * rewriting the whole table. Values that do NOT carry the prefix are
 * treated as legacy plaintext and passed through on decrypt — run the
 * one-off rewrap script (`prisma/scripts/encrypt-existing-tokens.ts`)
 * after deploying to convert them.
 *
 * Missing key behavior:
 *  - Production (`NODE_ENV === 'production'`) without key → throw on encrypt/decrypt.
 *  - Other envs without key → warn once, return plaintext through (so local
 *    dev works without setup). Developers who want to test the prod path
 *    can set `TOKEN_ENCRYPTION_FAIL_CLOSED=1`.
 *
 * KMS upgrade: this module's contract (`encryptToken`/`decryptToken`) is
 * what downstream code uses. A future M10b can swap the implementation
 * for envelope encryption (KMS-wrapped data keys) without touching the
 * Prisma extension or any call sites.
 */

const KEY_ENV = "TOKEN_ENCRYPTION_KEY";
const FAIL_CLOSED_ENV = "TOKEN_ENCRYPTION_FAIL_CLOSED";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const CURRENT_VERSION = "v1";
const VERSION_PREFIX = `${CURRENT_VERSION}:`;

const PASSTHROUGH_SENTINEL = "__TOKEN_CRYPTO_PASSTHROUGH__";

function loadKey(): Buffer | null {
  const raw = process.env[KEY_ENV];
  if (!raw || raw.length === 0) return null;

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error(`${KEY_ENV} is not valid base64`);
  }
  if (key.length !== 32) {
    throw new Error(
      `${KEY_ENV} must decode to exactly 32 bytes (got ${key.length}). Generate with: openssl rand -base64 32`,
    );
  }
  return key;
}

let cachedKey: Buffer | null | undefined;

function getKey(): Buffer | null {
  if (cachedKey === undefined) cachedKey = loadKey();
  return cachedKey;
}

function shouldFailClosed(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env[FAIL_CLOSED_ENV] === "1"
  );
}

function requireKey(operation: "encrypt" | "decrypt"): Buffer {
  const key = getKey();
  if (key) return key;
  if (shouldFailClosed()) {
    throw new Error(
      `${KEY_ENV} is not set. Cannot ${operation} OAuth tokens. Set a 32-byte base64 key (openssl rand -base64 32).`,
    );
  }
  // Dev/test passthrough — the caller decides whether to return plaintext.
  throw new Error(PASSTHROUGH_SENTINEL);
}

let devWarnLogged = false;
function logDevPassthroughOnce(): void {
  if (devWarnLogged) return;
  devWarnLogged = true;
  console.warn(
    `[token-crypto] ${KEY_ENV} not set — storing OAuth tokens in plaintext (local/dev only). ` +
      `Set ${FAIL_CLOSED_ENV}=1 to simulate prod behavior.`,
  );
}

/** Detects whether a stored value is already in v1 ciphertext form. */
export function isEncryptedToken(stored: unknown): boolean {
  return typeof stored === "string" && stored.startsWith(VERSION_PREFIX);
}

/** True when a key is configured. Useful for startup checks. */
export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

/**
 * Encrypt a token value for storage.
 *
 * Returns `null` for null/undefined, the input unchanged for empty strings
 * (so we never overwrite a DB NULL with an encrypted empty string).
 * Values already in v1 ciphertext form are returned unchanged — this makes
 * the Prisma extension idempotent if the same args object flows through
 * multiple write hooks.
 */
export function encryptToken(
  plaintext: string | null | undefined,
): string | null {
  if (plaintext == null) return null;
  if (plaintext.length === 0) return "";
  if (isEncryptedToken(plaintext)) return plaintext;

  let key: Buffer;
  try {
    key = requireKey("encrypt");
  } catch (err) {
    if (err instanceof Error && err.message === PASSTHROUGH_SENTINEL) {
      logDevPassthroughOnce();
      return plaintext;
    }
    throw err;
  }

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${VERSION_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/**
 * Decrypt a stored token value.
 *
 * Values without the `v1:` prefix are treated as legacy plaintext and
 * returned unchanged (transitional behavior until the rewrap migration
 * is run). `v1:` values without a configured key throw — we cannot
 * silently fail to return the token.
 */
export function decryptToken(
  stored: string | null | undefined,
): string | null {
  if (stored == null) return null;
  if (stored.length === 0) return "";
  if (!isEncryptedToken(stored)) return stored;

  let key: Buffer;
  try {
    key = requireKey("decrypt");
  } catch (err) {
    if (err instanceof Error && err.message === PASSTHROUGH_SENTINEL) {
      throw new Error(
        `Cannot decrypt v1 token: ${KEY_ENV} is not set, but the DB row contains encrypted data. ` +
          `Restore the original key or run the rewrap migration with the new key.`,
      );
    }
    throw err;
  }

  const parts = stored.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid token ciphertext: wrong number of segments");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  if (iv.length !== IV_LEN) {
    throw new Error("Invalid token ciphertext: IV length mismatch");
  }
  if (tag.length !== TAG_LEN) {
    throw new Error("Invalid token ciphertext: auth tag length mismatch");
  }

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Test helper: force the key cache to be re-read (e.g. after changing env in a test). */
export function __resetTokenCryptoCacheForTests(): void {
  cachedKey = undefined;
  devWarnLogged = false;
}
