/**
 * Smoke-test for canvas-image-briefing-defaults — unit-level (no AI).
 *
 * Validates that the defaults-mapping returns expected source + chip + model
 * for the 23 mapped content-types and graceful null for unknown types.
 *
 * Run: `npx tsx scripts/smoke-tests/image-briefing-defaults.ts`
 */

import {
  getContentTypeImageDefaults,
  getContentTypeAspectHint,
} from '@/features/campaigns/constants/image-briefing-defaults';

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

console.log('\n=== image-briefing-defaults smoke ===\n');

// ── Decision-validating cases ──
console.log('## Decision-validating defaults\n');
{
  const tiktok = getContentTypeImageDefaults('tiktok-script');
  assert('tiktok-script default = generate (NOT trained-style)', tiktok?.source === 'generate', `got ${tiktok?.source}`);
  assert('tiktok-script chip = lifestyle (Q5 fallback decision)', tiktok?.styleDirection === 'lifestyle', `got ${tiktok?.styleDirection}`);

  const landing = getContentTypeImageDefaults('landing-page');
  assert('landing-page default = compose (Q4 decision)', landing?.source === 'compose', `got ${landing?.source}`);

  const blog = getContentTypeImageDefaults('blog-post');
  assert('blog-post default = generate', blog?.source === 'generate');
  assert('blog-post chip = illustration', blog?.styleDirection === 'illustration');
  assert('blog-post modelHint mentions Recraft', blog?.modelHint.includes('Recraft') ?? false);

  const linkedinAd = getContentTypeImageDefaults('linkedin-ad');
  assert('linkedin-ad chip = product-shot', linkedinAd?.styleDirection === 'product-shot');
  assert('linkedin-ad modelHint = GPT Image 2', linkedinAd?.modelHint.includes('GPT Image 2') ?? false);

  const promo = getContentTypeImageDefaults('promotional-email');
  assert('promotional-email chip = product-shot', promo?.styleDirection === 'product-shot');

  const careerPage = getContentTypeImageDefaults('career-page');
  assert('career-page source = library (employer-branding authenticity)', careerPage?.source === 'library');

  const pressRelease = getContentTypeImageDefaults('press-release');
  assert('press-release source = library (PR verifiability)', pressRelease?.source === 'library');
}

// ── Coverage ──
console.log('\n## Coverage check (≥ 23 types per audit Laag 4)\n');
{
  const SCOPE_TYPES = [
    'linkedin-post', 'linkedin-article', 'linkedin-ad', 'instagram-post', 'social-carousel',
    'tiktok-script', 'facebook-post', 'newsletter', 'welcome-sequence', 'promotional-email',
    'blog-post', 'whitepaper', 'landing-page', 'product-page', 'case-study',
    'one-pager', 'sales-deck', 'proposal-template', 'press-release', 'media-pitch',
    'career-page', 'job-ad-copy', 'employee-story', 'internal-comms', 'impact-report',
  ];
  const missing = SCOPE_TYPES.filter((t) => getContentTypeImageDefaults(t) === null);
  assert(
    `All ${SCOPE_TYPES.length} scope-types have defaults`,
    missing.length === 0,
    `missing: ${missing.join(', ')}`,
  );
}

// ── Graceful fallback ──
console.log('\n## Graceful fallback\n');
{
  assert('Unknown type → null (no error)', getContentTypeImageDefaults('not-a-real-type') === null);
  assert('Empty string → null', getContentTypeImageDefaults('') === null);
  assert('Null input → null', getContentTypeImageDefaults(null) === null);
  assert('Undefined input → null', getContentTypeImageDefaults(undefined) === null);
}

// ── Aspect hints ──
console.log('\n## Aspect-ratio hints\n');
{
  assert('linkedin-post aspect hint defined', !!getContentTypeAspectHint('linkedin-post'));
  assert('tiktok-script aspect = 9:16', getContentTypeAspectHint('tiktok-script') === '9:16');
  assert('instagram-post aspect = 1:1', getContentTypeAspectHint('instagram-post') === '1:1');
  assert('Unknown type aspect → null', getContentTypeAspectHint('not-a-real-type') === null);
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
