/**
 * Smoke-test voor Pad C Sub-Sprint B Phase 1 — Brand-archetype classifier.
 *
 * Verifies (PURE delen, geen live Anthropic call):
 *  - buildClassifierPrompt produceert system met archetype-descriptions
 *  - System bevat alle 12 archetype-codes
 *  - User-prompt bevat aangeleverde brand-facts
 *  - Lege input → fallback-tekst
 *  - parseClassifierResponse: valid JSON, code-fenced JSON, prose-leak,
 *    invalid-archetype, invalid-confidence, missing-reasoning, malformed
 *  - Balance-counted brace-scan voor geneste JSON
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase16-archetype-classifier.ts
 */

import {
  buildClassifierPrompt,
  parseClassifierResponse,
  type ClassifierInput,
} from '../../src/lib/landing-pages/brand-archetype-classifier';

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

function group(name: string): void {
  console.log(`\n${name}`);
}

// ─── Fixtures ──────────────────────────────────────────

const LINFI_INPUT: ClassifierInput = {
  brandName: 'LINFI',
  industry: 'Luxe interieurelementen / vloerluiken',
  brandPurpose: 'Exclusieve maatwerk vloerluiken voor architecten en particulieren',
  brandPromise: 'Vakmanschap dat decennia meegaat',
  brandPersonality: 'Premium, exclusief, vakkundig, betrouwbaar, kwaliteits-georiënteerd',
  brandValues: ['Vakmanschap', 'Duurzaamheid', 'Premium kwaliteit', 'Maatwerk'],
  brandToneOfVoice: 'Premium, ingetogen, autoriteit-uitstralend',
  brandColors: 'Charcoal Navy #263238, Golden Bronze #B59032, Cloud White #F5F6F7',
  brandImageryStyle: 'Minimalist luxury interior photography',
};

const BRANDDOCK_INPUT: ClassifierInput = {
  brandName: 'Branddock',
  industry: 'B2B SaaS — Brand strategy + AI content',
  brandPurpose: 'Marketing teams uitrusten met merk-DNA op alle content',
  brandPromise: 'Schaal je merk-DNA in alle marketing-output zonder kwaliteitsverlies',
  brandPersonality: 'Expert, helder, betrouwbaar, kennis-georiënteerd',
  brandValues: ['Brand-fidelity', 'AI als versterker', 'Onderzoek-gedreven', 'Kennisdeling'],
  brandToneOfVoice: 'Helder, direct, expert',
};

// ─── Tests: prompt-builder ─────────────────────────────

group('Prompt-builder — system bevat alle 12 archetypes');
{
  const prompt = buildClassifierPrompt(LINFI_INPUT);
  const archetypes = [
    'INNOCENT', 'EXPLORER', 'SAGE', 'HERO', 'OUTLAW', 'MAGICIAN',
    'REGULAR_GUY', 'LOVER', 'JESTER', 'CARETAKER', 'CREATOR', 'RULER',
  ];
  for (const a of archetypes) {
    assert(`system bevat ${a}`, prompt.system.includes(a));
  }
  assert('system vermeldt Jung framework', prompt.system.includes('Jung'));
  assert('system schrijft JSON-only output voor', prompt.system.includes('ALLEEN valid JSON'));
}

group('Prompt-builder — user-prompt incorporeert brand-facts');
{
  const prompt = buildClassifierPrompt(LINFI_INPUT);
  assert('user bevat brandName LINFI', prompt.user.includes('LINFI'));
  assert('user bevat industrie', prompt.user.includes('Luxe interieur'));
  assert('user bevat purpose', prompt.user.includes('Exclusieve maatwerk'));
  assert('user bevat values comma-separated', prompt.user.includes('Vakmanschap, Duurzaamheid'));
  assert('user bevat tone-of-voice', prompt.user.includes('Premium, ingetogen'));
  assert('user bevat brand-colors', prompt.user.includes('Charcoal Navy'));
}

group('Prompt-builder — graceful met lege input');
{
  const prompt = buildClassifierPrompt({});
  assert('lege input: user-prompt heeft fallback-tekst', prompt.user.includes('zeer beperkte context'));
  assert('system blijft compleet', prompt.system.includes('ALLEEN valid JSON'));
}

group('Prompt-builder — Branddock SAGE-signalen aanwezig');
{
  const prompt = buildClassifierPrompt(BRANDDOCK_INPUT);
  assert('user bevat Branddock', prompt.user.includes('Branddock'));
  assert('user bevat kennis-georiënteerd', prompt.user.includes('kennis'));
  assert('user bevat Brand-fidelity value', prompt.user.includes('Brand-fidelity'));
}

// ─── Tests: response parser ────────────────────────────

group('Response-parser — clean JSON');
{
  const json = JSON.stringify({
    archetype: 'RULER',
    confidence: 'high',
    reasoning: 'Premium-positionering met "vakmanschap" en "exclusief" geeft duidelijk RULER-signaal.',
  });
  const result = parseClassifierResponse(json);
  assert('clean valid JSON parses', result.success && result.data?.archetype === 'RULER');
  assert('confidence preserved', result.data?.confidence === 'high');
  assert('reasoning preserved', result.data?.reasoning.includes('Premium') ?? false);
}

group('Response-parser — code-fenced JSON');
{
  const text = '```json\n' + JSON.stringify({
    archetype: 'SAGE',
    confidence: 'high',
    reasoning: 'Kennis + expertise + onderzoek-gedreven = klassiek SAGE.',
  }) + '\n```';
  const result = parseClassifierResponse(text);
  assert('code-fenced JSON parses', result.success);
  assert('archetype = SAGE', result.data?.archetype === 'SAGE');
}

group('Response-parser — prose-leak tolerated');
{
  const text = 'Hier is de classificatie:\n\n' + JSON.stringify({
    archetype: 'MAGICIAN',
    confidence: 'medium',
    reasoning: 'Transformatieve technologie + visie.',
  }) + '\n\nHoop dat dit helpt!';
  const result = parseClassifierResponse(text);
  assert('prose-prefix + suffix tolerated', result.success);
}

group('Response-parser — error modes');
{
  const result = parseClassifierResponse('Geen JSON hier');
  assert('geen JSON-block: success=false', !result.success);
}
{
  const result = parseClassifierResponse(JSON.stringify({
    archetype: 'INVALID_ARCHETYPE',
    confidence: 'high',
    reasoning: 'X',
  }));
  assert('invalid archetype rejected', !result.success);
}
{
  const result = parseClassifierResponse(JSON.stringify({
    archetype: 'RULER',
    confidence: 'invalid_level',
    reasoning: 'X',
  }));
  assert('invalid confidence rejected', !result.success);
}
{
  const result = parseClassifierResponse(JSON.stringify({
    archetype: 'RULER',
    confidence: 'high',
    reasoning: '',
  }));
  assert('empty reasoning rejected', !result.success);
}
{
  const result = parseClassifierResponse('{ malformed');
  assert('malformed JSON rejected', !result.success);
}

group('Response-parser — nested-string brace-balance');
{
  const text = JSON.stringify({
    archetype: 'RULER',
    confidence: 'high',
    reasoning: 'String met } character erin en zelfs { meerdere brace-tekens } veroorzaakt geen parse-fail.',
  });
  const result = parseClassifierResponse(text);
  assert('} binnen string-waarde breekt parser niet', result.success);
}

// ─── Resultaat ─────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
console.log('='.repeat(50));

if (fail > 0) {
  process.exit(1);
}
