/**
 * Smoke-test — GEO/SEO Fase 3: meet-haak buildGeoOptimizationAnalysis. Verifieert
 * dat de analyse de GEO-score + signalen + findings, de daadwerkelijk geëmitte
 * schema.org-types (uit de échte JSON-LD-builder) en de canonical URL bevat, met
 * een deterministische measuredAt. Pure functie — geen DB/AI.
 *
 * Run: npx tsx scripts/smoke-tests/geo-analysis.ts
 */
import { buildGeoOptimizationAnalysis } from '../../src/lib/landing-pages/geo-analysis';

let pass = 0,
  fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
    fail++;
  }
}

const variant = {
  geoArticle: true as const,
  hero: { headline: 'Wat is GEO?', subline: 'Generative Engine Optimization uitgelegd.' },
  answerFirstIntro: 'GEO optimaliseert content zodat AI-engines die zelfstandig citeren.',
  tldr: ['GEO = citeerbaarheid voor AI', 'Vult SEO aan'],
  sections: [
    { heading: 'Inleiding', body: 'Volgens Gartner groeit AI-zoekgebruik met 40% in 2026. Dat raakt B2B direct.' },
    { heading: 'Hoe werkt het', body: 'Schrijf answer-first. Houd brokken kort.' },
  ],
  qa: [
    { question: 'Wat is GEO?', answer: 'Generative Engine Optimization.' },
    { question: 'Anders dan SEO?', answer: 'Ja, GEO mikt op AI-citaties.' },
  ],
  citeableStats: [{ label: 'AI-zoekgroei', value: '+40%', source: 'Gartner 2026' }],
  definitions: [{ term: 'GEO', definition: 'Generative Engine Optimization' }],
  finalCta: { heading: 'Aan de slag', ctaLabel: 'Start' },
};

const now = new Date('2026-06-19T12:00:00.000Z');
const a = buildGeoOptimizationAnalysis({
  variant,
  canonicalUrl: 'https://acme.branddock.app/wat-is-geo',
  now,
});

console.log('── buildGeoOptimizationAnalysis ──');
assert('geoScore 0-100', typeof a.geoScore === 'number' && a.geoScore >= 0 && a.geoScore <= 100);
assert('5 signalen', Object.keys(a.signals).length === 5);
assert('findings is array', Array.isArray(a.findings));
assert('schemaTypes bevat BlogPosting', a.schemaTypes.includes('BlogPosting'));
assert('schemaTypes bevat FAQPage (uit qa)', a.schemaTypes.includes('FAQPage'));
assert('schemaTypes bevat DefinedTermSet (uit definities)', a.schemaTypes.includes('DefinedTermSet'));
assert('canonicalUrl bewaard', a.canonicalUrl === 'https://acme.branddock.app/wat-is-geo');
assert('measuredAt = ingegeven now (deterministisch)', a.measuredAt === '2026-06-19T12:00:00.000Z');

console.log('\n── deterministisch ──');
const b = buildGeoOptimizationAnalysis({ variant, canonicalUrl: 'https://acme.branddock.app/wat-is-geo', now });
assert('zelfde input → zelfde score', b.geoScore === a.geoScore);

console.log('\n── review-fix: answerFirst meet answerFirstIntro, niet de korte headline ──');
// Een LANGE, omslachtige intro moet answerFirst omlaag drukken; meten we per ongeluk
// de korte hero.headline (≤80 tekens) dan zou answerFirst altijd ~100 zijn.
const longIntro = Array.from({ length: 9 }, () =>
  'we nemen ruim de tijd om allerlei aspecten uitvoerig te kaderen voordat we de kern raken',
).join(', ') + '.';
const wordyVariant = buildGeoOptimizationAnalysis({
  variant: { ...variant, answerFirstIntro: longIntro },
  canonicalUrl: 'https://acme.branddock.app/x',
  now,
});
assert(
  'lange intro → lager answerFirst-signaal (meet de intro, niet de korte headline)',
  wordyVariant.signals.answerFirst < a.signals.answerFirst,
  `wordy=${wordyVariant.signals.answerFirst} good=${a.signals.answerFirst}`,
);
assert(
  'lange intro → lagere geoScore dan bondige intro',
  wordyVariant.geoScore < a.geoScore,
  `wordy=${wordyVariant.geoScore} good=${a.geoScore}`,
);
assert(
  'omslachtige intro (>55 woorden) triggert de answer-first finding',
  wordyVariant.findings.some((f) => f.toLowerCase().includes('answer-first')),
);

console.log('\n── variant zonder definities → geen DefinedTermSet ──');
const noDefs = buildGeoOptimizationAnalysis({
  variant: { ...variant, definitions: undefined },
  canonicalUrl: 'https://acme.branddock.app/x',
  now,
});
assert('geen DefinedTermSet zonder definities', !noDefs.schemaTypes.includes('DefinedTermSet'));
assert('nog steeds BlogPosting + FAQPage', noDefs.schemaTypes.includes('BlogPosting') && noDefs.schemaTypes.includes('FAQPage'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
