/**
 * Smoke-test voor sanitize-strategy-output utility.
 *
 * Verifieert dat Effie award-jargon uit strategy-output wordt geschoond zonder
 * onschuldige woorden te raken. Sluit aan op P2 bug-log entry voor linkedin-post
 * Strategy-step rationale-veld (testplan-content-items.md sectie 5).
 *
 * Run: npx tsx scripts/smoke-tests/sanitize-strategy-output.ts
 */

import {
  scrubAwardJargon,
  scrubAwardJargonString,
  scrubStrategyLayer,
} from '../../src/lib/ai/sanitize-strategy-output';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

console.log('\n=== sanitize-strategy-output smoke ===\n');

// ─── Direct strings ─────────────────────────────────────────
console.log('## scrubAwardJargonString\n');

const nl = scrubAwardJargonString('deze strategie is effie-waardig en doortimmerd');
assert('NL "effie-waardig" gescrubd', !/effie/i.test(nl), `out=${nl}`);
assert('NL "doortimmerd" intact', nl.includes('doortimmerd'));

const nlInflected = scrubAwardJargonString('een effie-waardige campagne met effie-waardiger insight');
assert(
  'NL inflecties (-e, -er) gescrubd',
  !/effie/i.test(nlInflected),
  `out=${nlInflected}`,
);

const en = scrubAwardJargonString('an Effie Award-worthy concept with Effie Award potential');
assert('EN "Effie Award" gescrubd', !/effie/i.test(en), `out=${en}`);

const allCaps = scrubAwardJargonString('THIS IS EFFIE-WAARDIG');
assert('Case-insensitive (UPPER)', !/effie/i.test(allCaps), `out=${allCaps}`);

const bareToken = scrubAwardJargonString('won the Effie last year');
assert('Bare "Effie" gescrubd', !/effie/i.test(bareToken), `out=${bareToken}`);

const effieCannes = scrubAwardJargonString('Risk: low | Effie/Cannes potential: very-high');
assert('Effie/Cannes potential gescrubd', !/effie/i.test(effieCannes), `out=${effieCannes}`);

// ─── Edge cases: accent, underscore, slash, possessive ─────
console.log('\n## Edge cases\n');

const accented = scrubAwardJargonString('Éffie Award winner');
assert('Accent "Éffie" gescrubd', !/[ÉéEe]ffie/i.test(accented), `out=${accented}`);

const underscored = scrubAwardJargonString('won an effie_award nomination');
assert('Underscore "effie_award" gescrubd', !/effie/i.test(underscored), `out=${underscored}`);

const slashed = scrubAwardJargonString('Risk: low | Effie/Cannes potential: very-high');
assert(
  'Slash "Effie/Cannes" gescrubd',
  !/effie/i.test(slashed),
  `out=${slashed}`,
);

const possessive = scrubAwardJargonString("the Effie's biggest winner");
assert('Possessive "Effie\'s" gescrubd', !/effie/i.test(possessive), `out=${possessive}`);

const multiLine = scrubAwardJargonString('Line 1: effie-waardig\nLine 2: Effie Award\nLine 3: clean');
assert('Multi-line scrub', !/effie/i.test(multiLine), `out=${multiLine}`);

// Idempotency — scrub twee keer geeft hetzelfde resultaat
const once = scrubAwardJargonString('effie-waardig en Effie Award');
const twice = scrubAwardJargonString(once);
assert('Idempotent (scrubben x2 = scrubben x1)', once === twice, `once=${once}, twice=${twice}`);

// ─── False-positive guards ──────────────────────────────────
console.log('\n## False-positive guards\n');

const fp1 = scrubAwardJargonString('effectief en effective campagne');
assert('"effectief" intact (word boundary)', fp1 === 'effectief en effective campagne', `out=${fp1}`);

const fp2 = scrubAwardJargonString('Jeffie was here');
assert('"Jeffie" intact (word boundary)', fp2 === 'Jeffie was here', `out=${fp2}`);

const fp3 = scrubAwardJargonString('the brand effects research');
assert('"effects" intact', fp3 === 'the brand effects research', `out=${fp3}`);

