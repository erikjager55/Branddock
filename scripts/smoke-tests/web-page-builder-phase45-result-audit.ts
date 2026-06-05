/**
 * Smoke-test — brandstyle RESULTAAT-audit verbeterplan (audit
 * 2026-06-05-brandstyle-result-audit), deterministische delen van Fase 1a/2/3.
 *
 *   Fase 2  — clusterElevation unwrapt {tokens:[...]} (elevation niet langer 0)
 *   Fase 1a — backfillComponentsByType herstelt ontbrekende types uit static
 *   Fase 3a — var()-resolutie geeft eerste echte familie, niet de hele stack
 *   Fase 3b — WooCommerce/Elementor icon-fonts gefilterd
 *   Fase 3c — alleen eerste familie per declaratie (geen fallback-chain-ruis)
 *   Fase 3d — weight-suffix strip voor Google-Fonts-lookup ("Sen Bold" → "Sen")
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase45-result-audit.ts
 */
import * as cheerio from 'cheerio';
import { clusterElevation } from '../../src/lib/brandstyle/semantic-role-resolver';
import {
  backfillComponentsByType,
  prioritiseScreenshotUrls,
  extractComponents,
  type DetectedComponent,
} from '../../src/lib/brandstyle/component-extractor';
import { extractSemanticFonts, extractFontsFromCss } from '../../src/lib/brandstyle/url-scraper';
import { stripFontWeightSuffix } from '../../src/lib/brandstyle/google-fonts-catalog';
import { reclassifySaturatedNeutral } from '../../src/lib/brandstyle/analysis-engine';
import { parsePxFirst } from '../../src/lib/brandstyle/bulk-computed-styles';
import { deriveCornerRadii, extractBorderRadius } from '../../src/lib/brandstyle/css-visual-heuristics';
import { computeConfidence } from '../../src/lib/brandstyle/component-screenshotter';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('── Fase 2: clusterElevation {tokens:[...]} unwrap ──');
const shadowSystem = {
  tokens: [
    { name: 'subtle', value: 'none !important', intensity: 'subtle' },
    { name: 'default', value: '0 .5rem 1rem rgba(33,37,41,.15) !important', intensity: 'subtle' },
    { name: 'bold', value: '10px 5px 5px #262626', intensity: 'subtle' },
    { name: 'elevated', value: '0 0 2px 2px rgba(0,0,0,.6)', intensity: 'subtle' },
  ],
};
const elev = clusterElevation(shadowSystem, []);
const elevCount = Object.keys(elev).length;
assert('elevation niet leeg (was 0 door Array.isArray-bug)', elevCount >= 2, `count=${elevCount}`);
assert('"none !important" gefilterd (geen elevation-level)', !Object.values(elev).some((v) => /none/i.test(v)));
assert('"!important" gestript uit waarden', !Object.values(elev).some((v) => /!important/i.test(v)));
assert('kale array werkt ook (backward-compat)', Object.keys(clusterElevation([{ value: '0 1px 2px #000' }], [])).length === 1);
assert('leeg/onbekend → leeg (geen crash)', Object.keys(clusterElevation(null, [])).length === 0);

console.log('\n── Fase 1a: backfillComponentsByType ──');
const mk = (type: DetectedComponent['type'], label: string, conf = 0.9): DetectedComponent => ({
  type, label, selector: 'x', classes: [], extractedStyles: {}, previewHtml: null, confidence: conf,
});
const shot = [mk('BUTTON', 'CTA'), mk('TOP_NAVIGATION', 'Nav')];
const staticSet = [mk('BUTTON', 'static-btn'), mk('FORM_INPUT', 'Email'), mk('PRODUCT_CARD', 'Card')];
const merged = backfillComponentsByType(shot, staticSet);
assert('screenshot-set blijft leidend (CTA behouden)', merged.some((c) => c.label === 'CTA'));
assert('ontbrekend type FORM_INPUT gebackfilld', merged.some((c) => c.type === 'FORM_INPUT'));
assert('ontbrekend type PRODUCT_CARD gebackfilld', merged.some((c) => c.type === 'PRODUCT_CARD'));
assert('aanwezig type BUTTON NIET dubbel uit static (static-btn niet toegevoegd)', !merged.some((c) => c.label === 'static-btn'));
assert('lage-confidence static gefilterd', !backfillComponentsByType([], [mk('FORM_INPUT', 'junk', 0.2)]).length);
assert('lege input → leeg', backfillComponentsByType([], []).length === 0);

