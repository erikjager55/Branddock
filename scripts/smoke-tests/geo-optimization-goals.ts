/**
 * Smoke-test — GEO/SEO Fase 1b: optimizationGoals-veld (SEO opt-in, default-aan)
 * + resolveOptimizationGoals + shouldRunSeoPipeline (de gedeelde gate-regel die
 * de orchestrator gebruikt om long-form door de SEO-pipeline te sturen).
 *
 * Run: npx tsx scripts/smoke-tests/geo-optimization-goals.ts
 */
import { getContentTypeInputs } from '../../src/features/campaigns/lib/content-type-inputs';
import {
  resolveOptimizationGoals,
  shouldRunSeoPipeline,
} from '../../src/lib/ai/seo-pipeline-utils';

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

console.log('── optimizationGoals-veld injectie ──');
const blogField = getContentTypeInputs('blog-post').find((f) => f.key === 'optimizationGoals');
assert('blog-post krijgt optimizationGoals-veld', !!blogField);
assert('veldtype is checkbox-group', blogField?.type === 'checkbox-group');
assert('default = ["seo"]', JSON.stringify(blogField?.defaultValue) === JSON.stringify(['seo']));
assert(
  'alle 7 long-form types krijgen het veld',
  ['blog-post', 'pillar-page', 'whitepaper', 'case-study', 'ebook', 'linkedin-article', 'thought-leadership'].every(
    (t) => getContentTypeInputs(t).some((f) => f.key === 'optimizationGoals'),
  ),
);
assert(
  'website-type (landing-page) krijgt het veld NIET',
  !getContentTypeInputs('landing-page').some((f) => f.key === 'optimizationGoals'),
);
assert(
  'social-type (linkedin-post) krijgt het veld NIET',
  !getContentTypeInputs('linkedin-post').some((f) => f.key === 'optimizationGoals'),
);

console.log('\n── resolveOptimizationGoals ──');
assert('geen input → default ["seo"]', JSON.stringify(resolveOptimizationGoals(undefined, 'blog-post')) === JSON.stringify(['seo']));
assert('lege array → opt-out []', resolveOptimizationGoals({ optimizationGoals: [] }, 'blog-post').length === 0);
assert(
  '["seo","geo"] → beide',
  JSON.stringify(resolveOptimizationGoals({ optimizationGoals: ['seo', 'geo'] }, 'blog-post')) === JSON.stringify(['seo', 'geo']),
);
assert('onbekende waarde wordt gefilterd', resolveOptimizationGoals({ optimizationGoals: ['bogus'] }, 'blog-post').length === 0);

console.log('\n── shouldRunSeoPipeline ──');
assert('website + keyword → true', shouldRunSeoPipeline('landing-page', undefined, true) === true);
assert('website zonder keyword → false', shouldRunSeoPipeline('landing-page', undefined, false) === false);
assert('long-form default (SEO aan) + keyword → true', shouldRunSeoPipeline('blog-post', undefined, true) === true);
assert('long-form SEO uitgevinkt → false', shouldRunSeoPipeline('blog-post', { optimizationGoals: [] }, true) === false);
assert('long-form alleen GEO (geen seo) → false', shouldRunSeoPipeline('blog-post', { optimizationGoals: ['geo'] }, true) === false);
assert('long-form zonder keyword → false', shouldRunSeoPipeline('blog-post', undefined, false) === false);
assert('niet-SEO-type (instagram-post) → false', shouldRunSeoPipeline('instagram-post', undefined, true) === false);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
