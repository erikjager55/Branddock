/**
 * Smoke voor de curatie-feedback-loop (R4).
 *
 * Volledig DB-vrij: `rule-violation-stats.ts` bevat uitsluitend pure functies,
 * precies zodat dit zonder Postgres draait. Dat de aggregatie op échte data ook
 * iets zinnigs oplevert, bewijst `scripts/dev/verify-curation-signals.ts`.
 *
 * Run: npx tsx scripts/smoke-tests/rule-violation-stats.ts
 */
import {
  aggregateViolations,
  isCuratableViolation,
  laneOf,
  selectCurationSignals,
  violationKey,
  type LiveRule,
  type ViolationRow,
} from '../../src/lib/brandstyle/rule-violation-stats';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

const rule = (over: Partial<LiveRule> = {}): LiveRule => ({
  id: 'rule-1',
  ruleType: 'FORBIDDEN_WORD',
  pattern: 'luxe',
  kind: 'voiceguide-synced',
  severity: 'warning',
  ...over,
});

const hit = (generationId: string, over: Partial<ViolationRow> = {}): ViolationRow => ({
  generationId,
  ruleId: 'cuid-whatever',
  ruleType: 'FORBIDDEN_WORD',
  pattern: 'luxe',
  ...over,
});

// ── 1. Sleutel ──────────────────────────────────────────
console.log('\n1. violationKey — stabiel over een rule-sync heen');

assert(
  'casing maakt niet uit',
  violationKey('brandrule', 'FORBIDDEN_WORD', 'Luxe') === violationKey('brandrule', 'forbidden_word', 'luxe'),
);
assert(
  'whitespace wordt getrimd',
  violationKey('brandrule', 'FORBIDDEN_WORD', ' luxe ') === violationKey('brandrule', 'FORBIDDEN_WORD', 'luxe'),
);
assert(
  'ander woord is een andere sleutel',
  violationKey('brandrule', 'FORBIDDEN_WORD', 'luxe') !== violationKey('brandrule', 'FORBIDDEN_WORD', 'premium'),
);
assert(
  'zelfde woord, ander ruleType is een andere regel',
  violationKey('brandrule', 'FORBIDDEN_WORD', 'luxe') !== violationKey('brandrule', 'REQUIRED_PHRASE', 'luxe'),
);

// ── 2. Curatabel ────────────────────────────────────────
console.log('\n2. isCuratableViolation — heuristieken vallen af');

assert(
  'een heuristiek is niet te cureren',
  !isCuratableViolation(hit('g1', { ruleId: 'heuristic:nl-NL:superlatives:eerste' })),
  'de gebruiker kan die regels niet aanpassen — dat is contentcoaching',
);
assert('een DB-regel wel', isCuratableViolation(hit('g1')));
assert(
  'zonder pattern kunnen we niet stabiel sleutelen',
  !isCuratableViolation(hit('g1', { pattern: null })),
);
assert('zonder ruleType idem', !isCuratableViolation(hit('g1', { ruleType: null })));

// ── 3. Aggregatie ───────────────────────────────────────
console.log('\n3. aggregateViolations');

const basic = aggregateViolations([hit('g1'), hit('g2'), hit('g3')], 10, [rule()]);
assert('drie generaties geraakt van tien', basic[0]?.generationsHit === 3);
assert('rate is 0,3', Math.abs((basic[0]?.rate ?? 0) - 0.3) < 1e-9);

const deduped = aggregateViolations([hit('g1'), hit('g1'), hit('g1')], 10, [rule()]);
assert(
  'drie hits in dezelfde generatie tellen als één',
  deduped[0]?.generationsHit === 1,
  'anders meet je woordfrequentie in plaats van hoe vaak de regel botst',
);

assert(
  'de sleutel overleeft een gewisselde cuid — dit is de hele reden van het ontwerp',
  aggregateViolations(
    [hit('g1', { ruleId: 'oude-cuid' }), hit('g2', { ruleId: 'nieuwe-cuid' })],
    10,
    [rule({ id: 'weer-een-andere-cuid' })],
  )[0]?.generationsHit === 2,
);

assert(
  'een regel die niet meer bestaat levert niets op',
  aggregateViolations([hit('g1'), hit('g2')], 10, []).length === 0,
  'anders stel je een correctie voor aan een regel die de gebruiker nergens vindt',
);

assert(
  'heuristieken tellen niet mee in de aggregatie',
  aggregateViolations(
    [hit('g1', { ruleId: 'heuristic:nl-NL:fillers:gewoon' })],
    10,
    [rule()],
  ).length === 0,
);

assert('nul generaties is een veilige no-op', aggregateViolations([hit('g1')], 0, [rule()]).length === 0);

const twoRules = aggregateViolations(
  [hit('g1'), hit('g2'), hit('g3'), hit('g4', { pattern: 'premium' })],
  10,
  [rule(), rule({ id: 'rule-2', pattern: 'premium' })],
);
assert('hoogste percentage eerst', twoRules[0]?.rule.pattern === 'luxe');
assert('beide regels komen terug', twoRules.length === 2);