console.log('\n── Fase 3a: var()-stack-resolutie ──');
// var resolvet naar pure system-stack → null (niet de hele stack als font)
const sysVarCss = ':root{--bs-body-font-family:var(--fb);--fb:system-ui,-apple-system,"Segoe UI",sans-serif}';
assert('var→system-stack body → null (geen stack-string)', extractSemanticFonts(sysVarCss).bodyFont === null,
  `got=${extractSemanticFonts(sysVarCss).bodyFont}`);
// var resolvet naar branded stack → eerste echte familie
const brandVarCss = ':root{--bs-headings-font-family:var(--fb);--fb:"Brandon Grotesque",sans-serif}';
assert('var→branded stack heading → "Brandon Grotesque"', extractSemanticFonts(brandVarCss).headingFont === 'Brandon Grotesque',
  `got=${extractSemanticFonts(brandVarCss).headingFont}`);

console.log('\n── Fase 3b: icon-font filter (WooCommerce) ──');
assert('--bs-body-font-family:WooCommerce → null (icon-font)', extractSemanticFonts(':root{--bs-body-font-family:WooCommerce}').bodyFont === null);

console.log('\n── Fase 3c: fallback-chain (alleen eerste echte familie) ──');
// Unquoted families — extractFontsFromCss' hoofd-regex slaat quoted waarden
// over (apart pad); de 3c-`break` werkt op de unquoted fallback-chain.
const chainCss = 'body{font-family:Brandloom, Roboto, Oxygen, Ubuntu, sans-serif} h1{font-family:Displayfont, Arial}';
const fonts = extractFontsFromCss(chainCss);
assert('Brandloom geëxtraheerd', fonts.some((f) => f.toLowerCase() === 'brandloom'), `fonts=${fonts.join(',')}`);
assert('Displayfont geëxtraheerd (aparte declaratie)', fonts.some((f) => f.toLowerCase() === 'displayfont'), `fonts=${fonts.join(',')}`);
assert('Roboto NIET (fallback-chain-ruis)', !fonts.some((f) => f.toLowerCase() === 'roboto'), `fonts=${fonts.join(',')}`);
assert('Oxygen/Ubuntu NIET (fallback-chain-ruis)', !fonts.some((f) => /oxygen|ubuntu/i.test(f)), `fonts=${fonts.join(',')}`);

console.log('\n── Fase 3d: weight-suffix strip ──');
assert('"Sen Bold" → "Sen"', stripFontWeightSuffix('Sen Bold') === 'Sen');
assert('"Poppins SemiBold Italic" → "Poppins"', stripFontWeightSuffix('Poppins SemiBold Italic') === 'Poppins');
assert('"Inter" → "Inter" (geen suffix)', stripFontWeightSuffix('Inter') === 'Inter');
assert('"Bold" → "Bold" (nooit laatste woord strippen)', stripFontWeightSuffix('Bold') === 'Bold');
assert('"Archivo 700" → "Archivo" (numeriek weight)', stripFontWeightSuffix('Archivo 700') === 'Archivo');
assert('"Times New Roman" → "Times New" (Roman = style-token)', stripFontWeightSuffix('Times New Roman') === 'Times New');