// ─── Null/undefined safety ──────────────────────────────────
console.log('\n## Null/undefined safety\n');

assert('null → null', scrubAwardJargonString(null) === null);
assert('undefined → undefined', scrubAwardJargonString(undefined) === undefined);
assert('empty string → empty string', scrubAwardJargonString('') === '');

// ─── Object scrubbing ───────────────────────────────────────
console.log('\n## scrubAwardJargon (objects)\n');

const strategy = {
  campaignTheme: 'Sterk Maandagochtend',
  effieRationale: 'Dit concept is effie-waardig vanwege de diepe insight',
  humanInsight: 'Mensen willen zinvol contact',
  brandRole: 'De brand is een effie-waardige facilitator',
  score: 8,
  notes: null,
};

const scrubbed = scrubAwardJargon(strategy, ['effieRationale', 'brandRole', 'humanInsight', 'campaignTheme']);

assert('Scrubt opgegeven veld (effieRationale)', !/effie/i.test(scrubbed.effieRationale as string));
assert('Scrubt opgegeven veld (brandRole)', !/effie/i.test(scrubbed.brandRole as string));
assert('Laat schoon veld onveranderd (humanInsight)', scrubbed.humanInsight === 'Mensen willen zinvol contact');
assert('Laat number-veld onveranderd', scrubbed.score === 8);
assert('Laat null-veld onveranderd', scrubbed.notes === null);
assert('Origineel object onveranderd (immutable)', strategy.effieRationale.includes('effie-waardig'));

// Non-listed field met leak blijft staan (verwacht — caller is verantwoordelijk voor field-lijst)
const partial = { a: 'effie-waardig A', b: 'effie-waardig B' };
const partialScrubbed = scrubAwardJargon(partial, ['a']);
assert('Niet-genoemd veld blijft (b)', /effie/i.test(partialScrubbed.b));
assert('Genoemd veld gescrubd (a)', !/effie/i.test(partialScrubbed.a));

// ─── scrubStrategyLayer (StrategyLayer-shape) ───────────────
console.log('\n## scrubStrategyLayer\n');

const fullStrategy = {
  strategicIntent: 'hybrid',
  intentRatio: { brand: 60, activation: 40 },
  campaignTheme: 'Een effie-waardig thema',
  positioningStatement: 'De Effie-waardige positionering',
  messagingHierarchy: {
    brandMessage: 'Wij zijn Effie-waardig',
    campaignMessage: 'Doe mee met de effie-waardige beweging',
    proofPoints: ['effie-waardig bewijs', '95% groei', 'effie award winner'],
  },
  jtbdFraming: {
    jobStatement: 'When I want to win, I want an effie-waardige strategy',
    functionalJob: 'Win an Effie Award',
    emotionalJob: 'Feel proud',
    socialJob: 'Be seen as effie-waardig',
  },
  strategicChoices: [
    { choice: 'effie-waardige keuze', rationale: 'omdat effie-waardig', tradeoff: 'geen' },
    'effie-waardige losse string',
  ],
  humanInsight: 'Mensen willen geen effie-waardig product, ze willen verbinding',
  effieRationale: 'Dit is bijzonder effie-waardig vanwege diepe insight',
  brandRole: 'De brand is effie-waardig in haar rol',
};

const result = scrubStrategyLayer(fullStrategy);
// Verzamel alleen de string-VALUES (keys zoals "effieRationale" mogen blijven
// staan — die zijn code-identifiers, niet user-facing tekst).
function collectStringValues(node: unknown): string[] {
  const out: string[] = [];
  const visit = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach(visit);
  };
  visit(node);
  return out;
}
const allValues = collectStringValues(result).join(' || ');
assert(
  'Volledige StrategyLayer values: geen "effie" residue',
  !/effie/i.test(allValues),
  `values=${allValues}`,
);
assert(
  'Niet-string-velden ongerept (intentRatio.brand)',
  (result.intentRatio as { brand: number }).brand === 60,
);
assert(
  'Origineel object onveranderd',
  fullStrategy.campaignTheme.includes('effie'),
);

// ─── Summary ────────────────────────────────────────────────
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