const dupSource = aggregateViolations([hit('g1')], 10, [
  rule({ id: 'uit-wordsWeAvoid', sourceFields: ['wordsWeAvoid'] }),
  rule({ id: 'uit-vocabularyDont', sourceFields: ['vocabularyDont'] }),
]);
assert(
  'dezelfde term uit twee bronvelden levert één ask',
  dupSource.length === 1 && dupSource[0].rule.id === 'uit-wordsWeAvoid',
  'anders krijgt de gebruiker twee keer dezelfde suggestie',
);

// ── 4. Drempel ──────────────────────────────────────────
console.log('\n4. selectCurationSignals — drempel ≥15% en ≥10 generaties');

const at15 = aggregateViolations([hit('g1'), hit('g2'), hit('g3')], 20, [rule()]);
assert('precies 15% haalt het', selectCurationSignals(at15).length === 1);

const under15 = aggregateViolations([hit('g1'), hit('g2')], 20, [rule()]);
assert('10% haalt het niet', selectCurationSignals(under15).length === 0);

const tooFew = aggregateViolations([hit('g1'), hit('g2'), hit('g3')], 5, [rule()]);
assert(
  '60% van maar 5 generaties haalt het niet',
  selectCurationSignals(tooFew).length === 0,
  'te weinig volume om er een conclusie aan te hangen',
);

assert(
  'de drempels zijn instelbaar',
  selectCurationSignals(tooFew, { minGenerations: 5, minRate: 0.5 }).length === 1,
);

const twoHitsAtTen = aggregateViolations([hit('g1'), hit('g2')], 10, [rule()]);
assert(
  '2 treffers bij 10 generaties haalt het niet, ook al is dat 20%',
  selectCurationSignals(twoHitsAtTen).length === 0,
  'minHits voorkomt dat een toevalstreffer als structureel patroon leest',
);

const many = aggregateViolations(
  Array.from({ length: 5 }, (_, i) =>
    ['g1', 'g2', 'g3', 'g4'].map((g) => hit(g, { pattern: `woord-${i}` })),
  ).flat(),
  10,
  Array.from({ length: 5 }, (_, i) => rule({ id: `r${i}`, pattern: `woord-${i}` })),
);
assert(
  'de uitkomst is begrensd',
  selectCurationSignals(many).length === 3,
  `${selectCurationSignals(many).length} — anders stroomt het kalibratie-paneel vol`,
);

// ── 5. Lanes ────────────────────────────────────────────
console.log('\n5. Lane-scheiding — twee regelsoorten kunnen hetzelfde pattern hebben');

assert(
  'dezelfde term in beide lanes is niet dezelfde sleutel',
  violationKey('brandrule', 'FORBIDDEN_WORD', 'luxe') !==
    violationKey('styleguide', 'FORBIDDEN_WORD', 'luxe'),
);
assert('een styleguide-ruleId hoort bij de styleguide-lane', laneOf('styleguide:voice:abc') === 'styleguide');
assert('een cuid hoort bij de brandrule-lane', laneOf('cmp071mab0011gims') === 'brandrule');

const bothLanes = aggregateViolations(
  [
    hit('g1', { ruleId: 'cuid-brandrule' }),
    hit('g2', { ruleId: 'cuid-brandrule' }),
    hit('g3', { ruleId: 'styleguide:voice:xyz' }),
  ],
  10,
  [
    rule({ id: 'br', kind: 'brand-rule-manual' }),
    rule({ id: 'sg', kind: 'styleguide-rule', severity: 'ADVISORY' }),
  ],
);
assert(
  'beide lanes tellen apart',
  bothLanes.length === 2 &&
    bothLanes.find((s) => s.rule.id === 'br')?.generationsHit === 2 &&
    bothLanes.find((s) => s.rule.id === 'sg')?.generationsHit === 1,
  'anders wint er stilzwijgend één en laat de correctie de andere ongemoeid',
);

// ── 6. Bron-term ────────────────────────────────────────
console.log('\n6. Bronvelden worden samengevoegd, niet weggegooid');

const merged = aggregateViolations([hit('g1')], 10, [
  rule({ id: 'a', sourceTerm: 'luxe', sourceFields: ['wordsWeAvoid'] }),
  rule({ id: 'b', sourceTerm: 'luxe', sourceFields: ['vocabularyDont'] }),
]);
assert(
  'één ask, maar met álle bronvelden',
  merged.length === 1 &&
    merged[0].rule.sourceFields?.length === 2 &&
    merged[0].rule.sourceFields.includes('wordsWeAvoid') &&
    merged[0].rule.sourceFields.includes('vocabularyDont'),
  'één veld opschonen laat de regel vanuit het andere gewoon bestaan',
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
