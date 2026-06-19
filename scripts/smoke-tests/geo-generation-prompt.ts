/**
 * Smoke-test — GEO/SEO Fase 2 generatie-activering: buildLongFormGeoSystemPrompt
 * dispatch + de GEO-checkbox-optie. Verifieert dat long-form-types de GEO-prompt
 * krijgen (die de longFormGeoVariantSchema-shape instrueert, incl. de geoArticle-
 * discriminant) en dat dit niet lekt naar andere types. De prompt-builder is puur
 * (geen live-AI); de feitelijke LLM-output blijft live-AI (deferred).
 *
 * Run: npx tsx scripts/smoke-tests/geo-generation-prompt.ts
 */
import { buildLandingPageVariantPrompt } from '../../src/lib/landing-pages/variant-generator';
import { getContentTypeInputs } from '../../src/features/campaigns/lib/content-type-inputs';

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

const base = { brand: {}, userPrompt: 'Schrijf over GEO-optimalisatie voor B2B-SaaS' };
const optValues = (o: string | { value: string; label: string }) => (typeof o === 'object' ? o.value : o);

console.log('── GEO prompt-dispatch (long-form) ──');
const geo = buildLandingPageVariantPrompt({ ...base, contentType: 'blog-post' });
assert('blog-post → GEO system-prompt met geoArticle-discriminant', geo.system.includes('"geoArticle": true'));
assert('GEO-prompt instrueert answerFirstIntro', geo.system.includes('answerFirstIntro'));
assert('GEO-prompt eist citeableStats mét bron', geo.system.includes('citeableStats') && geo.system.includes('VERPLICHTE bron'));
assert('GEO-prompt bevat tldr', geo.system.includes('tldr'));
assert('GEO-prompt rol = GEO-contentstrateeg', geo.system.includes('GEO-contentstrateeg'));
assert('GEO user-prompt-label', geo.user.includes('LONG-FORM GEO-ARTIKEL OPDRACHT'));
assert(
  'alle 7 long-form-types → GEO-prompt',
  ['blog-post', 'pillar-page', 'whitepaper', 'case-study', 'ebook', 'linkedin-article', 'thought-leadership'].every(
    (t) => buildLandingPageVariantPrompt({ ...base, contentType: t }).system.includes('"geoArticle": true'),
  ),
);

console.log('\n── geen lek naar andere types ──');
assert('landing-page → GEEN geoArticle', !buildLandingPageVariantPrompt({ ...base, contentType: 'landing-page' }).system.includes('"geoArticle": true'));
const faq = buildLandingPageVariantPrompt({ ...base, contentType: 'faq-page' });
assert('faq-page → FAQ-prompt (popularQuestions), geen geoArticle', faq.system.includes('popularQuestions') && !faq.system.includes('"geoArticle": true'));
assert('product-page → geen geoArticle', !buildLandingPageVariantPrompt({ ...base, contentType: 'product-page' }).system.includes('"geoArticle": true'));

console.log('\n── GEO-checkbox-optie (UI-activering) ──');
const goalsField = getContentTypeInputs('blog-post').find((f) => f.key === 'optimizationGoals');
assert('optimizationGoals-veld aanwezig op blog-post', !!goalsField);
assert('optimizationGoals heeft geo-optie', (goalsField?.options ?? []).some((o) => optValues(o) === 'geo'));
assert('optimizationGoals heeft seo-optie', (goalsField?.options ?? []).some((o) => optValues(o) === 'seo'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
