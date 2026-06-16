/**
 * [DET] LP-tekstkwaliteit + fidelity-meting (audit 2026-06-10, fase 1-5).
 *
 * Dekt deterministisch:
 *  1. Scoring-targets + drempel (length-penalty-fix)
 *  2. Placeholder-guard + content-hash
 *  3. Detector: glued em-dash + hyphen-splice + brand-vocab-whitelist
 *  4. Prompt: HVD-gating, geen em-dash-priming, geen cross-brand hardcode,
 *     anti-fabricage + anti-drieslag regels
 *  5. flattenPuckText-hygiëne (asset-keys, Q&A-volgorde, sectielabels)
 *  6. variant-tell-rewrite gating + vocab-dedupe
 *
 * Run: npx tsx scripts/smoke-tests/lp-text-quality-fidelity.ts
 */
import 'dotenv/config';
import {
  resolveTargetWordCount,
  resolveCompositeThreshold,
  containsPlaceholderContent,
  computeContentHash,
} from '../../src/lib/brand-fidelity/fidelity-runner';
import { computeLengthMultiplier } from '../../src/lib/brand-fidelity/g-eval-rubric';
import { detectAiTells } from '../../src/lib/brand-fidelity/ai-tell-detector';
import { buildLandingPageVariantPrompt, type LandingPageGenerationParams } from '../../src/lib/landing-pages/variant-generator';
import { flattenPuckText, flattenPuckTextForJudge } from '../../src/lib/landing-pages/puck-data-flatten';
import {
  buildVariantTellFeedback,
  runVariantTellRewriteIfNeeded,
} from '../../src/lib/landing-pages/variant-tell-rewrite';
import { dedupeVocabularyAgainstAvoid } from '../../src/lib/brandvoice/vocab-dedupe';
import type { LandingPageVariantContent } from '../../src/lib/landing-pages/variant-schema';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

// ─── 1. Scoring-targets + drempel ─────────────────────────
group('1. resolveTargetWordCount + resolveCompositeThreshold');
assert('landing-page target = 650 (was 1550 via registry-midpoint)', resolveTargetWordCount('landing-page') === 650);
// W1 (page-type-schemas): eigen contracten herijken de verwachte omvang —
// product 750 (3-6 features + problem/solution/faq), faq 800, microsite 700.
assert('product-page target = 750 (W1-herijking)', resolveTargetWordCount('product-page') === 750);
assert('faq-page target = 800 (W1-herijking)', resolveTargetWordCount('faq-page') === 800);
assert('microsite target = 700', resolveTargetWordCount('microsite') === 700);
assert('blog-post target onaangetast (≠ structured-variant-map)', resolveTargetWordCount('blog-post') !== 650 && resolveTargetWordCount('blog-post') > 0);
assert('landing-page drempel = 70 (mid-form)', resolveCompositeThreshold('landing-page') === 70);
assert('comparison-page drempel = 70', resolveCompositeThreshold('comparison-page') === 70);
assert('blog-post drempel = 75 (long-form ongewijzigd)', resolveCompositeThreshold('blog-post') === 75);
assert('linkedin-post drempel = 65 (short-form ongewijzigd)', resolveCompositeThreshold('linkedin-post') === 65);
assert('650 woorden vs target 650 → multiplier 1.0', computeLengthMultiplier(650, 650).multiplier === 1);
assert('650 woorden vs oud target 1550 → multiplier 0.6 (het oude artefact)', computeLengthMultiplier(650, 1550).multiplier === 0.6);

// ─── 2. Placeholder-guard + content-hash ──────────────────
group('2. Placeholder-guard + computeContentHash');
assert('placeholder "Schrijf hier je inhoud.nbvcxz" gedetecteerd', containsPlaceholderContent('Intro. Schrijf hier je inhoud.nbvcxz En meer.'));
assert('Lorem ipsum gedetecteerd (case-insensitive)', containsPlaceholderContent('LOREM IPSUM dolor sit amet'));
assert('normale copy passeert', !containsPlaceholderContent('Vlekkeloos textiel, elke dag geleverd op schema.'));
assert('hash stabiel', computeContentHash('abc') === computeContentHash('abc'));
assert('hash trim-insensitief', computeContentHash('  abc  ') === computeContentHash('abc'));
assert('hash 16 hex chars', /^[0-9a-f]{16}$/.test(computeContentHash('abc')));
assert('hash verschilt per content', computeContentHash('abc') !== computeContentHash('abd'));

// ─── 3. Detector-uitbreiding ──────────────────────────────
group('3. Detector: glued em-dash + hyphen-splice + whitelist');
const glued = detectAiTells('Horecatextiel dat altijd klaar ligt—zonder omkijken. Wij nemen dit over—zodat jij kunt focussen.');
assert('glued em-dash gedetecteerd (2×)', (glued.detected.find((d) => d.definition.id === 'em_dash_glued')?.count ?? 0) === 2,
  `got ${glued.detected.find((d) => d.definition.id === 'em_dash_glued')?.count}`);
