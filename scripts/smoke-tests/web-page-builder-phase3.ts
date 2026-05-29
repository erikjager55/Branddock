/**
 * Smoke-test voor Phase 3 — per-type templates + variantToPuckData.
 *
 * Verifies:
 *  - resolveTemplateBuilder returns the correct builder for all 5 web-page
 *    types (landing-page / product-page / faq-page / comparison-page /
 *    microsite) and falls back to landing-page for unknowns.
 *  - Each builder produces a valid SpikeData tree with the expected
 *    component sequence (e.g. faq-page has FAQ; product-page has PricingTable).
 *  - extractFilledFields pulls headline/sub/cta/features/faq/testimonial/
 *    pricing/longText from a realistic PreviewContent fixture.
 *  - variantToPuckData wires the extraction + builder paths so fully
 *    automated seeding works per-type.
 *  - Empty variant-content still produces a usable template (defaults filled).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase3.ts
 */

import {
  variantToPuckData,
  extractFilledFields,
} from '../../src/features/campaigns/components/canvas/medium/variant-to-puck-data';
import {
  resolveTemplateBuilder,
} from '../../src/features/campaigns/components/canvas/medium/puck-templates';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';
import type { PreviewContent } from '../../src/features/campaigns/types/canvas.types';
import { DEFAULT_BRAND_TOKENS, type BrandTokens } from '../../src/lib/landing-pages/brand-tokens';

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

function group(name: string): void {
  console.log(`\n${name}`);
}

const DEFAULT_TOKENS: BrandTokens = {
  ...DEFAULT_BRAND_TOKENS,
  headingFont: 'sans-serif',
  bodyFont: 'sans-serif',
};

function mockContext(typeId: string, overrides?: Partial<CanvasContextStack>): CanvasContextStack {
  return {
    brand: { brandName: 'TestBrand' },
    concept: {
      campaignTheme: 'Spring Launch',
      positioningStatement: 'The fastest way to launch.',
      strategicApproach: null,
      keyMessages: [],
      targetAudienceInsights: null,
      humanInsight: null,
      creativePlatform: null,
    },
    journeyPhase: null,
    medium: null,
    deliverableTypeId: typeId,
    personas: [{ id: 'p-1', name: 'Marketing Marit', serialized: '', avatarUrl: null }],
    brief: null,
    products: [],
    brandTokens: DEFAULT_TOKENS,
    ...overrides,
  };
}

const FIXTURE_RICH: PreviewContent = {
  headline: { type: 'text', content: '**Lanceer in minuten, niet weken**' },
  sub: { type: 'text', content: 'Voor MKB-marketingteams die snel willen schakelen.' },
  cta: { type: 'text', content: 'Start mijn proefperiode' },
  features: {
    type: 'text',
    content:
      '- Snel - In 5 minuten online\n- Brand-aware - Automatisch on-brand\n- Schaalbaar - Groeit mee met je business',
  },
  pricing: {
    type: 'text',
    content:
      'Starter €19/mnd\nBasis features\nE-mail support\n\nPro €49/mnd\nAlle features\nPriority support',
  },
  faq: {
    type: 'text',
    content:
      'Hoe werkt het? Heel eenvoudig: signup, kies template, publiceer.\n\nWat als ik wil opzeggen? Maandelijks opzegbaar zonder kosten.',
  },
  testimonial: {
    type: 'text',
    content: '"Onze launch is twee keer zo snel sinds we Branddock gebruiken."',
  },
};

const FIXTURE_EMPTY: PreviewContent = {};

// ─── 1. resolveTemplateBuilder ───────────────────────────────

function testTemplateResolver(): void {
  group('1. resolveTemplateBuilder');

  const allTypes = ['landing-page', 'product-page', 'faq-page', 'comparison-page', 'microsite'];
  for (const t of allTypes) {
    const builder = resolveTemplateBuilder(t);
    assert(`returns builder for "${t}"`, typeof builder === 'function');
  }

  const unknown = resolveTemplateBuilder('unknown-type');
  const fallback = resolveTemplateBuilder('landing-page');
  assert('unknown type falls back to landing-page builder', unknown === fallback);

  const nullBuilder = resolveTemplateBuilder(null);
  assert('null type falls back to landing-page builder', nullBuilder === fallback);
}

// ─── 2. extractFilledFields ──────────────────────────────────

function testExtractFilledFields(): void {
  group('2. extractFilledFields — rich fixture');

  const ctx = mockContext('landing-page');
  const filled = extractFilledFields(FIXTURE_RICH, ctx);

  assert(
    'headline stripped of markdown',
    filled.headline === 'Lanceer in minuten, niet weken',
    filled.headline,
  );
  assert(
    'sub captured',
    filled.sub.includes('snel willen schakelen'),
    filled.sub,
  );
  assert('ctaLabel captured', filled.ctaLabel === 'Start mijn proefperiode', filled.ctaLabel);

  assert(
    `features parsed (got ${filled.featureItems.length})`,
    filled.featureItems.length === 3,
  );
  assert(
    'first feature has title + description',
    filled.featureItems[0]?.title === 'Snel'
      && filled.featureItems[0]?.description === 'In 5 minuten online',
    JSON.stringify(filled.featureItems[0]),
  );

  assert(
    `pricing tiers parsed (got ${filled.pricingTiers.length})`,
    filled.pricingTiers.length >= 2,
  );
  assert(
    'first tier name is Starter',
    filled.pricingTiers[0]?.name === 'Starter',
    JSON.stringify(filled.pricingTiers[0]),
  );

  assert(
    `faq items parsed (got ${filled.faqItems.length})`,
    filled.faqItems.length === 2,
  );
  assert(
    'first FAQ question captured',
    filled.faqItems[0]?.question.endsWith('?'),
    filled.faqItems[0]?.question,
  );

  assert(
    'testimonial quote captured',
    filled.testimonialQuote.includes('twee keer zo snel'),
  );

  group('3. extractFilledFields — empty fixture falls back to concept');
  const emptyFilled = extractFilledFields(FIXTURE_EMPTY, ctx);
  assert(
    'headline falls back to campaignTheme',
    emptyFilled.headline === 'Spring Launch',
    emptyFilled.headline,
  );
  assert(
    'sub falls back to positioningStatement',
    emptyFilled.sub === 'The fastest way to launch.',
    emptyFilled.sub,
  );
}

