/**
 * Smoke-test — Typography-fix Fase 2 (type-scale rem-normalisatie + extractor
 * first-family canonicalisatie). Verifieert de deterministisch testbare delen:
 *
 *   1. resolveSizeToRem normaliseert px/pt/clamp/calc naar rem; var()/onbekend
 *      blijft verbatim (fail-safe).
 *   2. normalizeTypeScale behoudt ALLE velden (object-spread) en het aantal
 *      entries (geen dedup) — zodat de size-gedreven rol-mapping niet breekt.
 *   3. extractTypographyByRole kiest de canonieke merk-font, niet de
 *      Adobe-CLS-fallback die vooraan in de stack staat.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase45-typescale-normalizer.ts
 */
import {
  lengthToRem,
  resolveSizeToRem,
  normalizeTypeScale,
} from '../../src/lib/brandstyle/type-scale-normalizer';
import { extractTypographyByRole } from '../../src/lib/brandstyle/typography-extractor';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('── resolveSizeToRem: eenheid-normalisatie ──');
assert('clamp(2.5rem,...,6.5rem) → 2.5rem (min-arg)', resolveSizeToRem('clamp(2.5rem, 3.824vw + 1.276rem, 6.5rem)') === '2.5rem', `got=${resolveSizeToRem('clamp(2.5rem, 3.824vw + 1.276rem, 6.5rem)')}`);
assert('36px → 2.25rem', resolveSizeToRem('36px') === '2.25rem', `got=${resolveSizeToRem('36px')}`);
assert('16pt → 1.333rem', resolveSizeToRem('16pt') === '1.333rem', `got=${resolveSizeToRem('16pt')}`);
assert('18px → 1.125rem', resolveSizeToRem('18px') === '1.125rem', `got=${resolveSizeToRem('18px')}`);
assert('2rem → 2rem (identiteit, geen rebase-aanname)', resolveSizeToRem('2rem') === '2rem', `got=${resolveSizeToRem('2rem')}`);
assert('var(--x) → ongewijzigd (fail-safe)', resolveSizeToRem('var(--x)') === 'var(--x)', `got=${resolveSizeToRem('var(--x)')}`);
assert('lege string → ongewijzigd', resolveSizeToRem('') === '');
assert('lengthToRem(36px) === 2.25', lengthToRem('36px') === 2.25);

console.log('\n── normalizeTypeScale: veldbehoud + aantal ──');
assert('[] → []', normalizeTypeScale([]).length === 0);
const withExtras = normalizeTypeScale([
  { level: 'H1', name: 'Hero', size: '36px', lineHeight: '1.2', weight: '700', color: '#111', usage: 'titles', letterSpacing: '-0.01em' },
]);
assert('behoudt color', withExtras[0].color === '#111');
assert('behoudt usage', withExtras[0].usage === 'titles');
assert('behoudt letterSpacing', withExtras[0].letterSpacing === '-0.01em');
assert('size genormaliseerd naar rem', withExtras[0].size === '2.25rem', `got=${withExtras[0].size}`);
const multi = normalizeTypeScale([
  { level: 'H1', name: 'A', size: '32px', lineHeight: '1.2', weight: '700' },
  { level: 'H2', name: 'B', size: '2rem', lineHeight: '1.3', weight: '600' },
  { level: 'Body', name: 'C', size: '16px', lineHeight: '1.6', weight: '400' },
]);
assert('aantal entries ongewijzigd (geen dedup)', multi.length === 3);

console.log('\n── extractTypographyByRole: canonieke first-family ──');
const css = "body{font-family:'effra',system-ui} h1{font-family:'effra-fallback','effra',sans-serif}";
const roles = extractTypographyByRole(css);
assert('body.fontFamily === effra', roles.body?.fontFamily === 'effra', `got=${roles.body?.fontFamily}`);
assert('display.fontFamily === effra (niet effra-fallback)', roles.display?.fontFamily === 'effra', `got=${roles.display?.fontFamily}`);

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
