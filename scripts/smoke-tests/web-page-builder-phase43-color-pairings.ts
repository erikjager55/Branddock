/**
 * Smoke-test — brandstyle Fase 5 (kleurcombinaties-generatie). Verifieert dat
 * buildColorPairings WCAG-geverifieerde, rol-gelabelde fg/bg-combinaties levert
 * uit een geclassificeerd palet (symptoom: "geen kleurcombinaties").
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase43-color-pairings.ts
 */
import { buildColorPairings, type PaletteColorLike } from '../../src/lib/brandstyle/color-pairings';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

const palette: PaletteColorLike[] = [
  { hex: '#008ACF', category: 'PRIMARY' },   // blauw
  { hex: '#F0B849', category: 'ACCENT' },    // goud
  { hex: '#212529', category: 'NEUTRAL' },   // donkere tekst
  { hex: '#F8F9FA', category: 'NEUTRAL' },   // lichte surface
];

const pairs = buildColorPairings(palette);
console.log(`\n${pairs.length} combinaties:`);
for (const p of pairs) console.log(`  ${p.label.padEnd(18)} bg=${p.background} fg=${p.foreground} ${p.contrastRatio}:1 ${p.wcag} (${p.usage})`);

console.log('\n── assertions ──');
assert('genereert ≥4 combinaties', pairs.length >= 4, `n=${pairs.length}`);
assert('geen enkele fail-combinatie (allemaal ≥ AA-large)', pairs.every((p) => p.wcag !== 'fail'));
assert('button-pairing voor PRIMARY #008ACF', pairs.some((p) => p.usage === 'button' && p.background.toLowerCase() === '#008acf'));
assert('PRIMARY ook als foreground op surface', pairs.some((p) => p.usage === 'text-on-surface' && p.foreground.toLowerCase() === '#008acf'));
assert('basis-leespaar (surface-pair) aanwezig', pairs.some((p) => p.usage === 'surface-pair'));
assert('surface-pair haalt AA (≥4.5)', pairs.filter((p) => p.usage === 'surface-pair').every((p) => p.contrastRatio >= 4.5));
assert('contrastRatio is een getal', pairs.every((p) => typeof p.contrastRatio === 'number' && p.contrastRatio > 0));
// Foreground van een button moet de best-leesbare zijn (geen lage-contrast keuze)
const primaryBtn = pairs.find((p) => p.usage === 'button' && p.background.toLowerCase() === '#008acf');
assert('PRIMARY-knop foreground haalt minimaal AA-large', !!primaryBtn && primaryBtn.contrastRatio >= 3, `ratio=${primaryBtn?.contrastRatio}`);

// Review-bugfixes #4 + #6
assert('geen grammaticaal foute "Accente knop"', !pairs.some((p) => p.label.includes('Accente')));
assert('Accent-knop label = "Accentknop"', pairs.some((p) => p.label === 'Accentknop'));
const surfacePair = pairs.find((p) => p.usage === 'surface-pair');
assert('basis-leespaar gebruikt echte donkerste NEUTRAL (#212529), niet #000000',
  !!surfacePair && surfacePair.foreground.toLowerCase() === '#212529', `fg=${surfacePair?.foreground}`);

// Leeg palet → geen crash, lege lijst
assert('leeg palet → [] (geen crash)', buildColorPairings([]).length === 0);

// Dark-mode-combinaties: een donker-thema-merk (Zwarthout — charcoal-surface +
// witte/oranje tekst) moet zijn dominante donkere-surface-combinaties krijgen,
// niet alleen de lichte (anders ontbreken zwart-achtergrond-combinaties).
console.log('\n── Dark-mode-surface (Zwarthout) ──');
const zw = buildColorPairings([
  { hex: '#E06000', category: 'PRIMARY' },   // Burnt Orange (logo)
  { hex: '#F8F9FA', category: 'NEUTRAL' },   // Soft White
  { hex: '#212529', category: 'NEUTRAL' },   // Deep Charcoal (donkere surface)
]);
for (const p of zw) console.log(`  ${p.label.padEnd(20)} bg=${p.background} fg=${p.foreground} ${p.contrastRatio}:1 ${p.wcag}`);
assert('"Tekst op donker" — licht op charcoal-surface', zw.some((p) => p.label === 'Tekst op donker' && p.background.toLowerCase() === '#212529'));
assert('"Primair op donker" — oranje tekst op charcoal-surface', zw.some((p) => p.label === 'Primair op donker' && p.background.toLowerCase() === '#212529' && p.foreground.toLowerCase() === '#e06000'));
assert('lichte "Tekst op surface" (charcoal op wit) blijft ook', zw.some((p) => p.label === 'Tekst op surface'));
assert('beide surface-pairs halen contrast (geen fail)', zw.filter((p) => p.usage === 'surface-pair').every((p) => p.wcag !== 'fail'));

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
