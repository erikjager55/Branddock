/**
 * Smoke-test voor Layer 1 generic property-evals.
 * Sub-sprint #5.A foundation — 15 checks × representative fixtures.
 *
 * Doel:
 *   - Per check ≥ 1 PASS-fixture + ≥ 1 FAIL-fixture (positive + negative case)
 *   - Cumulatieve runtime check: alle 15 checks < 100ms per variant
 *   - Severity-mapping: 5 block / 8 warn / 2 info
 *
 * Run: npx tsx scripts/smoke-tests/property-evals.ts
 * Geen DB nodig — pure functions.
 */

import { runAllPropertyEvals } from '../../src/lib/content-test/property-evals';
import type {
  PropertyEvalCheckId,
  PropertyEvalContext,
} from '../../src/lib/content-test/types';

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

/** Default-context voor positive-case fixtures (alles OK). */
function defaultContext(overrides: Partial<PropertyEvalContext> = {}): PropertyEvalContext {
  return {
    expectedLanguage: 'nl',
    brandName: 'Napking',
    contentType: 'blog-post',
    wordBounds: { min: 50, max: 2000 },
    groupType: 'body',
    requiresCTA: false,
    knownEntities: ['Napking', 'Napking Pro', 'Napking Studio'],
    siblingVariants: [],
    ...overrides,
  };
}

/** Vind het result voor een check-id. */
function find(results: ReturnType<typeof runAllPropertyEvals>['results'], id: PropertyEvalCheckId) {
  return results.find((r) => r.check === id)!;
}

