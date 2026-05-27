/**
 * Smoke-test voor Phase 2 — web-page builder (per ADR 2026-05-22-landing-page-builder-architectuur).
 *
 * Verifies:
 *  - extractBrandTokensFromStyleguide picks PRIMARY/SECONDARY/ACCENT/NEUTRAL
 *    + DISPLAY/BODY fonts from structurally-loaded styleguide records.
 *  - extractBrandTokensFromContext fallback parses hex codes + font hints
 *    from the flat BrandContextBlock strings.
 *  - DEFAULT_BRAND_TOKENS used when nothing supplied.
 *  - buildSpikePuckConfig produces 8 components.
 *  - Each component's render() returns markup that contains the brand-tokens
 *    consumed (color, font, persona name where applicable).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase2.ts
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  extractBrandTokensFromStyleguide,
  extractBrandTokensFromContext,
  DEFAULT_BRAND_TOKENS,
  type BrandTokens,
} from '../../src/lib/landing-pages/brand-tokens';
import {
  buildSpikePuckConfig,
  type SpikePuckProps,
} from '../../src/features/campaigns/components/canvas/medium/puck-config';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';

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

// ─── Fixtures ────────────────────────────────────────────────

const MOCK_STYLEGUIDE = {
  primaryFontName: 'Inter Tight',
  colors: [
    { hex: '#0D9488', category: 'PRIMARY', sortOrder: 0 },
    { hex: '#1E293B', category: 'SECONDARY', sortOrder: 0 },
    { hex: '#F59E0B', category: 'ACCENT', sortOrder: 0 },
    { hex: '#64748B', category: 'NEUTRAL', sortOrder: 0 },
  ],
  fonts: [
    { name: 'Poppins', role: 'DISPLAY', fontFamily: 'Poppins, sans-serif', sortOrder: 0 },
    { name: 'Inter', role: 'BODY', fontFamily: 'Inter, sans-serif', sortOrder: 0 },
  ],
};

const MOCK_TOKENS_FROM_STYLEGUIDE: BrandTokens = {
  ...DEFAULT_BRAND_TOKENS,
  primaryHex: '#0D9488',
  secondaryHex: '#1E293B',
  accentHex: '#F59E0B',
  neutralHex: '#64748B',
  surface: '#FFFFFF',
  onSurface: '#1E293B',
  surfaceMuted: '#64748B',
  brand: '#0D9488',
  onBrand: '#FFFFFF',
  action: '#0D9488',
  onAction: '#FFFFFF',
  accent: '#F59E0B',
  headingFont: 'Poppins, sans-serif',
  bodyFont: 'Inter, sans-serif',
};

const MOCK_PERSONA = { id: 'persona-1', name: 'Marketing Marit', serialized: '', avatarUrl: null };

function mockContext(overrides?: Partial<CanvasContextStack>): CanvasContextStack {
  return {
    brand: {
      brandName: 'TestBrand',
      brandColors: 'Primary: #0D9488, Secondary: #1E293B',
      brandFonts: 'heading: Poppins, body: Inter',
    },
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'landing-page',
    personas: [MOCK_PERSONA],
    brief: null,
    products: [],
    brandTokens: MOCK_TOKENS_FROM_STYLEGUIDE,
    ...overrides,
  };
}

// ─── 1. Brand-tokens util tests ──────────────────────────────

function testBrandTokens(): void {
  group('1. extractBrandTokensFromStyleguide');

  const tokens = extractBrandTokensFromStyleguide(MOCK_STYLEGUIDE);
  assert('primaryHex matches PRIMARY color', tokens.primaryHex === '#0D9488', tokens.primaryHex);
  assert('secondaryHex matches SECONDARY color', tokens.secondaryHex === '#1E293B', tokens.secondaryHex);
  assert('accentHex matches ACCENT color', tokens.accentHex === '#F59E0B', tokens.accentHex);
  assert('neutralHex matches NEUTRAL color', tokens.neutralHex === '#64748B', tokens.neutralHex);
  assert('headingFont uses DISPLAY fontFamily', tokens.headingFont === 'Poppins, sans-serif', tokens.headingFont);
  assert('bodyFont uses BODY fontFamily', tokens.bodyFont === 'Inter, sans-serif', tokens.bodyFont);

  group('2. extractBrandTokensFromStyleguide — fallbacks');
  const minimal = extractBrandTokensFromStyleguide({
    primaryFontName: 'Fallback Font',
    colors: [],
    fonts: [],
  });
  assert(
    'falls back to DEFAULT when no PRIMARY color',
    minimal.primaryHex === DEFAULT_BRAND_TOKENS.primaryHex,
  );
  assert(
    'uses primaryFontName when no DISPLAY font',
    minimal.headingFont === 'Fallback Font',
  );

  const nothing = extractBrandTokensFromStyleguide(null);
  assert('null styleguide returns DEFAULTS', nothing.primaryHex === DEFAULT_BRAND_TOKENS.primaryHex);

  group('3. extractBrandTokensFromContext — regex fallback');
  const ctxTokens = extractBrandTokensFromContext({
    brandColors: 'Primary: #AABBCC, Secondary: #112233',
    brandFonts: 'heading: Roboto, body: Arial',
  });
  assert('picks first hex as primary', ctxTokens.primaryHex === '#AABBCC');
  assert('picks second hex as secondary', ctxTokens.secondaryHex === '#112233');
  assert(
    'extracts heading font from string',
    ctxTokens.headingFont.toLowerCase().includes('roboto'),
    ctxTokens.headingFont,
  );

  const empty = extractBrandTokensFromContext(undefined);
  assert('undefined ctx returns DEFAULTS', empty.primaryHex === DEFAULT_BRAND_TOKENS.primaryHex);
}

// ─── 2. Puck config + 8 components ───────────────────────────

function testPuckConfig(): void {
  group('4. buildSpikePuckConfig — structure');
  const ctx = mockContext();
  const config = buildSpikePuckConfig(ctx);
  const componentNames = Object.keys(config.components ?? {}) as Array<keyof SpikePuckProps>;

  const expected: Array<keyof SpikePuckProps> = [
    'BrandHero', 'BrandCTA', 'FeatureGrid', 'Testimonial',
    'PricingTable', 'FAQ', 'Footer', 'RichText',
    // C9 — StickyCtaBar (DTS-plan)
    'StickyCtaBar',
    // DTS audit-fix #4 — StatsBlock (dark-bg highlights)
    'StatsBlock',
  ];

  assert(`exactly 10 components registered (got ${componentNames.length})`, componentNames.length === 10);
  for (const name of expected) {
    assert(`component ${name} present`, componentNames.includes(name));
  }
}

// ─── 3. Brand-token injection per render ─────────────────────

type ComponentKey = keyof SpikePuckProps;

interface RenderCheck<K extends ComponentKey> {
  name: K;
  props: SpikePuckProps[K];
  expectedSubstrings: string[];
}

function renderComponent<K extends ComponentKey>(
  config: ReturnType<typeof buildSpikePuckConfig>,
  name: K,
  props: SpikePuckProps[K],
): string {
  const def = config.components?.[name];
  if (!def) throw new Error(`Component ${name} not in config`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = (def as any).render(props as any);
  return renderToStaticMarkup(createElement(() => element));
}

function testRenderInjections(): void {
  group('5. Render output — brand-token injection');

  const ctx = mockContext();
  const config = buildSpikePuckConfig(ctx);
  const tokens = ctx.brandTokens;

  const checks: RenderCheck<ComponentKey>[] = [
    {
      name: 'BrandHero',
      props: { headline: 'Test headline', sub: 'Test sub', ctaLabel: 'Click me' },
      expectedSubstrings: [tokens.primaryHex, tokens.headingFont.split(',')[0], 'Test headline', 'Click me'],
    },
    {
      name: 'BrandCTA',
      props: { label: 'Trial', href: '/start', personaId: MOCK_PERSONA.id },
      expectedSubstrings: [tokens.primaryHex, 'Trial', MOCK_PERSONA.name],
    },
    {
      name: 'FeatureGrid',
      props: {
        columns: '3',
        features: [{ title: 'F1', description: 'D1' }, { title: 'F2', description: 'D2' }],
      },
      expectedSubstrings: ['F1', 'D2', tokens.secondaryHex],
    },
    {
      name: 'Testimonial',
      props: { quote: 'Great tool', author: 'Alex', personaId: MOCK_PERSONA.id },
      expectedSubstrings: ['Great tool', 'Alex', MOCK_PERSONA.name, tokens.secondaryHex],
    },
    {
      name: 'PricingTable',
      props: {
        tiers: [
          { name: 'Basic', price: '€9', features: 'X\nY' },
          { name: 'Pro', price: '€29', features: 'A\nB' },
        ],
      },
      expectedSubstrings: ['Basic', '€29', tokens.primaryHex],
    },
    {
      name: 'FAQ',
      props: {
        items: [
          { question: 'Why?', answer: 'Because.' },
          { question: 'How?', answer: 'Like this.' },
        ],
      },
      expectedSubstrings: ['Why?', 'Like this.'],
    },
    {
      name: 'Footer',
      props: {
        companyName: 'ACME',
        tagline: 'Best ever',
        links: [{ label: 'Privacy', href: '/p' }],
      },
      expectedSubstrings: ['ACME', 'Best ever', 'Privacy', tokens.secondaryHex],
    },
    {
      name: 'RichText',
      props: { content: 'Multi-line\ncontent block.' },
      expectedSubstrings: ['Multi-line', 'content block.', tokens.secondaryHex],
    },
  ];

  for (const check of checks) {
    let html: string;
    try {
      html = renderComponent(config, check.name, check.props);
    } catch (err) {
      assert(`${check.name} renders without error`, false, (err as Error).message);
      continue;
    }
    assert(`${check.name} renders without error`, true);
    for (const needle of check.expectedSubstrings) {
      assert(
        `${check.name} output contains "${truncate(needle, 30)}"`,
        html.includes(needle),
        `not in html (len=${html.length})`,
      );
    }
  }
}

// ─── 4. Fallback render path (no brandTokens on ctx) ────────

function testFallbackRender(): void {
  group('6. Render with no brandTokens on context — fallback path');
  const ctx = mockContext({
    brandTokens: undefined as unknown as BrandTokens,
    brand: {
      brandName: 'FallbackBrand',
      brandColors: '#AB12CD',
      brandFonts: 'heading: Lato',
    },
  });
  const config = buildSpikePuckConfig(ctx);
  const html = renderComponent(config, 'BrandHero', {
    headline: 'Fallback test',
    sub: 'Sub',
    ctaLabel: 'Btn',
  });
  assert(
    'fallback regex picks #AB12CD as primary',
    html.includes('#AB12CD'),
    `html: ${html.substring(0, 200)}`,
  );
  assert(
    'fallback picks Lato as heading',
    html.toLowerCase().includes('lato'),
  );
}

// ─── Run ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Phase 2 smoke-test — web-page builder');
  testBrandTokens();
  testPuckConfig();
  testRenderInjections();
  testFallbackRender();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}

main().catch((err) => {
  console.error('SMOKE crashed', err);
  process.exit(2);
});
