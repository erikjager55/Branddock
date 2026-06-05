/**
 * Smoke-test — observed-kleurcombinaties (2026-06-05). Verifieert dat de
 * kleurcombinaties uit de WERKELIJK voorkomende (tekstkleur | achtergrond)-paren
 * worden gebouwd (multi-page), gemapt op het palet, WCAG-gefilterd en op
 * frequentie gesorteerd — i.p.v. gegenereerd uit palet-categorieën.
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/web-page-builder-phase48-observed-pairings.ts
 */
import { buildObservedColorPairings } from '../../src/lib/brandstyle/observed-color-pairings';
import type { PaletteColorLike } from '../../src/lib/brandstyle/color-pairings';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

// Geobserveerde paren (key = "fg | bg") zoals bulk-computed-styles ze levert.
// Zwarthout (donker thema): witte tekst op charcoal dominant, charcoal op wit,
// oranje op charcoal (accent), witte tekst op oranje (knop). Plus een grijs-paar
// dat NIET in het palet zit (moet weggefilterd worden).
const pairs: Record<string, number> = {
  'rgb(255, 255, 255) | rgb(33, 37, 41)': 400, // witte tekst op charcoal — dark-mode body
  'rgb(33, 37, 41) | rgb(248, 249, 250)': 300, // charcoal tekst op wit — light-mode body
  'rgb(224, 96, 0) | rgb(33, 37, 41)': 50,      // oranje tekst op charcoal — accent op donker
  'rgb(255, 255, 255) | rgb(224, 96, 0)': 30,   // witte tekst op oranje — knop
  'rgb(108, 117, 125) | rgb(255, 255, 255)': 9, // grijs op wit — grijs niet in palet → skip
};
const palette: PaletteColorLike[] = [
  { hex: '#E06000', category: 'PRIMARY' },
  { hex: '#F8F9FA', category: 'NEUTRAL' },
  { hex: '#212529', category: 'NEUTRAL' },
];

const out = buildObservedColorPairings(pairs, palette);
console.log('\nObserved combinaties (gesorteerd op frequentie):');
for (const p of out) console.log(`  ${p.label.padEnd(20)} bg=${p.background} fg=${p.foreground} ${p.contrastRatio}:1 ${p.wcag} (${p.usage})`);

console.log('\n── assertions ──');
assert('genereert combinaties uit observed paren', out.length >= 4, `n=${out.length}`);
assert('dark-mode "Tekst op donker" (wit op charcoal) aanwezig',
  out.some((p) => p.label === 'Tekst op donker' && p.background.toLowerCase() === '#212529' && p.foreground.toLowerCase() === '#f8f9fa'));
assert('light-mode "Tekst op surface" (charcoal op wit) aanwezig',
  out.some((p) => p.label === 'Tekst op surface' && p.background.toLowerCase() === '#f8f9fa'));
assert('"Primair op donker" (oranje op charcoal) aanwezig',
  out.some((p) => p.label === 'Primair op donker' && p.background.toLowerCase() === '#212529' && p.foreground.toLowerCase() === '#e06000'));
assert('"Primaire knop" (op oranje vlak) aanwezig',
  out.some((p) => p.label === 'Primaire knop' && p.background.toLowerCase() === '#e06000'));
assert('grijs-paar (niet in palet) weggefilterd', !out.some((p) => /6c757d|108, 117/.test(JSON.stringify(p))));
assert('meest-frequente combinatie staat eerst (dark-mode body, 400×)', out[0].label === 'Tekst op donker', `eerste=${out[0].label}`);
assert('geen fail-contrast combinaties', out.every((p) => p.wcag !== 'fail'));
assert('contrastRatio is een getal', out.every((p) => typeof p.contrastRatio === 'number' && p.contrastRatio > 0));

console.log('\n── auto-surface inferentie (image-achtergrond) ──');
// Zwarthout-realiteit: donkere secties = background-IMAGE → geen bg-kleur →
// 'auto'. Surface wordt afgeleid uit best-leesbaar contrast.
const autoPairs: Record<string, number> = {
  'rgb(255, 255, 255) | auto': 400, // witte tekst op donkere image-sectie
  'rgb(224, 96, 0) | auto': 50,      // oranje tekst op donkere image-sectie
  'rgb(33, 37, 41) | rgb(248, 249, 250)': 200, // charcoal op witte card (echte bg)
  'rgb(255, 255, 255) | rgb(224, 96, 0)': 30,   // witte tekst op oranje knop (echte bg)
};
const autoOut = buildObservedColorPairings(autoPairs, palette);
for (const p of autoOut) console.log(`  ${p.label.padEnd(20)} bg=${p.background} fg=${p.foreground} ${p.contrastRatio}:1 ${p.wcag}`);
assert('witte tekst zonder bg → "Tekst op donker" (charcoal afgeleid)',
  autoOut.some((p) => p.label === 'Tekst op donker' && p.background.toLowerCase() === '#212529' && p.foreground.toLowerCase() === '#f8f9fa'));
assert('oranje tekst zonder bg → "Primair op donker" (best-contrast = charcoal)',
  autoOut.some((p) => p.label === 'Primair op donker' && p.background.toLowerCase() === '#212529' && p.foreground.toLowerCase() === '#e06000'));
assert('charcoal op witte card → "Tekst op surface"', autoOut.some((p) => p.label === 'Tekst op surface'));
assert('witte tekst op oranje knop → "Primaire knop"', autoOut.some((p) => p.label === 'Primaire knop'));
assert('dominante combinatie (wit op donker, 400×) eerst', autoOut[0].label === 'Tekst op donker');

console.log('\n── fallback ──');
assert('lege paren → [] (caller valt terug op gegenereerd)', buildObservedColorPairings({}, palette).length === 0);
assert('null paren → []', buildObservedColorPairings(null, palette).length === 0);
assert('leeg palet → []', buildObservedColorPairings(pairs, []).length === 0);
// Paren met alleen niet-palet-kleuren → [] (geen match).
assert('alleen niet-palet-kleuren → []', buildObservedColorPairings({ 'rgb(10, 200, 50) | rgb(90, 20, 200)': 100 }, palette).length === 0);

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
