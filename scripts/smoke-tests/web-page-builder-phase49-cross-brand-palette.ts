/**
 * Smoke-test — cross-brand palet-verbeteringen (2026-06-05).
 *   Fase 1: non-brand kleur-uitsluiting (third-party widget / social / admin)
 *   Fase 2: neutral-consolidatie (perceptuele dedup + cap)
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/web-page-builder-phase49-cross-brand-palette.ts
 */
import { isNonBrandColor } from '../../src/lib/brandstyle/non-brand-colors';
import { applyUsageDrivenPaletteFilter, type BulkColorStyles, type RenderStrength } from '../../src/lib/brandstyle/palette-usage-filter';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

console.log('── Fase 1: isNonBrandColor ──');
assert('WhatsApp Green (tag whatsapp/social) → non-brand', isNonBrandColor({ hex: '#25D366', tags: ['whatsapp', 'social', 'cta'] }));
assert('WordPress Blue (tag admin/system) → non-brand', isNonBrandColor({ hex: '#007CBA', tags: ['admin', 'system'] }));
assert('Facebook Blue (tag social) → non-brand', isNonBrandColor({ hex: '#3B5998', tags: ['social', 'trust'] }));
assert('Instagram Pink (tag social) → non-brand', isNonBrandColor({ hex: '#E4405F', tags: ['social', 'vibrant'] }));
assert('WhatsApp-hex #25D366 zonder tag → non-brand (distinctieve backstop)', isNonBrandColor({ hex: '#25D366', tags: [] }));
assert('blauwe platform-hex #1877F2 zonder tag → BRAND (geen blauw-backstop, alleen via tag)', !isNonBrandColor({ hex: '#1877F2', tags: [] }));
assert('WP-admin #007CBA zonder tag → BRAND (geen blauw-backstop); MÉT admin-tag wél weg', !isNonBrandColor({ hex: '#007CBA', tags: [] }) && isNonBrandColor({ hex: '#007CBA', tags: ['admin'] }));
assert('Ocean Blue (cta/brand-accent, geen social-tag) → BRAND (behouden)', !isNonBrandColor({ hex: '#008ACF', tags: ['cta', 'buttons', 'brand-accent'] }));
assert('Burnt Orange (brand/logo) → BRAND', !isNonBrandColor({ hex: '#E06000', tags: ['brand', 'logo', 'cta'] }));
assert('generieke oranje #FF6600 zonder social-tag → BRAND', !isNonBrandColor({ hex: '#FF6600', tags: ['energy', 'highlight'] }));
// Review CRITICAL-1: puur rood mag GEEN merk-rood weren (#FF0000 uit hex-lijst).
assert('merk-rood #FF0000 (geen youtube-tag) → BRAND', !isNonBrandColor({ hex: '#FF0000', tags: ['error', 'brand', 'primary'] }));
assert('bijna-puur-rood #FB0000 → BRAND', !isNonBrandColor({ hex: '#FB0000', tags: ['accent'] }));
// Review CRITICAL-2: corporate-blauw mag niet door WP-admin-band geweerd worden.
assert('corporate-blauw #2271B1 (geen admin-tag) → BRAND', !isNonBrandColor({ hex: '#2271B1', tags: ['primary', 'brand'] }));
assert('Material-blauw #2196F3 → BRAND', !isNonBrandColor({ hex: '#2196F3', tags: ['interactive'] }));
assert('#2271B1 MÉT admin-tag → non-brand (via tag)', isNonBrandColor({ hex: '#2271B1', tags: ['admin', 'system'] }));