const route = detectAiTells('De trein Amsterdam—Berlijn vertrekt om negen uur en de reis duurt ongeveer zes uur in totaal.');
assert('route-notatie Amsterdam—Berlijn matcht NIET (uppercase)', !route.detected.some((d) => d.definition.id === 'em_dash_glued'));
const spaced = detectAiTells('Dit is het resultaat — zonder gedoe geregeld voor je hele team.');
assert('gespatieerde trailing-dash nog steeds gedetecteerd (em_dash_overuse)', spaced.detected.some((d) => d.definition.id === 'em_dash_overuse'));
const hyphen = detectAiTells('Wij nemen dit hele circus over-zodat jij nooit meer hoeft na te denken.');
assert('hyphen-splice "over-zodat" gedetecteerd', hyphen.detected.some((d) => d.definition.id === 'hyphen_splice_conjunction'));
const compounds = detectAiTells('Stuur een e-mail met de AI-tekst en de offerte-aanvraag naar de klant vandaag nog door.');
assert('legitieme samenstellingen (e-mail) matchen NIET', !compounds.detected.some((d) => d.definition.id === 'hyphen_splice_conjunction'));

const TELLY = 'Het resultaat is naadloos geïntegreerd en naadloos afgewerkt in het hele pand, elke dag opnieuw zichtbaar.';
const noWhitelist = detectAiTells(TELLY);
const withWhitelist = detectAiTells(TELLY, { brandVocabulary: ['naadloos'] });
const nlWordCount = (r: ReturnType<typeof detectAiTells>) =>
  r.detected.filter((d) => d.definition.category === 'NL_WORD' || d.definition.category === 'EN_WORD')
    .reduce((s, d) => s + d.matches.filter((m) => m.toLowerCase().includes('naadloos')).length, 0);
assert('zonder whitelist: "naadloos" telt als lexicon-tell', nlWordCount(noWhitelist) > 0);
assert('met brand-vocab-whitelist: "naadloos" telt NIET', nlWordCount(withWhitelist) === 0);
const structuralStillCounts = detectAiTells('Wij regelen het—zodat jij vrij bent.', { brandVocabulary: ['zodat'] });
assert('whitelist raakt structurele tells (interpunctie) NIET', structuralStillCounts.detected.some((d) => d.definition.id === 'em_dash_glued'));
const wbMask = detectAiTells(TELLY, { brandVocabulary: ['naad'] });
assert('whitelist matcht op hele woorden ("naad" maskeert "naadloos" NIET)', nlWordCount(wbMask) > 0);

// ─── 4. Prompt-assertions (de echte productie-prompt) ─────
group('4. buildLandingPageVariantPrompt');
const baseParams: LandingPageGenerationParams = {
  brand: { brandName: 'Napking', brandToneOfVoice: 'warm en nuchter', industry: 'horeca-textiel' },
  persona: { name: 'Restauranteigenaar' },
  userPrompt: 'Landing page voor textielbeheer-abonnement voor restaurants.',
  locale: 'nl-NL',
  vocabularyDo: ['vlekkeloos', 'omkijken'],
  vocabularyDont: ['goedkoop'],
};
const promptDefault = buildLandingPageVariantPrompt(baseParams);
const promptOff = buildLandingPageVariantPrompt({ ...baseParams, humanVoiceMode: 'OFF' });
const promptStrict = buildLandingPageVariantPrompt({ ...baseParams, humanVoiceMode: 'STRICT' });

assert('HVD aanwezig bij default (BASELINE-semantiek)', promptDefault.system.includes('HUMAN VOICE'));
assert('HVD bevat em-dash-prohibitie', promptDefault.system.includes('Em-dash'));
assert('HVD aanwezig bij STRICT', promptStrict.system.includes('HUMAN VOICE'));
assert('HVD afwezig bij OFF', !promptOff.system.includes('HUMAN VOICE'));
assert('OFF-prompt bevat NUL em-dashes (geen model-priming)', !promptOff.system.includes('—'),
  `eerste: ${promptOff.system.split('\n').find((l) => l.includes('—'))?.slice(0, 80)}`);
assert('geen LINFI-hardcode meer', !promptDefault.system.includes('LINFI'));
assert('geen Better Brands-hardcode meer', !promptDefault.system.includes('Better Brands'));
assert('riskReducer-voorbeeld zonder "Geen X"-framing', !promptDefault.system.includes('Geen creditcard nodig'));
assert('anti-drieslag regel 15 aanwezig', promptDefault.system.includes('Maximaal 1 opsommende ontkenning'));
assert('anti-fabricage: verzin nooit namen/cijfers', promptDefault.system.includes('verzin NOOIT echte bedrijfsnamen'));
assert('vocab-rails nog intact', promptDefault.system.includes('"vlekkeloos"'));
assert('user-prompt bevat brand', promptDefault.user.includes('Napking'));
const promptEn = buildLandingPageVariantPrompt({ ...baseParams, locale: 'en-US' });
assert('EN-locale → EN HVD', promptEn.system.includes('Real writing has rhythm'));

