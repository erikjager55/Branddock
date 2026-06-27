// =============================================================
// Token encryption helper — AES-256-GCM via TOKEN_ENCRYPTION_KEY.
//
// Wordt gebruikt door Fase B ad-publishing OAuth-tokens
// (ConnectedAdAccount.accessTokenEncrypted + refreshTokenEncrypted).
// Future: ook hergebruikbaar voor WorkspaceIntegration tokens.
//
// Format: base64(iv[12] || authTag[16] || ciphertext)
//
// Key-rotation: nieuwe key vereist re-encrypt van alle bestaande
// tokens. Voorlopig één key; rotation-flow komt in vervolg-spec.
// =============================================================

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16; // GCM standard
const KEY_LENGTH = 32; // 256-bit

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length === 0) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY env var is not set. Generate with `openssl rand -base64 32` and add to .env.',
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${buf.length}). Use \`openssl rand -base64 32\`.`,
    );
  }
  cachedKey = buf;
  return buf;
}

/** Encrypts a plaintext token. Returns base64(iv || tag || ciphertext). */
export function encryptToken(plain: string): string {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('encryptToken requires a non-empty string');
  }
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Decrypts a base64-encoded ciphertext produced by encryptToken. */
export function decryptToken(encoded: string): string {
  if (typeof encoded !== 'string' || encoded.length === 0) {
    throw new Error('decryptToken requires a non-empty string');
  }
  const key = getKey();
  const buf = Buffer.from(encoded, 'base64');
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Encrypted token payload is malformed (too short).');
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const enc = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/**
 * Test-only: reset the cached key. Call from unit-tests when
 * mutating process.env.TOKEN_ENCRYPTION_KEY between cases.
 */
export function _resetKeyCacheForTesting(): void {
  cachedKey = null;
}
