/**
 * Smoke-test — GEO/SEO Fase 3: buildGeoDirective() canonieke directive +
 * de inbedding in de long-form GEO-generatie-prompt. Verifieert dat de directive
 * de kernprincipes draagt (answer-first / atomic chunking / cited-stats /
 * entity-clarity / freshness / anti-patterns), dat de polish-modus de trade-off-
 * regel toevoegt, en dat de gestructureerde GEO-prompt de directive bevat (één
 * bron, geen drift tussen generatie en polish).
 *
 * Run: npx tsx scripts/smoke-tests/geo-directives.ts
 */
import { buildGeoDirective, GEO_DIRECTIVE_VERSION } from '../../src/lib/ai/prompts/geo-directives';
import { buildLandingPageVariantPrompt } from '../../src/lib/landing-pages/variant-generator';

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

console.log('── buildGeoDirective kernprincipes ──');
const gen = buildGeoDirective({ locale: 'nl-NL' });
assert('version geëxporteerd', GEO_DIRECTIVE_VERSION === '1.0.0');
assert('Answer-first', gen.includes('Answer-first'));
assert('Atomic chunking', gen.includes('Atomic chunking'));
assert('Citeerbare stats MET bron', gen.includes('Citeerbare stats MET bron'));
assert('Entity-clarity', gen.includes('Entity-clarity'));
assert('Freshness', gen.includes('Freshness'));
assert('Anti-patterns', gen.includes('Anti-patterns'));

console.log('\n── modus-verschil generate vs polish ──');
assert('generate-modus heeft GEEN trade-off-regel', !gen.includes('Trade-off'));
const polish = buildGeoDirective({ locale: 'nl-NL', mode: 'polish' });
assert('polish-modus heeft trade-off-regel', polish.includes('Trade-off'));
assert('polish: answer-first wint van keyword-first', polish.toLowerCase().includes('wint altijd answer-first'));

console.log('\n── inbedding in long-form GEO-prompt (geen drift) ──');
const geoPrompt = buildLandingPageVariantPrompt({
  brand: {},
  userPrompt: 'Schrijf over GEO',
  contentType: 'blog-post',
}).system;
assert('GEO-prompt bevat de canonieke directive-kop', geoPrompt.includes('# GEO-DIRECTIVE'));
assert('GEO-prompt bevat answer-first uit directive', geoPrompt.includes('Answer-first (AEO)'));
assert('directive niet gelekt naar landing-page', !buildLandingPageVariantPrompt({ brand: {}, userPrompt: 'x', contentType: 'landing-page' }).system.includes('# GEO-DIRECTIVE'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
