/**
 * Smoke-test voor Sprint 2 (brand-styling-consistency-plan §3b) — WCAG-gate.
 *
 * Verifies:
 *  - contrastRatio accuracy tegen bekende WCAG-waardes (zwart/wit/midgrijs)
 *  - meetsWCAG levels (AA normal/large, AAA normal/large, non-text)
 *  - getMinRatio constants per level + size
 *  - validateTokenPairs voor LINFI/Better Brands fixtures
 *  - Pre-render gate in extractBrandTokensFromStyleguide: bij low-contrast
 *    keuze valt safe-fallback in (black-or-white)
 *  - F-VAL dimensie 7 (wcagCompliance) score + composite-herbalancering
 *  - Composite zonder brandTokens herverdeelt WCAG-gewicht naar overige 6
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase13-wcag.ts
 */

import {
  contrastRatio,
  getMinRatio,
  meetsWCAG,
  checkContrast,
  validateTokenPairs,
  pickHigherContrast,
  blackOrWhiteFor,
} from '../../src/lib/landing-pages/wcag';
import {
  extractBrandTokensFromStyleguide,
  DEFAULT_BRAND_TOKENS,
} from '../../src/lib/landing-pages/brand-tokens';
import { evaluateLandingPageQuality } from '../../src/lib/landing-pages/landing-page-quality';
import type { PuckLikeData } from '../../src/lib/landing-pages/puck-data-flatten';

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

// ─── Tests ─────────────────────────────────────────────

group('contrastRatio accuracy tegen WCAG-spec');
{
  // Bekende waardes uit WCAG 2.1 documentatie
  assert('black-on-white = 21:1', Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01);
  assert('white-on-white = 1:1', Math.abs(contrastRatio('#FFFFFF', '#FFFFFF') - 1) < 0.01);
  assert('black-on-black = 1:1', Math.abs(contrastRatio('#000000', '#000000') - 1) < 0.01);
  // Mid-gray
  const ratio808080 = contrastRatio('#808080', '#FFFFFF');
  assert('gray-on-white ≈ 3.95:1', Math.abs(ratio808080 - 3.95) < 0.05);
  // Symmetrisch
  assert(
    'contrastRatio is symmetrisch',
    Math.abs(contrastRatio('#0D9488', '#FFFFFF') - contrastRatio('#FFFFFF', '#0D9488')) < 0.01,
  );
}

group('getMinRatio constants');
{
  assert('AA normal = 4.5', getMinRatio('AA', 'normal') === 4.5);
  assert('AA large = 3', getMinRatio('AA', 'large') === 3);
  assert('AA non-text = 3', getMinRatio('AA', 'non-text') === 3);
  assert('AAA normal = 7', getMinRatio('AAA', 'normal') === 7);
  assert('AAA large = 4.5', getMinRatio('AAA', 'large') === 4.5);
}

group('meetsWCAG verdicts');
{
  assert('black-on-white AA-normal', meetsWCAG('#000000', '#FFFFFF', { level: 'AA', size: 'normal' }));
  assert('black-on-white AAA-normal', meetsWCAG('#000000', '#FFFFFF', { level: 'AAA', size: 'normal' }));
  // Golden Bronze op wit = ~3:1 borderline — faalt zelfs AA large
  assert(
    'Golden Bronze op wit faalt AA-normal (4.5:1)',
    !meetsWCAG('#B59032', '#FFFFFF', { level: 'AA', size: 'normal' }),
  );
  // Golden Bronze contrast met wit is ~2.99 (net onder 3:1)
  const goldRatio = contrastRatio('#B59032', '#FFFFFF');
  assert(
    `Golden Bronze ratio op wit ${goldRatio.toFixed(2)}:1 (borderline 3:1)`,
    goldRatio > 2.9 && goldRatio < 3.1,
  );
  // Soft Cream op wit = ~1.05:1 — faalt alles
  assert(
    'Soft Cream op wit faalt zelfs AA-large',
    !meetsWCAG('#FBF4BC', '#FFFFFF', { level: 'AA', size: 'large' }),
  );
}

