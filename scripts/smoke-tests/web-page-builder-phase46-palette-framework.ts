/**
 * Smoke-test — brandstyle palet-framework-cleanup (verbeterplan Fase A, audit
 * 2026-06-05-brandstyle-palette-framework-cleanup). Verifieert dat
 * `isFrameworkNoiseColor` precies de ongebruikte framework-default-kleuren
 * markeert (en de echte/gebruikte/logo-kleuren behoudt) — getest tegen het
 * werkelijke Zwarthout-palet (100% Bootstrap/WordPress, 6 `unused`).
 *
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/web-page-builder-phase46-palette-framework.ts
 */
import { isFrameworkNoiseColor } from '../../src/lib/brandstyle/analysis-engine';

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

// Het werkelijke Zwarthout-palet (uit de DB) — 6 `unused` framework-kleuren.
type C = Parameters<typeof isFrameworkNoiseColor>[0] & { name: string };
const zwarthout: C[] = [
  { name: 'Bootstrap Blue', hex: '#0D6EFD', tags: ['bootstrap', 'default', 'unused', 'usage:border', 'usage:link'] },
  { name: 'Slate Gray', hex: '#6C757D', tags: ['bootstrap', 'secondary', 'text', 'usage:link'] },
  { name: 'Forest Green', hex: '#198754', tags: ['bootstrap', 'success', 'semantic', 'usage:link'] },
  { name: 'Cyan Blue', hex: '#0DCAF0', tags: ['bootstrap', 'info', 'unused', 'usage:link'] },
  { name: 'Amber Gold', hex: '#FFC107', tags: ['bootstrap', 'warning', 'semantic', 'usage:link'] },
  { name: 'Crimson Red', hex: '#DC3545', tags: ['bootstrap', 'danger', 'error', 'usage:link'] },
  { name: 'Soft White', hex: '#F8F9FA', tags: ['bootstrap', 'background', 'light', 'usage:link'] },
  { name: 'Charcoal Black', hex: '#212529', tags: ['bootstrap', 'text', 'dark', 'primary-text', 'usage:link'] },
  { name: 'Vivid Purple', hex: '#7A00DF', tags: ['wordpress', 'synced', 'unused'] },
  { name: 'Deep Blue', hex: '#0A58CA', tags: ['bootstrap', 'text-variant', 'unused', 'usage:link'] },
  { name: 'Pine Green', hex: '#146C43', tags: ['bootstrap', 'text-variant', 'unused', 'usage:link'] },
  { name: 'Teal Blue', hex: '#087990', tags: ['bootstrap', 'text-variant', 'unused'] },
];

console.log('── Fase A: isFrameworkNoiseColor tegen Zwarthout-palet ──');
const dropped = zwarthout.filter((c) => isFrameworkNoiseColor(c)).map((c) => c.name);
const keptNames = zwarthout.filter((c) => !isFrameworkNoiseColor(c)).map((c) => c.name);
console.log(`  gedropt: ${dropped.join(', ')}`);
console.log(`  behouden: ${keptNames.join(', ')}`);

const EXPECT_DROP = ['Bootstrap Blue', 'Cyan Blue', 'Vivid Purple', 'Deep Blue', 'Pine Green', 'Teal Blue'];
for (const n of EXPECT_DROP) assert(`dropt ongebruikte framework "${n}"`, dropped.includes(n));
assert('dropt precies de 6 unused (niet meer)', dropped.length === 6, `n=${dropped.length}: ${dropped.join(',')}`);
assert('behoudt Charcoal Black (echte tekstkleur, niet unused)', keptNames.includes('Charcoal Black'));
assert('behoudt Slate Gray (gebruikt)', keptNames.includes('Slate Gray'));
assert('behoudt Bootstrap-semantics (Forest/Amber/Crimson, gebruikt)',
  ['Forest Green', 'Amber Gold', 'Crimson Red'].every((n) => keptNames.includes(n)));

console.log('\n── Guards ──');
assert('logo-kleur nooit gedropt (ook framework-hex)',
  !isFrameworkNoiseColor({ hex: '#0D6EFD', tags: ['unused'], detectorSource: 'logo-vision' }));
assert('positief usage behoudt framework-kleur',
  !isFrameworkNoiseColor({ hex: '#0D6EFD', tags: ['bootstrap', 'unused'], usageEvidence: 'strong' }));
assert('niet-framework merk-kleur nooit gedropt (ook al unused-tag)',
  !isFrameworkNoiseColor({ hex: '#FF5722', tags: ['unused'] }));
// Review-fix: exact-token-match — substring-tags zoals "wordpress-migrated"
// mogen een echte merk-kleur NIET als framework-ruis bestempelen.
assert('merk-kleur met "wordpress-migrated"-tag NIET gedropt (exact-token)',
  !isFrameworkNoiseColor({ hex: '#FF5722', tags: ['wordpress-migrated', 'unused'] }));
assert('merk-kleur met "synced-from-figma"-tag NIET gedropt',
  !isFrameworkNoiseColor({ hex: '#3A7F2C', tags: ['synced-from-figma', 'unused'] }));
assert('exacte "bootstrap"-tag + unused → wel drop',
  isFrameworkNoiseColor({ hex: '#0DCAF0', tags: ['bootstrap', 'unused'] }));
assert('detectorSource met framework-substring NIET meer drop-trigger (src-check geschrapt)',
  !isFrameworkNoiseColor({ hex: '#3A7F2C', tags: ['unused'], detectorSource: 'my-bootstrap-theme' }));
assert('framework + usageEvidence none → drop',
  isFrameworkNoiseColor({ hex: '#0D6EFD', tags: ['bootstrap'], usageEvidence: 'none' }));
assert('framework zonder unused-signaal → behouden',
  !isFrameworkNoiseColor({ hex: '#6C757D', tags: ['bootstrap', 'secondary'] }));
assert('lege tags + onbekende hex → behouden', !isFrameworkNoiseColor({ hex: '#3A7F2C', tags: [] }));

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
