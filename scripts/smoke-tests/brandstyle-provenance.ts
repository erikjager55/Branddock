/**
 * [DET] Deterministische eval-suite voor de governed-token-layer
 * (`docs/audits/2026-06-06-governed-token-layer-verbeterplan.md`, V5).
 *
 * Fixture-styleguides → extractBrandTokensWithProvenance → assert op de
 * geresolveerde tokens ÉN hun provenance (source/confidence). Geen netwerk,
 * geen DB — puur de resolve-logica. Dit is de baseline waartegen ablation-
 * per-PR (CI-hook) de accuraatheid-delta meet: een wijziging die provenance of
 * token-resolutie laat regresseren, laat deze suite falen.
 *
 * Run: npx tsx scripts/smoke-tests/brandstyle-provenance.ts
 */
import {
  extractBrandTokensWithProvenance,
} from '../../src/lib/landing-pages/brand-tokens';
import {
  summarizeProvenance,
  isScrapedOrigin,
} from '../../src/lib/landing-pages/token-provenance';

type Styleguide = Parameters<typeof extractBrandTokensWithProvenance>[0];

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

// ─── Fixtures ───────────────────────────────────────────

/** Sterk merk: brand-tagged PRIMARY + surface + dark text + fonts + profiles. */
const STRONG: Styleguide = {
  colors: [
    { hex: '#E8521F', category: 'PRIMARY', tags: ['brand'], confidence: 'high', sortOrder: 0 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['surface', 'background', 'light'], confidence: 'high', sortOrder: 1 },
    { hex: '#1A1A1A', category: 'NEUTRAL', tags: ['text', 'body'], confidence: 'high', sortOrder: 2 },
    { hex: '#6B7280', category: 'NEUTRAL', tags: ['muted'], confidence: 'medium', sortOrder: 3 },
  ],
  fonts: [
    { name: 'Sen', role: 'DISPLAY', fontFamily: 'Sen', sortOrder: 0 },
    { name: 'Inter', role: 'BODY', fontFamily: 'Inter', sortOrder: 1 },
  ],
  layoutStyle: 'MINIMAL',
  buttonProfile: { primary: { background: '#E8521F', color: '#FFFFFF' } },
  elevationProfile: { samples: ['0 2px 8px rgba(0,0,0,0.1)'], dominantCategory: 'subtle-shadow' },
};

/** Logo-extractie: brand-kleur komt uit het logo (hoogste fidelity). */
const LOGO: Styleguide = {
  colors: [
    { hex: '#0F766E', category: 'PRIMARY', tags: ['logo', 'brand'], confidence: 'medium', sortOrder: 0 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['surface', 'background', 'light'], confidence: 'high', sortOrder: 1 },
    { hex: '#111827', category: 'NEUTRAL', tags: ['text'], confidence: 'high', sortOrder: 2 },
  ],
  fonts: [],
};

/** GIGO / lege placeholder (napking-WordPress): niets bruikbaars. */
const EMPTY: Styleguide = { colors: [], fonts: [] };

/** Radius-only: wél radiusProfile maar GEEN elevationProfile. De V2-gate mag
 *  dit NIET als scraped-elevation zien (cardElevationCategory blijft preset). */
const RADIUS_ONLY: Styleguide = {
  colors: [
    { hex: '#222222', category: 'NEUTRAL', tags: ['text'], confidence: 'high', sortOrder: 0 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['surface', 'background', 'light'], confidence: 'high', sortOrder: 1 },
  ],
  fonts: [],
  // Flat key cardTypical — zoals mapElevationTokens (`radius?.cardTypical`) leest.
  radiusProfile: { cardTypical: '8px' },
  // GEEN elevationProfile
};

/** Framework-default: Bootstrap-blauw mag NIET als brand winnen. */
const FRAMEWORK: Styleguide = {
  colors: [
    { hex: '#0D6EFD', category: 'PRIMARY', tags: ['bootstrap', 'default', 'brand'], confidence: 'high', sortOrder: 0 },
    { hex: '#212529', category: 'NEUTRAL', tags: ['text', 'body'], confidence: 'high', sortOrder: 1 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['surface', 'background', 'light'], confidence: 'high', sortOrder: 2 },
  ],
  fonts: [],
};

// ─── 1. Sterk merk — scraped/high overal ──────────────────

console.log('\n=== 1. Sterk merk ===\n');
{
  const { tokens, provenance } = extractBrandTokensWithProvenance(STRONG);
  assert('brand === scraped #E8521F', tokens.brand === '#E8521F', tokens.brand);
  assert('brand provenance === scraped', provenance.brand?.source === 'scraped', provenance.brand?.source);
  assert('brand confidence === high', provenance.brand?.confidence === 'high', provenance.brand?.confidence);
  assert('surface === #FFFFFF', tokens.surface === '#FFFFFF', tokens.surface);
  assert('surface provenance scraped', isScrapedOrigin(provenance, 'surface'));
  assert('headingFont provenance scraped', provenance.headingFont?.source === 'scraped', provenance.headingFont?.source);
  assert('headingFont strips weight → "Sen"', tokens.headingFont.startsWith('Sen'), tokens.headingFont);
  assert('button provenance scraped (profile present)', isScrapedOrigin(provenance, 'button'));
  assert('elevation provenance scraped (V2 gate respects shadow)', isScrapedOrigin(provenance, 'elevation'));
  assert('onBrand is derived', provenance.onBrand?.source === 'derived', provenance.onBrand?.source);
  // Kern-rollen (kleur/font/profile) zijn allemaal scraped; optionele usage-tag
  // kleuren (heroBgColor etc.) mogen legitiem fallback zijn — die tagt deze
  // fixture niet. Dus: assert op de kern, niet op totaal-0-fallback.
  const coreRoles = ['brand', 'surface', 'onSurface', 'headingFont', 'bodyFont', 'button'];
  assert(
    'alle kern-rollen scraped voor sterk merk',
    coreRoles.every((r) => isScrapedOrigin(provenance, r)),
    coreRoles.filter((r) => !isScrapedOrigin(provenance, r)).join(',') || 'ok',
  );
}