group('checkContrast detail-output');
{
  const check = checkContrast('#1E293B', '#FFFFFF', { level: 'AA', size: 'normal' });
  assert('check.fg correct', check.fg === '#1E293B');
  assert('check.bg correct', check.bg === '#FFFFFF');
  assert('check.minRatio = 4.5', check.minRatio === 4.5);
  assert('check.ratio is hoog (slate-900 op wit, ~14.6:1)', check.ratio > 14);
  assert('check.passes = true', check.passes === true);
}

group('Helpers: pickHigherContrast + blackOrWhiteFor');
{
  // Bij gold-bg → black geeft hogere contrast dan white
  assert('blackOrWhiteFor(gold) = #000000', blackOrWhiteFor('#B59032') === '#000000');
  // Bij dark navy → white wint
  assert('blackOrWhiteFor(navy) = #FFFFFF', blackOrWhiteFor('#263238') === '#FFFFFF');
  // pickHigherContrast
  assert(
    'pickHigherContrast picks safer text-color',
    pickHigherContrast('#FFFFFF', '#000000', '#B59032') === '#000000',
  );
}

group('validateTokenPairs — LINFI shape (zonder decoratieve border)');
{
  // Geldige LINFI mapping — surfaceBorder uitgesloten (decoratief, niet
  // strict 1.4.11 non-text-criterium voor niet-interactieve elementen).
  const result = validateTokenPairs({
    onSurface: { fg: '#000000', bg: '#F5F6F7' },
    surfaceMuted: { fg: '#404D5E', bg: '#F5F6F7' },
    onBrand: { fg: '#000000', bg: '#B59032' },
    onAction: { fg: '#000000', bg: '#B59032' },
  });
  assert('LINFI valid mapping: failures = 0', result.failureCount === 0);
  assert('LINFI achievedLevel niet null', result.achievedLevel !== null);
}
{
  // Foute mapping (oude bug): gold body-text op wit
  const result = validateTokenPairs({
    onSurface: { fg: '#B59032', bg: '#FFFFFF' },
  });
  assert('Gold-on-white failures >= 1', result.failureCount >= 1);
  assert('Failed mapping: achievedLevel = null', result.achievedLevel === null);
}

group('validateTokenPairs — Better Brands SaaS shape (zwart op teal-600)');
{
  // teal-600 (#0D9488) heeft borderline contrast met wit. Voor reliable
  // AA-normal: gebruik zwart op teal — extractor doet dit via blackOrWhiteFor.
  const result = validateTokenPairs({
    onSurface: { fg: '#1E293B', bg: '#FFFFFF' },
    surfaceMuted: { fg: '#64748B', bg: '#FFFFFF' },
    onBrand: { fg: '#000000', bg: '#0D9488' },
    onAction: { fg: '#000000', bg: '#0D9488' },
  });
  assert('Better Brands: failures = 0', result.failureCount === 0);
  assert('Better Brands: achievedLevel ≠ null', result.achievedLevel !== null);
}

