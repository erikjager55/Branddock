/**
 * Smoke-test — usage-gedreven palet-filter (2026-06-05). Verifieert dat een
 * kleur ALLEEN uit het palet valt als hij aantoonbaar niet gebruikt wordt
 * (multi-page computed-style aanwezigheid + homepage pixel-pass), en NOOIT
 * enkel omdat hij een framework-hex deelt. User-eis: "als een kleur wél
 * gebruikt wordt, mag die niet overgeslagen worden."
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/web-page-builder-phase47-usage-filter.ts
 */
import {
  applyUsageDrivenPaletteFilter,
  buildRenderedColorIndex,
  renderStrength,
  type BulkColorStyles,
  type RenderStrength,
} from '../../src/lib/brandstyle/palette-usage-filter';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

// Multi-page computed kleuren (zoals bulk-computed-styles ze levert): charcoal
// tekst dominant, slate-gray muted tekst echt aanwezig, soft-white surface,
// oranje CTA. Bootstrap-blauw/rood renderen NERGENS.
const bulk: BulkColorStyles = {
  color: {
    'rgb(33, 37, 41)': 500,   // Deep Charcoal — body text
    'rgb(108, 117, 125)': 80, // Slate Gray — muted text (écht gebruikt)
    'rgb(224, 96, 0)': 12,    // Burnt Orange — link/cta tekst
  },
  'background-color': {
    'rgb(248, 249, 250)': 200, // Soft White — surface
    'rgb(224, 96, 0)': 30,     // Burnt Orange — CTA bg
  },
};

type C = { hex: string; name: string; tags?: string[]; detectorSource?: string | null };
const palette: C[] = [
  { hex: '#E06000', name: 'Burnt Orange', tags: ['brand', 'logo', 'cta'], detectorSource: 'logo-extraction:histogram' },
  { hex: '#6C757D', name: 'Slate Gray', tags: ['text', 'secondary', 'muted'] },
  { hex: '#F8F9FA', name: 'Soft White', tags: ['background', 'surface'] },
  { hex: '#212529', name: 'Deep Charcoal', tags: ['text', 'dark'] },
  { hex: '#0D6EFD', name: 'Bootstrap Blue', tags: ['framework', 'accent'] },   // rendert nergens
  { hex: '#DC3545', name: 'Crimson Red', tags: ['danger', 'semantic'] },        // framework-hex, rendert nergens
];

const usage = new Map<string, RenderStrength | undefined>([
  ['#E06000', 'strong'],
  ['#212529', 'strong'],
  ['#6C757D', 'weak'],
  ['#F8F9FA', 'strong'],
  ['#0D6EFD', 'none'],
  ['#DC3545', 'none'],
]);

console.log('── buildRenderedColorIndex / renderStrength ──');
const index = buildRenderedColorIndex(bulk);
assert('index parst rgb-waarden', index.entries.length === 5 && index.total === 822, `entries=${index.entries.length} total=${index.total}`);
assert('Deep Charcoal sterk gerenderd', renderStrength('#212529', index) === 'strong');
assert('Slate Gray gerenderd (≥weak)', renderStrength('#6C757D', index) !== 'none');
assert('Bootstrap Blue rendert niet → none', renderStrength('#0D6EFD', index) === 'none');
assert('near-match binnen tolerantie (rgb(34,38,42) ~ #212529)', renderStrength('#22262A', index) !== 'none');

console.log('\n── applyUsageDrivenPaletteFilter (Zwarthout-scenario, multi-page) ──');
const kept = applyUsageDrivenPaletteFilter(palette, { bulkColorStyles: bulk, usageEvidenceByHex: usage });
const keptNames = kept.map((c) => c.name);
console.log(`  behouden: ${keptNames.join(', ')}`);
assert('Burnt Orange behouden (logo)', keptNames.includes('Burnt Orange'));
assert('Slate Gray behouden — WÉL gebruikt (kern-eis user)', keptNames.includes('Slate Gray'));
assert('Soft White behouden (surface/lightest)', keptNames.includes('Soft White'));
assert('Deep Charcoal behouden (text/darkest)', keptNames.includes('Deep Charcoal'));
assert('Bootstrap Blue GEDROPT (rendert nergens)', !keptNames.includes('Bootstrap Blue'));
assert('Crimson Red GEDROPT (framework-hex, rendert nergens)', !keptNames.includes('Crimson Red'));