async function main() {
  console.log('\n=== Layer 1 property-evals — 15 checks × representative fixtures ===\n');

  // ─── PASS-fixture: clean NL blog-content ─────────────────────
  console.log('\n## Positive case — clean NL content\n');
  const cleanContent = `# Vakmanschap als basis

Bij Napking geloven we dat aandacht voor detail het verschil maakt. Onze
ervaren team levert handgemaakte producten die jaren meegaan.

## Onze aanpak

We werken vanuit drie kernwaarden: precisiewerk, transparantie en respect
voor materiaal. Elk Napking-product wordt zorgvuldig samengesteld.

## Resultaat voor jou

Een product dat past bij wie jij bent. Met aandacht gemaakt, voor langdurig
gebruik.`;

  const cleanResult = runAllPropertyEvals(cleanContent, defaultContext());
  assert('clean content: passed = true', cleanResult.passed === true);
  assert('clean content: 0 block-violations', cleanResult.blockViolations.length === 0);
  assert('clean content: runtime < 100ms', cleanResult.runtimeMs < 100, `got ${cleanResult.runtimeMs.toFixed(1)}ms`);
  assert('clean content: all 17 checks executed', cleanResult.results.length === 17);

  // ─── Per-check negative-case fixtures ────────────────────────

  console.log('\n## Negative cases — één fixture per check\n');

  // #1 schema-valid: empty content
  const emptyResult = runAllPropertyEvals('', defaultContext());
  assert('#1 schema-valid blocks on empty content', !find(emptyResult.results, 'schema-valid').pass);
  assert('#1 schema-valid severity = block', find(emptyResult.results, 'schema-valid').severity === 'block');

  // #2 language-match: EN content tagged als NL
  const enContent = 'In conclusion, this is a long English text that should be detected by franc-min as English language. Branddock makes premium products for discerning customers worldwide.';
  const langResult = runAllPropertyEvals(enContent, defaultContext({ expectedLanguage: 'nl', brandName: 'Branddock', knownEntities: ['Branddock'] }));
  assert('#2 language-match flags EN content as NL', !find(langResult.results, 'language-match').pass);

  // #3 length-bounds: too short
  const shortResult = runAllPropertyEvals('Te kort.', defaultContext({ wordBounds: { min: 50, max: 2000 } }));
  assert('#3 length-bounds flags too-short content', !find(shortResult.results, 'length-bounds').pass);

  // #4 banned-phrase: "state-of-the-art"
  const bannedContent = 'Onze state-of-the-art oplossing maakt het verschil voor klanten met hoge eisen.';
  const bannedResult = runAllPropertyEvals(bannedContent, defaultContext());
  assert('#4 banned-phrase flags "state-of-the-art"', !find(bannedResult.results, 'banned-phrase').pass);
  assert('#4 banned-phrase severity = warn', find(bannedResult.results, 'banned-phrase').severity === 'warn');

  // #5 brand-name-capitalization: "napking" lowercase
  const wrongBrandContent = 'Bij napking werken we hard. We zijn napking voor jou. Vraag napking om hulp.';
  const wrongBrandResult = runAllPropertyEvals(wrongBrandContent, defaultContext());
  assert('#5 brand-name-capitalization blocks wrong case', !find(wrongBrandResult.results, 'brand-name-capitalization').pass);
  assert('#5 brand-name-capitalization severity = block', find(wrongBrandResult.results, 'brand-name-capitalization').severity === 'block');

  // #6 placeholder-detection: [PRICE]
  const placeholderContent = 'Bestel nu voor slechts [PRICE] per stuk. Beperkte voorraad.';
  const placeholderResult = runAllPropertyEvals(placeholderContent, defaultContext());
  assert('#6 placeholder-detection blocks [PRICE]', !find(placeholderResult.results, 'placeholder-detection').pass);
  assert('#6 placeholder-detection severity = block', find(placeholderResult.results, 'placeholder-detection').severity === 'block');

  // #7 pii-safety: e-mail in content
  const piiContent = 'Neem contact op via info@napking.nl voor meer informatie over onze diensten.';
  const piiResult = runAllPropertyEvals(piiContent, defaultContext());
  assert('#7 pii-safety blocks e-mail address', !find(piiResult.results, 'pii-safety').pass);
  assert('#7 pii-safety severity = block', find(piiResult.results, 'pii-safety').severity === 'block');

  // #8 heading-hierarchy: H1 → H3 skip
  const skipContent = `# Hoofdtitel\n\n### Subtitle springt naar H3\n\nTekst hier.`;
  const skipResult = runAllPropertyEvals(skipContent, defaultContext());
  assert('#8 heading-hierarchy flags H1→H3 jump', !find(skipResult.results, 'heading-hierarchy').pass);

  // #9 cta-presence: requires-CTA without action verb
  const noCtaContent = 'Onze diensten zijn beschikbaar. Wij helpen graag bij vraagstukken in jouw sector. Meer informatie volgt later.';
  const noCtaResult = runAllPropertyEvals(noCtaContent, defaultContext({ requiresCTA: true }));
  assert('#9 cta-presence flags missing action-verb when requiresCTA', !find(noCtaResult.results, 'cta-presence').pass);

  // #16 cta-quality: generic "Submit" / "Lees meer" zonder specificiteit
  const genericCtaContent = 'Klik hier voor meer informatie over onze diensten en aanbiedingen.';
  const genericCtaResult = runAllPropertyEvals(
    genericCtaContent,
    defaultContext({ requiresCTA: true, groupType: 'cta' }),
  );
  assert(
    '#16 cta-quality flags generic "Klik hier"',
    !find(genericCtaResult.results, 'cta-quality').pass,
  );

  // #17 meta-description-compliance: te kort + generic opener
  const badMetaContent = 'Welkom bij Napking';
  const badMetaResult = runAllPropertyEvals(
    badMetaContent,
    defaultContext({ groupType: 'meta_description' }),
  );
  assert(
    '#17 meta-description-compliance flags too-short + generic opener',
    !find(badMetaResult.results, 'meta-description-compliance').pass,
  );

  // #10 hallucination-flag: 3+ unknown capitalized entities
  const hallucinateContent = 'Bij Napking werken we samen met Acme Corp, Globex Industries, Initech Solutions en TechStartup BV.';
  const hallucinateResult = runAllPropertyEvals(hallucinateContent, defaultContext());
  assert('#10 hallucination-flag flags unknown entities', !find(hallucinateResult.results, 'hallucination-flag').pass);

  // #11 sentence-case-headings: Title Case in NL
  const titleCaseContent = `# This Is A Title Case Heading In Dutch\n\nText here.\n\n## Another Capital Letters Heading\n\nMore text.`;
  const titleResult = runAllPropertyEvals(titleCaseContent, defaultContext());
  assert('#11 sentence-case-headings flags Title Case', !find(titleResult.results, 'sentence-case-headings').pass);

  // #12 minimum-heading-count: long-form met 1 H2
  const fewHeadingsContent = `# Hoofdtitel\n\nLange tekst zonder veel structuur. ${'Lorem ipsum '.repeat(50)}\n\n## Enige H2\n\nMeer tekst.`;
  const fewHeadingsResult = runAllPropertyEvals(fewHeadingsContent, defaultContext({ contentType: 'blog-post' }));
  assert('#12 minimum-heading-count flags too few H2s in long-form', !find(fewHeadingsResult.results, 'minimum-heading-count').pass);

  // #13 markdown-leakage: bold-markers in plain-text group
  const leakedContent = 'This headline has **bold markdown** in plain-text group.';
  const leakedResult = runAllPropertyEvals(leakedContent, defaultContext({ groupType: 'headline' }));
  assert('#13 markdown-leakage flags bold in headline group', !find(leakedResult.results, 'markdown-leakage').pass);

  // #14 language-directive-consistency: deferred (always pass v1)
  assert('#14 language-directive-consistency deferred to v2', find(cleanResult.results, 'language-directive-consistency').pass);

  // #15 duplicate-content: variant too similar to sibling
  const dupSibling = 'Onze aanpak werkt vanuit drie kernwaarden: precisiewerk, transparantie en respect voor materiaal. Elk product is zorgvuldig samengesteld.';
  const dupContent = 'Onze aanpak werkt vanuit drie kernwaarden: precisiewerk, transparantie en respect voor materiaal. Elk product is met aandacht gemaakt.';
  const dupResult = runAllPropertyEvals(dupContent, defaultContext({ siblingVariants: [dupSibling] }));
  assert('#15 duplicate-content flags >70% similarity', !find(dupResult.results, 'duplicate-content').pass);

  // ─── Severity-distribution check ─────────────────────────────
  console.log('\n## Severity-distribution check\n');

  // Build worst-case content dat MANY checks faalt om severity-counts te bepalen
  const worstContent = `[PRICE] napking is the BEST. Click info@napking.nl. **Bold**`;
  const worstResult = runAllPropertyEvals(worstContent, defaultContext({ groupType: 'headline', requiresCTA: true, wordBounds: { min: 50, max: 200 } }));
  const blockCount = worstResult.results.filter((r) => !r.pass && r.severity === 'block').length;
  assert(`worst-case: blockViolations ≥ 3 (placeholder + pii + brand-mismatch)`, blockCount >= 3, `got ${blockCount}`);
  assert(`worst-case: passed = false`, worstResult.passed === false);

  // ─── Runtime budget check ────────────────────────────────────
  console.log('\n## Runtime budget check\n');
  // Genereer 1000-word fixture om realistische load te simuleren
  const longContent = 'Vakmanschap. '.repeat(500);
  const longResult = runAllPropertyEvals(longContent, defaultContext({ wordBounds: { min: 100, max: 5000 } }));
  assert(`runtime budget: 1000-word content < 100ms`, longResult.runtimeMs < 100, `got ${longResult.runtimeMs.toFixed(1)}ms`);

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