// ─── 3. Per-type template structure ──────────────────────────

function testPerTypeTemplates(): void {
  group('4. Per-type template — component sequence');

  const cases: Array<{ type: string; expectedTypes: string[]; mustInclude: string[] }> = [
    {
      type: 'landing-page',
      expectedTypes: ['BrandHero', 'FeatureGrid', 'BrandCTA', 'FAQ', 'Footer'],
      mustInclude: ['FAQ'],
    },
    {
      type: 'product-page',
      expectedTypes: ['BrandHero', 'FeatureGrid', 'PricingTable', 'Testimonial', 'BrandCTA', 'Footer'],
      mustInclude: ['PricingTable', 'Testimonial'],
    },
    {
      type: 'faq-page',
      expectedTypes: ['BrandHero', 'FAQ', 'BrandCTA', 'Footer'],
      mustInclude: ['FAQ'],
    },
    {
      type: 'comparison-page',
      expectedTypes: ['BrandHero', 'FeatureGrid', 'PricingTable', 'RichText', 'BrandCTA', 'Footer'],
      mustInclude: ['PricingTable', 'RichText'],
    },
    {
      type: 'microsite',
      expectedTypes: ['BrandHero', 'RichText', 'FeatureGrid', 'Testimonial', 'RichText', 'BrandCTA', 'Footer'],
      mustInclude: ['RichText', 'Testimonial'],
    },
  ];

  for (const c of cases) {
    const ctx = mockContext(c.type);
    const data = variantToPuckData(FIXTURE_RICH, ctx);
    const types = data.content.map((c2) => c2.type);
    assert(
      `${c.type} → ${c.expectedTypes.length} components`,
      types.length === c.expectedTypes.length,
      `got ${types.join(',')}`,
    );
    for (let i = 0; i < c.expectedTypes.length; i++) {
      assert(
        `${c.type} position ${i} is ${c.expectedTypes[i]}`,
        types[i] === c.expectedTypes[i],
        `got ${types[i]}`,
      );
    }
    for (const required of c.mustInclude) {
      assert(`${c.type} contains ${required}`, (types as string[]).includes(required));
    }
  }
}

// ─── 4. Empty content still produces usable templates ────────

function testEmptyContentSeeding(): void {
  group('5. Empty PreviewContent — usable templates per type');

  const types = ['landing-page', 'product-page', 'faq-page', 'comparison-page', 'microsite'];
  for (const t of types) {
    const ctx = mockContext(t);
    const data = variantToPuckData(FIXTURE_EMPTY, ctx);
    assert(`${t}: tree has > 0 components`, data.content.length > 0);
    const heroProps = data.content.find((c) => c.type === 'BrandHero')?.props as
      | { headline?: string }
      | undefined;
    assert(
      `${t}: BrandHero headline non-empty`,
      typeof heroProps?.headline === 'string' && heroProps.headline.length > 0,
    );
  }
}

// ─── 5. Filled values are seeded into BrandHero ──────────────

function testHeroSeeding(): void {
  group('6. BrandHero seeded with extracted headline + sub + cta');

  const ctx = mockContext('landing-page');
  const data = variantToPuckData(FIXTURE_RICH, ctx);
  const hero = data.content.find((c) => c.type === 'BrandHero')?.props as
    | { headline?: string; sub?: string; ctaLabel?: string }
    | undefined;

  assert(
    'hero.headline matches rich fixture',
    hero?.headline === 'Lanceer in minuten, niet weken',
    hero?.headline,
  );
  assert(
    'hero.sub matches rich fixture',
    hero?.sub?.includes('snel willen schakelen') ?? false,
    hero?.sub,
  );
  assert(
    'hero.ctaLabel matches rich fixture',
    hero?.ctaLabel === 'Start mijn proefperiode',
    hero?.ctaLabel,
  );

  const cta = data.content.find((c) => (c as { type: string }).type === 'BrandCTA')?.props as
    | { personaId?: string }
    | undefined;
  assert(
    'CTA has first persona auto-assigned',
    cta?.personaId === 'p-1',
    cta?.personaId,
  );
}

async function main(): Promise<void> {
  console.log('Phase 3 smoke-test — per-type templates + extraction');
  testTemplateResolver();
  testExtractFilledFields();
  testPerTypeTemplates();
  testEmptyContentSeeding();
  testHeroSeeding();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});