console.log('\n── Fase 1b: prioritiseScreenshotUrls (coverage) ──');
const home = 'https://zwarthout.com/';
const subs = [
  'https://zwarthout.com/about-us/',
  'https://zwarthout.com/products/kyushu/',
  'https://zwarthout.com/products/marugame/',
  'https://zwarthout.com/products/naoshima/',
  'https://zwarthout.com/products/omiyama/',
  'https://zwarthout.com/contact/',
  'https://zwarthout.com/quote/',
];
const ordered = prioritiseScreenshotUrls(home, subs);
const top5 = ordered.slice(0, 5);
assert('homepage eerst', ordered[0] === home);
assert('/contact in top-5 (was rank 8, viel buiten oude slice)', top5.some((u) => /\/contact\//.test(u)), top5.join(','));
assert('/quote in top-5', top5.some((u) => /\/quote\//.test(u)));
assert('max 2 product-pagina\'s in top-5 (Fase 1d)', top5.filter((u) => /\/products\//.test(u)).length <= 2, top5.join(','));
assert('alle URL\'s behouden (geen verlies)', ordered.length === subs.length + 1);

console.log('\n── Fase 1c: product-item → PRODUCT_CARD ──');
const cardHtml = '<ul class="products"><li class="product-item mm-product"><h3 class="product-title">Kyushu</h3><div class="product-img"></div></li></ul>';
const cardCss = '.product-item{background:#ffffff;border:1px solid #ddd;border-radius:8px;padding:16px;color:#212529}';
const cardComps = extractComponents(cheerio.load(cardHtml), cardCss);
assert('li.product-item gedetecteerd als PRODUCT_CARD', cardComps.some((c) => c.type === 'PRODUCT_CARD'),
  cardComps.map((c) => c.type).join(','));
// inline child mag geen product-card worden
const childHtml = '<span class="product-item-title">X</span>';
const childComps = extractComponents(cheerio.load(childHtml), '.product-item-title{color:#000}');
assert('inline .product-item-title NIET als card (geen substring-false-positive)', !childComps.some((c) => c.type === 'PRODUCT_CARD'));

console.log('\n── Fase 4a: chroma-gate (saturated NEUTRAL → ACCENT) ──');
assert('verzadigd blauw + usage → ACCENT', reclassifySaturatedNeutral('NEUTRAL', '#1a5fb4', { usageEvidence: 'strong' }) === 'ACCENT');
assert('verzadigd paars + usage → ACCENT', reclassifySaturatedNeutral('NEUTRAL', '#7b2fbe', { usageEvidence: 'weak' }) === 'ACCENT');
assert('echte grijs blijft NEUTRAL', reclassifySaturatedNeutral('NEUTRAL', '#6c757d', { usageEvidence: 'strong' }) === 'NEUTRAL');
assert('bijna-wit blijft NEUTRAL (hue onbetrouwbaar)', reclassifySaturatedNeutral('NEUTRAL', '#f8f9fa', { usageEvidence: 'strong' }) === 'NEUTRAL');
assert('bijna-zwart blijft NEUTRAL', reclassifySaturatedNeutral('NEUTRAL', '#0a0b0c', { usageEvidence: 'strong' }) === 'NEUTRAL');
assert('framework-default-blauw zonder usage NIET promoten', reclassifySaturatedNeutral('NEUTRAL', '#0d6efd', { usageEvidence: 'none' }) === 'NEUTRAL');
assert('PRIMARY blijft PRIMARY (niet aangeraakt)', reclassifySaturatedNeutral('PRIMARY', '#1a5fb4', { usageEvidence: 'strong' }) === 'PRIMARY');
assert('ACCENT blijft ACCENT', reclassifySaturatedNeutral('ACCENT', '#1a5fb4', { usageEvidence: 'none' }) === 'ACCENT');

console.log('\n── Fase 5a: parsePxFirst afronding ──');
assert('"5.42px" → 5 (geen fractioneel)', parsePxFirst('5.42px') === 5);
assert('"3.75px" → 4', parsePxFirst('3.75px') === 4);
assert('"0px 16px 32px 0px" → 16 (eerste niet-nul, integer)', parsePxFirst('0px 16px 32px 0px') === 16);
assert('"8px" → 8 (heel blijft heel)', parsePxFirst('8px') === 8);

console.log('\n── Fase 5c: deriveCornerRadii pill-detectie ──');
const mkRadius = (values: number[]) => ({ values, median: values[0] ?? 0, mostCommon: values[0] ?? 0, hasVariation: values.length > 1 });
const r1 = deriveCornerRadii(mkRadius([4, 8, 16, 9999])).tokens;
assert('full = 9999 (echte pill, niet 4px)', r1.find((t) => t.name === 'full')?.value === 9999, JSON.stringify(r1));
assert('sm/md/lg uit kleine radii', ['sm', 'md', 'lg'].every((n) => r1.some((t) => t.name === n)));
// >4 waarden incl. pill: pill mag niet door slice(0,4) verdwijnen
const r2 = deriveCornerRadii(mkRadius([2, 4, 6, 8, 16, 9999])).tokens;
assert('pill behouden bij >4 radii (niet weggesliced)', r2.some((t) => t.name === 'full' && t.value === 9999), JSON.stringify(r2));
assert('geen fake "full" zonder pill', !deriveCornerRadii(mkRadius([4, 8, 16])).tokens.some((t) => t.name === 'full'));
assert('enkele radius → "default"', deriveCornerRadii(mkRadius([8])).tokens[0]?.name === 'default');

// Review-fix: pill-sentinel in values, maar NIET in median/mostCommon (AI-prompt)
const brMixed = extractBorderRadius('.a{border-radius:8px;}.b{border-radius:8px;}.c{border-radius:8px;}.avatar{border-radius:50%;}.pill{border-radius:9999px;}');
assert('pill-sentinel zit in values (voor deriveCornerRadii)', brMixed.values.includes(9999), `values=${JSON.stringify(brMixed.values)}`);
assert('median pill-vrij (niet 9999 naar AI-prompt)', brMixed.median !== 9999 && brMixed.median === 8, `median=${brMixed.median}`);
assert('mostCommon pill-vrij', brMixed.mostCommon !== 9999 && brMixed.mostCommon === 8, `mostCommon=${brMixed.mostCommon}`);
const brAllPill = extractBorderRadius('.a{border-radius:50%;}');
assert('alleen pills → median 0 (geen 9999-lek)', brAllPill.median === 0, `median=${brAllPill.median}`);

// Review-fix: chroma-gate behandelt undefined usageEvidence als 'none'
assert('framework-default + undefined usage NIET promoten', reclassifySaturatedNeutral('NEUTRAL', '#0d6efd', {}) === 'NEUTRAL');
assert('framework-default + weak usage → wel ACCENT (positief bewijs)', reclassifySaturatedNeutral('NEUTRAL', '#0d6efd', { usageEvidence: 'weak' }) === 'ACCENT');

console.log('\n── Fase 6a: computeConfidence discrimineert ──');
const btnConf = computeConfidence({ 'background-color': 'rgb(255,87,34)', 'border-radius': '8px', padding: '12px 24px', 'font-weight': '700' });
const genConf = computeConfidence({ color: 'rgb(0,0,0)', display: 'block', 'font-size': '16px' });
const navConf = computeConfidence({ 'background-color': 'rgba(0, 0, 0, 0)', display: 'block', padding: '8px' });
assert('echte button → hoog (>0.7)', btnConf > 0.7, `conf=${btnConf}`);
assert('generiek element → laag (geen onderscheidende props)', genConf <= 0.35, `conf=${genConf}`);
assert('transparante balk → niet 100% (was degeneratie)', navConf < 0.6, `conf=${navConf}`);
assert('button scoort hoger dan generiek', btnConf > genConf);

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
