/**
 * Smoke-test voor de StyleguideRule → F-VAL doorvoer (pure laag).
 *
 * Dekt: het constraint-vocabulaire (parsing, legacy-vorm, afwijzingen), de
 * tekst-vs-visueel-scheiding, elke tekst-check afzonderlijk, de
 * severity-mapping en de vorm van de synthetische ruleId.
 *
 * Volledig zonder DB en zonder AI — importeert alleen pure modules
 * (styleguide-rule-checks + rule-constraints + text-matchers).
 *
 * Run: npx tsx scripts/smoke-tests/styleguide-rule-compiler.ts
 */
import {
  parseRuleConstraint,
  isTextConstraint,
  isVisualConstraint,
} from '../../src/lib/brandstyle/rule-constraints';
import {
  compileStyleguideRules,
  evaluateCompiledStyleguideRules,
  styleguideRuleId,
  type StyleguideRuleInput,
} from '../../src/lib/brand-fidelity/styleguide-rule-checks';

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

function makeRule(overrides: Partial<StyleguideRuleInput>): StyleguideRuleInput {
  return {
    id: 'r1',
    section: 'voice',
    kind: 'HARD_RULE',
    severity: 'ADVISORY',
    title: 'Testregel',
    description: null,
    constraint: null,
    ...overrides,
  };
}

/** Compileer één regel en draai hem tegen een tekst. */
function run(constraint: unknown, text: string, overrides: Partial<StyleguideRuleInput> = {}) {
  const result = compileStyleguideRules([makeRule({ constraint, ...overrides })]);
  return {
    ...result,
    violations: evaluateCompiledStyleguideRules(text, result.compiled),
  };
}

// ─── 1. Constraint-vocabulaire ──────────────────────

console.log('\n1. Constraint-parsing');

assert(
  'tekst-constraint parseert',
  isTextConstraint(parseRuleConstraint({ modality: 'text', check: 'no-emoji' })),
);
assert(
  'expliciete visuele constraint parseert',
  isVisualConstraint(
    parseRuleConstraint({ modality: 'visual', property: 'gradient', allowed: false }),
  ),
);
assert(
  'legacy-vorm { property } zonder modality telt als visueel',
  isVisualConstraint(parseRuleConstraint({ property: 'gradient', allowed: false })),
  'schema-comment-vorm moet blijven werken',
);
assert('null-constraint → null', parseRuleConstraint(null) === null);
assert('array-constraint → null', parseRuleConstraint(['nope']) === null);

let invalidReason = '';
assert(
  'onbekende check → null mét reden',
  parseRuleConstraint({ modality: 'text', check: 'levitate' }, (r) => {
    invalidReason = r;
  }) === null && invalidReason.length > 0,
  `reden: "${invalidReason}"`,
);

assert(
  'derivedBy default is user',
  parseRuleConstraint({ modality: 'text', check: 'no-emoji' })?.derivedBy === 'user',
);
assert(
  'derivedBy blijft behouden',
  parseRuleConstraint({ modality: 'text', check: 'no-emoji', derivedBy: 'ai' })?.derivedBy === 'ai',
);

// Regex-veiligheid
assert(
  'geneste quantifier wordt geweigerd',
  parseRuleConstraint({ modality: 'text', check: 'forbidden-pattern', pattern: '(a+)+b' }) === null,
);
assert(
  'ongeldige regex wordt geweigerd',
  parseRuleConstraint({ modality: 'text', check: 'forbidden-pattern', pattern: '([unclosed' }) ===
    null,
);
assert(
  'geldige regex wordt geaccepteerd',
  parseRuleConstraint({
    modality: 'text',
    check: 'forbidden-pattern',
    pattern: '\\b(wij|we|ons|onze)\\b',
  }) !== null,
);
assert(
  'lege woordenlijst wordt geweigerd',
  parseRuleConstraint({ modality: 'text', check: 'forbidden-words', words: [] }) === null,
);

// ─── 2. Tekst vs visueel bij het compileren ─────────

console.log('\n2. Modaliteit-scheiding');

const mixed = compileStyleguideRules([
  makeRule({ id: 'a', constraint: { modality: 'text', check: 'no-emoji' } }),
  makeRule({ id: 'b', section: 'colors', constraint: { property: 'gradient', allowed: false } }),
  makeRule({ id: 'c', section: 'logo', constraint: null }),
  makeRule({ id: 'd', constraint: { modality: 'text', check: 'levitate' } }),
]);
assert('alleen de tekstregel compileert', mixed.compiled.length === 1, `${mixed.compiled.length}`);
assert('visuele regel geteld als skippedVisual', mixed.skippedVisual === 1);
assert('regel zonder constraint geteld als skippedUnconstrained', mixed.skippedUnconstrained === 1);
assert('ongeldige constraint geteld als invalid', mixed.invalid === 1);
assert('totaal blijft zichtbaar', mixed.total === 4);