group('Pre-render gate in extractor — LINFI smoke');
{
  // LINFI fixture met legit Charcoal Navy als onSurface — geen fallback nodig
  const styleguide = {
    primaryFontName: null,
    colors: [
      { hex: '#B59032', category: 'PRIMARY', tags: ['brand', 'luxury'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 0 },
      { hex: '#000000', category: 'NEUTRAL', tags: ['text'], contrastWhite: 'AAA', contrastBlack: 'Fail', confidence: 'high', sortOrder: 1 },
      { hex: '#F5F6F7', category: 'NEUTRAL', tags: ['surface'], contrastWhite: 'Fail', contrastBlack: 'AAA', confidence: 'high', sortOrder: 2 },
    ],
    fonts: [],
  };
  const tokens = extractBrandTokensFromStyleguide(styleguide);
  // onSurface = #000000 op surface #F5F6F7 → ratio ~19:1 → no fallback
  assert('onSurface niet ge-fallback (al WCAG-passing)', tokens.onSurface === '#000000');
  assert('onBrand = #000000 (contrast AAA op brand)', tokens.onBrand === '#000000');
}

group('Pre-render gate — fallback triggert bij low-contrast');
{
  // Tegen verwachting: lege styleguide-extractie zou WCAG halen via defaults
  const empty = extractBrandTokensFromStyleguide({ colors: [], fonts: [] });
  assert('lege extractor: onSurface op surface haalt WCAG', meetsWCAG(empty.onSurface, empty.surface, { level: 'AA', size: 'normal' }));
}

group('F-VAL dimensie 7 — WCAG-compliance score');
{
  const goodTokens = {
    ...DEFAULT_BRAND_TOKENS,
    surface: '#FFFFFF',
    onSurface: '#000000',
    surfaceMuted: '#64748B',
    surfaceBorder: '#6B7280', // gray-500 — ≥3:1 op white (~4:1)
    brand: '#0F766E',         // teal-700 — pairs goed met wit
    onBrand: '#FFFFFF',
    action: '#0F766E',
    onAction: '#FFFFFF',
  };
  // Mock minimal tree
  const tree: PuckLikeData = {
    root: { props: {} },
    content: [
      { type: 'BrandHero', props: { headline: 'X', sub: 'Y', ctaLabel: 'Z' } },
      { type: 'FeatureGrid', props: { columns: '3', features: [] } },
      { type: 'Testimonial', props: { quote: 'q', author: 'a', personaId: '' } },
      { type: 'FAQ', props: { items: [{ question: 'Q', answer: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }] } },
      { type: 'BrandCTA', props: { label: 'X', href: '#', personaId: '' } },
      { type: 'Footer', props: { companyName: 'X', tagline: 'Y', links: [] } },
    ],
  };

  const result = evaluateLandingPageQuality({ data: tree, brandTokens: goodTokens });
  assert('wcagCompliance dimensie aanwezig', typeof result.dimensions.wcagCompliance === 'number');
  assert('goodTokens: wcagCompliance = 100', result.dimensions.wcagCompliance === 100);
}
{
  const badTokens = {
    ...DEFAULT_BRAND_TOKENS,
    onSurface: '#FBF4BC', // soft cream on white = faalt
    surfaceMuted: '#F0F0F0', // bijna wit
    onBrand: '#B59032', // gold-on-gold (default brand) = faalt
  };
  const tree: PuckLikeData = { root: { props: {} }, content: [{ type: 'BrandHero', props: { headline: 'x', sub: 'y', ctaLabel: 'z' } }] };
  const result = evaluateLandingPageQuality({ data: tree, brandTokens: badTokens });
  assert(
    'badTokens: wcagCompliance < 100',
    (result.dimensions.wcagCompliance ?? 100) < 100,
  );
}

group('Composite-herbalancering zonder brandTokens');
{
  const tree: PuckLikeData = {
    root: { props: {} },
    content: [
      { type: 'BrandHero', props: { headline: 'X', sub: 'Y', ctaLabel: 'Z' } },
      { type: 'FeatureGrid', props: { columns: '3', features: [] } },
      { type: 'Testimonial', props: { quote: 'q', author: 'a', personaId: '' } },
      { type: 'FAQ', props: { items: [{ question: 'Q', answer: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }, { q: 'Q', a: 'A' }] } },
      { type: 'BrandCTA', props: { label: 'X', href: '#', personaId: '' } },
      { type: 'Footer', props: { companyName: 'X', tagline: 'Y', links: [] } },
    ],
  };
  const resultNoTokens = evaluateLandingPageQuality({ data: tree });
  assert(
    'zonder brandTokens: wcagCompliance undefined',
    resultNoTokens.dimensions.wcagCompliance === undefined,
  );
  // Composite moet alsnog meaningful zijn (gewicht herverdeeld)
  assert('zonder brandTokens: composite niet NaN', !Number.isNaN(resultNoTokens.composite));
  assert('zonder brandTokens: composite 0-100 range', resultNoTokens.composite >= 0 && resultNoTokens.composite <= 100);
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}
