/**
 * Smoke-test — framework-defaults zonder usage-data (2026-06-05, Napking-fix #2).
 *
 * Symptoom: re-scrape zónder multi-page usage-data hield framework-defaults
 * vast omdat `keep()` onbemeten kleuren benefit-of-the-doubt gaf (`!known →
 * keep`) VÓÓR de framework-gate. Napking lekte zo WP-admin #007CBA (ACCENT) +
 * Gutenberg #ABB8C3 (neutral). Fix: (A) #007CBA-familie = framework-origin
 * (WP-admin-theme-color, usage-gated); (B) framework-gate vóór `!known` →
 * framework-defaults moeten POSITIEF sterk gebruik tonen, óók zonder usage-data.
 * Een ECHTE merk-kleur (niet-framework) houdt z'n benefit-of-the-doubt.
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/web-page-builder-phase51-framework-no-usage-data.ts
 */
import { applyUsageDrivenPaletteFilter, type BulkColorStyles, type RenderStrength } from '../../src/lib/brandstyle/palette-usage-filter';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

type C = { hex: string; name: string; category: string; tags?: string[]; detectorSource?: string | null };
const NO_DATA = { bulkColorStyles: null as BulkColorStyles | null, usageEvidenceByHex: new Map<string, RenderStrength | undefined>() };

console.log('── 1. Napking ZONDER usage-data: WP-admin #007CBA + Gutenberg #ABB8C3 vallen ──');
{
  const palette: C[] = [
    { hex: '#008ACF', name: 'Ocean Blue', category: 'ACCENT', tags: ['cta', 'brand-accent'] },
    { hex: '#007CBA', name: 'Deep Blue', category: 'ACCENT', tags: [] }, // WP-admin, niet getagd admin
    { hex: '#1A171B', name: 'Deep Charcoal', category: 'NEUTRAL', tags: ['text'] },
    { hex: '#EEEEEE', name: 'Soft Gray', category: 'NEUTRAL', tags: ['backgrounds'] },
    { hex: '#313131', name: 'Charcoal Gray', category: 'NEUTRAL', tags: ['text'] },
    { hex: '#6B7280', name: 'Slate Gray', category: 'NEUTRAL', tags: ['usage:border'] },
    { hex: '#200707', name: 'Dark Brown', category: 'NEUTRAL', tags: ['text'] },
    { hex: '#ABB8C3', name: 'Cool Gray', category: 'NEUTRAL', tags: ['ui'] },
  ];
  const kept = applyUsageDrivenPaletteFilter(palette, NO_DATA).map((c) => c.name);
  console.log(`  behouden (${kept.length}): ${kept.join(', ')}`);
  assert('WP-admin #007CBA GEDROPT (framework-origin, geen sterk gebruik)', !kept.includes('Deep Blue'));
  assert('Gutenberg #ABB8C3 GEDROPT (framework-neutral, geen sterk gebruik)', !kept.includes('Cool Gray'));
  assert('Ocean Blue #008ACF BEHOUDEN (echte merk-kleur, benefit-of-the-doubt)', kept.includes('Ocean Blue'));
  assert('Deep Charcoal #1A171B BEHOUDEN (niet-framework neutral)', kept.includes('Deep Charcoal'));
  assert('Slate Gray #6B7280 BEHOUDEN (Tailwind, niet in framework-set, usage:border)', kept.includes('Slate Gray'));
}

console.log('\n── 2. Framework-default MÉT sterk gebruik → BEHOUDEN (usage wint) ──');
{
  const palette: C[] = [
    { hex: '#1A171B', name: 'Ink', category: 'PRIMARY', tags: ['text'] },
    { hex: '#007CBA', name: 'Admin Blue', category: 'ACCENT', tags: [] },
    { hex: '#FFFFFF', name: 'Paper', category: 'NEUTRAL', tags: ['surface'] },
  ];
  // #007CBA = rgb(0,124,186) rendert sterk.
  const bulk: BulkColorStyles = {
    color: { 'rgb(26, 23, 27)': 400, 'rgb(0, 124, 186)': 300 },
    'background-color': { 'rgb(255, 255, 255)': 400 },
  };
  const kept = applyUsageDrivenPaletteFilter(palette, { bulkColorStyles: bulk, usageEvidenceByHex: new Map() }).map((c) => c.name);
  assert('#007CBA sterk gebruikt → BEHOUDEN (framework-prior verliest van usage)', kept.includes('Admin Blue'), kept.join(','));
}

