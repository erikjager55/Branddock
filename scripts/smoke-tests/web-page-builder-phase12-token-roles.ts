/**
 * Smoke-test voor Sprint 1 (brand-styling-consistency-plan §3a) —
 * BrandTokens v2 role-based extractor.
 *
 * Verifies:
 *  - LINFI-shaped fixture (mismatch case): correct role-mapping ondanks
 *    classifier-fouten in DB (Golden Bronze als PRIMARY met "accent" tag,
 *    Charcoal Navy als PRIMARY met "background" tag).
 *  - Better Brands-shaped fixture (typical SaaS): straightforward mapping.
 *  - Edge cases: missing tags, single-color brand, geen styleguide, lege
 *    arrays, semantic colors uitgesloten van onSurface.
 *  - Legacy field-aliases (primaryHex/secondaryHex/etc.) populated
 *    consistent met role-tokens.
 *  - relativeLuminance helper accuracy tegen bekende waardes.
 *  - extractBrandTokensFromContext fallback met 0/1/2/3+ hexes.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase12-token-roles.ts
 */

import {
  extractBrandTokensFromStyleguide,
  extractBrandTokensFromContext,
  relativeLuminance,
  DEFAULT_BRAND_TOKENS,
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

// ─── Fixtures ──────────────────────────────────────────

const LINFI_STYLEGUIDE = {
  primaryFontName: 'Inter, sans-serif',
  colors: [
    { hex: '#263238', category: 'PRIMARY', tags: ['dark', 'background', 'brand', 'header'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 0 },
    { hex: '#B59032', category: 'PRIMARY', tags: ['brand', 'luxury', 'premium', 'accent'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 1 },
    { hex: '#FBF4BC', category: 'SECONDARY', tags: ['light', 'background', 'subtle'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 2 },
    { hex: '#CAA33F', category: 'ACCENT', tags: ['hover', 'interactive', 'highlight'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 3 },
    { hex: '#000000', category: 'NEUTRAL', tags: ['text', 'contrast', 'header'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 4 },
    { hex: '#2E2F2A', category: 'NEUTRAL', tags: ['background', 'dark', 'text'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'medium', sortOrder: 5 },
    { hex: '#404D5E', category: 'NEUTRAL', tags: ['text', 'secondary-text', 'muted'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 6 },
    { hex: '#DDDEDF', category: 'NEUTRAL', tags: ['border', 'divider', 'subtle'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'medium', sortOrder: 7 },
    { hex: '#F5F6F7', category: 'NEUTRAL', tags: ['background', 'light', 'surface'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'medium', sortOrder: 8 },
    { hex: '#E5F3FF', category: 'SEMANTIC', tags: ['info'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'medium', sortOrder: 9 },
  ],
  fonts: [
    { name: 'Inter', role: 'DISPLAY', fontFamily: 'Inter, sans-serif', sortOrder: 0 },
    { name: 'Inter', role: 'BODY', fontFamily: 'Inter, sans-serif', sortOrder: 1 },
  ],
};

const BETTERBRANDS_STYLEGUIDE = {
  primaryFontName: 'Poppins, sans-serif',
  colors: [
    { hex: '#0D9488', category: 'PRIMARY', tags: ['brand'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 0 },
    { hex: '#1E293B', category: 'NEUTRAL', tags: ['text', 'body'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 1 },
    { hex: '#F59E0B', category: 'ACCENT', tags: ['hover'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 2 },
    { hex: '#64748B', category: 'NEUTRAL', tags: ['muted'], contrastWhite: 'AAA', contrastBlack: 'AA', confidence: 'medium', sortOrder: 3 },
    { hex: '#E2E8F0', category: 'NEUTRAL', tags: ['border'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'medium', sortOrder: 4 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['surface', 'background'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 5 },
  ],
  fonts: [
    { name: 'Poppins', role: 'DISPLAY', fontFamily: 'Poppins, sans-serif', sortOrder: 0 },
    { name: 'Inter', role: 'BODY', fontFamily: 'Inter, sans-serif', sortOrder: 1 },
  ],
};

// ─── Tests ─────────────────────────────────────────────

group('relativeLuminance helper accuracy');
{
  // WCAG known values
  assert('luminance(#FFFFFF) ≈ 1.0', relativeLuminance('#FFFFFF') > 0.99);
  assert('luminance(#000000) ≈ 0.0', relativeLuminance('#000000') < 0.01);
  assert('luminance(#808080) ≈ 0.215', Math.abs(relativeLuminance('#808080') - 0.215) < 0.01);
  // Brand color sanity
  const goldL = relativeLuminance('#B59032');
  assert('luminance(Golden Bronze) tussen 0.2-0.45', goldL > 0.2 && goldL < 0.45);
  const navyL = relativeLuminance('#263238');
  assert('luminance(Charcoal Navy) <0.05 (heel donker)', navyL < 0.05);
}

group('LINFI extraction — role-mapping correct ondanks classifier-fouten');
{
  const tokens = extractBrandTokensFromStyleguide(LINFI_STYLEGUIDE);

  // Surface: tagged surface + high L
  assert(
    'surface = #F5F6F7 (Cloud White, tagged surface)',
    tokens.surface === '#F5F6F7',
    `actual: ${tokens.surface}`,
  );

  // onSurface: darkest non-SEMANTIC
  assert(
    'onSurface = #000000 (Pure Black, darkest non-SEMANTIC)',
    tokens.onSurface === '#000000',
    `actual: ${tokens.onSurface}`,
  );

  // surfaceMuted: NEUTRAL tagged muted/secondary-text
  assert(
    'surfaceMuted = #404D5E (Slate Gray, tagged muted)',
    tokens.surfaceMuted === '#404D5E',
    `actual: ${tokens.surfaceMuted}`,
  );

  // surfaceBorder: NEUTRAL tagged border/divider
  assert(
    'surfaceBorder = #DDDEDF (Silver Mist, tagged border)',
    tokens.surfaceBorder === '#DDDEDF',
    `actual: ${tokens.surfaceBorder}`,
  );

  // brand: Golden Bronze (PRIMARY tagged brand, NIET tagged background/header)
  // Charcoal Navy is excluded ondanks PRIMARY-category omdat "background" en
  // "header" tags hebben (geclassificeerd als dark-bg, niet als brand-fill)
  assert(
    'brand = #B59032 (Golden Bronze — niet Charcoal Navy ondanks PRIMARY)',
    tokens.brand === '#B59032',
    `actual: ${tokens.brand}`,
  );

  // onBrand: black (contrastBlack=AAA op Golden Bronze)
  assert(
    'onBrand = #000000 (black — contrastBlack=AAA op brand)',
    tokens.onBrand === '#000000',
    `actual: ${tokens.onBrand}`,
  );

  // accent: ACCENT category (Warm Gold)
  assert(
    'accent = #CAA33F (Warm Gold, ACCENT category)',
    tokens.accent === '#CAA33F',
    `actual: ${tokens.accent}`,
  );

  // brandSubtle = lightened brand
  assert(
    'brandSubtle is lighter than brand',
    relativeLuminance(tokens.brandSubtle) > relativeLuminance(tokens.brand),
  );

  // Fonts
  assert('headingFont = Inter', tokens.headingFont.includes('Inter'));
  assert('bodyFont = Inter', tokens.bodyFont.includes('Inter'));
}

group('LINFI legacy field aliases — geen unleesbare body-text meer');
{
  const tokens = extractBrandTokensFromStyleguide(LINFI_STYLEGUIDE);
  // Cruciale fix: secondaryHex was eerder #FBF4BC (Soft Cream) — onleesbaar
  // op wit. Nu = onSurface = #000000 (Pure Black) — leesbaar.
  assert(
    'primaryHex = brand (Golden Bronze, voor CTA-fill)',
    tokens.primaryHex === tokens.brand,
  );
  assert(
    'secondaryHex = onSurface (Pure Black, voor body-text)',
    tokens.secondaryHex === tokens.onSurface,
  );
  assert(
    'secondaryHex is DARK genoeg voor body-text (L<0.2)',
    relativeLuminance(tokens.secondaryHex) < 0.2,
  );
  assert('accentHex = accent (Warm Gold)', tokens.accentHex === tokens.accent);
  assert('neutralHex = surfaceMuted (Slate Gray)', tokens.neutralHex === tokens.surfaceMuted);
  // Cruciaal: legacy secondaryHex (gebruikt voor body-text in puck-config)
  // is NIET de brand-color
  assert(
    'secondaryHex ≠ brand (verbiedt body-text in brand-color)',
    tokens.secondaryHex !== tokens.brand,
  );
}

group('Better Brands extraction — straightforward SaaS pattern');
{
  const tokens = extractBrandTokensFromStyleguide(BETTERBRANDS_STYLEGUIDE);
  assert('surface = #FFFFFF (NEUTRAL surface-tagged)', tokens.surface === '#FFFFFF');
  assert(
    'onSurface = #1E293B (NEUTRAL text-tagged, darkest)',
    tokens.onSurface === '#1E293B',
  );
  assert(
    'brand = #0D9488 (PRIMARY tagged brand)',
    tokens.brand === '#0D9488',
  );
  assert(
    'onBrand = #FFFFFF (white — contrastWhite=AAA op teal)',
    tokens.onBrand === '#FFFFFF',
  );
  assert('accent = #F59E0B (ACCENT category)', tokens.accent === '#F59E0B');
  assert('surfaceMuted = #64748B', tokens.surfaceMuted === '#64748B');
  assert('surfaceBorder = #E2E8F0', tokens.surfaceBorder === '#E2E8F0');
  assert('headingFont = Poppins', tokens.headingFont.includes('Poppins'));
}

group('Edge case: null/lege styleguide → defaults');
{
  const nullTokens = extractBrandTokensFromStyleguide(null);
  const undefTokens = extractBrandTokensFromStyleguide(undefined);
  const emptyTokens = extractBrandTokensFromStyleguide({ colors: [], fonts: [] });
  assert('null → DEFAULT brand', nullTokens.brand === DEFAULT_BRAND_TOKENS.brand);
  assert('undefined → DEFAULT brand', undefTokens.brand === DEFAULT_BRAND_TOKENS.brand);
  assert('lege arrays → DEFAULT brand', emptyTokens.brand === DEFAULT_BRAND_TOKENS.brand);
  assert('null → DEFAULT onSurface', nullTokens.onSurface === DEFAULT_BRAND_TOKENS.onSurface);
}

group('Edge case: SEMANTIC colors uitgesloten van onSurface');
{
  // SEMANTIC error-rood is donker maar mag niet als body-text dienen
  const styleguide = {
    primaryFontName: null,
    colors: [
      { hex: '#FF0000', category: 'SEMANTIC', tags: ['error'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 0 },
      { hex: '#1E293B', category: 'NEUTRAL', tags: [], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 1 },
    ],
    fonts: [],
  };
  const tokens = extractBrandTokensFromStyleguide(styleguide);
  assert(
    'onSurface picks NEUTRAL ipv SEMANTIC-red',
    tokens.onSurface === '#1E293B',
    `actual: ${tokens.onSurface}`,
  );
}

group('Edge case: classifier-fout brand-PRIMARY met background tag');
{
  // Charcoal Navy als ENIGE PRIMARY met background-tag → fallback ladder kicks in
  const styleguide = {
    primaryFontName: null,
    colors: [
      { hex: '#263238', category: 'PRIMARY', tags: ['dark', 'background', 'header'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 0 },
      { hex: '#FF6B35', category: 'ACCENT', tags: ['cta'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'medium', sortOrder: 1 },
    ],
    fonts: [],
  };
  const tokens = extractBrandTokensFromStyleguide(styleguide);
  // Geen PRIMARY tagged brand → fallback naar ACCENT
  assert(
    'brand = #FF6B35 (ACCENT) bij geen valide PRIMARY (filtert background-tag)',
    tokens.brand === '#FF6B35',
    `actual: ${tokens.brand}`,
  );
}

group('extractBrandTokensFromContext — fallback per hex-count');
{
  // 0 hexes
  const noHex = extractBrandTokensFromContext({ brandColors: '' });
  assert('0 hexes → all defaults', noHex.brand === DEFAULT_BRAND_TOKENS.brand);

  // 1 hex = brand
  const oneHex = extractBrandTokensFromContext({ brandColors: '#AB12CD' });
  assert('1 hex → die hex IS brand', oneHex.brand === '#AB12CD');
  assert('1 hex → surface = DEFAULT', oneHex.surface === DEFAULT_BRAND_TOKENS.surface);
  assert('1 hex → primaryHex alias = brand', oneHex.primaryHex === '#AB12CD');

  // 2 hexes
  const twoHex = extractBrandTokensFromContext({ brandColors: '#FFFFFF #112233' });
  assert('2 hexes → wit = surface', twoHex.surface === '#FFFFFF');
  assert('2 hexes → donkerste = onSurface', twoHex.onSurface === '#112233');

  // 3+ hexes — full mapping
  const threeHex = extractBrandTokensFromContext({
    brandColors: '#FFFFFF #112233 #0D9488 #F59E0B',
  });
  assert('3+ hexes: surface = wit', threeHex.surface === '#FFFFFF');
  assert('3+ hexes: onSurface = donker', threeHex.onSurface === '#112233');
  // Brand = eerste die niet surface of onSurface is — sortOrder-volgorde in hexes-array
  assert(
    '3+ hexes: brand picked uit overige',
    threeHex.brand === '#0D9488' || threeHex.brand === '#F59E0B',
  );
}

group('extractBrandTokensFromContext — single-color brand keeps brand-color');
{
  // Reproduceer phase2 regressie-case: 1 hex moet alsnog als brand komen
  const tokens = extractBrandTokensFromContext({
    brandColors: '#AB12CD',
    brandFonts: 'heading: Lato',
  });
  assert('single hex → primaryHex = die hex', tokens.primaryHex === '#AB12CD');
  assert('single hex → action = die hex', tokens.action === '#AB12CD');
  // Op donker brand → onBrand = wit
  assert(
    'donker brand → onBrand = wit',
    tokens.onBrand === '#FFFFFF',
  );
  assert('Lato als headingFont', tokens.headingFont.includes('Lato'));
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}
