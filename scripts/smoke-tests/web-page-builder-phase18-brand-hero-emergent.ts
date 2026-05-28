/**
 * Smoke-test voor Pad C Sub-Sprint B Phase 3 — BrandHero brand-emergent renderer.
 *
 * Verifies dat de nieuwe brandHeroComponent render-function voor verschillende
 * archetype × layoutStyle combinaties MEANINGFUL VERSCHILLENDE output produceert.
 *
 * Renderers worden via react-dom/server gerenderd naar HTML-strings; assertions
 * inspecteren style-attributen + content om brand-emergent gedrag te bewijzen.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase18-brand-hero-emergent.ts
 */

import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildSpikePuckConfig,
} from '../../src/features/campaigns/components/canvas/medium/puck-config';
import type { CanvasContextStack } from '../../src/lib/ai/canvas-context';
import { getDesignSystemForLayoutStyle } from '../../src/lib/landing-pages/design-system';
import {
  DEFAULT_BRAND_TOKENS,
  type BrandTokens,
} from '../../src/lib/landing-pages/brand-tokens';

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

// ─── Fixture brand-tokens ─────────────────────────────

function makeLinfiTokens(): BrandTokens {
  return {
    ...DEFAULT_BRAND_TOKENS,
    surface: '#F5F6F7',
    onSurface: '#000000',
    surfaceMuted: '#404D5E',
    surfaceBorder: '#DDDEDF',
    brand: '#B59032',
    onBrand: '#000000',
    brandSubtle: '#F5E5C8',
    action: '#B59032',
    onAction: '#000000',
    accent: '#CAA33F',
    headingFont: '"Cormorant Garamond", serif',
    bodyFont: '"DM Sans", sans-serif',
    primaryHex: '#B59032',
    secondaryHex: '#000000',
    accentHex: '#CAA33F',
    neutralHex: '#404D5E',
    layoutStyle: 'MINIMAL',
    designSystem: getDesignSystemForLayoutStyle('MINIMAL'),
    archetype: 'RULER',
  };
}

function makeBranddockTokens(): BrandTokens {
  return {
    ...DEFAULT_BRAND_TOKENS,
    surface: '#FFFFFF',
    onSurface: '#0F172A',
    surfaceMuted: '#64748B',
    surfaceBorder: '#E2E8F0',
    brand: '#1FD1B2',
    onBrand: '#000000',  // teal needs dark text
    brandSubtle: '#E6F9F5',
    action: '#1FD1B2',
    onAction: '#000000',
    accent: '#F59E0B',
    headingFont: 'system-ui, sans-serif',
    bodyFont: 'system-ui, sans-serif',
    primaryHex: '#1FD1B2',
    secondaryHex: '#0F172A',
    accentHex: '#F59E0B',
    neutralHex: '#64748B',
    layoutStyle: 'COMMERCIAL',
    designSystem: getDesignSystemForLayoutStyle('COMMERCIAL'),
    archetype: 'SAGE',
  };
}

function makeJesterTokens(): BrandTokens {
  return {
    ...DEFAULT_BRAND_TOKENS,
    brand: '#FF6B6B',
    onBrand: '#FFFFFF',
    layoutStyle: 'PLAYFUL',
    designSystem: getDesignSystemForLayoutStyle('PLAYFUL'),
    archetype: 'JESTER',
  };
}

function makeHeroExperientialTokens(): BrandTokens {
  return {
    ...DEFAULT_BRAND_TOKENS,
    brand: '#000000',
    onBrand: '#FFFFFF',
    onSurface: '#000000',
    layoutStyle: 'EXPERIENTIAL',
    designSystem: getDesignSystemForLayoutStyle('EXPERIENTIAL'),
    archetype: 'HERO',
  };
}

// ─── Render helper ─────────────────────────────────────

function renderBrandHero(tokens: BrandTokens, props: { headline: string; sub: string; ctaLabel: string; heroVisualUrl?: string }): string {
  const ctx: CanvasContextStack = {
    brand: { brandName: 'Test', brandTokens: tokens },
    personas: [],
    brief: null,
    concept: null,
    journeyPhase: null,
    medium: null,
    deliverableTypeId: 'landing-page',
    products: [],
    brandTokens: tokens,
  } as unknown as CanvasContextStack;
  const config = buildSpikePuckConfig(ctx);
  const heroComponent = config.components.BrandHero;
  // @ts-expect-error — Puck's component-shape; render is callable in tests
  const element = heroComponent.render({ ...props, heroVisualUrl: props.heroVisualUrl ?? '' });
  return renderToStaticMarkup(element);
}

const PROPS = {
  headline: 'Premium meets craft',
  sub: 'Vakmanschap dat decennia meegaat — voor architecten en designers.',
  ctaLabel: 'Plan een afspraak',
};

// ─── Tests ─────────────────────────────────────────────

group('LINFI (RULER + MINIMAL) — full-bleed placeholder, dark frame');
{
  const html = renderBrandHero(makeLinfiTokens(), PROPS);
  // Geen heroVisualUrl → placeholder frame (dark-framed)
  assert('contains placeholder label', html.includes('Architectuurfoto'));
  // 100vh full viewport
  assert('100vh hero (minHeight)', html.includes('min-height:100vh'));
  // Bottom-left text alignment
  assert('flex-end justifyContent (bottom-positioned)', html.includes('justify-content:flex-end'));
  assert('text-align:left', html.includes('text-align:left'));
  // Cormorant display font
  assert('Cormorant Garamond display-font', html.includes('Cormorant Garamond'));
  // Display size sparse uit MINIMAL modular scale ≈ [48, 60, 76, 96],
  // sparse pakt index 2 (76px). Clamp() wrapt het.
  assert('display font-size max sparse-2 (modular)', html.includes(', 76px)') || html.includes(', 72px)'));
  // Display weight 300 (sparse, lichtste)
  assert('display weight 300', html.includes('font-weight:300'));
  // Button sharp (radius 0) + uppercase + 0.1em
  assert('button radius 0', html.includes('border-radius:0'));
  assert('button uppercase', html.includes('text-transform:uppercase'));
  assert('button letter-spacing 0.1em', html.includes('letter-spacing:0.1em'));
}

