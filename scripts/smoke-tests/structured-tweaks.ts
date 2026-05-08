/**
 * Smoke-test for canvas-tweaks-structured-skeleton.
 *
 * Validates:
 *   1. linkedin-carousel WITHOUT vs WITH `slideSkeleton` — verifieer dat
 *      WITH-output exact die slide-titels gebruikt (regex match)
 *   2. landing-page WITHOUT vs WITH `sectionSkeleton` — verifieer geen
 *      generieke "Why Choose Us"-section in WITH-output
 *   3. Naked-fix unit-checks — verifieer dat microsite + newsletter nu
 *      hun verwachte bundles bevatten (geen AI-call nodig)
 *
 * Run: `set -a && source .env.local && set +a && npm run smoke:structured-tweaks`
 */

import { dispatchTextCompletion } from '@/lib/ai/dispatch-completion';
import {
  formatBrandContext,
  SYSTEM_BASE,
  type BrandContextBlock,
} from '@/lib/ai/prompt-templates';
import { buildBrandVoiceDirectiveFromContext } from '@/lib/studio/brand-voice-directive';
import { getContentTypeInputs } from '@/features/campaigns/lib/content-type-inputs';

let pass = 0;
let fail = 0;
let warn = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function softCheck(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.warn(`  ⚠ ${name}${detail ? ` — ${detail}` : ''} (soft check — AI variance)`);
    warn++;
  }
}

const brandCtx: BrandContextBlock = {
  contentLanguage: 'nl',
  brandName: 'Better Brands',
  brandPurpose: 'Help merkmanagers consistente brand-content produceren zonder eigen taal-team.',
  brandPromise: 'Brand-control op AI-snelheid.',
  brandPersonality: 'Direct, concreet, anti-fluff.',
  industry: 'B2B SaaS / brand-management',
  targetAudience: 'Senior brand-managers en marketing-leads bij mid-market B2B-bedrijven',
  brandToneOfVoice: 'Stellig, geen marketingjargon, korte zinnen, nederlands van werkvloer-niveau.',
};

// Generic landing-page section fingerprints — these are AI-default sections that
// should NOT appear when sectionSkeleton overrides them
const GENERIC_LP_SECTION_FINGERPRINTS = [
  /^#+\s+(Why|Waarom) (Choose|Kies|Kiezen voor)\b/im,
  /^#+\s+About Us\b/im,
  /^#+\s+Over Ons\b/im,
  /^#+\s+(Our|Onze) (Features|Voordelen|Mogelijkheden)\b/im,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) if (p.test(text)) n++;
  return n;
}

interface AITestCase {
  name: string;
  contentType: string;
  briefingTask: string;
  withInputs: Record<string, string | number | boolean>;
  withoutInputs?: Record<string, string | number | boolean>;
}

