/**
 * scripts/smoke-tests/ad-creative-validation.ts
 *
 * Fase B — creative-spec validator smoke. DB-vrij, geen Meta API call.
 *
 * Validates:
 *   - valid spec → ok=true
 *   - missing fields → rejected with field-specific issue
 *   - char-overflow per Meta hard-limit → rejected
 *   - non-CTA enum value → rejected
 *   - non-HTTPS image URL → rejected
 *   - malformed landing-page URL → rejected
 *
 * Run: `npx tsx scripts/smoke-tests/ad-creative-validation.ts`
 */

import { validateFacebookCreative } from '../../src/lib/ad-providers/meta/publish';
import type { FacebookAdCreativeSpec } from '../../src/lib/ad-providers/meta/publish';

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

function hasIssue(issues: ReturnType<typeof validateFacebookCreative>['issues'], field: string): boolean {
  return issues.some((i) => i.field === field);
}

const validSpec: FacebookAdCreativeSpec = {
  primaryText: 'Generate brand-aligned content faster with Branddock.',
  headline: 'Stop fixing AI slop',
  description: 'Built for marketers',
  ctaButton: 'LEARN_MORE',
  imageUrl: 'https://cdn.example.com/hero.jpg',
  landingPageUrl: 'https://branddock.io',
};

console.log('\n=== ad-creative-validation smoke ===\n');

// Case 1: full valid spec
{
  const result = validateFacebookCreative(validSpec);
  assert('valid spec is accepted', result.ok && result.issues.length === 0);
}

// Case 2: missing required fields
{
  const result = validateFacebookCreative({});
  assert('empty spec is rejected', !result.ok);
  assert('  rejects with primaryText issue', hasIssue(result.issues, 'primaryText'));
  assert('  rejects with headline issue', hasIssue(result.issues, 'headline'));
  assert('  rejects with description issue', hasIssue(result.issues, 'description'));
  assert('  rejects with ctaButton issue', hasIssue(result.issues, 'ctaButton'));
  assert('  rejects with imageUrl issue', hasIssue(result.issues, 'imageUrl'));
  assert('  rejects with landingPageUrl issue', hasIssue(result.issues, 'landingPageUrl'));
}

// Case 3: char-overflow per Meta hard-limit
{
  const overflow = validateFacebookCreative({
    ...validSpec,
    primaryText: 'a'.repeat(126), // 1 over 125
  });
  assert('rejects primaryText > 125 chars', hasIssue(overflow.issues, 'primaryText'));
}
{
  const overflow = validateFacebookCreative({
    ...validSpec,
    headline: 'a'.repeat(41), // 1 over 40
  });
  assert('rejects headline > 40 chars', hasIssue(overflow.issues, 'headline'));
}
{
  const overflow = validateFacebookCreative({
    ...validSpec,
    description: 'a'.repeat(31), // 1 over 30
  });
  assert('rejects description > 30 chars', hasIssue(overflow.issues, 'description'));
}

// Case 4: CTA enum
{
  const bad = validateFacebookCreative({ ...validSpec, ctaButton: 'CLICKBAIT' as never });
  assert('rejects unknown CTA', hasIssue(bad.issues, 'ctaButton'));
}

// Case 5: image URL must be HTTPS
{
  const bad = validateFacebookCreative({ ...validSpec, imageUrl: 'http://insecure.example/img.jpg' });
  assert('rejects HTTP imageUrl', hasIssue(bad.issues, 'imageUrl'));
}

// Case 6: malformed landing-page URL
{
  const bad = validateFacebookCreative({ ...validSpec, landingPageUrl: 'not a url' });
  assert('rejects malformed landingPageUrl', hasIssue(bad.issues, 'landingPageUrl'));
}

// Case 7: boundary — exactly at limits
{
  const exact = validateFacebookCreative({
    ...validSpec,
    primaryText: 'a'.repeat(125),
    headline: 'a'.repeat(40),
    description: 'a'.repeat(30),
  });
  assert('accepts exact-boundary content (125/40/30)', exact.ok);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
