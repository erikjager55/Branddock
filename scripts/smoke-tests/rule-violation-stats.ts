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

/** Vaste ijkpunten, zodat de leeftijdsgrens deterministisch te testen is. */
const T0 = new Date('2026-01-01T00:00:00Z');   // regel bestaat al lang
const T_MID = new Date('2026-06-01T00:00:00Z'); // regel van halverwege

const rule = (over: Partial<LiveRule> = {}): LiveRule => ({
  id: 'rule-1',
  ruleType: 'FORBIDDEN_WORD',
  pattern: 'luxe',
  kind: 'voiceguide-synced',
  severity: 'warning',
  createdAt: T0,
  ...over,
});

/** Bouwt een venster van n generaties, oplopend vanaf `from`, één per dag. */
const window = (n: number, from = new Date('2026-05-01T00:00:00Z'), contentType?: string) =>
  Array.from({ length: n }, (_, i) => ({
    id: `g${i + 1}`,
    scoredAt: new Date(from.getTime() + i * 86_400_000),
    ...(contentType !== undefined ? { contentType } : {}),
  }));

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

const basic = aggregateViolations([hit('g1'), hit('g2'), hit('g3')], window(10), [rule()]);
assert('drie generaties geraakt van tien', basic[0]?.generationsHit === 3);
assert('rate is 0,3', Math.abs((basic[0]?.rate ?? 0) - 0.3) < 1e-9);

const deduped = aggregateViolations([hit('g1'), hit('g1'), hit('g1')], window(10), [rule()]);
assert(
  'drie hits in dezelfde generatie tellen als één',
  deduped[0]?.generationsHit === 1,
  'anders meet je woordfrequentie in plaats van hoe vaak de regel botst',
);

assert(
  'de sleutel overleeft een gewisselde cuid — dit is de hele reden van het ontwerp',
  aggregateViolations(
    [hit('g1', { ruleId: 'oude-cuid' }), hit('g2', { ruleId: 'nieuwe-cuid' })],
    window(10),
    [rule({ id: 'weer-een-andere-cuid' })],
  )[0]?.generationsHit === 2,
);

assert(
  'een regel die niet meer bestaat levert niets op',
  aggregateViolations([hit('g1'), hit('g2')], window(10), []).length === 0,
  'anders stel je een correctie voor aan een regel die de gebruiker nergens vindt',
);

assert(
  'heuristieken tellen niet mee in de aggregatie',
  aggregateViolations(
    [hit('g1', { ruleId: 'heuristic:nl-NL:fillers:gewoon' })],
    window(10),
    [rule()],
  ).length === 0,
);

assert('nul generaties is een veilige no-op', aggregateViolations([hit('g1')], window(0), [rule()]).length === 0);

const twoRules = aggregateViolations(
  [hit('g1'), hit('g2'), hit('g3'), hit('g4', { pattern: 'premium' })],
  window(10),
  [rule(), rule({ id: 'rule-2', pattern: 'premium' })],
);
assert('hoogste percentage eerst', twoRules[0]?.rule.pattern === 'luxe');
assert('beide regels komen terug', twoRules.length === 2);

