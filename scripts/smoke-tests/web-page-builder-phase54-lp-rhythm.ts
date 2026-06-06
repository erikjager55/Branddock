/**
 * Smoke-test — LP-render ritmiek (Track 4, 2026-06-06). `sectionPaddingY` las
 * `designSystem.spacing[5]` = 64px voor MINIMAL/EXPERIENTIAL → 128px lege band
 * per sectie (zwarthout's schaarse ritmiek). De clamp tempert ALLÉÉN de preset-
 * fallback naar [40,56]; een ECHT gescrapte section.paddingY passeert ongeclampt
 * (merk-fidelity).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase54-lp-rhythm.ts
 */
import { mapSectionRhythmTokens } from '../../src/lib/landing-pages/brand-tokens-v4-mappers';
import { getDesignSystemForLayoutStyle } from '../../src/lib/landing-pages/design-system';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

const fallback = { sectionPaddingY: 64, sectionPaddingX: 24, cardPaddingY: 24, cardPaddingX: 24, alternateBg: false };

console.log('── preset-fallback geclampt naar [40,56] ──');
{
  const minimal = mapSectionRhythmTokens(null, getDesignSystemForLayoutStyle('MINIMAL'), fallback);
  assert('MINIMAL (spacing[5]=64) → ≤56 (was 64 → 128px band)', minimal.sectionPaddingY <= 56 && minimal.sectionPaddingY >= 40, `${minimal.sectionPaddingY}`);
  const experiential = mapSectionRhythmTokens(null, getDesignSystemForLayoutStyle('EXPERIENTIAL'), fallback);
  assert('EXPERIENTIAL (spacing[5]=64) → ≤56', experiential.sectionPaddingY <= 56 && experiential.sectionPaddingY >= 40, `${experiential.sectionPaddingY}`);
  const commercial = mapSectionRhythmTokens(null, getDesignSystemForLayoutStyle('COMMERCIAL'), fallback);
  assert('COMMERCIAL (spacing[5]=24) → floor 40 (was te dun)', commercial.sectionPaddingY === 40, `${commercial.sectionPaddingY}`);
}

console.log('\n── gescrapte section.paddingY passeert ongeclampt (fidelity) ──');
{
  const scraped = mapSectionRhythmTokens(
    { section: { typical: { paddingY: '96px' } } },
    getDesignSystemForLayoutStyle('MINIMAL'),
    fallback,
  );
  assert('gescrapte 96px blijft 96 (niet geclampt naar 56)', scraped.sectionPaddingY === 96, `${scraped.sectionPaddingY}`);
  const scrapedTight = mapSectionRhythmTokens(
    { section: { typical: { paddingY: '32px' } } },
    getDesignSystemForLayoutStyle('MINIMAL'),
    fallback,
  );
  assert('gescrapte 32px blijft 32 (clamp raakt alleen fallback)', scrapedTight.sectionPaddingY === 32, `${scrapedTight.sectionPaddingY}`);
}

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
