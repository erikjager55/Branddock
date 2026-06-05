/**
 * Smoke-test — recompute observed-kleurcombinaties op een BEWERKT palet (2026-06-05).
 *
 * Probleem: `recomputeColorPairings` viel ná een manuele kleur-add/-delete terug
 * op gegenereerde combinaties → de werkelijke (observed, incl. dark-mode)
 * combinaties gingen verloren. Fix: de raw observed (fg|bg)-paren worden bij de
 * scrape gepersisteerd (`BrandStyleguide.observedColorPairs`) en recompute
 * heromapt ze op het BEWERKTE palet via `buildObservedColorPairings`.
 *
 * Deze test dekt de load-bearing pure functie met exact de inputs die recompute
 * doorgeeft: een verwijderde kleur mag in GEEN enkele combinatie nog voorkomen
 * (matchPalette → null → paar valt), en re-add herstelt z'n combinaties.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase52-recompute-observed-edit.ts
 */
import { buildObservedColorPairings } from '../../src/lib/brandstyle/observed-color-pairings';
import type { PaletteColorLike } from '../../src/lib/brandstyle/color-pairings';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

// Raw observed map zoals bij de scrape gepersisteerd (Zwarthout dark-thema).
const observed: Record<string, number> = {
  'rgb(255, 255, 255) | rgb(33, 37, 41)': 400, // wit op charcoal
  'rgb(33, 37, 41) | rgb(248, 249, 250)': 300, // charcoal op wit
  'rgb(224, 96, 0) | rgb(33, 37, 41)': 50,      // oranje (PRIMARY) op charcoal
  'rgb(255, 255, 255) | rgb(224, 96, 0)': 30,   // wit op oranje knop
};

console.log('── DELETE: gebruiker verwijdert oranje PRIMARY #E06000 ──');
{
  const editedPalette: PaletteColorLike[] = [
    { hex: '#F8F9FA', category: 'NEUTRAL' },
    { hex: '#212529', category: 'NEUTRAL' },
  ];
  const out = buildObservedColorPairings(observed, editedPalette);
  assert('observed "Tekst op donker" (wit/charcoal) blijft', out.some((p) => p.label === 'Tekst op donker' && p.background.toLowerCase() === '#212529'));
  assert('observed "Tekst op surface" (charcoal/wit) blijft', out.some((p) => p.label === 'Tekst op surface' && p.background.toLowerCase() === '#f8f9fa'));
  // KERN: de verwijderde kleur komt NERGENS meer voor.
  assert('verwijderde oranje nergens gerefereerd', out.every((p) => !/e06000|224,\s*96,\s*0/i.test(JSON.stringify(p))), JSON.stringify(out));
  assert('geen "Primair op donker" (oranje weg)', !out.some((p) => p.label.startsWith('Primair')));
  assert('geen "Primaire knop" (oranje weg)', !out.some((p) => p.label === 'Primaire knop'));
}

console.log('\n── RE-ADD: gebruiker voegt oranje weer toe → combinaties herleven ──');
{
  const readded = buildObservedColorPairings(observed, [
    { hex: '#E06000', category: 'PRIMARY' },
    { hex: '#F8F9FA', category: 'NEUTRAL' },
    { hex: '#212529', category: 'NEUTRAL' },
  ]);
  assert('re-add herstelt "Primair op donker"', readded.some((p) => p.label === 'Primair op donker'));
  assert('re-add herstelt "Primaire knop"', readded.some((p) => p.label === 'Primaire knop'));
  assert('neutrale combinaties blijven ook bestaan', readded.some((p) => p.label === 'Tekst op donker'));
}

console.log('\n── FALLBACK: geen observed data → lege lijst (caller valt terug op gegenereerd) ──');
{
  assert('null observed → []', buildObservedColorPairings(null, [{ hex: '#212529', category: 'NEUTRAL' }]).length === 0);
  assert('leeg palet → []', buildObservedColorPairings(observed, []).length === 0);
}

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
