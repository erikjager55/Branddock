/**
 * scripts/smoke-tests/ad-encryption.ts
 *
 * Fase B — token-encryption smoke. DB-vrij.
 *
 * Validates:
 *   - missing TOKEN_ENCRYPTION_KEY → clear error
 *   - wrong length key → clear error
 *   - roundtrip encrypt → decrypt preserves UTF-8
 *   - tampered ciphertext → auth-tag failure
 *   - empty input → rejects
 *
 * Run: `npx tsx scripts/smoke-tests/ad-encryption.ts`
 */

import { randomBytes } from 'crypto';
import {
  encryptToken,
  decryptToken,
  _resetKeyCacheForTesting,
} from '../../src/lib/ad-tokens/encryption';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function expectThrow(name: string, fn: () => unknown, pattern: RegExp) {
  try {
    fn();
    assert(name, false, 'expected throw, none thrown');
  } catch (err) {
    const msg = (err as Error).message;
    assert(name, pattern.test(msg), `got: ${msg}`);
  }
}

console.log('\n=== ad-encryption smoke ===\n');

// Case 1: missing key
delete process.env.TOKEN_ENCRYPTION_KEY;
_resetKeyCacheForTesting();
// L9-convergentie (2026-07-13): de adapter faalt nu fail-closed met een
// eigen message ("not configured — refusing to store ... in plaintext")
// i.p.v. de oude "not set". Match beide zodat de assertie stabiel is.
expectThrow(
  'throws when TOKEN_ENCRYPTION_KEY missing',
  () => encryptToken('hi'),
  /not set|not configured/,
);

// Case 2: malformed key (wrong length)
process.env.TOKEN_ENCRYPTION_KEY = Buffer.from('too-short').toString('base64');
_resetKeyCacheForTesting();
expectThrow('throws when key is wrong length', () => encryptToken('hi'), /32 bytes/);

// Case 3: roundtrip with valid key
process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
_resetKeyCacheForTesting();

const samples = [
  'short',
  'with-spaces and punctuation',
  '🔐 unicode token éàü',
  'a'.repeat(2000),
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
];

for (const original of samples) {
  const enc = encryptToken(original);
  const dec = decryptToken(enc);
  assert(`roundtrip preserves ${original.length} chars`, dec === original);
}

// Case 4: each encrypt produces fresh IV (different ciphertext for same input)
const a = encryptToken('same-input');
const b = encryptToken('same-input');
assert('IV randomized — same plaintext yields different ciphertext', a !== b);
assert('  both decrypt back to same plaintext', decryptToken(a) === decryptToken(b));

// Case 5: tampered ciphertext fails auth
const enc = encryptToken('important-secret');
const buf = Buffer.from(enc, 'base64');
buf[buf.length - 1] ^= 0xff; // flip last byte
const tampered = buf.toString('base64');
expectThrow('tampered ciphertext rejected by auth-tag', () => decryptToken(tampered), /.+/);

// Case 6: empty input
expectThrow('empty plaintext rejected', () => encryptToken(''), /non-empty/);
expectThrow('empty ciphertext rejected', () => decryptToken(''), /non-empty/);

// Case 7: malformed ciphertext (too short)
expectThrow(
  'too-short ciphertext rejected',
  () => decryptToken(Buffer.from('xx').toString('base64')),
  /malformed/,
);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