const dupSource = aggregateViolations([hit('g1')], window(10), [
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

const at15 = aggregateViolations([hit('g1'), hit('g2'), hit('g3')], window(20), [rule()]);
assert('precies 15% haalt het', selectCurationSignals(at15).length === 1);

const under15 = aggregateViolations([hit('g1'), hit('g2')], window(20), [rule()]);
assert('10% haalt het niet', selectCurationSignals(under15).length === 0);

const tooFew = aggregateViolations([hit('g1'), hit('g2'), hit('g3')], window(5), [rule()]);
assert(
  '60% van maar 5 generaties haalt het niet',
  selectCurationSignals(tooFew).length === 0,
  'te weinig volume om er een conclusie aan te hangen',
);

assert(
  'de drempels zijn instelbaar',
  selectCurationSignals(tooFew, { minGenerations: 5, minRate: 0.5 }).length === 1,
);

const twoHitsAtTen = aggregateViolations([hit('g1'), hit('g2')], window(10), [rule()]);
assert(
  '2 treffers bij 10 generaties haalt het niet, ook al is dat 20%',
  selectCurationSignals(twoHitsAtTen).length === 0,
  'minHits voorkomt dat een toevalstreffer als structureel patroon leest',
);

const many = aggregateViolations(
  Array.from({ length: 5 }, (_, i) =>
    ['g1', 'g2', 'g3', 'g4'].map((g) => hit(g, { pattern: `woord-${i}` })),
  ).flat(), window(10),
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
  window(10),
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

const merged = aggregateViolations([hit('g1')], window(10), [
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


// ── 9. Leeftijdsgrens op de noemer ──────────────────────
console.log('\n9. Een verse regel wordt beoordeeld tegen zijn eigen levensduur');

// 20 generaties, één per dag vanaf 1 mei. Een regel van 15 mei "zag" er 6.
const twintig = window(20);
const verseRegel = rule({ createdAt: new Date('2026-05-15T00:00:00Z') });
const vers = aggregateViolations(
  ['g15', 'g16', 'g17'].map((g) => hit(g)),
  twintig,
  [verseRegel],
);
assert(
  'de noemer is de levensduur van de regel, niet het venster',
  vers[0]?.generationsTotal === 6,
  `${vers[0]?.generationsTotal} (verwacht 6 van de 20)`,
);
assert(
  '3 van 6 = 50%, niet 15%',
  Math.abs((vers[0]?.rate ?? 0) - 0.5) < 1e-9,
  'zonder de leeftijdsgrens zou dit 3/20 zijn en nooit surfacen',
);

const oud = aggregateViolations(['g1', 'g2', 'g3'].map((g) => hit(g)), twintig, [rule()]);
assert(
  'een oude regel houdt het volle venster',
  oud[0]?.generationsTotal === 20,
  `${oud[0]?.generationsTotal}`,
);

// Artefact-test: ligt `createdAt` ná de nieuwste generatie, dan kan het geen
// echte aanmaakdatum zijn (een regel ontstaat niet ná de data waarin hij
// overtredingen heeft). Dan negeren we de grens. Dat is de stand van zaken op
// de echte data: élke regel draagt de datum van de laatste sync.
const artefact = rule({ createdAt: new Date('2026-09-01T00:00:00Z') });
const genegeerd = aggregateViolations([hit('g1'), hit('g2'), hit('g3')], twintig, [artefact]);
assert(
  'een createdAt ná het venster wordt genegeerd',
  genegeerd[0]?.generationsTotal === 20,
  `${genegeerd[0]?.generationsTotal} — verwacht het volle venster`,
);

// Monotonie: de noemer hangt alleen van het venster af, niet van de treffers.
// Een extra overtreding mag het percentage nooit omlaag brengen — anders zou
// slechter presteren je onzichtbaar maken.
const drie = aggregateViolations(['g18', 'g19', 'g20'].map((g) => hit(g)), twintig, [artefact]);
const vier = aggregateViolations(
  ['g2', 'g18', 'g19', 'g20'].map((g) => hit(g)),
  twintig,
  [artefact],
);
assert(
  'een extra overtreding verlaagt het percentage niet',
  (vier[0]?.rate ?? 0) > (drie[0]?.rate ?? 0),
  `3 treffers: ${drie[0]?.rate}, 4 treffers: ${vier[0]?.rate}`,
);
assert(
  'en de noemer blijft gelijk',
  drie[0]?.generationsTotal === vier[0]?.generationsTotal,
  'de noemer mag niet van de meting zelf afhangen',
);

// ── 10. contentTypeFilter ───────────────────────────────
console.log('\n10. Een regel met contentTypeFilter telt alleen passende generaties');

const gemengd = [
  { id: 'a1', scoredAt: new Date('2026-06-02T00:00:00Z'), contentType: 'Blog Post' },
  { id: 'a2', scoredAt: new Date('2026-06-03T00:00:00Z'), contentType: 'Landing Page' },
  { id: 'a3', scoredAt: new Date('2026-06-04T00:00:00Z'), contentType: 'Blog Post' },
  { id: 'a4', scoredAt: new Date('2026-06-05T00:00:00Z'), contentType: 'Landing Page' },
];
const blogRegel = rule({ contentTypeFilter: ['Blog Post'] });
const gefilterd = aggregateViolations([hit('a1'), hit('a3')], gemengd, [blogRegel]);
assert(
  'alleen de twee blogposts vormen de noemer',
  gefilterd[0]?.generationsTotal === 2 && gefilterd[0]?.generationsHit === 2,
  `${gefilterd[0]?.generationsHit}/${gefilterd[0]?.generationsTotal}`,
);
assert(
  'een treffer op een ander type telt niet mee',
  aggregateViolations([hit('a2')], gemengd, [blogRegel]).length === 0,
);
assert(
  'casing in het filter maakt niet uit',
  aggregateViolations([hit('a1')], gemengd, [rule({ contentTypeFilter: ['blog post'] })])[0]
    ?.generationsTotal === 2,
);
assert(
  'zonder filter tellen alle generaties, ook zonder contentType',
  aggregateViolations([hit('g1')], window(12), [rule()])[0]?.generationsTotal === 12,
);

// ── 11. Dismiss ─────────────────────────────────────────
console.log('\n11. Weggeklikte suggesties');

const kandidaat = aggregateViolations(
  ['g1', 'g2', 'g3', 'g4'].map((g) => hit(g)),
  window(12),
  [rule()],
);
assert('zonder dismiss surfacet hij', selectCurationSignals(kandidaat).length === 1);
assert(
  'met dismiss verdwijnt hij',
  selectCurationSignals(kandidaat, { dismissedKeys: [kandidaat[0].key] }).length === 0,
);
assert(
  'een sleutel van een ándere regel raakt hem niet',
  selectCurationSignals(kandidaat, { dismissedKeys: ['brandrule::forbidden_word::premium'] })
    .length === 1,
);
assert(
  'de sleutel bevat het pattern — dus een gewijzigde regel keert vanzelf terug',
  kandidaat[0].key.includes('luxe'),
  'wegklikken bevriest deze regel in deze vorm, niet het onderwerp',
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
