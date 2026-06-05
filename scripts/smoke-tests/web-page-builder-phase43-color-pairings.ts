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

// Leeg palet → geen crash, lege lijst
assert('leeg palet → [] (geen crash)', buildColorPairings([]).length === 0);

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