console.log('\n── 3. Framework-default MÉT data maar GEEN render → DROP ──');
{
  const palette: C[] = [
    { hex: '#1A171B', name: 'Ink', category: 'PRIMARY', tags: ['text'] },
    { hex: '#007CBA', name: 'Admin Blue', category: 'ACCENT', tags: [] },
    { hex: '#FFFFFF', name: 'Paper', category: 'NEUTRAL', tags: ['surface'] },
  ];
  const bulk: BulkColorStyles = {
    color: { 'rgb(26, 23, 27)': 400 },
    'background-color': { 'rgb(255, 255, 255)': 400 }, // #007CBA rendert nergens
  };
  const kept = applyUsageDrivenPaletteFilter(palette, { bulkColorStyles: bulk, usageEvidenceByHex: new Map() }).map((c) => c.name);
  assert('#007CBA rendert nergens → GEDROPT', !kept.includes('Admin Blue'), kept.join(','));
}

console.log('\n── 4. darkest/lichtste framework-kleur blijft beschermd (geen over-drop tekst/surface) ──');
{
  // Pure-Bootstrap-merk zónder usage-data: #212529 (gray-900, darkest) + #F8F9FA
  // (gray-100, lightest) zijn de lees-basis en MOETEN blijven, ook al zijn ze
  // framework-origin. De brand-kleur (#E06000) blijft via benefit-of-the-doubt.
  const palette: C[] = [
    { hex: '#E06000', name: 'Burnt Orange', category: 'PRIMARY', tags: ['brand', 'logo'], detectorSource: 'logo-extraction:histogram' },
    { hex: '#212529', name: 'BS Dark', category: 'NEUTRAL', tags: ['text'] },
    { hex: '#F8F9FA', name: 'BS Light', category: 'NEUTRAL', tags: ['surface'] },
    { hex: '#6C757D', name: 'BS Mid Gray', category: 'NEUTRAL', tags: ['muted'] },
  ];
  const kept = applyUsageDrivenPaletteFilter(palette, NO_DATA).map((c) => c.name);
  assert('darkste framework-grijs #212529 BEHOUDEN (structureel: tekst)', kept.includes('BS Dark'));
  assert('lichtste framework-grijs #F8F9FA BEHOUDEN (structureel: surface)', kept.includes('BS Light'));
  assert('Burnt Orange BEHOUDEN (echte merk-kleur)', kept.includes('Burnt Orange'));
  assert('mid-grijs #6C757D GEDROPT (framework, geen structurele rol, geen gebruik)', !kept.includes('BS Mid Gray'), kept.join(','));
}

console.log('\n── 5. Over-drop-guard: saturated framework-default-PRIMARY als ECHTE merk-kleur ──');
{
  // Review-fix: een merk dat een Bootstrap-default-hex bewust als merk-kleur
  // gebruikt (#0D6EFD blauw / #20C997 teal) mag NIET grayscalen op een no-data-
  // run. Alléén de hex-bevestigde CMS-neutral/admin-leak-klassen vallen blind.
  const palette: C[] = [
    { hex: '#0D6EFD', name: 'Brand Blue', category: 'PRIMARY', tags: ['brand', 'cta'] }, // Bootstrap-default-hex, maar merk-eigen
    { hex: '#20C997', name: 'Brand Teal', category: 'ACCENT', tags: ['accent'] },          // Bootstrap-teal als merk-accent
    { hex: '#1A1A1A', name: 'Ink', category: 'NEUTRAL', tags: ['text'] },
    { hex: '#FFFFFF', name: 'Paper', category: 'NEUTRAL', tags: ['surface'] },
    { hex: '#ABB8C3', name: 'Gutenberg Gray', category: 'NEUTRAL', tags: ['ui'] },          // hex-leak → valt
  ];
  const kept = applyUsageDrivenPaletteFilter(palette, NO_DATA).map((c) => c.name);
  console.log(`  behouden (${kept.length}): ${kept.join(', ')}`);
  assert('saturated default #0D6EFD BEHOUDEN (geen grayscale van merk-blauw)', kept.includes('Brand Blue'), kept.join(','));
  assert('saturated default #20C997 BEHOUDEN (merk-teal)', kept.includes('Brand Teal'), kept.join(','));
  assert('hex-leak Gutenberg #ABB8C3 toch GEDROPT', !kept.includes('Gutenberg Gray'), kept.join(','));
}

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