group('LINFI met heroVisualUrl — full-bleed image rendering');
{
  const html = renderBrandHero(makeLinfiTokens(), { ...PROPS, heroVisualUrl: 'https://example.com/hero.jpg' });
  // Background-image moet de URL bevatten
  assert('hero-image URL in background-image', html.includes('https://example.com/hero.jpg'));
  assert('linear-gradient overlay', html.includes('linear-gradient'));
  assert('background-size:cover', html.includes('background-size:cover'));
  // Geen placeholder-label meer (heroVisualUrl aanwezig)
  assert('geen placeholder label meer', !html.includes('Architectuurfoto'));
}

group('Branddock (SAGE + COMMERCIAL) — solid-brand centered');
{
  const html = renderBrandHero(makeBranddockTokens(), PROPS);
  // COMMERCIAL forceert solid-brand
  assert('solid-brand bg (geen full-bleed image)', !html.includes('linear-gradient'));
  // Background = brand-color
  assert('background:#1FD1B2 (teal brand)', html.includes('#1FD1B2'));
  // Centered text alignment
  assert('justify-content:center (vertical center)', html.includes('justify-content:center'));
  assert('text-align:center', html.includes('text-align:center'));
  // System-ui (geen Cormorant)
  assert('system-ui font (geen Cormorant)', html.includes('system-ui') && !html.includes('Cormorant'));
  // Display size dense uit COMMERCIAL modular ≈ [32, 40, 48], dense pakt
  // index 1 (40px). Clamp-wrapper.
  assert('display font-size max dense (modular)', html.includes(', 40px)') || html.includes(', 42px)'));
  // Button rounded (radius 8)
  assert('button radius 8', html.includes('border-radius:8'));
}

group('JESTER + PLAYFUL — gradient-brand pill-button');
{
  const html = renderBrandHero(makeJesterTokens(), PROPS);
  // Gradient
  assert('linear-gradient brand', html.includes('linear-gradient(135deg'));
  // Button pill (radius 999)
  assert('button radius 999 (pill)', html.includes('border-radius:999'));
  // Lowercase (friendly)
  assert('button NIET uppercase', !html.includes('text-transform:uppercase'));
  // Nunito font
  assert('Nunito display font', html.includes('Nunito'));
}

group('HERO + EXPERIENTIAL — dramatic typography');
{
  const html = renderBrandHero(makeHeroExperientialTokens(), { ...PROPS, heroVisualUrl: 'https://example.com/hero.jpg' });
  // Display dramatic uit EXPERIENTIAL modular ≈ [80, 120, 184, 272],
  // dramatic pakt max-index. Clamp-wrapper.
  assert(
    'display font-size dramatic (modular)',
    html.includes(', 272px)') || html.includes(', 184px)') || html.includes(', 144px)'),
  );
  // Display weight 900 (zwaarste)
  assert('display weight 900', html.includes('font-weight:900'));
  // Inter font
  assert('Inter display font', html.includes('Inter'));
  // 100vh + centered (EXPERIENTIAL fullViewportHeight)
  assert('min-height:100vh', html.includes('min-height:100vh'));
}

group('Cross-brand differentiation — meaningful verschillen');
{
  const linfi = renderBrandHero(makeLinfiTokens(), PROPS);
  const branddock = renderBrandHero(makeBranddockTokens(), PROPS);
  const jester = renderBrandHero(makeJesterTokens(), PROPS);

  // Linfi vs Branddock: andere typography (Cormorant vs system-ui)
  assert(
    'LINFI gebruikt Cormorant, Branddock niet',
    linfi.includes('Cormorant') && !branddock.includes('Cormorant'),
  );
  // Linfi (MINIMAL modular sparse ≈ 76) vs Branddock (COMMERCIAL modular
  // dense ≈ 40) — beide via clamp-wrapper.
  assert(
    'LINFI vs Branddock display size verschilt (modular)',
    (linfi.includes(', 76px)') || linfi.includes(', 72px)')) &&
    (branddock.includes(', 40px)') || branddock.includes(', 42px)')),
  );
  // Linfi vs Jester: andere button-shape (radius 0 vs 999)
  assert(
    'LINFI button radius 0, Jester radius 999',
    linfi.includes('border-radius:0') && jester.includes('border-radius:999'),
  );
  // Linfi heeft placeholder-frame (geen image), Branddock niet (solid-brand)
  assert(
    'LINFI heeft placeholder, Branddock niet',
    linfi.includes('Architectuurfoto') && !branddock.includes('Architectuurfoto'),
  );
}

group('Backward-compat — defaults zonder archetype');
{
  // DEFAULT_BRAND_TOKENS heeft archetype=null + designSystem=COMMERCIAL preset
  // Render moet niet crashen, valt terug op COMMERCIAL solid-brand
  const html = renderBrandHero(DEFAULT_BRAND_TOKENS, PROPS);
  assert('renders met archetype=null', html.length > 100);
  assert('default tokens → solid-brand (geen gradient)', !html.includes('linear-gradient(135deg'));
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}
