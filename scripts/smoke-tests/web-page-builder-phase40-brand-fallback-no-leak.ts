/**
 * Smoke-test — LP brand-fidelity Fase 1 (plan functional-conjuring-harbor).
 *
 * Verifieert dat de token-extractie NOOIT Branddock's eigen huisstijl
 * (#1FD1B2 teal / #F59E0B amber) in een klant-LP lekt wanneer de scrape geen
 * bruikbare merk-kleur oplevert (de Zwarthout-case: alleen NEUTRAL/SEMANTIC
 * Bootstrap-defaults). En dat echte merk-kleuren ongewijzigd blijven werken.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase40-brand-fallback-no-leak.ts
 */

import {
  extractBrandTokensFromStyleguide,
  extractBrandTokensFromContext,
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

const BRANDDOCK_TEAL = '#1FD1B2';
const BRANDDOCK_AMBER = '#F59E0B';
const BRANDDOCK_TEAL_WASH = '#E6F9F5';

function isBranddockColor(hex: string): boolean {
  const h = hex.toLowerCase();
  return h === BRANDDOCK_TEAL.toLowerCase()
    || h === BRANDDOCK_AMBER.toLowerCase()
    || h === BRANDDOCK_TEAL_WASH.toLowerCase();
}

// ─── Fixture: Zwarthout (alleen NEUTRAL/SEMANTIC Bootstrap-defaults) ──
const ZWARTHOUT_STYLEGUIDE = {
  primaryFontName: 'Sen, sans-serif',
  colors: [
    { hex: '#0D6EFD', category: 'SEMANTIC', tags: ['bootstrap', 'default', 'info'], confidence: 'high', sortOrder: 0 },
    { hex: '#6C757D', category: 'NEUTRAL', tags: ['bootstrap', 'secondary', 'text'], confidence: 'high', sortOrder: 1 },
    { hex: '#198754', category: 'SEMANTIC', tags: ['bootstrap', 'success'], confidence: 'high', sortOrder: 2 },
    { hex: '#DC3545', category: 'SEMANTIC', tags: ['bootstrap', 'danger'], confidence: 'high', sortOrder: 3 },
    { hex: '#F8F9FA', category: 'NEUTRAL', tags: ['bootstrap', 'background', 'surface'], confidence: 'high', sortOrder: 4 },
    { hex: '#212529', category: 'NEUTRAL', tags: ['bootstrap', 'text', 'dark'], confidence: 'high', sortOrder: 5 },
    { hex: '#7A00DF', category: 'NEUTRAL', tags: ['wordpress', 'synced-block'], confidence: 'medium', sortOrder: 6 },
  ],
  fonts: [{ name: 'Sen', role: 'BODY', fontFamily: 'Sen, sans-serif', sortOrder: 0 }],
};

// ─── Fixture: echt merk met PRIMARY brand-kleur (regressie) ──
const REAL_BRAND_STYLEGUIDE = {
  primaryFontName: 'Poppins, sans-serif',
  colors: [
    { hex: '#0D9488', category: 'PRIMARY', tags: ['brand'], confidence: 'high', sortOrder: 0 },
    { hex: '#1E293B', category: 'NEUTRAL', tags: ['text', 'body'], confidence: 'high', sortOrder: 1 },
    { hex: '#F97316', category: 'ACCENT', tags: ['cta', 'highlight'], confidence: 'high', sortOrder: 2 },
    { hex: '#FFFFFF', category: 'NEUTRAL', tags: ['background', 'surface'], confidence: 'high', sortOrder: 3 },
  ],
  fonts: [{ name: 'Poppins', role: 'BODY', fontFamily: 'Poppins, sans-serif', sortOrder: 0 }],
};

console.log('\n── Fase 1: geen Branddock-identity-leak ──');

// 1. Zwarthout (geen PRIMARY/ACCENT) — geen teal/amber lek
const zw = extractBrandTokensFromStyleguide(ZWARTHOUT_STYLEGUIDE);
assert('Zwarthout brand is NIET Branddock-teal', !isBranddockColor(zw.brand), `brand=${zw.brand}`);
assert('Zwarthout accent is NIET Branddock-amber', !isBranddockColor(zw.accent), `accent=${zw.accent}`);
assert('Zwarthout brandSubtle is NIET teal-wash', !isBranddockColor(zw.brandSubtle), `brandSubtle=${zw.brandSubtle}`);
assert('Zwarthout action is NIET Branddock-teal', !isBranddockColor(zw.action), `action=${zw.action}`);
assert('Zwarthout brand is de donkerste klant-kleur (charcoal #212529)', zw.brand.toLowerCase() === '#212529', `brand=${zw.brand}`);
assert('Zwarthout brand == onSurface (gegrond in klant-kleur)', zw.brand.toLowerCase() === zw.onSurface.toLowerCase(), `brand=${zw.brand} onSurface=${zw.onSurface}`);

// 2. Geen styleguide → DEFAULT moet neutraal zijn, geen teal
const def = extractBrandTokensFromStyleguide(null);
assert('DEFAULT brand is neutraal (geen teal)', !isBranddockColor(def.brand), `brand=${def.brand}`);
assert('DEFAULT accent is neutraal (geen amber)', !isBranddockColor(def.accent), `accent=${def.accent}`);

// 3. extractBrandTokensFromContext (regex-fallback) — geen teal
const ctxEmpty = extractBrandTokensFromContext({ brandColors: null } as never);
assert('regex-fallback brand is geen teal', !isBranddockColor(ctxEmpty.brand), `brand=${ctxEmpty.brand}`);

// 4. Regressie: echt merk met PRIMARY behoudt zijn kleur
const real = extractBrandTokensFromStyleguide(REAL_BRAND_STYLEGUIDE);
assert('Echt merk: brand == PRIMARY #0D9488', real.brand.toLowerCase() === '#0d9488', `brand=${real.brand}`);
assert('Echt merk: accent == ACCENT #F97316', real.accent.toLowerCase() === '#f97316', `accent=${real.accent}`);

// 5. DEFAULT_BRAND_TOKENS bevat geen Branddock-merk-kleuren meer
assert('DEFAULT_BRAND_TOKENS.brand niet teal', !isBranddockColor(DEFAULT_BRAND_TOKENS.brand));
assert('DEFAULT_BRAND_TOKENS.accent niet amber', !isBranddockColor(DEFAULT_BRAND_TOKENS.accent));

console.log('\n── Fase 2: spacing px/rem-classificatie ──');

// Napking-achtige px-scale met non-integer waarden (1.6/6.6) — mag NIET ×16.
const pxScale = extractBrandTokensFromStyleguide({
  ...ZWARTHOUT_STYLEGUIDE,
  spacingScale: { tokens: [{ value: 1.6 }, { value: 4 }, { value: 6.6 }, { value: 8 }, { value: 12 }, { value: 16 }] },
});
const pxMax = Math.max(...pxScale.designSystem.spacing);
assert('px-scale (max 16) blijft px, niet ×16 opgeblazen', pxMax <= 20, `max=${pxMax}`);

// LINFI-achtige rem-scale (alles klein, max 7) — moet ×16.
const remScale = extractBrandTokensFromStyleguide({
  ...ZWARTHOUT_STYLEGUIDE,
  spacingScale: { tokens: [{ value: 1 }, { value: 2 }, { value: 4 }, { value: 5 }, { value: 7 }] },
});
const remMax = Math.max(...remScale.designSystem.spacing);
assert('rem-scale (max 7) ×16 geïnterpreteerd', remMax >= 100, `max=${remMax}`);

console.log('\n── Fase 4: garbage-button + framework-kleur-gating ──');

// B1a: kale <button>-reset (transparant + padding 0) → genegeerd, sane defaults
const garbageBtn = extractBrandTokensFromStyleguide({
  ...ZWARTHOUT_STYLEGUIDE,
  buttonProfile: [{ role: 'primary', selector: 'button', background: '#fff0', paddingX: '0', paddingY: '0', borderRadius: null, border: null }],
});
assert('garbage-button → background null (fallback)', garbageBtn.button.background === null, `bg=${garbageBtn.button.background}`);
assert('garbage-button → sane padding (28)', garbageBtn.button.paddingX === 28, `padX=${garbageBtn.button.paddingX}`);

// B1b: WordPress-default button-selector → genegeerd
const wpBtn = extractBrandTokensFromStyleguide({
  ...ZWARTHOUT_STYLEGUIDE,
  buttonProfile: [{ role: 'primary', selector: '.wp-block-button__link', background: '#32373c', paddingX: '16px', paddingY: '8px', borderRadius: '9999px', border: null }],
});
assert('wp-block-button selector → genegeerd (radius fallback 6)', wpBtn.button.radiusPx === 6, `radius=${wpBtn.button.radiusPx}`);

// B2: Bootstrap-default mis-geclassificeerd als PRIMARY → NIET als brand gekozen
const fwBrand = extractBrandTokensFromStyleguide({
  ...ZWARTHOUT_STYLEGUIDE,
  colors: [
    { hex: '#0D6EFD', category: 'PRIMARY', tags: ['bootstrap', 'default', 'primary'], confidence: 'high', sortOrder: 0 },
    { hex: '#212529', category: 'NEUTRAL', tags: ['bootstrap', 'text', 'dark'], confidence: 'high', sortOrder: 1 },
  ],
});
assert('framework-default PRIMARY (#0D6EFD) NIET als brand', fwBrand.brand.toLowerCase() !== '#0d6efd', `brand=${fwBrand.brand}`);
assert('framework-case brand grondt op echte kleur (charcoal)', fwBrand.brand.toLowerCase() === '#212529', `brand=${fwBrand.brand}`);

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