const visualOnly = run({ property: 'gradient', allowed: false }, 'Een tekst met gradient erin.');
assert(
  'visuele regel levert NUL tekst-violations',
  visualOnly.violations.length === 0 && visualOnly.compiled.length === 0,
  'visuele regels horen bij de renderer, niet bij de tekst-pijler',
);

// ─── 3. De checks zelf ──────────────────────────────

console.log('\n3. Tekst-checks');

// De A2-output uit de Stap-0-spike: emoji + wij-vorm + superlatief.
const SPIKE_A2 = 'Wat een wedstrijd 💪⚽ Samen zijn we DTS, dé voetbalfamilie van Ede!';

const emoji = run({ modality: 'text', check: 'no-emoji' }, SPIKE_A2);
assert('no-emoji vindt beide emoji', emoji.violations.length === 2, `${emoji.violations.length}`);
assert(
  'no-emoji geeft de emoji als snippet met offset',
  emoji.violations[0]?.snippet === '💪' && emoji.violations[0]?.position > 0,
  JSON.stringify(emoji.violations[0]),
);
assert(
  '™/©/® tellen niet als emoji',
  run({ modality: 'text', check: 'no-emoji' }, 'Branddock™ © 2026 ®').violations.length === 0,
);
assert(
  'schone tekst levert geen emoji-violation',
  run({ modality: 'text', check: 'no-emoji' }, 'Magere zege DTS Ede tegen DOS Kampen.').violations
    .length === 0,
);

const wijVorm = run(
  { modality: 'text', check: 'forbidden-pattern', pattern: '\\b(wij|we|ons|onze)\\b' },
  SPIKE_A2,
);
assert('forbidden-pattern vangt de wij-vorm', wijVorm.violations.length === 1, JSON.stringify(wijVorm.violations));

const superlatief = run(
  { modality: 'text', check: 'forbidden-words', words: ['dé', 'beste', 'revolutionair'] },
  SPIKE_A2,
);
assert(
  'forbidden-words vangt het superlatief mét diakriet',
  superlatief.violations.length === 1,
  'ASCII-\\b matcht "dé" niet — vandaar de unicode-boundary',
);
assert(
  'forbidden-words respecteert word-boundaries',
  run({ modality: 'text', check: 'forbidden-words', words: ['beste'] }, 'Het bestek ligt klaar.')
    .violations.length === 0,
  '"bestek" mag niet matchen op "beste"',
);
assert(
  'unicode-boundary matcht niet middenin een woord met diakriet',
  run({ modality: 'text', check: 'forbidden-words', words: ['één'] }, 'géén probleem').violations
    .length === 0,
);

const stem = run(
  { modality: 'text', check: 'forbidden-words', words: ['innovatief'], stemVariants: true },
  'Een innovatieve aanpak.',
);
assert(
  'stemVariants gebruikt de geïnjecteerde expander niet zonder opgave',
  stem.violations.length === 0,
  'zonder expander blijft het gedrag exact-match',
);
const stemInjected = compileStyleguideRules(
  [
    makeRule({
      constraint: { modality: 'text', check: 'forbidden-words', words: ['innovatief'], stemVariants: true },
    }),
  ],
  { expandStemVariants: (w) => [w, `${w.slice(0, -3)}ieve`] },
);
assert(
  'stemVariants wiring werkt met een expander',
  evaluateCompiledStyleguideRules('Een innovatieve aanpak.', stemInjected.compiled).length === 1,
);

const phraseMissing = run(
  { modality: 'text', check: 'required-phrase', phrase: 'DTS Ede' },
  'Een tekst zonder clubnaam.',
);
assert('required-phrase mist → 1 violation', phraseMissing.violations.length === 1);
assert(
  'required-phrase-violation is document-level (dedupe-sentinel)',
  phraseMissing.violations[0]?.position === 0 && phraseMissing.violations[0]?.snippet === '',
);
assert(
  'required-phrase aanwezig → 0 violations',
  run({ modality: 'text', check: 'required-phrase', phrase: 'DTS Ede' }, 'Zege voor DTS Ede.')
    .violations.length === 0,
);

const longSentence =
  'Dit is een bewust veel te lange zin die ruim over de gestelde grens van tien woorden heen gaat. Kort.';
