// =============================================================
// Ad-token encryption — adapter op het versioned token-crypto-contract.
//
// L9 (security-audit 2026-06-26): dit bestand had een eigen, tweede
// AES-256-GCM-implementatie (unversioned `base64(iv||tag||ct)`) náást
// `src/lib/security/token-crypto.ts` (versioned `v1:iv:tag:ct`). Twee
// divergerende crypto-shapes = drift-risico. Deze module is nu een dunne
// adapter: één crypto-primitief (de gedeelde helper) + één compat-shim
// voor het legacy on-disk-formaat.
//
// - encryptToken → schrijft ALTIJD het nieuwe v1-formaat (via de gedeelde
//   helper), zodat toekomstige rotatie/versioning centraal geregeld is.
// - decryptToken → `v1:`-rijen via de gedeelde helper; bestaande
//   unversioned rijen via het legacy-pad hieronder (backward-compatible —
//   zonder deze shim zou de gedeelde helper een oude rij als "legacy
//   plaintext" doorlaten en de token bricken, zie gotcha 2026-04-21).
//
// Signatures ongewijzigd zodat de callers (ad-publish/-accounts + jobs)
// niet raken: encryptToken(string): string, decryptToken(string): string.
// =============================================================

import { createDecipheriv } from 'crypto';
import {
  encryptToken as encryptTokenVersioned,
  decryptToken as decryptTokenVersioned,
  isEncryptedToken,
  __resetTokenCryptoCacheForTests,
} from '@/lib/security/token-crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16; // GCM standard
const KEY_LENGTH = 32; // 256-bit

/** Encrypts a plaintext token. Returns the versioned `v1:` ciphertext. */
export function encryptToken(plain: string): string {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('encryptToken requires a non-empty string');
  }
  const encrypted = encryptTokenVersioned(plain);
  // Fail-closed in ÉLKE env (ook het oude contract): de gedeelde helper doet
  // in dev/test zonder key een passthrough (retourneert plaintext) — dat mag
  // een geheim ad-token nooit onversleuteld opslaan. Een echte v1-ciphertext
  // begint met `v1:`; anders (passthrough of null) hard falen.
  if (encrypted == null || !isEncryptedToken(encrypted)) {
    throw new Error(
      'encryptToken: TOKEN_ENCRYPTION_KEY is not configured — refusing to store an ad-token in plaintext.',
    );
  }
  return encrypted;
}

/**
 * Decrypts a stored ad-token. Versioned (`v1:`) rijen lopen via de gedeelde
 * helper; legacy unversioned rijen (`base64(iv||tag||ct)`) via het pad
 * hieronder — die blijven decrypten tot een rewrap ze naar v1 tilt.
 */
export function decryptToken(encoded: string): string {
  if (typeof encoded !== 'string' || encoded.length === 0) {
    throw new Error('decryptToken requires a non-empty string');
  }
  if (isEncryptedToken(encoded)) {
    const plain = decryptTokenVersioned(encoded);
    if (plain == null) {
      throw new Error('decryptToken returned no plaintext for a v1 token');
    }
    return plain;
  }
  return decryptLegacyToken(encoded);
}

/**
 * Legacy on-disk-formaat van vóór de convergentie: `base64(iv[12] ||
 * tag[16] || ciphertext)`. Leest de master-key via dezelfde env als de
 * gedeelde helper (getKey is daar private, dus hier los ingelezen — puur
 * voor het legacy-decrypt-pad).
 */
function decryptLegacyToken(encoded: string): string {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length === 0) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY env var is not set. Generate with `openssl rand -base64 32` and add to .env.',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). Use \`openssl rand -base64 32\`.`,
    );
  }
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
 * Test-only: reset the cached key. Delegeert naar de gedeelde helper zodat
 * een env-mutatie tussen test-cases doorwerkt.
 */
export function _resetKeyCacheForTesting(): void {
  __resetTokenCryptoCacheForTests();
}
