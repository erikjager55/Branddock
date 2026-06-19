/**
 * Smoke-test — GEO/SEO Fase 2 gate-laag: isPuckRenderable + LONG_FORM_GEO_PUCK_TYPES.
 * Verifieert dat long-form ALLEEN de Puck/structured-flow in mag wanneer het GEO-doel
 * actief is, en dat het bestaande website-page-type-gedrag ongewijzigd blijft
 * (geen geo-goal → identiek aan isPuckWebpageType → nul regressie in productie).
 *
 * Run: npx tsx scripts/smoke-tests/geo-puck-renderable.ts
 */
import {
  isPuckWebpageType,
  isPuckRenderable,
  PUCK_WEBPAGE_TYPES,
  LONG_FORM_GEO_PUCK_TYPES,
} from '../../src/lib/landing-pages/webpage-types';
import { getChecklistForPlatform } from '../../src/features/campaigns/lib/publish-timing';

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

console.log('── website-types: ongewijzigd (profiel-onafhankelijk) ──');
assert('landing-page renderable (geen inputs)', isPuckRenderable('landing-page', undefined) === true);
assert('product-page renderable (null inputs)', isPuckRenderable('product-page', null) === true);
assert('faq-page renderable met willekeurige inputs', isPuckRenderable('faq-page', { optimizationGoals: [] }) === true);
assert('isPuckWebpageType ongewijzigd (landing-page)', isPuckWebpageType('landing-page') === true);
assert('isPuckWebpageType ongewijzigd (blog-post)', isPuckWebpageType('blog-post') === false);

console.log('\n── long-form: alleen renderable bij GEO-doel ──');
assert('blog-post zonder inputs → false (default = [seo])', isPuckRenderable('blog-post', undefined) === false);
assert('blog-post met [seo] → false', isPuckRenderable('blog-post', { optimizationGoals: ['seo'] }) === false);
assert('blog-post met [geo] → true', isPuckRenderable('blog-post', { optimizationGoals: ['geo'] }) === true);
assert('blog-post met [seo,geo] → true', isPuckRenderable('blog-post', { optimizationGoals: ['seo', 'geo'] }) === true);
assert('whitepaper met [geo] → true', isPuckRenderable('whitepaper', { optimizationGoals: ['geo'] }) === true);
assert('blog-post met [] (opt-out) → false', isPuckRenderable('blog-post', { optimizationGoals: [] }) === false);

console.log('\n── niet-eligible types ──');
assert('instagram-post met [geo] → false (geen long-form/website)', isPuckRenderable('instagram-post', { optimizationGoals: ['geo'] }) === false);
assert('null contentType → false', isPuckRenderable(null, { optimizationGoals: ['geo'] }) === false);

console.log('\n── set-invarianten ──');
assert(
  'LONG_FORM_GEO_PUCK_TYPES bevat de 7 long-form types',
  ['blog-post', 'pillar-page', 'whitepaper', 'case-study', 'ebook', 'linkedin-article', 'thought-leadership'].every((t) =>
    LONG_FORM_GEO_PUCK_TYPES.has(t),
  ),
);
assert(
  'GEO-set disjunct van PUCK_WEBPAGE_TYPES (geen overlap)',
  [...LONG_FORM_GEO_PUCK_TYPES].every((t) => !PUCK_WEBPAGE_TYPES.has(t)),
);

console.log('\n── publish-timing checklist (gate-consumer) ──');
const geoChecklist = getChecklistForPlatform(null, null, null, 'blog-post', { optimizationGoals: ['geo'] });
assert('long-form GEO → Puck-checklist (has-title)', geoChecklist.some((i) => i.id === 'has-title'));
const seoOnlyChecklist = getChecklistForPlatform(null, null, null, 'blog-post', { optimizationGoals: ['seo'] });
assert('long-form zonder GEO → géén Puck-checklist', !seoOnlyChecklist.some((i) => i.id === 'has-title'));
assert('landing-page → Puck-checklist (ongewijzigd)', getChecklistForPlatform(null, null, null, 'landing-page', undefined).some((i) => i.id === 'has-title'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