// ─── 5. flattenPuckText-hygiëne ───────────────────────────
group('5. flattenPuckText');
const tree = {
  content: [
    {
      type: 'BrandHero',
      props: { headline: 'Vlekkeloos textiel', heroVisualUrl: '/uploads/media/x/hero.png', cta: 'Plan gesprek' },
    },
    {
      type: 'FAQ',
      props: { items: [{ answer: 'Binnen twee dagen geleverd.', question: 'Hoe snel leveren jullie?' }] },
    },
    { type: 'Footer', props: { logoSrc: '/img/logo.svg', tagline: 'Sinds 1998' } },
  ],
};
const flat = flattenPuckText(tree);
const flatJudge = flattenPuckTextForJudge(tree);
assert('asset-URL (heroVisualUrl) uitgesloten', !flat.includes('/uploads/media'));
assert('logoSrc uitgesloten (suffix-match)', !flat.includes('logo.svg'));
assert('copy behouden', flat.includes('Vlekkeloos textiel') && flat.includes('Sinds 1998'));
assert('FAQ: vraag vóór antwoord', flat.indexOf('Hoe snel leveren jullie?') < flat.indexOf('Binnen twee dagen geleverd.'));
assert('judge-variant: sectielabels aanwezig', flatJudge.includes('[BrandHero]') && flatJudge.includes('[FAQ]'));
assert('basis-variant: GEEN labels (readability/edit-distance blijft zuiver)', !flat.includes('[BrandHero]'));

// ─── 6. variant-tell-rewrite + vocab-dedupe ───────────────
group('6. variant-tell-rewrite + vocab-dedupe');
const telly = detectAiTells('Dit is baanbrekend en naadloos—zodat alles moeiteloos verloopt. Het is belangrijk om te beseffen dat dit een baanbrekende, naadloze oplossing is die moeiteloos werkt—zonder gedoe.');
const feedback = buildVariantTellFeedback(telly);
assert('tell-feedback gegenereerd voor telly tekst', feedback !== null && feedback.includes('AI-tell-detector'));

const cleanVariant: LandingPageVariantContent = {
  hero: { headline: 'Verkoold gevelhout dat zwart blijft', subhead: 'Drie keer gebrand volgens Japans recept. Daarom houdt de kleur decennia.', primaryCta: 'Vraag stalen aan' },
  trust: { type: 'logos', items: [{ label: 'BNA Architecten' }] },
  features: { sectionHeading: 'Waarom dit hout', items: [
    { icon: 'Flame', heading: 'Gebrand op ambacht', body: 'Elke plank gaat door drie brandgangen. De koolstoflaag beschermt tegen weer en insecten.' },
    { icon: 'Shield', heading: 'Onderhoudsarm', body: 'De eerste vijftien jaar hoeft er niets aan te gebeuren. Daarna hooguit een borstelbeurt.' },
    { icon: 'Leaf', heading: 'Volhoutbaar', body: 'FSC-hout uit Europese bossen, verduurzaamd met vuur in plaats van chemie.' },
  ] },
  socialProof: { testimonials: [{ quote: 'Na vier jaar staat de gevel er nog exact zo bij als bij oplevering.', authorName: 'M. Janssen', authorRole: 'Architect', authorCompany: 'Bureau Janssen' }] },
  faq: { items: [
    { question: 'Hoe lang gaat het mee?', answer: 'Vijftig jaar is realistisch. Het Japanse origineel staat er soms al een eeuw.' },
    { question: 'Wat kost het per vierkante meter?', answer: 'Tussen de 60 en 95 euro, afhankelijk van profiel en brandgraad.' },
    { question: 'Kan ik het zelf monteren?', answer: 'Ja. We leveren een montagehandleiding en bezorgen op de bouwplaats.' },
    { question: 'Verkleurt de gevel?', answer: 'De koolstoflaag patineert licht. De basiskleur blijft diep zwart.' },
    { question: 'Is het brandveilig?', answer: 'Het voldoet aan brandklasse B. Het branden verhoogt juist de weerstand.' },
  ] },
  finalCta: { heading: 'Zien hoe het staat bij jouw project?', riskReducer: 'Stalen binnen twee werkdagen in huis', primaryCta: 'Vraag stalen aan' },
} as LandingPageVariantContent;

async function asyncChecks(): Promise<void> {
  let callbackInvoked = false;
  const rewriteResult = await runVariantTellRewriteIfNeeded(cleanVariant, async () => {
    callbackInvoked = true;
    return JSON.stringify(cleanVariant);
  });
  assert('schone variant: geen rewrite-call (detector-gate)', !callbackInvoked && !rewriteResult.rewritten,
    rewriteResult.decisionReason);

  const dedupe = dedupeVocabularyAgainstAvoid(['Exclusief', 'vlekkeloos', 'Luxe'], ['exclusief'], ['luxe', 'goedkoop']);
  assert('dedupe verwijdert case-insensitief uit do-lijst', dedupe.cleanedDo.length === 1 && dedupe.cleanedDo[0] === 'vlekkeloos');
  assert('dedupe rapporteert verwijderde termen', dedupe.removed.length === 2);
}

asyncChecks().then(() => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
