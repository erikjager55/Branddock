/**
 * scripts/smoke-tests/voice-baseline-1pager.ts
 *
 * Δ-3 — pure derivation + format-helper smoke. DB-vrij.
 *
 * Validates:
 *   - empty/null voiceguide → emptyBaseline
 *   - partial voiceguide → degraded shape with derivedFromCount honest
 *   - full voiceguide → all sections populated
 *   - top-10 truncation on wordsWeUse / wordsWeAvoid
 *   - format-helper produces ≤300-word markdown with 4 sections
 *
 * Run: `npx tsx scripts/smoke-tests/voice-baseline-1pager.ts`
 */

import {
  deriveVoiceBaseline1Pager,
  formatVoiceBaseline1Pager,
} from '@/lib/brand-fidelity/voice-baseline-1pager';
import type { BrandVoiceguide } from '@prisma/client';

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

// Build minimal BrandVoiceguide for tests. Only fields that derivation reads
// matter — toneDimensions / wordsWeUse / wordsWeAvoid / antiPatterns. Other
// fields cast as unknown for DB-shape compat.
function makeVoiceguide(partial: Partial<BrandVoiceguide>): BrandVoiceguide {
  return {
    id: 'vg-test',
    workspaceId: 'ws-test',
    voiceAttributes: [],
    toneDimensions: null,
    wordsWeUse: [],
    wordsWeAvoid: [],
    antiPatterns: [],
    writingSamples: [],
    brandVoiceDescription: null,
    contentLocale: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as unknown as BrandVoiceguide;
}

console.log('\n=== voice-baseline-1pager smoke ===\n');

// ── Null / empty input ──
console.log('## Null / empty input\n');
{
  const baseline = deriveVoiceBaseline1Pager(null);
  assert('null → empty attributes', baseline.attributes.length === 0);
  assert('null → empty preferred terms', baseline.preferredTermsTop10.length === 0);
  assert('null → empty avoid terms', baseline.avoidTermsTop10.length === 0);
  assert('null → empty style rules', baseline.styleRules.length === 0);
  assert('null → derivedFromCount all zero',
    baseline.derivedFromCount.attributesAvailable === 0 &&
    baseline.derivedFromCount.preferredTermsAvailable === 0 &&
    baseline.derivedFromCount.avoidTermsAvailable === 0 &&
    baseline.derivedFromCount.styleRulesAvailable === 0,
  );

  const undefBaseline = deriveVoiceBaseline1Pager(undefined);
  assert('undefined → same as null', undefBaseline.attributes.length === 0);
}

// ── Partial voiceguide ──
console.log('\n## Partial voiceguide (3 wordsWeUse, no toneDimensions)\n');
{
  const vg = makeVoiceguide({
    wordsWeUse: ['concreet', 'direct', 'eerlijk'],
  });
  const baseline = deriveVoiceBaseline1Pager(vg);
  assert('Partial → 3 preferred terms', baseline.preferredTermsTop10.length === 3);
  assert('Partial → no fillers added', baseline.preferredTermsTop10.includes('concreet'));
  assert('Partial → 0 attributes', baseline.attributes.length === 0);
  assert('Partial → derivedFromCount honest (3)',
    baseline.derivedFromCount.preferredTermsAvailable === 3,
  );
}

// ── Full voiceguide with toneDimensions ──
console.log('\n## Full voiceguide with NN/g 4-axis tone-dimensions\n');
{
  const vg = makeVoiceguide({
    toneDimensions: {
      formalCasual: 0.7,
      seriousFunny: 0.3,
      respectfulIrreverent: 0.5,
      matterOfFactEnthusiastic: 0.8,
    } as unknown as BrandVoiceguide['toneDimensions'],
    wordsWeUse: ['merk', 'positionering', 'voice', 'consistentie', 'helder', 'stelling', 'bewijs', 'concreet'],
    wordsWeAvoid: ['synergie', 'ontzorgen', 'leverage', 'stakeholder', 'holistisch'],
    antiPatterns: [
      'Geen marketing-jargon zonder bewijs',
      'Vermijd dubbele ontkenningen',
      'Schrijf actief, niet passief',
      'Geen vulwoorden (basically, eigenlijk)',
    ],
  });
  const baseline = deriveVoiceBaseline1Pager(vg);
  assert('Full → 4 attributes uit toneDimensions', baseline.attributes.length === 4);
  assert('Full → all attributes have name/poles', baseline.attributes.every((a) => a.name && a.polePos && a.poleNeg));
  assert('Full → at least one attribute has value', baseline.attributes.some((a) => typeof a.value === 'number'));
  assert('Full → 8 preferred terms', baseline.preferredTermsTop10.length === 8);
  assert('Full → 5 avoid terms', baseline.avoidTermsTop10.length === 5);
  assert('Full → ≥1 style rule', baseline.styleRules.length >= 1);
  assert('Full → derivedFromCount preferred=8', baseline.derivedFromCount.preferredTermsAvailable === 8);
  assert('Full → derivedFromCount styleRules=4', baseline.derivedFromCount.styleRulesAvailable === 4);
}

// ── Top-10 truncation ──
console.log('\n## Top-10 truncation (15 input → 10 output)\n');
{
  const vg = makeVoiceguide({
    wordsWeUse: Array.from({ length: 15 }, (_, i) => `term-${i + 1}`),
    wordsWeAvoid: Array.from({ length: 12 }, (_, i) => `avoid-${i + 1}`),
  });
  const baseline = deriveVoiceBaseline1Pager(vg);
  assert('15 wordsWeUse → top-10', baseline.preferredTermsTop10.length === 10);
  assert('Top-10 = head van lijst (term-1 first)', baseline.preferredTermsTop10[0] === 'term-1');
  assert('Top-10 stops at term-10', baseline.preferredTermsTop10[9] === 'term-10');
  assert('12 wordsWeAvoid → top-10', baseline.avoidTermsTop10.length === 10);
  assert('Available count > top-10 (15)', baseline.derivedFromCount.preferredTermsAvailable === 15);
}

// ── Format helper ──
console.log('\n## Format helper (≤300 words, 4 sections)\n');
{
  const vg = makeVoiceguide({
    toneDimensions: {
      formalCasual: 0.8,
      seriousFunny: 0.4,
      respectfulIrreverent: 0.6,
      matterOfFactEnthusiastic: 0.5,
    } as unknown as BrandVoiceguide['toneDimensions'],
    wordsWeUse: ['merk', 'positionering', 'voice'],
    wordsWeAvoid: ['synergie', 'ontzorgen'],
    antiPatterns: ['Geen jargon', 'Schrijf actief'],
  });
  const baseline = deriveVoiceBaseline1Pager(vg);
  const formatted = formatVoiceBaseline1Pager(baseline);

  const wordCount = formatted.split(/\s+/).filter((w) => w.length > 0).length;
  console.log(`  Word-count: ${wordCount}`);
  console.log(`  Output preview (first 200 chars):\n  ${formatted.slice(0, 200).replace(/\n/g, ' ')}…`);

  assert('Format ≤ 300 words', wordCount <= 300, `actual ${wordCount}`);
  assert('Format has section "Tone-attributes"', formatted.includes('## Tone-attributes'));
  assert('Format has section "Voorkeurstermen"', formatted.includes('## Voorkeurstermen'));
  assert('Format has section "Te vermijden termen"', formatted.includes('## Te vermijden termen'));
  assert('Format has section "Style rules"', formatted.includes('## Style rules'));
  assert('Format includes preferred-term "merk"', formatted.includes('merk'));
  assert('Format includes avoid-term "synergie"', formatted.includes('synergie'));
}

// ── Format helper for empty baseline ──
console.log('\n## Format helper for empty baseline (graceful degradation)\n');
{
  const empty = deriveVoiceBaseline1Pager(null);
  const formatted = formatVoiceBaseline1Pager(empty);
  assert('Empty format has 4 placeholder sections', (formatted.match(/Nog niet vastgelegd/g) ?? []).length >= 4);
  assert('Empty format still has section headers', formatted.includes('## Voorkeurstermen'));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
