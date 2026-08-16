/**
 * Smoke-test voor de deliverable-content-accessor (fase 1 van
 * tasks/content-chain-accessor.md).
 *
 * Dekt: elke `kind`, de flip (gekozen variant wint van verouderde componenten),
 * een half-complete variant die `flattenPageVariantToText` laat gooien, rommelige
 * `settings`, variant-selectie binnen een groep, en de uitsluiting van
 * beeld-/videocomponenten uit de tekstprojectie.
 *
 * Run: npx tsx scripts/smoke-tests/deliverable-content-accessor.ts
 * Geen DB nodig — pure functies.
 */

import {
  getDeliverableText,
  resolveDeliverableContent,
  type DeliverableLike,
} from '../../src/lib/content/resolve-deliverable-content';
import {
  countVariantOptions,
  readChosenVariant,
  readDeliverableSettings,
} from '../../src/lib/content/deliverable-settings';

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

/** Schema-complete FAQ-variant — de eenvoudigste tak van de flatten-dispatch. */
function validFaqVariant(headline = 'Veelgestelde vragen') {
  return {
    hero: { headline, subline: 'Alles over onze dienstverlening' },
    popularQuestions: [{ question: 'Wat kost het?', answer: 'Vanaf 39 euro per maand.' }],
    categories: [
      { label: 'Facturatie', items: [{ question: 'Kan ik opzeggen?', answer: 'Maandelijks.' }] },
    ],
    contactEscape: { heading: 'Niet gevonden?', body: 'Mail ons.', ctaLabel: 'Contact' },
    closingCta: { heading: 'Aan de slag', ctaLabel: 'Start' },
  };
}

/**
 * Dispatcht naar de FAQ-tak (`popularQuestions` aanwezig) maar mist `categories`
 * → `for (const cat of v.categories)` gooit. Staat voor een variant die is
 * opgeslagen vóór een schema-uitbreiding, of een partial uit een afgebroken run.
 */
function halfCompleteFaqVariant() {
  return {
    hero: { headline: 'Half', subline: 'compleet' },
    popularQuestions: [{ question: 'Q', answer: 'A' }],
    // categories ontbreekt bewust
    contactEscape: { heading: 'H', body: 'B', ctaLabel: 'C' },
    closingCta: { heading: 'H', ctaLabel: 'C' },
  };
}

function component(over: Partial<DeliverableLike['components'] extends (infer C)[] | null | undefined ? C : never> = {}) {
  return {
    componentType: 'body',
    groupType: 'body',
    generatedContent: 'Tekst uit de componentketen.',
    order: 0,
    ...over,
  };
}

console.log('\n## 1. De vier kinds');

{
  const r = resolveDeliverableContent({ components: [component()] });
  assert('components: kind', r.kind === 'components');
  assert('components: tekst', r.kind === 'components' && r.text.includes('componentketen'));
  assert('components: byGroup gevuld', r.kind === 'components' && !!r.byGroup.body);
  assert('components: niet als legacy gemarkeerd', r.kind === 'components' && !r.legacy);
}

{
  const r = resolveDeliverableContent({ settings: { structuredVariant: validFaqVariant() } });
  assert('structured: kind', r.kind === 'structured');
  assert('structured: tekst uit variant', r.kind === 'structured' && r.text.includes('Veelgestelde vragen'));
  assert('structured: variant meegegeven', r.kind === 'structured' && !!r.variant);
}

{
  const r = resolveDeliverableContent({
    settings: { structuredVariantOptions: [validFaqVariant('A'), validFaqVariant('B')] },
  });
  assert('structured-unchosen: kind', r.kind === 'structured-unchosen');
  assert('structured-unchosen: telling', r.kind === 'structured-unchosen' && r.optionCount === 2);
}

{
  assert('empty: leeg deliverable', resolveDeliverableContent({}).kind === 'empty');
  assert('empty: componenten zonder inhoud',
    resolveDeliverableContent({ components: [component({ generatedContent: '   ' })] }).kind === 'empty');
}

console.log('\n## 2. De flip — een gekozen variant wint van verouderde componenten');

{
  // Long-form defaultt op ['seo'] en gebruikt dan keten A. Vinkt de gebruiker het
  // GEO-doel aan, dan flipt het deliverable naar keten B terwijl de oude
  // variantGroups blijven staan. De accessor mag dan NIET de pre-flip-tekst geven.
  const r = resolveDeliverableContent({
    contentType: 'thought-leadership',
    components: [component({ generatedContent: 'VEROUDERDE pre-flip tekst' })],
    settings: { structuredVariant: validFaqVariant('Na de flip') },
  });
  assert('flip: variant wint van componenten', r.kind === 'structured');
  assert('flip: pre-flip-tekst komt NIET terug',
    r.kind === 'structured' && !r.text.includes('VEROUDERDE'));
  assert('flip: verse tekst komt wel terug',
    r.kind === 'structured' && r.text.includes('Na de flip'));
}

console.log('\n## 3. Fail-soft — een half-complete variant mag nooit 500-en');

{
  let threw = false;
  let r;
  try {
    r = resolveDeliverableContent({ settings: { structuredVariant: halfCompleteFaqVariant() } });
  } catch {
    threw = true;
  }
  assert('half-complete: gooit niet', !threw);
  assert('half-complete: degradeert naar empty', !threw && r?.kind === 'empty');
}

{
  // Zelfs mét componenten: geen terugval, want dat zou opnieuw pre-flip-tekst zijn.
  const r = resolveDeliverableContent({
    components: [component({ generatedContent: 'VEROUDERDE pre-flip tekst' })],
    settings: { structuredVariant: halfCompleteFaqVariant() },
  });
  assert('half-complete: valt niet terug op componenten', r.kind === 'empty');
}

