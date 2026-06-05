/**
 * Smoke-test — brandstyle Fase 4 (font-fallback). Verifieert de deterministisch
 * testbare delen van de font-fidelity-fix (symptoom: lege fonts-tabel, "fonts
 * lopen niet lekker"):
 *
 *   1. extractSemanticFonts vangt nu Bootstrap `--bs-*` font-vars; een
 *      brand-gecustomiseerde waarde overleeft, een vanilla system-stack wordt
 *      terecht gefilterd (geen valse merk-font).
 *   2. selectDetectedFontNames levert UITSLUITEND écht gescrapte fonts — nooit
 *      de AI-fallback (anders wordt een gok als detectie gepresenteerd).
 *   3. planHeadlessMerge / shouldTryHeadless / hasNoBrandFonts: de headless
 *      computed-style-render triggert óók op lege fonts en merget per-bron
 *      deficiëntie-gestuurd (nooit een goed statisch resultaat overschrijven).
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase44-font-fallback.ts
 */
import { extractSemanticFonts } from '../../src/lib/brandstyle/url-scraper';
import {
  hasNoBrandFonts,
  planHeadlessMerge,
  shouldTryHeadless,
  selectDetectedFontNames,
} from '../../src/lib/brandstyle/font-fallback';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('── extractSemanticFonts: Bootstrap --bs-* vars ──');

// Brand-gecustomiseerde Bootstrap: echte merk-fonts in --bs-* vars.
const customBootstrap = `:root{--bs-body-font-family:'Brandon Grotesque',sans-serif;--bs-headings-font-family:"Reckless",serif}`;
const custom = extractSemanticFonts(customBootstrap);
assert('--bs-body-font-family → bodyFont "Brandon Grotesque"', custom.bodyFont === 'Brandon Grotesque', `got=${custom.bodyFont}`);
assert('--bs-headings-font-family → headingFont "Reckless"', custom.headingFont === 'Reckless', `got=${custom.headingFont}`);

// Vanilla Bootstrap 5: system-stack body + inherit headings → géén merk-font.
const vanillaBootstrap = `:root{--bs-body-font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;--bs-headings-font-family:inherit}`;
const vanilla = extractSemanticFonts(vanillaBootstrap);
assert('vanilla --bs-body system-stack → bodyFont null (gefilterd)', vanilla.bodyFont === null, `got=${vanilla.bodyFont}`);
assert('vanilla --bs-headings inherit → headingFont null (gefilterd)', vanilla.headingFont === null, `got=${vanilla.headingFont}`);

// ACSS-regressie: bestaande --h1-font-family blijft werken.
const acss = `:root{--h1-font-family:Poppins;--body-font-family:Inter}`;
const acssRes = extractSemanticFonts(acss);
assert('regressie: --h1-font-family → "Poppins"', acssRes.headingFont === 'Poppins', `got=${acssRes.headingFont}`);
assert('regressie: --body-font-family → "Inter"', acssRes.bodyFont === 'Inter', `got=${acssRes.bodyFont}`);

console.log('\n── selectDetectedFontNames: geen AI-leak ──');
assert('leeg → [] (geen AI-fallback gepresenteerd als detectie)', selectDetectedFontNames([]).length === 0);
assert('echte fonts → behouden', JSON.stringify(selectDetectedFontNames(['Inter', 'Roboto'])) === JSON.stringify(['Inter', 'Roboto']));
assert('filtert lege/whitespace strings', JSON.stringify(selectDetectedFontNames(['', '  ', 'Inter', null, undefined])) === JSON.stringify(['Inter']));
assert('cap op 6', selectDetectedFontNames(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']).length === 6);

console.log('\n── hasNoBrandFonts ──');
assert('leeg → true', hasNoBrandFonts([]) === true);
assert('alleen whitespace → true', hasNoBrandFonts(['', '   ', null]) === true);
assert('één echte font → false', hasNoBrandFonts(['Inter']) === false);

console.log('\n── shouldTryHeadless ──');
assert('zwak palet → true', shouldTryHeadless({ weakPalette: true, fontsEmpty: false }) === true);
assert('lege fonts → true', shouldTryHeadless({ weakPalette: false, fontsEmpty: true }) === true);
assert('beide ok → false', shouldTryHeadless({ weakPalette: false, fontsEmpty: false }) === false);

console.log('\n── planHeadlessMerge: deficiëntie-gestuurde merge ──');
const weakOnly = planHeadlessMerge({ weakPalette: true, fontsEmpty: false, headlessFontCount: 3 });
assert('zwak palet → adoptColors, niet adoptFonts', weakOnly.adoptColors === true && weakOnly.adoptFonts === false);
const fontsOnly = planHeadlessMerge({ weakPalette: false, fontsEmpty: true, headlessFontCount: 2 });
assert('lege fonts + headless vond fonts → adoptFonts, niet adoptColors', fontsOnly.adoptFonts === true && fontsOnly.adoptColors === false);
const fontsButNoneFound = planHeadlessMerge({ weakPalette: false, fontsEmpty: true, headlessFontCount: 0 });
assert('lege fonts maar headless vond niets → niets adopteren', fontsButNoneFound.adoptColors === false && fontsButNoneFound.adoptFonts === false);
const both = planHeadlessMerge({ weakPalette: true, fontsEmpty: true, headlessFontCount: 4 });
assert('beide deficiënt → beide adopteren', both.adoptColors === true && both.adoptFonts === true);

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
