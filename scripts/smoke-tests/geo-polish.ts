/**
 * Smoke-test — GEO/SEO Fase 3: composable GEO-polish-stage. Verifieert de pure
 * prompt-builder (polish-modus directive + behoud-SEO-instructie + draft-envelope),
 * het gating-predikaat (alleen seo-geo op long-form), en de fail-soft op lege
 * input. De feitelijke LLM-herwrite blijft live-AI (deferred), net als de
 * SEO-pipeline zelf.
 *
 * Run: npx tsx scripts/smoke-tests/geo-polish.ts
 */
import { buildGeoPolishPrompt, shouldApplyGeoPolish, runGeoPolish } from '../../src/lib/ai/geo-polish';
import type { ResolvedModel } from '../../src/lib/ai/feature-models';

let pass = 0,
  fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

console.log('── buildGeoPolishPrompt ──');
const { systemPrompt, userPrompt } = buildGeoPolishPrompt('# Titel\n\nBestaande SEO-content.', {
  locale: 'nl-NL',
  voiceDirective: 'BRAND-VOICE: helder en direct.',
});
assert('bevat polish-directive (trade-off)', systemPrompt.includes('Trade-off') && systemPrompt.toLowerCase().includes('wint altijd answer-first'));
assert('behoud-SEO-instructie', systemPrompt.includes('BEHOUD') && systemPrompt.includes('keywords'));
assert('draft-envelope schema', systemPrompt.includes('"draft"'));
assert('voiceDirective ingebed', systemPrompt.includes('BRAND-VOICE: helder en direct.'));
assert('userPrompt bevat de bestaande content', userPrompt.includes('Bestaande SEO-content.'));

console.log('\n── shouldApplyGeoPolish (gating) ──');
assert('seo-geo + blog-post → polish', shouldApplyGeoPolish(['seo', 'geo'], 'blog-post') === true);
assert('geo-only + whitepaper → polish', shouldApplyGeoPolish(['geo'], 'whitepaper') === true);
assert('seo-only + blog-post → GEEN polish', shouldApplyGeoPolish(['seo'], 'blog-post') === false);
assert('seo-geo + landing-page (geen long-form) → GEEN polish', shouldApplyGeoPolish(['seo', 'geo'], 'landing-page') === false);
assert('seo-geo + product-page → GEEN polish', shouldApplyGeoPolish(['seo', 'geo'], 'product-page') === false);
assert('leeg profiel → GEEN polish', shouldApplyGeoPolish([], 'blog-post') === false);

console.log('\n── runGeoPolish fail-soft ──');
// Alleen het lege-input-pad wordt geraakt (returnt vóór modelgebruik) → shape-cast volstaat.
const dummyModel = { provider: 'anthropic', model: 'claude-x' } as unknown as ResolvedModel;
async function main(): Promise<void> {
  const empty = await runGeoPolish('   ', dummyModel);
  assert('lege content → ongewijzigd terug (geen LLM-call)', empty === '   ');
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}
void main();
