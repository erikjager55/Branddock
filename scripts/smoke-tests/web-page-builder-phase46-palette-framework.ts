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

// Het werkelijke Zwarthout-palet (DB, 14:20-run) — 100% framework-defaults,
// getagd `framework`; geen enkele echte merk-kleur (oranje/zwart) in CSS.
// Regel: drop een framework-default-kleur TENZIJ usageEvidence==='strong'
// (zwakke link/border-usage telt niet). Logo-kleuren + de neutrale tekst/
// surface (geen framework-tag/-hex) blijven.
type C = Parameters<typeof isFrameworkNoiseColor>[0] & { name: string };
const zwarthout: C[] = [
  { name: 'Bootstrap Blue', hex: '#0D6EFD', tags: ['default', 'framework', 'unused', 'usage:border', 'usage:link'], usageEvidence: 'weak' },
  { name: 'Slate Gray', hex: '#6C757D', tags: ['secondary', 'framework', 'text', 'usage:link'], usageEvidence: 'weak' },
  { name: 'Forest Green', hex: '#198754', tags: ['success', 'semantic', 'framework', 'usage:link'], usageEvidence: 'weak' },
  { name: 'Cyan Info', hex: '#0DCAF0', tags: ['info', 'framework', 'unused', 'usage:link'], usageEvidence: 'none' },
  { name: 'Amber Warning', hex: '#FFC107', tags: ['warning', 'semantic', 'framework', 'usage:link'], usageEvidence: 'weak' },
  { name: 'Crimson Red', hex: '#DC3545', tags: ['error', 'danger', 'semantic', 'usage:link'], usageEvidence: 'weak' },
  { name: 'Soft White', hex: '#F8F9FA', tags: ['background', 'light', 'surface', 'usage:link'], usageEvidence: 'strong' },
  { name: 'Deep Charcoal', hex: '#212529', tags: ['text', 'dark', 'primary-text', 'usage:link'], usageEvidence: 'strong' },
];

console.log('── Fase A: isFrameworkNoiseColor tegen Zwarthout-palet (14:20) ──');
const dropped = zwarthout.filter((c) => isFrameworkNoiseColor(c)).map((c) => c.name);
const keptNames = zwarthout.filter((c) => !isFrameworkNoiseColor(c)).map((c) => c.name);
console.log(`  gedropt: ${dropped.join(', ')}`);
console.log(`  behouden: ${keptNames.join(', ')}`);

const EXPECT_DROP = ['Bootstrap Blue', 'Slate Gray', 'Forest Green', 'Cyan Info', 'Amber Warning', 'Crimson Red'];
for (const n of EXPECT_DROP) assert(`dropt framework-default "${n}"`, dropped.includes(n));
assert('dropt alle 6 framework-defaults (blauw/grijs/groen/cyaan/amber/rood)', dropped.length === 6, `n=${dropped.length}: ${dropped.join(',')}`);
assert('behoudt Deep Charcoal (tekstkleur, geen framework-tag/-hex)', keptNames.includes('Deep Charcoal'));
assert('behoudt Soft White (surface, geen framework-tag/-hex)', keptNames.includes('Soft White'));
assert('Crimson Red gedropt via hex (geen framework-tag, wel #DC3545)', dropped.includes('Crimson Red'));

console.log('\n── Guards ──');
assert('logo-kleur nooit gedropt (ook framework-hex)',
  !isFrameworkNoiseColor({ hex: '#0D6EFD', tags: ['framework', 'unused'], detectorSource: 'logo-extraction:histogram' }));
assert('STERK gebruikte framework-kleur behouden (echt merk-gebruik)',
  !isFrameworkNoiseColor({ hex: '#0D6EFD', tags: ['framework'], usageEvidence: 'strong' }));
assert('niet-framework merk-kleur nooit gedropt (ook al unused)',
  !isFrameworkNoiseColor({ hex: '#FF5722', tags: ['unused'], usageEvidence: 'weak' }));
assert('logo-oranje (geen framework) behouden',
  !isFrameworkNoiseColor({ hex: '#FF5722', tags: [], detectorSource: 'logo-extraction:histogram', usageEvidence: 'strong' }));
// Exact-token-match — substring-tags zoals "wordpress-migrated" mogen een echte
// merk-kleur NIET als framework-ruis bestempelen.
assert('merk-kleur met "wordpress-migrated"-tag NIET gedropt (exact-token)',
  !isFrameworkNoiseColor({ hex: '#FF5722', tags: ['wordpress-migrated'], usageEvidence: 'weak' }));
assert('merk-kleur met "synced-from-figma"-tag NIET gedropt',
  !isFrameworkNoiseColor({ hex: '#3A7F2C', tags: ['synced-from-figma'], usageEvidence: 'weak' }));
assert('detectorSource met framework-substring NIET drop-trigger (src-check geschrapt)',
  !isFrameworkNoiseColor({ hex: '#3A7F2C', tags: [], detectorSource: 'my-bootstrap-theme', usageEvidence: 'weak' }));
assert('framework + usageEvidence none → drop',
  isFrameworkNoiseColor({ hex: '#0D6EFD', tags: ['bootstrap'], usageEvidence: 'none' }));
assert('framework + zwakke usage → drop (zwakke link-usage is geen brand-usage)',
  isFrameworkNoiseColor({ hex: '#6C757D', tags: ['bootstrap', 'secondary'], usageEvidence: 'weak' }));
assert('framework + undefined usage → drop (geen sterk bewijs)',
  isFrameworkNoiseColor({ hex: '#0DCAF0', tags: ['framework'] }));
assert('lege tags + onbekende hex → behouden', !isFrameworkNoiseColor({ hex: '#3A7F2C', tags: [] }));

console.log(`\n${fail === 0 ? 'OK' : 'FAILED'} — ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
