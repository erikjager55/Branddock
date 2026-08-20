// =============================================================
// Smoke: BrandAsset → sectie-samenvatting (resolver)
//
// Bewaakt het gat waar `brandmd-emitter.ts` structureel langs kijkt: die
// smoke start bij een fixture-DesignSystemModel, dus mét samenvattingen.
// Het samenvátten zelf — summarizeBrandAsset — had daardoor geen enkele
// bewaker, en dat kostte 79 stil lege secties over 11 productie-merken.
//
// De payloads hieronder dragen de ECHTE sleutelnamen zoals gemeten op
// productie 2026-08-20 (Neon, 13 workspaces met frameworkData).
//
// Run: npx tsx scripts/smoke-tests/brand-asset-summary.ts
// =============================================================

import { summarizeBrandAsset, NARRATIVE_SUMMARY_KEYS } from '../../src/lib/export/design-system/resolver';

let failed = 0;
function assert(label: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  OK   ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

const T = 'x'.repeat(60); // narratieve tekst, ruim boven elke lengtedrempel

/** Sleutelnamen per asset-type, gemeten op productie. */
const PROD_SHAPES: Array<{ slug: string; framework: Record<string, unknown>; moetVullen: boolean }> = [
  // Werkten al vóór de fix — mogen niet regresseren.
  { slug: 'purpose-statement', framework: { statement: T }, moetVullen: true },
  { slug: 'golden-circle', framework: { why: T, how: T }, moetVullen: true },
  { slug: 'brand-promise', framework: { promiseStatement: T }, moetVullen: true },
  // Waren stil leeg — 79 gevallen op prod.
  { slug: 'brand-essence', framework: { essenceStatement: T, essenceNarrative: T }, moetVullen: true },
  { slug: 'mission-statement', framework: { missionStatement: T, visionStatement: T }, moetVullen: true },
  { slug: 'brand-archetype', framework: { archetypeInAction: T, coreDesire: T }, moetVullen: true },
  { slug: 'brand-story', framework: { elevatorPitch: T, originStory: T }, moetVullen: true },
  { slug: 'transformative-goals', framework: { massiveTransformativePurpose: T }, moetVullen: true },
  { slug: 'social-relevancy', framework: { impactStatement: T, impactNarrative: T }, moetVullen: true },
  { slug: 'brand-personality', framework: { brandVoiceDescription: T, writingSample: T }, moetVullen: true },
  // BEWUST leeg: valueTension beschrijft de spanning tussen waarden, niet de
  // waarden zelf. Leeg is hier eerlijker dan misleidend.
  { slug: 'core-values', framework: { valueTension: T }, moetVullen: false },
];

console.log('1. Elke asset-vorm uit productie levert (of levert bewust geen) samenvatting');
for (const { slug, framework, moetVullen } of PROD_SHAPES) {
  const out = summarizeBrandAsset('framework-uitlegtekst uit de seed', null, framework);
  assert(
    `${slug} -> ${moetVullen ? 'gevuld' : 'bewust leeg'}`,
    moetVullen ? out.length > 0 : out.length === 0,
    `kreeg ${JSON.stringify(out.slice(0, 40))}`,
  );
}

console.log('\n2. `description` lekt nooit als sectie-inhoud (eerlijkheidsregel full-profile)');
const seedUitleg = 'The reason your organization exists beyond profit';
assert(
  'leeg framework + alleen description -> leeg',
  summarizeBrandAsset(seedUitleg, null, null) === '',
);

console.log('\n3. Voorkeursvolgorde: type-specifieke sleutel wint van generieke');
assert(
  'brand-archetype kiest archetypeInAction, niet brandVoiceDescription',
  summarizeBrandAsset('', null, { brandVoiceDescription: 'STEM', archetypeInAction: 'ARCHETYPE' }) === 'ARCHETYPE',
);
// Bij 11 van de 12 prod-merken is essenceStatement een label van 13-26 tekens
// en essenceNarrative 191-311 tekens echte positionering. Narrative wint.
assert(
  'brand-essence kiest essenceNarrative, niet het korte essenceStatement',
  summarizeBrandAsset('', null, { essenceStatement: 'Bewijsbaar on-brand', essenceNarrative: 'NARRATIVE' }) === 'NARRATIVE',
);
assert(
  'zonder narrative valt hij terug op het statement',
  summarizeBrandAsset('', null, { essenceStatement: 'ALLEEN_STATEMENT' }) === 'ALLEEN_STATEMENT',
);
assert(
  'content wint van frameworkData',
  summarizeBrandAsset('', 'UIT_CONTENT', { essenceStatement: 'UIT_FRAMEWORK' }) === 'UIT_CONTENT',
);

console.log('\n4. MUTATIETEST — met de oude 5-sleutel-lijst moet dit rood staan');
const OUD = ['statement', 'promiseStatement', 'coreMessage', 'essence', 'why'];
const stilLeegOnderOud = PROD_SHAPES.filter(
  (p) => p.moetVullen && !Object.keys(p.framework).some((k) => OUD.includes(k)),
);
assert(
  `de oude lijst liet ${stilLeegOnderOud.length} typen stil leeg (verwacht 7)`,
  stilLeegOnderOud.length === 7,
  stilLeegOnderOud.map((p) => p.slug).join(', '),
);
assert(
  'de nieuwe lijst dekt al die typen',
  stilLeegOnderOud.every((p) => Object.keys(p.framework).some((k) => (NARRATIVE_SUMMARY_KEYS as readonly string[]).includes(k))),
);

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${PROD_SHAPES.length + 7} checks, ${failed} gefaald`);
process.exit(failed === 0 ? 0 : 1);