console.log('\n── Fase 1+2: filter op napking-achtig palet ──');
type C = { hex: string; name: string; category: string; tags?: string[]; detectorSource?: string | null };
const palette: C[] = [
  { hex: '#1A171B', name: 'Deep Charcoal', category: 'PRIMARY', tags: ['text', 'headings', 'brand'] },
  { hex: '#008ACF', name: 'Ocean Blue', category: 'ACCENT', tags: ['cta', 'brand-accent'] },
  { hex: '#25D366', name: 'WhatsApp Green', category: 'ACCENT', tags: ['whatsapp', 'social', 'cta'] },
  { hex: '#007CBA', name: 'WordPress Blue', category: 'ACCENT', tags: ['admin', 'system'] },
  { hex: '#DDDDDD', name: 'Light Gray', category: 'NEUTRAL', tags: ['borders'] },
  { hex: '#EEEEEE', name: 'Soft White', category: 'NEUTRAL', tags: ['backgrounds'] },
  { hex: '#313131', name: 'Dark Charcoal', category: 'NEUTRAL', tags: ['dark-surfaces'] },
  { hex: '#6B7280', name: 'Slate Gray', category: 'NEUTRAL', tags: ['secondary-text'] },
  { hex: '#200707', name: 'Deep Brown', category: 'NEUTRAL', tags: ['text'] },
  { hex: '#C0C6C1', name: 'Sage Gray', category: 'NEUTRAL', tags: ['subtle'] },
  { hex: '#ABB8C3', name: 'Cool Gray', category: 'NEUTRAL', tags: ['ui'] },
];
// Alle kleuren renderen (zodat usage ze niet dropt — we testen non-brand + cap).
const bulk: BulkColorStyles = {
  color: {
    'rgb(26, 23, 27)': 500, 'rgb(0, 138, 207)': 60, 'rgb(37, 211, 102)': 40, 'rgb(0, 124, 186)': 20,
    'rgb(49, 49, 49)': 120, 'rgb(107, 114, 128)': 90, 'rgb(32, 7, 7)': 30,
  },
  'background-color': {
    'rgb(238, 238, 238)': 300, 'rgb(221, 221, 221)': 80, 'rgb(192, 198, 193)': 25, 'rgb(171, 184, 195)': 15,
  },
};
const usage = new Map<string, RenderStrength | undefined>();
const kept = applyUsageDrivenPaletteFilter(palette, { bulkColorStyles: bulk, usageEvidenceByHex: usage });
const names = kept.map((c) => c.name);
console.log(`  behouden (${names.length}): ${names.join(', ')}`);

assert('WhatsApp Green GEDROPT (widget)', !names.includes('WhatsApp Green'));
assert('WordPress Blue GEDROPT (admin)', !names.includes('WordPress Blue'));
assert('Deep Charcoal behouden (primary, gebruikt)', names.includes('Deep Charcoal'));
assert('Ocean Blue behouden (brand-accent, gebruikt)', names.includes('Ocean Blue'));
const keptNeutrals = kept.filter((c) => c.category === 'NEUTRAL');
assert('neutrals geconsolideerd (7 → minder, ≤6)', keptNeutrals.length < 7 && keptNeutrals.length <= 6, `n=${keptNeutrals.length}: ${keptNeutrals.map((c) => c.name).join(',')}`);
assert('near-duplicate Light Gray #DDDDDD gemerged (near Soft White #EEEEEE)', !keptNeutrals.some((c) => c.hex === '#DDDDDD'));
assert('near-duplicate cool-grijs gemerged (#ABB8C3 of #C0C6C1 weg)', keptNeutrals.filter((c) => ['#C0C6C1', '#ABB8C3'].includes(c.hex)).length === 1);
assert('donkerste neutral behouden (#200707 Deep Brown)', keptNeutrals.some((c) => c.hex === '#200707'));
assert('lichtste neutral behouden (#EEEEEE Soft White)', keptNeutrals.some((c) => c.hex === '#EEEEEE'));

console.log('\n── Fase 2b: WP/Gutenberg framework-neutral #ABB8C3 usage-gated ──');
// Napking-leak: #ABB8C3 ("Cyan bluish gray") = WP-core-default-palet neutraal,
// AI tagt 'm niet framework → moet via de framework-neutral-gate de STERKE-
// gebruik-lat halen, net als de Bootstrap-grijzen. Geen blinde blocklist.
const wpBase: C[] = [
  { hex: '#1A171B', name: 'Brand Ink', category: 'PRIMARY', tags: ['brand', 'text'] },
  { hex: '#FFFFFF', name: 'Paper', category: 'NEUTRAL', tags: ['surface'] },
  { hex: '#ABB8C3', name: 'Cyan Bluish Gray', category: 'NEUTRAL', tags: ['ui'] },
];
const wpWeakBulk: BulkColorStyles = {
  color: { 'rgb(26, 23, 27)': 800 },
  'background-color': { 'rgb(255, 255, 255)': 700, 'rgb(171, 184, 195)': 5 },
};
const wpWeakKept = applyUsageDrivenPaletteFilter(wpBase, { bulkColorStyles: wpWeakBulk, usageEvidenceByHex: new Map() }).map((c) => c.name);
assert('WP-default #ABB8C3 zwak gebruikt → GEDROPT (framework-neutral gate)', !wpWeakKept.includes('Cyan Bluish Gray'), wpWeakKept.join(','));

