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
// ⚠️ DEZE ASSERTIE PINT EEN TEGENSTRIJDIGHEID VAST — lees dit vóór je hem "repareert".
//
// De directive zegt op deze regel: "elk cijfer/feit heeft een expliciete bron uit
// de aangeleverde context". In DEZELFDE prompt staat 27 regels verderop
// (`variant-generator.ts`, het JSON-contract) juist: een eigen/first-party
// merk-cijfer krijgt `source: null`.
//
// Die tweede helft is de fix van 2026-06-24 (`2f78eec3`, changelog #340). De
// aanleiding was precies deze eis: een verplichte bron dwong het model er één te
// VERZINNEN, meestal een interne context-laagnaam die als bronvermelding op de
// klantpagina belandde. De prompt-kant is toen gecorrigeerd, deze directive niet.
//
// Sinds 2026-08-19 draait deze bewaker in de PR-poort (#374). Daarmee dwingt CI de
// verouderde helft actief af: wie `geo-directives.ts` fatsoeneert, krijgt hier rood
// en zou de oude tekst kunnen terugzetten om de gate groen te krijgen. Dat is
// precies de fout die #375 in `geo-generation-prompt` moest herstellen, nu
// geautomatiseerd.
//
// Bewust NIET zelf opgelost: de prompt wijzigen is een generatie-kwaliteitsafweging
// (de sanitizer vangt de oude leak nog, maar `INTERNAL_SOURCE_PATTERNS` is een
// denylist van vier — een verzonnen "McKinsey, 2024" glipt erdoor). Dat besluit
// ligt bij Erik. Wordt de directive aangepast, dan hoort DEZE assertie mee te
// veranderen — niet de directive terug.
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