async function generateForCase(
  contentType: string,
  briefingTask: string,
  inputs: Record<string, string | number | boolean>,
): Promise<string> {
  const fields = getContentTypeInputs(contentType);
  const inputLines: string[] = [];
  for (const f of fields) {
    const v = inputs[f.key];
    if (v == null || v === '') continue;
    inputLines.push(`- ${f.label}: ${typeof v === 'boolean' ? (v ? 'yes' : 'no') : v}`);
  }

  const userPrompt = [
    buildBrandVoiceDirectiveFromContext(brandCtx),
    formatBrandContext(brandCtx),
    `## Content Type\n${contentType}`,
    inputLines.length ? `## Content-Specific Inputs\n${inputLines.join('\n')}` : '',
    `## Task\n${briefingTask}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const result = await dispatchTextCompletion({
    resolvedModel: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
    systemPrompt: SYSTEM_BASE,
    userPrompt,
    maxTokens: 1500,
    temperature: 0.5, // lower temp for structural tasks per task-file risk-1 mitigation
  });
  return result.content ?? '';
}

(async () => {
  console.log('=== structured-tweaks smoke-test ===');

  // ── Test 1: naked-fix unit-checks (no AI required) ──
  console.log('\n## Naked-fix unit-checks\n');
  const micrositeFields = getContentTypeInputs('microsite').map((f) => f.key);
  assert('microsite has pageSkeleton', micrositeFields.includes('pageSkeleton'));
  assert('microsite has narrativeFlow', micrositeFields.includes('narrativeFlow'));
  assert('microsite has webPage-bundle field (sectionStructure or seoFocus)',
    micrositeFields.includes('sectionStructure') || micrositeFields.includes('seoFocus'),
    `microsite fields: ${micrositeFields.join(',')}`);

  const newsletterFields = getContentTypeInputs('newsletter').map((f) => f.key);
  assert('newsletter has email-bundle (ctaPlacement)', newsletterFields.includes('ctaPlacement'));
  assert('newsletter has personalize', newsletterFields.includes('personalize'));
  assert('newsletter has previewTextLength', newsletterFields.includes('previewTextLength'));
  assert('newsletter has featuredItem', newsletterFields.includes('featuredItem'));
  assert('newsletter has recurringSegments', newsletterFields.includes('recurringSegments'));

  const linkedinCarouselFields = getContentTypeInputs('linkedin-carousel').map((f) => f.key);
  assert('linkedin-carousel has slideSkeleton', linkedinCarouselFields.includes('slideSkeleton'));
  assert('linkedin-carousel has slideHook', linkedinCarouselFields.includes('slideHook'));

  // ── Test 2: linkedin-carousel slideSkeleton honoring ──
  console.log('\n## linkedin-carousel — slideSkeleton honoring\n');
  const carouselSlides = [
    'Het probleem niemand benoemt',
    'De data die het bewijst',
    'Wat anderen verkeerd doen',
    'Onze aanpak in 3 stappen',
    'De volgende stap',
  ];
  const carouselOutput = await generateForCase(
    'linkedin-carousel',
    'Schrijf een 5-slide LinkedIn-carousel over brand-consistency. Output: per slide title + 2-3 zinnen body.',
    {
      slidesCount: 5,
      slideSkeleton: carouselSlides.join('\n'),
      slideHook: 'De meeste merken meten brand-voice niet — wij wel.',
    },
  );
  console.log(`  Output (first 600 chars): ${carouselOutput.slice(0, 600).replace(/\n/g, ' ')}…`);

  let titlesFound = 0;
  for (const title of carouselSlides) {
    if (carouselOutput.toLowerCase().includes(title.toLowerCase())) titlesFound++;
  }
  assert(
    `All 5 slide titles appear verbatim in output (found ${titlesFound}/5)`,
    titlesFound === 5,
    `missing: ${carouselSlides.filter((t) => !carouselOutput.toLowerCase().includes(t.toLowerCase())).join(' | ')}`,
  );

  // ── Test 3: landing-page sectionSkeleton — no generic sections ──
  console.log('\n## landing-page — sectionSkeleton no-generic-injection\n');
  const lpSections = [
    'Het stille probleem in B2B-content',
    'Hoe Better Brands voice-fidelity meet',
    'Wat klanten zien na 4 weken',
    'Start je gratis trial',
  ];
  const lpOutput = await generateForCase(
    'landing-page',
    'Schrijf een landing-page (max 600 woorden) voor de Brand Voice Analyzer. Output: per section title + body-paragraaf.',
    {
      sectionSkeleton: lpSections.join('\n'),
      conversionGoal: 'Free Trial',
      valueProposition: 'Detecteer brand-fluff in copy voordat het de pers haalt',
      targetObjection: 'AI-tools snijden te veel persoonlijkheid weg',
    },
  );
  console.log(`  Output (first 500 chars): ${lpOutput.slice(0, 500).replace(/\n/g, ' ')}…`);

  let lpTitlesFound = 0;
  for (const title of lpSections) {
    if (lpOutput.toLowerCase().includes(title.toLowerCase())) lpTitlesFound++;
  }
  assert(
    `All 4 section titles appear verbatim in landing-page output (found ${lpTitlesFound}/4)`,
    lpTitlesFound === 4,
    `missing: ${lpSections.filter((t) => !lpOutput.toLowerCase().includes(t.toLowerCase())).join(' | ')}`,
  );

  const genericMatches = countMatches(lpOutput, GENERIC_LP_SECTION_FINGERPRINTS);
  assert(
    'landing-page output has 0 generic AI-injected sections (Why Choose Us / About / Features)',
    genericMatches === 0,
    `still matched: ${GENERIC_LP_SECTION_FINGERPRINTS.filter((p) => p.test(lpOutput)).map((p) => p.source).join(', ')}`,
  );

  console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed, ${warn} soft-warnings ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
