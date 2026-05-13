/**
 * Smoke voor enforceBrandNameCapitalization (UX-fix 2026-05-13).
 * Verifieert auto-fix gedrag voor lowercase / ALL-CAPS / Title-Case
 * varianten + dat geen-match content onaangetast blijft.
 */

import { enforceBrandNameCapitalization } from '../../src/features/campaigns/lib/variant-content-sanitizer';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

console.log('\n=== enforceBrandNameCapitalization smoke ===\n');

// Lowercase -> canonical
const lower = enforceBrandNameCapitalization('Bij napking is alles automatisch.', 'Napking');
assert('lowercase napking -> Napking', lower === 'Bij Napking is alles automatisch.');

// ALL-CAPS -> canonical
const caps = enforceBrandNameCapitalization('NAPKING regelt het voor je.', 'Napking');
assert('NAPKING -> Napking', caps === 'Napking regelt het voor je.');

// Mixed case across occurrences
const mixed = enforceBrandNameCapitalization(
  'napking is goed. Napking is beter. NAPKING is het beste.',
  'Napking',
);
assert(
  'mixed-case all normalized',
  mixed === 'Napking is goed. Napking is beter. Napking is het beste.',
);

// Already canonical: no-op
const canonical = enforceBrandNameCapitalization('Napking levert kwaliteit.', 'Napking');
assert('already canonical: no-op', canonical === 'Napking levert kwaliteit.');

// Word-boundary respect: niet inside woord matchen
// "napkings" eindigt niet op word-boundary direct na "napking" (s is word-char),
// dus brand-name match faalt → content blijft ongewijzigd. Correct gedrag —
// vermijdt vreemde rewrites zoals "napkings" → "Napkings" wat ongewenst is.
const inWord = enforceBrandNameCapitalization('De napkings zijn schoon.', 'Napking');
assert(
  'word-boundary respect: napkings blijft napkings (geen brand-name match)',
  inWord === 'De napkings zijn schoon.',
);

// Empty brand name: no-op
const noBrand = enforceBrandNameCapitalization('Test content', '');
assert('empty brandName: no-op', noBrand === 'Test content');

// Regex-special characters in brand-name escaped
const specialBrand = enforceBrandNameCapitalization(
  'B&B Hospitality werkt met b&b hospitality.',
  'B&B Hospitality',
);
assert(
  'regex-special chars escaped',
  specialBrand === 'B&B Hospitality werkt met B&B Hospitality.',
);

// Empty content: no-op
const empty = enforceBrandNameCapitalization('', 'Napking');
assert('empty content: no-op', empty === '');

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