const wpStrongBulk: BulkColorStyles = {
  color: { 'rgb(26, 23, 27)': 400 },
  'background-color': { 'rgb(255, 255, 255)': 400, 'rgb(171, 184, 195)': 300 },
};
const wpStrongKept = applyUsageDrivenPaletteFilter(wpBase, { bulkColorStyles: wpStrongBulk, usageEvidenceByHex: new Map() }).map((c) => c.name);
assert('WP-default #ABB8C3 STERK gebruikt → BEHOUDEN (usage wint van framework-prior)', wpStrongKept.includes('Cyan Bluish Gray'), wpStrongKept.join(','));

// Review MAJOR-4: een logo-kleur die toevallig op een social-hex lijkt → behouden.
const logoNear: C[] = [
  { hex: '#1DA1F2', name: 'Logo Blue', category: 'PRIMARY', tags: ['brand'], detectorSource: 'logo-extraction:histogram' },
  { hex: '#212529', name: 'Ink', category: 'NEUTRAL' },
  { hex: '#FFFFFF', name: 'Paper', category: 'NEUTRAL' },
];
const logoKept = applyUsageDrivenPaletteFilter(logoNear, { bulkColorStyles: { color: { 'rgb(29,161,242)': 100, 'rgb(33,37,41)': 200, 'rgb(255,255,255)': 200 } }, usageEvidenceByHex: new Map() }).map((c) => c.name);
assert('logo-kleur near social-hex behouden (logo wint van non-brand)', logoKept.includes('Logo Blue'), logoKept.join(','));

// Review MAJOR-1: safety mag non-brand niet heropenen — val terug op brandPool.
const leaky: C[] = [
  { hex: '#1A171B', name: 'Charcoal', category: 'NEUTRAL', tags: ['text'] }, // rendert niet in deze bulk
  { hex: '#25D366', name: 'WhatsApp', category: 'ACCENT', tags: ['whatsapp', 'social'] },
  { hex: '#007CBA', name: 'WP', category: 'ACCENT', tags: ['admin'] },
];
const leakyBulk: BulkColorStyles = { color: { 'rgb(0,0,0)': 100 }, 'background-color': {} }; // niets matcht het palet → alles usage 'none'
const leakyKept = applyUsageDrivenPaletteFilter(leaky, { bulkColorStyles: leakyBulk, usageEvidenceByHex: new Map([['#1A171B', 'none'], ['#25D366', 'none'], ['#007CBA', 'none']]) }).map((c) => c.name);
assert('all-drop → brandPool (Charcoal), NIET WhatsApp/WP', leakyKept.includes('Charcoal') && !leakyKept.includes('WhatsApp') && !leakyKept.includes('WP'), leakyKept.join(','));

console.log('\n── Zwarthout-regressie: geen over-consolidatie bij weinig neutrals ──');
const zw: C[] = [
  { hex: '#E06000', name: 'Burnt Orange', category: 'PRIMARY', tags: ['brand', 'logo'], detectorSource: 'logo-extraction:histogram' },
  { hex: '#F8F9FA', name: 'Soft White', category: 'NEUTRAL', tags: ['surface'] },
  { hex: '#212529', name: 'Deep Charcoal', category: 'NEUTRAL', tags: ['text'] },
];
const zwBulk: BulkColorStyles = { color: { 'rgb(33, 37, 41)': 500, 'rgb(224, 96, 0)': 20 }, 'background-color': { 'rgb(248, 249, 250)': 200 } };
const zwKept = applyUsageDrivenPaletteFilter(zw, { bulkColorStyles: zwBulk, usageEvidenceByHex: new Map() }).map((c) => c.name);
assert('Zwarthout blijft 3 kleuren (geen over-drop/consolidatie)', zwKept.length === 3, zwKept.join(','));

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
