/**
 * Smoke-test — Typography-fix Fase 3 (font-load-consolidatie). Verifieert de
 * pure delen van het geconsolideerde load-pad:
 *
 *   1. buildFontFamilyStack zet de echte font eerst, dan de substitute, dan de
 *      system-fallback; `normalise:false` houdt UPLOADED/ADOBE-namen verbatim.
 *   2. resolveFontRender kiest de juiste bron (UPLOADED → ADOBE-met-kit →
 *      GOOGLE_FONTS → SUBSTITUTE) en geeft geen valse Inter op een echte
 *      Google-Fonts-naam (exact-match, geen fuzzy).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase45-font-loading.ts
 */
import { buildFontFamilyStack, weightForLevel } from '../../src/lib/brandstyle/typography-display';
import { resolveFontRender } from '../../src/features/brandstyle/utils/font-loading';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('── buildFontFamilyStack ──');
assert('Effra + Inter → stack met beide', buildFontFamilyStack('Effra', 'Inter') === '"Effra", "Inter", system-ui, -apple-system, sans-serif', `got=${buildFontFamilyStack('Effra', 'Inter')}`);
assert('Roboto zonder substitute', buildFontFamilyStack('Roboto', null) === '"Roboto", system-ui, -apple-system, sans-serif', `got=${buildFontFamilyStack('Roboto', null)}`);
assert('lege naam → undefined', buildFontFamilyStack('', 'Inter') === undefined);
assert('verbatim (normalise:false) — geen PascalCase', buildFontFamilyStack('brandon-grotesque', null, { normalise: false }) === '"brandon-grotesque", system-ui, -apple-system, sans-serif', `got=${buildFontFamilyStack('brandon-grotesque', null, { normalise: false })}`);

console.log('\n── resolveFontRender: bron-keuze ──');
const commercial = resolveFontRender('Effra', 'COMMERCIAL', { workspaceKitId: null, isUploaded: false });
assert('COMMERCIAL Effra → SUBSTITUTE Inter', commercial.source === 'SUBSTITUTE' && commercial.substitute?.googleFont === 'Inter', `got=${commercial.source}/${commercial.substitute?.googleFont}`);
const adobeKit = resolveFontRender('Effra', 'ADOBE_FONTS', { workspaceKitId: 'yvk1gic', isUploaded: false });
assert('ADOBE + workspace-kit → ADOBE_FONTS, geen substitute', adobeKit.source === 'ADOBE_FONTS' && adobeKit.substitute === null);
const adobeNoKit = resolveFontRender('Effra', 'ADOBE_FONTS', { workspaceKitId: null, isUploaded: false });
assert('ADOBE zonder kit (Napking) → SUBSTITUTE Inter', adobeNoKit.source === 'SUBSTITUTE' && adobeNoKit.substitute?.googleFont === 'Inter', `got=${adobeNoKit.source}/${adobeNoKit.substitute?.googleFont}`);
const google = resolveFontRender('Roboto', 'GOOGLE_FONTS', { workspaceKitId: null, isUploaded: false });
assert('GOOGLE_FONTS → GOOGLE_FONTS, geen substitute', google.source === 'GOOGLE_FONTS' && google.substitute === null);
const uploaded = resolveFontRender('brandon-grotesque', 'UPLOADED', { workspaceKitId: 'yvk1gic', isUploaded: true });
assert('UPLOADED → UPLOADED, geen substitute', uploaded.source === 'UPLOADED' && uploaded.substitute === null);
const rowsLess = resolveFontRender('Markazi Text', null, { workspaceKitId: null, isUploaded: false });
assert('rows-less onbekende naam → geen fuzzy false-positive Inter', rowsLess.substitute === null, `got substitute=${rowsLess.substitute?.googleFont}`);

console.log('\n── weightForLevel: consistente heading-defaults (Type Scale ≡ In Context) ──');
assert('H1 zonder scrape → 700 (bold)', weightForLevel('H1', null) === 700);
assert('H2 zonder scrape → 600', weightForLevel('H2', null) === 600);
assert('H3 zonder scrape → 600', weightForLevel('h3', undefined) === 600);
assert('Body zonder scrape → undefined (normaal)', weightForLevel('Body', null) === undefined);
assert('Small zonder scrape → undefined', weightForLevel('Small', '') === undefined);
assert('gescrapt weight wint van default', weightForLevel('H1', '300') === '300');

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