assert(
  'max-sentence-words vangt alleen de lange zin',
  run({ modality: 'text', check: 'max-sentence-words', max: 10 }, longSentence).violations.length ===
    1,
);
assert(
  'max-sentence-words onder de grens is schoon',
  run({ modality: 'text', check: 'max-sentence-words', max: 30 }, longSentence).violations.length ===
    0,
);

assert(
  'no-exclamation-marks vangt uitroeptekens',
  run({ modality: 'text', check: 'no-exclamation-marks' }, 'Kom nu! Echt!').violations.length === 2,
);

const pronouns = run(
  { modality: 'text', check: 'forbidden-pronouns', group: 'first-person-plural', language: 'nl' },
  SPIKE_A2,
);
assert(
  'forbidden-pronouns vangt de wij-vorm uit de ingebouwde tabel',
  pronouns.violations.length === 1 && pronouns.violations[0]?.snippet.toLowerCase() === 'we',
  `${pronouns.violations.length}× — verwacht alleen "we" uit "zijn we DTS"`,
);
assert(
  'forbidden-pronouns kent geen woorden uit de constraint zelf',
  run(
    {
      modality: 'text',
      check: 'forbidden-pronouns',
      group: 'second-person-formal',
      language: 'nl',
      words: ['verzonnen'],
    },
    'Een verzonnen woord en uw aandacht.',
  ).violations.length === 1,
  'alleen "uw" telt; het meegegeven woord wordt genegeerd',
);
assert(
  'forbidden-pronouns weigert een onbekende taal',
  parseRuleConstraint({
    modality: 'text',
    check: 'forbidden-pronouns',
    group: 'first-person-plural',
    language: 'fr',
  }) === null,
);
assert(
  'forbidden-pronouns weigert u/je-onderscheid in het Engels',
  parseRuleConstraint({
    modality: 'text',
    check: 'forbidden-pronouns',
    group: 'second-person-formal',
    language: 'en',
  }) === null,
  'het Engels kent geen T-V-onderscheid — zo\'n regel zou nooit matchen',
);

// ─── 4. Severity + identiteit ───────────────────────

console.log('\n4. Severity en ruleId');

const blocking = run({ modality: 'text', check: 'no-emoji' }, '🎉', { severity: 'BLOCKING' });
assert('BLOCKING → severity error', blocking.violations[0]?.severity === 'error');
const advisory = run({ modality: 'text', check: 'no-emoji' }, '🎉', { severity: 'ADVISORY' });
assert('ADVISORY → severity warning', advisory.violations[0]?.severity === 'warning');

assert(
  'ruleId draagt sectie en id',
  blocking.violations[0]?.ruleId === styleguideRuleId('voice', 'r1'),
  blocking.violations[0]?.ruleId,
);
assert(
  'ruleId-prefix onderscheidt van heuristic/BrandRule',
  blocking.violations[0]?.ruleId.startsWith('styleguide:') === true,
);
assert(
  'message is de regeltekst zelf',
  blocking.violations[0]?.message === 'Testregel',
  blocking.violations[0]?.message,
);
assert(
  'description wordt aan de message geplakt',
  run({ modality: 'text', check: 'no-emoji' }, '🎉', { description: 'merkboek p.12' })
    .violations[0]?.message === 'Testregel — merkboek p.12',
);

assert(
  'required-phrase krijgt ruleType REQUIRED_PHRASE',
  phraseMissing.violations[0]?.ruleType === 'REQUIRED_PHRASE',
);
assert(
  'max-sentence-words krijgt ruleType STYLE_LIMIT',
  run({ modality: 'text', check: 'max-sentence-words', max: 10 }, longSentence).violations[0]
    ?.ruleType === 'STYLE_LIMIT',
);
assert('no-emoji krijgt ruleType FORBIDDEN_WORD', blocking.violations[0]?.ruleType === 'FORBIDDEN_WORD');

// ─── 5. Randgevallen ────────────────────────────────

console.log('\n5. Randgevallen');

assert('lege regelset compileert leeg', compileStyleguideRules([]).compiled.length === 0);
assert(
  'lege tekst levert geen violations',
  run({ modality: 'text', check: 'no-emoji' }, '').violations.length === 0,
);
assert(
  'lege tekst met required-phrase levert wél een violation',
  run({ modality: 'text', check: 'required-phrase', phrase: 'DTS' }, '').violations.length === 1,
  'een ontbrekende verplichte frase ontbreekt ook in lege content',
);

const spammy = run(
  { modality: 'text', check: 'no-exclamation-marks' },
  '!'.repeat(200),
);
assert(
  'één regel levert nooit meer dan 25 violations',
  spammy.violations.length === 25,
  `${spammy.violations.length} — cap beschermt de findings-persistentie`,
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