console.log('\n── framework vs niet-framework drempel ──');
// Een framework-kleur die zwak rendert → drop (zwakke link-rendering geen merk-keuze).
// Blauw is een klein aandeel (3) naast dominante zwarte tekst (500) → <2% → weak.
// Wit als surface erbij zodat het blauw niet de "lichtste gerenderde" wordt.
const fwWeakBulk: BulkColorStyles = { color: { 'rgb(13, 110, 253)': 3, 'rgb(0, 0, 0)': 500 }, 'background-color': { 'rgb(255, 255, 255)': 200 } };
const fwWeak = applyUsageDrivenPaletteFilter(
  [{ hex: '#0D6EFD', name: 'BS Blue', tags: ['framework'] }, { hex: '#111111', name: 'Ink' }, { hex: '#FFFFFF', name: 'Paper' }],
  { bulkColorStyles: fwWeakBulk, usageEvidenceByHex: new Map([['#0D6EFD', 'weak']]) },
).map((c) => c.name);
assert('framework + zwak gerenderd → drop', !fwWeak.includes('BS Blue'), fwWeak.join(','));
// Een framework-kleur die STERK rendert (echt de CTA) → behouden.
const fwStrongBulk: BulkColorStyles = { color: {}, 'background-color': { 'rgb(13, 110, 253)': 100, 'rgb(255,255,255)': 100 } };
const fwStrong = applyUsageDrivenPaletteFilter(
  [{ hex: '#0D6EFD', name: 'BS Blue CTA', tags: ['framework'] }, { hex: '#111111', name: 'Ink' }, { hex: '#FAFAFA', name: 'Paper' }],
  { bulkColorStyles: fwStrongBulk, usageEvidenceByHex: new Map([['#0D6EFD', 'strong']]) },
).map((c) => c.name);
assert('framework + STERK gerenderd → behouden', fwStrong.includes('BS Blue CTA'), fwStrong.join(','));

console.log('\n── MAJOR-3: sample-floor (dunne pagina geeft geen "strong") ──');
const thinIdx = buildRenderedColorIndex({ color: { 'rgb(13, 110, 253)': 8, 'rgb(0, 0, 0)': 12, 'rgb(255, 255, 255)': 10 } }); // total 30 < 60
assert('hoog aandeel maar te weinig samples → weak (geen strong)', renderStrength('#0D6EFD', thinIdx) === 'weak', `total=${thinIdx.total}`);
const thinFw = applyUsageDrivenPaletteFilter(
  [{ hex: '#0D6EFD', name: 'BS Blue', tags: ['framework'] }, { hex: '#000000', name: 'Ink' }, { hex: '#FFFFFF', name: 'Paper' }],
  { bulkColorStyles: { color: { 'rgb(13, 110, 253)': 8, 'rgb(0, 0, 0)': 12, 'rgb(255, 255, 255)': 10 } }, usageEvidenceByHex: new Map() },
).map((c) => c.name);
assert('framework-kleur op dunne pagina (weak) → gedropt, ondanks hoog aandeel', !thinFw.includes('BS Blue'), thinFw.join(','));

console.log('\n── MINOR-1: structureel over GERENDERDE subset ──');
// Ongebruikte framework-#000 mag niet als "donkerste" gered worden wanneer een
// echte (gerenderde) donkere kleur bestaat.
const unusedBlackBulk: BulkColorStyles = { color: { 'rgb(33, 37, 41)': 200, 'rgb(255,255,255)': 100 }, 'background-color': {} };
const minor1 = applyUsageDrivenPaletteFilter(
  [{ hex: '#000000', name: 'Pure Black (framework, ongebruikt)', tags: ['framework'] }, { hex: '#212529', name: 'Charcoal (gebruikt)' }, { hex: '#FFFFFF', name: 'White (gebruikt)' }],
  { bulkColorStyles: unusedBlackBulk, usageEvidenceByHex: new Map() },
).map((c) => c.name);
assert('ongebruikte framework-#000 niet als donkerste gered → gedropt', !minor1.includes('Pure Black (framework, ongebruikt)'), minor1.join(','));
assert('gerenderde Charcoal behouden (echte donkerste)', minor1.includes('Charcoal (gebruikt)'));

console.log('\n── fallback + safety ──');
// Geen bulkStyles → val terug op homepage usageEvidence.
const fallback = applyUsageDrivenPaletteFilter(palette, { bulkColorStyles: null, usageEvidenceByHex: usage }).map((c) => c.name);
assert('fallback (geen bulk): framework-none nog steeds gedropt', !fallback.includes('Bootstrap Blue'));
assert('fallback: Slate Gray (weak homepage-usage) behouden', fallback.includes('Slate Gray'));
// Geen enkel signaal → niets droppen (safety).
const noSignal = applyUsageDrivenPaletteFilter(palette, { bulkColorStyles: null, usageEvidenceByHex: new Map() });
assert('geen signalen → safety: alles behouden', noSignal.length === palette.length, `kept=${noSignal.length}`);
// Lege input → leeg.
assert('lege input → leeg', applyUsageDrivenPaletteFilter([], { bulkColorStyles: bulk, usageEvidenceByHex: usage }).length === 0);

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