console.log('\n## 4. Rommelige settings');

for (const [label, value] of [
  ['null', null],
  ['string', 'niet eens JSON'],
  ['array', [1, 2, 3]],
  ['number', 42],
  ['structuredVariant: null', { structuredVariant: null }],
  ['structuredVariant: string', { structuredVariant: 'kapot' }],
  ['options: geen array', { structuredVariantOptions: 'kapot' }],
  ['options: rommel in array', { structuredVariantOptions: [null, 'x', 3] }],
] as Array<[string, unknown]>) {
  let threw = false;
  let kind = '';
  try {
    kind = resolveDeliverableContent({ settings: value }).kind;
  } catch {
    threw = true;
  }
  assert(`settings ${label}: gooit niet en wordt empty`, !threw && kind === 'empty');
}

{
  // Rommel in settings mag de componentketen niet blokkeren.
  const r = resolveDeliverableContent({ settings: 'kapot', components: [component()] });
  assert('rommelige settings: componenten winnen alsnog', r.kind === 'components');
}

console.log('\n## 5. Variant-selectie binnen een groep');

{
  const r = resolveDeliverableContent({
    components: [
      component({ variantGroup: 'body', variantIndex: 0, generatedContent: 'Variant A' }),
      component({ variantGroup: 'body', variantIndex: 1, generatedContent: 'Variant B', isSelected: true }),
      component({ variantGroup: 'body', variantIndex: 2, generatedContent: 'Variant C' }),
    ],
  });
  assert('selectie: alleen de gekozen variant', r.kind === 'components' && r.text === 'Variant B');
}

{
  const r = resolveDeliverableContent({
    components: [
      component({ variantGroup: 'body', variantIndex: 0, generatedContent: 'Variant A' }),
      component({ variantGroup: 'body', variantIndex: 1, generatedContent: 'Variant B' }),
    ],
  });
  assert('selectie: zonder keuze wint variant 0', r.kind === 'components' && r.text === 'Variant A');
}

console.log('\n## 6. Beeld en video zijn geen tekst');

{
  // `generatedContent` bevat bij image/video de gebruikte PROMPT. Die als
  // artikeltekst doorgeven zou beeldprompts in exports en F-VAL-scoring laten belanden.
  const r = resolveDeliverableContent({
    components: [
      component({ componentType: 'image', generatedContent: 'een foto van een golfbaan bij zonsopgang' }),
      component({ componentType: 'body', generatedContent: 'De echte tekst.', order: 1 }),
    ],
  });
  assert('beeldprompt niet in tekst', r.kind === 'components' && !r.text.includes('zonsopgang'));
  assert('echte tekst wel', r.kind === 'components' && r.text.includes('De echte tekst'));
}

{
  const r = resolveDeliverableContent({
    components: [
      component({ componentType: 'image', variantGroup: 'hero-image', imageUrl: 'https://cdn/hero.jpg' }),
      component({ componentType: 'image', imageUrl: 'https://cdn/other.jpg' }),
      component({ componentType: 'body', generatedContent: 'Tekst.' }),
    ],
  });
  assert('hero-beeld herkend', r.kind === 'components' && r.heroImageUrl === 'https://cdn/hero.jpg');
}

{
  // Alleen beeld, geen tekst → geen tekstprojectie, dus empty.
  const r = resolveDeliverableContent({
    components: [component({ componentType: 'image', imageUrl: 'https://cdn/x.jpg', generatedContent: 'prompt' })],
  });
  assert('alleen beeld → empty', r.kind === 'empty');
}

console.log('\n## 7. Keten C (legacy generatedText)');

{
  const r = resolveDeliverableContent({ generatedText: 'Oude losse tekst.' });
  assert('legacy: komt terug als components', r.kind === 'components');
  assert('legacy: gemarkeerd', r.kind === 'components' && r.legacy === true);
  assert('legacy: tekst klopt', r.kind === 'components' && r.text === 'Oude losse tekst.');
}

{
  const r = resolveDeliverableContent({
    generatedText: 'Oude losse tekst.',
    components: [component({ generatedContent: 'Verse componenttekst.' })],
  });
  assert('legacy: componenten gaan voor', r.kind === 'components' && !r.legacy);
}

{
  const r = resolveDeliverableContent({
    generatedText: 'Oude losse tekst.',
    settings: { structuredVariantOptions: [validFaqVariant()] },
  });
  assert('legacy: onchosen-opties gaan voor', r.kind === 'structured-unchosen');
}

console.log('\n## 8. getDeliverableText — is er iets te versturen?');

{
  assert('text: componenten', getDeliverableText({ components: [component()] }) !== null);
  assert('text: structured', getDeliverableText({ settings: { structuredVariant: validFaqVariant() } }) !== null);
  assert('text: unchosen is null (geen placeholder)',
    getDeliverableText({ settings: { structuredVariantOptions: [validFaqVariant()] } }) === null);
  assert('text: empty is null', getDeliverableText({}) === null);
}

console.log('\n## 9. settings-parser los');

{
  assert('readDeliverableSettings: null → {}', Object.keys(readDeliverableSettings(null)).length === 0);
  assert('readDeliverableSettings: array → {}', Object.keys(readDeliverableSettings([1])).length === 0);
  assert('readChosenVariant: object', readChosenVariant({ structuredVariant: validFaqVariant() } as never) !== null);
  assert('readChosenVariant: string → null', readChosenVariant({ structuredVariant: 'x' } as never) === null);
  assert('countVariantOptions: telt alleen objecten',
    countVariantOptions({ structuredVariantOptions: [{}, null, 'x', {}] } as never) === 2);
}

console.log(`\n${'='.repeat(56)}`);
console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
