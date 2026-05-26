/**
 * Smoke-test voor Pad C Sub-Sprint A — Design-system foundation.
 *
 * Verifies:
 *  - getDesignSystemForLayoutStyle: 5 LayoutStyle-presets, alle compleet
 *  - Spacing/Typography/Radius/Alternation/ImageStrategy verschillen MEANINGFUL
 *    tussen MINIMAL en COMMERCIAL (sanity-check niet alleen kopie-paste)
 *  - nearestSpacing helper picks closest waarde uit scale
 *  - backgroundForSectionIndex wraps modulo pattern-length
 *  - resolveDesignSystem accepteert overrides
 *  - extractBrandTokensFromStyleguide populeert v3 designSystem
 *  - LINFI fixture met layoutStyle=MINIMAL → MINIMAL design-system
 *  - extractor zonder layoutStyle → DEFAULT_LAYOUT_STYLE
 *  - extractBrandTokensFromContext (fallback-pad) ook v3-compliant
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase15-design-system.ts
 */

import {
  getDesignSystemForLayoutStyle,
  resolveDesignSystem,
  nearestSpacing,
  backgroundForSectionIndex,
  DEFAULT_LAYOUT_STYLE,
  type LayoutStyle,
} from '../../src/lib/landing-pages/design-system';
import {
  extractBrandTokensFromStyleguide,
  extractBrandTokensFromContext,
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

const ALL_LAYOUTS: LayoutStyle[] = [
  'MINIMAL',
  'EDITORIAL',
  'COMMERCIAL',
  'EXPERIENTIAL',
  'PLAYFUL',
];

// ─── Tests ─────────────────────────────────────────────

group('getDesignSystemForLayoutStyle — 5 presets compleet');
for (const layout of ALL_LAYOUTS) {
  const ds = getDesignSystemForLayoutStyle(layout);
  assert(`${layout}: layoutStyle field`, ds.layoutStyle === layout);
  assert(`${layout}: spacing array niet leeg`, ds.spacing.length > 0);
  assert(`${layout}: typography.display.fontFamily aanwezig`, ds.typography.display.fontFamily.length > 0);
  assert(`${layout}: typography.heading.weights niet leeg`, ds.typography.heading.weights.length > 0);
  assert(`${layout}: typography.body.sizes niet leeg`, ds.typography.body.sizes.length > 0);
  assert(`${layout}: typography.label.textTransform uppercase`, ds.typography.label.textTransform === 'uppercase');
  assert(`${layout}: radius.button is number`, typeof ds.radius.button === 'number');
  assert(`${layout}: imageStrategy.placeholderLabel niet leeg`, ds.imageStrategy.placeholderLabel.length > 0);
  assert(`${layout}: sectionAlternation.pattern niet leeg`, ds.sectionAlternation.pattern.length > 0);
}

group('MINIMAL vs COMMERCIAL — meaningful differentiation');
{
  const minimal = getDesignSystemForLayoutStyle('MINIMAL');
  const commercial = getDesignSystemForLayoutStyle('COMMERCIAL');
  assert(
    'MINIMAL gebruikt serif display, COMMERCIAL system-ui',
    minimal.typography.display.fontFamily.includes('Cormorant')
    && commercial.typography.display.fontFamily.includes('system-ui'),
  );
  assert(
    'MINIMAL display heeft lichter weight (300/400) dan COMMERCIAL (600/700)',
    Math.min(...minimal.typography.display.weights) < Math.min(...commercial.typography.display.weights),
  );
  assert(
    'MINIMAL spacing-scale gaat hoger dan COMMERCIAL (160 vs 64 max)',
    Math.max(...minimal.spacing) > Math.max(...commercial.spacing),
  );
  assert(
    'MINIMAL radius.button = 0 vs COMMERCIAL = 8',
    minimal.radius.button === 0 && commercial.radius.button === 8,
  );
  assert(
    'MINIMAL imageStrategy dark-framed vs COMMERCIAL subtle-gray',
    minimal.imageStrategy.placeholderStyle === 'dark-framed'
    && commercial.imageStrategy.placeholderStyle === 'subtle-gray',
  );
  assert(
    'MINIMAL imageStrategy testimonialPhotos uit (premium) vs COMMERCIAL aan',
    minimal.imageStrategy.testimonialPhotoStyle === 'none'
    && commercial.imageStrategy.testimonialPhotoStyle === 'circle',
  );
}

group('EXPERIENTIAL vs PLAYFUL differentiation');
{
  const exp = getDesignSystemForLayoutStyle('EXPERIENTIAL');
  const play = getDesignSystemForLayoutStyle('PLAYFUL');
  assert(
    'EXPERIENTIAL display sizes groter (96+ max) dan PLAYFUL (64 max)',
    Math.max(...exp.typography.display.sizes) > Math.max(...play.typography.display.sizes),
  );
  assert(
    'PLAYFUL radius.button = 999 (pill) vs EXPERIENTIAL = 4',
    play.radius.button === 999 && exp.radius.button === 4,
  );
}

group('Helper: nearestSpacing');
{
  const scale: readonly number[] = [4, 8, 16, 24, 48];
  assert('nearestSpacing(target=10) = 8 (closer than 16)', nearestSpacing(scale, 10) === 8);
  // 16 en 24 zijn beide ~4 weg van 20; reduce houdt FIRST (16) bij tie
  assert('nearestSpacing(target=20) = 16 (first-match on tie)', nearestSpacing(scale, 20) === 16);
  assert('nearestSpacing(target=4) exact match', nearestSpacing(scale, 4) === 4);
  assert('nearestSpacing(target=1000) = 48 (max)', nearestSpacing(scale, 1000) === 48);
  assert('lege scale returns target', nearestSpacing([], 16) === 16);
}

group('Helper: backgroundForSectionIndex wraps');
{
  const alt = { pattern: ['surface', 'surfaceMuted', 'surfaceInverted'] as const };
  assert('index 0 = surface', backgroundForSectionIndex(alt, 0) === 'surface');
  assert('index 1 = surfaceMuted', backgroundForSectionIndex(alt, 1) === 'surfaceMuted');
  assert('index 2 = surfaceInverted', backgroundForSectionIndex(alt, 2) === 'surfaceInverted');
  assert('index 3 wraps to surface', backgroundForSectionIndex(alt, 3) === 'surface');
  assert('index 7 wraps to surface (7 % 3 = 1, surfaceMuted)', backgroundForSectionIndex(alt, 7) === 'surfaceMuted');
}

group('resolveDesignSystem accepteert overrides');
{
  const base = getDesignSystemForLayoutStyle('COMMERCIAL');
  const overridden = resolveDesignSystem('COMMERCIAL', {
    spacingScale: [10, 20, 30] as const,
  });
  assert(
    'override spacingScale toegepast',
    overridden.spacing[0] === 10 && overridden.spacing[1] === 20,
  );
  assert(
    'andere velden behouden default uit COMMERCIAL',
    overridden.radius.button === base.radius.button,
  );
}

group('extractBrandTokensFromStyleguide v3 — designSystem populated');
{
  const styleguide = {
    primaryFontName: null,
    layoutStyle: 'MINIMAL' as LayoutStyle,
    colors: [
      { hex: '#B59032', category: 'PRIMARY', tags: ['brand'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 0 },
      { hex: '#000000', category: 'NEUTRAL', tags: ['text'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 1 },
      { hex: '#F5F6F7', category: 'NEUTRAL', tags: ['surface'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 2 },
    ],
    fonts: [],
  };
  const tokens = extractBrandTokensFromStyleguide(styleguide);
  assert('tokens.layoutStyle = MINIMAL', tokens.layoutStyle === 'MINIMAL');
  assert('tokens.designSystem aanwezig', tokens.designSystem !== undefined);
  assert('designSystem.layoutStyle matched', tokens.designSystem.layoutStyle === 'MINIMAL');
  assert(
    'designSystem.typography.display Cormorant (MINIMAL preset)',
    tokens.designSystem.typography.display.fontFamily.includes('Cormorant'),
  );
  assert(
    'designSystem.radius.button = 0 (MINIMAL preset)',
    tokens.designSystem.radius.button === 0,
  );
}

group('extractor zonder layoutStyle → DEFAULT (COMMERCIAL)');
{
  const styleguide = {
    primaryFontName: null,
    layoutStyle: null,
    colors: [],
    fonts: [],
  };
  const tokens = extractBrandTokensFromStyleguide(styleguide);
  assert('tokens.layoutStyle = DEFAULT', tokens.layoutStyle === DEFAULT_LAYOUT_STYLE);
  assert(
    'designSystem.layoutStyle = COMMERCIAL',
    tokens.designSystem.layoutStyle === 'COMMERCIAL',
  );
}

group('extractor zonder styleguide → DEFAULT BrandTokens met v3');
{
  const tokens = extractBrandTokensFromStyleguide(null);
  assert('null: layoutStyle = DEFAULT', tokens.layoutStyle === DEFAULT_LAYOUT_STYLE);
  assert('null: designSystem aanwezig', tokens.designSystem !== undefined);
}

group('extractBrandTokensFromContext (fallback) ook v3-compliant');
{
  const tokens = extractBrandTokensFromContext({ brandColors: '#0D9488' });
  assert('fallback: layoutStyle = DEFAULT', tokens.layoutStyle === DEFAULT_LAYOUT_STYLE);
  assert('fallback: designSystem aanwezig', tokens.designSystem !== undefined);
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}