// ─── 2. Logo-extractie ────────────────────────────────────

console.log('\n=== 2. Logo-extractie ===\n');
{
  const { tokens, provenance } = extractBrandTokensWithProvenance(LOGO);
  assert('brand === #0F766E', tokens.brand === '#0F766E', tokens.brand);
  assert('brand provenance === logo', provenance.brand?.source === 'logo', provenance.brand?.source);
  assert('logo promoot naar high confidence', provenance.brand?.confidence === 'high', provenance.brand?.confidence);
  assert('isScrapedOrigin true voor logo-source', isScrapedOrigin(provenance, 'brand'));
}

// ─── 3. GIGO / leeg — alles fallback ──────────────────────

console.log('\n=== 3. Leeg / GIGO ===\n');
{
  const { provenance } = extractBrandTokensWithProvenance(EMPTY);
  assert('brand provenance === fallback', provenance.brand?.source === 'fallback', provenance.brand?.source);
  assert('surface provenance === fallback', provenance.surface?.source === 'fallback', provenance.surface?.source);
  assert('headingFont provenance === fallback', provenance.headingFont?.source === 'fallback', provenance.headingFont?.source);
  assert('isScrapedOrigin false voor fallback', !isScrapedOrigin(provenance, 'brand'));
  const summary = summarizeProvenance(provenance);
  assert('summary: needsAttention bevat brand', summary.needsAttention.includes('brand'));
  assert('summary: scraped === 0', summary.scraped === 0, `scraped=${summary.scraped}`);
  assert('summary: fallback > 5', summary.fallback > 5, `fallback=${summary.fallback}`);
}

// ─── 4. Framework-default mag niet als brand winnen ───────

console.log('\n=== 4. Framework-default (Bootstrap) ===\n');
{
  const { tokens, provenance } = extractBrandTokensWithProvenance(FRAMEWORK);
  assert('brand !== bootstrap-blauw #0D6EFD', tokens.brand.toLowerCase() !== '#0d6efd', tokens.brand);
  // Brand valt terug op de donkerste betekenisvolle kleur (onSurface recycle)
  // → provenance markeert dat als fallback (geen merk-kleur gevonden).
  assert('brand provenance === fallback (geen echte merk-kleur)', provenance.brand?.source === 'fallback', provenance.brand?.source);
}

// ─── 5. V2 forceFlatCards-gate contract ───────────────────
// De gate in puck-config.tsx is `forceFlatCards && !isScrapedOrigin(prov,
// 'elevation')`. We testen de INPUT van die gate (isScrapedOrigin op
// 'elevation') voor de drie scenario's — dit lockt de CRITICAL-fix dat een
// radius-only merk de gate NIET als scraped passeert.

console.log('\n=== 5. forceFlatCards-gate contract ===\n');
{
  const strong = extractBrandTokensWithProvenance(STRONG).provenance;
  assert(
    'elevationProfile aanwezig → gate ziet scraped → shadow blijft',
    isScrapedOrigin(strong, 'elevation') === true,
    strong.elevation?.source,
  );
}
{
  const radiusOnly = extractBrandTokensWithProvenance(RADIUS_ONLY).provenance;
  assert(
    'radius-only (geen elevationProfile) → gate ziet GEEN scraped → mag flatten',
    isScrapedOrigin(radiusOnly, 'elevation') === false,
    radiusOnly.elevation?.source,
  );
  assert(
    'radius-only → elevation.radius wél scraped (aparte provenance-pad)',
    isScrapedOrigin(radiusOnly, 'elevation.radius') === true,
    radiusOnly['elevation.radius']?.source,
  );
}
{
  const empty = extractBrandTokensWithProvenance(EMPTY).provenance;
  assert(
    'geen profiles → gate ziet GEEN scraped',
    isScrapedOrigin(empty, 'elevation') === false,
    empty.elevation?.source,
  );
}

// ─── 6. WCAG-gate provenance-correctie ────────────────────
// STRONG's onBrand: wit op #E8521F faalt AA (3.71:1) → WCAG forceert #000000.
// De provenance moet dan 'derived' (wcag-fallback) zijn, niet scraped/high.
console.log('\n=== 6. WCAG-gate provenance ===\n');
{
  const { tokens, provenance } = extractBrandTokensWithProvenance(STRONG);
  assert(
    'onBrand provenance === derived na WCAG-fallback',
    provenance.onBrand?.source === 'derived',
    provenance.onBrand?.source,
  );
  // Strikt: 'wcag-fallback' (de correctie-stap), NIET de initiële 'wcag-on-color'
  // — anders zou de assert ook slagen als de correctie-stap stopt te draaien.
  assert(
    "onBrand detector === 'wcag-fallback'",
    provenance.onBrand?.detector === 'wcag-fallback',
    provenance.onBrand?.detector,
  );
  // onBrand-waarde is daadwerkelijk de WCAG-veilige zwart (niet wit).
  assert('onBrand === #000000 (WCAG-safe)', tokens.onBrand === '#000000', tokens.onBrand);
}

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
process.exit(fail > 0 ? 1 : 0);
