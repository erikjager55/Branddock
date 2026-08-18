/**
 * Smoke-test voor de context-selectie in de SEO-pipeline
 * (tasks/seo-pipeline-speedup.md — Fase 3, structureel).
 *
 * Dekt: `buildStepContext` (selectie, volgorde, formaat-pariteit met
 * `accumulatedContext`, ontbrekende stappen, lege selectie), de researchselectie
 * voor variant B, en de stap-8-override die de achterhaalde stap-6-draft weert.
 *
 * Dekking per sectie, expliciet — want een test die meer belooft dan hij waarmaakt
 * is precies de faalvorm die deze taak repareert:
 *   1-3  gedrag van `buildStepContext` (selectie, volgorde, randgevallen)
 *   4    de oude tail-slice, nagespeeld op mediane blokgroottes uit echte runs.
 *        Dit is een reconstructie ter documentatie: hij kan NIET omvallen door een
 *        wijziging in `src/`.
 *   5    de stap-8-override
 *   6    de variant-B-prompt, gebouwd met exact de functies die `runSeoPipeline`
 *        aanroept — een teruggedraaide selectie wordt hier rood
 *   7    de contextkeuze per stap (`resolveStepContext`, exact wat de pipeline
 *        aanroept) plus een tripwire op het letterlijke tail-slice-patroon
 *
 * Deze suite draait volledig op pure functies en dekt dus NIET dat `runSeoPipeline`
 * ze ook echt aanroept. Dat doet `seo-pipeline-wiring.ts`: die draait de échte
 * pipeline met een onderschepte fetch en inspecteert de prompts die eruit komen.
 * Samen sluiten ze het gat dat een adversariële review vond (11 van 21 mutaties in
 * `seo-pipeline.ts` kwamen langs deze suite alleen).
 *
 * Blokgroottes: medianen over alle 31 herspeelbare runs, stap-8-snapshots
 * 2026-05-24 t/m 2026-06-12. Reproduceerbaar met `npm run fidelity:variant-b -- blocks`.
 *
 * Run: npx tsx scripts/smoke-tests/seo-context-selection.ts
 * Geen DB en geen API-keys nodig — pure functies.
 */

import { readFileSync } from 'node:fs';
import type { ResearchContext } from '../../src/lib/ai/seo-pipeline-utils';
import {
  buildStepContext,
  buildVariantBResearchContext,
  buildVariantBUserPrompt,
  renderStepBlock,
  resolveStepContext,
  RESEARCH_STEPS,
  STEP_CONTEXT_OVERRIDES,
} from '../../src/lib/ai/seo-pipeline-utils';
import { SEO_STEP_DEFINITIONS } from '../../src/lib/ai/seo-pipeline.types';

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

/**
 * Mediane blokgroottes over alle 31 herspeelbare runs in het AICallSnapshot-archief
 * (stap-8-snapshots 2026-05-24 t/m 2026-06-12); reproduceerbaar met
 * `npm run fidelity:variant-b -- blocks`.
 *
 * Waar het om draait: de prose-staart (stap 6 + 7, samen 29.953) is groter dan de
 * oude slice van 20.000, dus het venster begon altijd binnen stap 6 of 7 en
 * bereikte stap 5 nooit. NIET "stap 7 is in zijn eentje groter dan de slice" —
 * stap 7 haalt de 20.000 in geen enkele gemeten run (max 19.532).
 */
const MEASURED_CHARS: Record<number, number> = {
  1: 2631,
  2: 3194,
  3: 5897,
  4: 4309,
  5: 9414,
  6: 14549,
  7: 15404,
};

/** De tail-slice zoals hij vóór de fix in de variant-B-generator stond. */
const OLD_SLICE_CHARS = 20000;

/**
 * Herkenbare vulling per stap, zodat een assert kan zien wát er in de context zit.
 * `MEASURED_CHARS` zijn BLOKgroottes (kop + body + `\n---`), zoals de `blocks`-fase
 * ze rapporteert — dus de body wordt hier met de wrapper-overhead gecorrigeerd,
 * anders is elk blok ~29 tekens te groot en betekent de fixture iets anders dan
 * zijn bron.
 */
function blockText(step: number): string {
  const size = MEASURED_CHARS[step];
  if (size === undefined) throw new Error(`geen gemeten blokgrootte voor stap ${step}`);
  const marker = `<<STEP-${step}-BODY>>`;
  const wrapper = renderStepBlock(step, '').length;
  return `${marker}${'x'.repeat(Math.max(0, size - wrapper - marker.length * 2))}${marker}`;
}

function outputsUpTo(lastStep: number): { step: number; name: string; rawText: string }[] {
  return SEO_STEP_DEFINITIONS.filter((d) => d.step <= lastStep).map((d) => ({
    step: d.step,
    name: d.name,
    rawText: blockText(d.step),
  }));
}

/**
 * Bouwt `accumulatedContext` op zoals de pipeline dat doet — via dezelfde
 * `renderStepBlock` die `runSeoPipeline` gebruikt. Bewust GEEN eigen kopie van
 * het formaat: een tweede definitie kan uit de eerste weglopen zonder dat één
 * test rood wordt, en dat is precies de faalvorm die deze taak repareert.
 */
function accumulate(outputs: { step: number; rawText: string }[]): string {
  return outputs.map((o) => renderStepBlock(o.step, o.rawText)).join('');
}

function hasStep(ctx: string, step: number): boolean {
  return ctx.includes(`<<STEP-${step}-BODY>>`);
}

// ── 1. Formaat-pariteit met accumulatedContext ────────────────
console.log('\n1. Formaat-pariteit');
{
  const outputs = outputsUpTo(7);
  const all = buildStepContext(outputs, [1, 2, 3, 4, 5, 6, 7]);
  // N.b. dit is per constructie waar (beide lopen via `renderStepBlock`) en dus
  // geen regressiebewaking — het pint vast dát ze één bron delen. Dat de pipeline
  // diezelfde bron gebruikt, checkt sectie 7.
  assert(
    'volledige selectie == accumulatie: één gedeelde renderer, geen tweede formaat',
    all === accumulate(outputs),
  );
  assert('begint met de blok-separator, niet midden in een zin', all.startsWith('\n\n## Step 1: '));
  assert('gebruikt het echte label uit SEO_STEP_DEFINITIONS', all.includes('## Step 5: Outline & Internal Links'));
}

// ── 2. Selectie + volgorde ───────────────────────────────────
console.log('\n2. Selectie en volgorde');
{
  const outputs = outputsUpTo(7);
  const research = buildStepContext(outputs, RESEARCH_STEPS);
  assert('bevat alle vijf researchstappen', [1, 2, 3, 4, 5].every((s) => hasStep(research, s)));
  assert('bevat GEEN prose-stappen (6 draft, 7 editorial)', !hasStep(research, 6) && !hasStep(research, 7));

  // Waves leveren niet-deterministisch aan (2 en 3 draaien parallel) — de
  // context moet toch altijd oplopend zijn, anders verschilt de prompt per run.
  const shuffled = [...outputs].reverse();
  assert('oplopend op stapnummer, ongeacht de volgorde in outputs', buildStepContext(shuffled, RESEARCH_STEPS) === research);

  const idx = (s: number) => research.indexOf(`## Step ${s}:`);
  assert('blokken staan oplopend: stap 1 vóór 2 vóór 5', idx(1) < idx(2) && idx(2) < idx(5));
}

// ── 3. Randgevallen ──────────────────────────────────────────
console.log('\n3. Randgevallen');
{
  assert('lege outputs → lege string', buildStepContext([], RESEARCH_STEPS) === '');
  assert('lege selectie → lege string', buildStepContext(outputsUpTo(7), []) === '');

  // Resume-pad: een gevraagde stap zit nog niet in de state. Overslaan, niet gooien.
  const partial = outputsUpTo(3);
  const ctx = buildStepContext(partial, RESEARCH_STEPS);
  assert('ontbrekende stappen worden overgeslagen (deelverzameling mag)', hasStep(ctx, 3) && !hasStep(ctx, 4));
  assert('géén lege kop voor een ontbrekende stap', !ctx.includes('## Step 4:'));

  const unknown = buildStepContext([{ step: 99, rawText: 'toekomstige stap' }], [99]);
  assert('onbekend stapnummer valt terug op een generiek label', unknown.includes('## Step 99: Step 99'));
}

// ── 4. Regressie: de oude tail-slice ─────────────────────────
console.log('\n4. Reconstructie — de tail-slice die variant B nul research gaf (documentatie, geen regressiebewaking)');
{
  const outputs = outputsUpTo(7);
  const acc = accumulate(outputs);

  // Zoals het wás.
  const oldWay = acc.slice(-OLD_SLICE_CHARS);
  // Het mechanisme, exact: niet stap 7 alleen, maar de prose-staart samen.
  assert(
    'stap 7 alléén haalt de slice-grens NIET (dus dat was niet het mechanisme)',
    MEASURED_CHARS[7] < OLD_SLICE_CHARS,
    `stap 7 = ${MEASURED_CHARS[7]} tekens`,
  );
  assert(
    'stap 6 + 7 samen vullen het venster wél volledig',
    MEASURED_CHARS[6] + MEASURED_CHARS[7] > OLD_SLICE_CHARS,
    `6+7 = ${MEASURED_CHARS[6] + MEASURED_CHARS[7]} tekens`,
  );
  assert('OUD: geen enkele researchstap kwam door', [1, 2, 3, 4, 5].every((s) => !hasStep(oldWay, s)));
  assert('OUD: alleen prose (stap 6 en/of 7)', hasStep(oldWay, 7) && hasStep(oldWay, 6));
  assert('OUD: begon midden in een blok, niet op een kop', !oldWay.startsWith('\n\n## Step'));

  // Zoals het nu is.
  const newWay = buildStepContext(outputs, RESEARCH_STEPS);
  assert('NIEUW: alle vijf researchstappen komen door', [1, 2, 3, 4, 5].every((s) => hasStep(newWay, s)));
  assert('NIEUW: het artikel zit er niet meer dubbel in', !hasStep(newWay, 6) && !hasStep(newWay, 7));

  const researchChars = [1, 2, 3, 4, 5].reduce((n, s) => n + MEASURED_CHARS[s], 0);
  console.log(`     → oud: ${oldWay.length} tekens prose, 0 research`);
  console.log(`     → nieuw: ${newWay.length} tekens, waarvan ${researchChars} research`);
}

// ── 5. Stap-8-override ───────────────────────────────────────
console.log('\n5. Stap 8 — achterhaalde draft eruit');
{
  const override = STEP_CONTEXT_OVERRIDES[8];
  assert('stap 8 heeft een expliciete context-override', Array.isArray(override) && override.length > 0);
  if (!override) throw new Error('stap-8-override ontbreekt — rest van sectie 5 is zinloos');

  const ctx = buildStepContext(outputsUpTo(7), override);
  assert('stap 8 krijgt de definitieve prose uit stap 7', hasStep(ctx, 7));
  assert('stap 8 krijgt NIET de achterhaalde stap-6-draft', !hasStep(ctx, 6));
  assert('stap 8 houdt de research (keywords/outline voor meta + schema)', [1, 2, 3, 4, 5].every((s) => hasStep(ctx, s)));

  const full = accumulate(outputsUpTo(7));
  // Nu `blockText` de wrapper-overhead compenseert is een blok exact zo groot als
  // de gemeten waarde — dus geen losse correctieterm meer in de assertie.
  assert(
    'de override scheelt precies het stap-6-blok',
    full.length - ctx.length === MEASURED_CHARS[6],
    `verschil = ${full.length - ctx.length}, verwacht ${MEASURED_CHARS[6]}`,
  );

  // Stappen zonder override moeten ongewijzigd alles krijgen — de kernbelofte is
  // "stap 1 t/m 7 gedragen zich als voorheen", dus check ze alle zeven.
  assert(
    'stap 1 t/m 7 hebben géén override en houden de volledige context',
    [1, 2, 3, 4, 5, 6, 7].every((s) => STEP_CONTEXT_OVERRIDES[s] === undefined),
  );
  assert('stap 8 is de enige uitzondering', Object.keys(STEP_CONTEXT_OVERRIDES).length === 1);
}

// ── 6. De variant-B-prompt zelf ──────────────────────────────
console.log('\n6. Variant-B-prompt — de kop belooft research, dus assert dat die er staat');
{
  const outputs = outputsUpTo(7);
  const article = '# De definitieve pagina\n\nDit is variant A, al volledig geschreven.';
  const prompt = buildVariantBUserPrompt({ originalContent: article, researchContext: buildVariantBResearchContext(outputs) });

  assert('de prompt bevat het artikel als ORIGINAL PAGE', prompt.includes('## ORIGINAL PAGE (Variant A)') && prompt.includes(article));
  assert('de research-kop staat er', prompt.includes('## SEO RESEARCH CONTEXT'));
  // De regel uit de gotcha: een kop die research belooft, moet research bevatten.
  assert('en onder die kop staat ook écht alle research', [1, 2, 3, 4, 5].every((s) => hasStep(prompt, s)));
  assert('het artikel staat er niet nóg een keer via de research', !hasStep(prompt, 6) && !hasStep(prompt, 7));

  // De verwisseling die een review langs de vorige suite kreeg: artikel en
  // research in elkaars veld. Type-technisch legaal (beide `string`), dus de
  // invariant moet het vangen.
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => void warnings.push(args.map(String).join(' '));
  buildVariantBUserPrompt({ originalContent: buildVariantBResearchContext(outputs), researchContext: article as ResearchContext });
  console.warn = originalWarn;
  assert('verwisselde velden geven een waarschuwing', warnings.some((w) => w.includes('researchContext')));

  // De moeilijke case: een how-to-artikel dat zélf "## Step N:"-koppen draagt.
  // Daar faalde de eerste versie van de invariant op, en juist bij zulke content
  // is een verwisseling het schadelijkst.
  const howTo = '# Zo leg je een vloer\n\n## Step 1: selecting FSC Accoya\n\nKies hout.\n\n## Step 2: charring\n\nBranden maar.';
  const howToWarnings: string[] = [];
  console.warn = (...args: unknown[]) => void howToWarnings.push(args.map(String).join(' '));
  buildVariantBUserPrompt({ originalContent: article, researchContext: howTo as ResearchContext });
  console.warn = originalWarn;
  assert('een how-to-artikel in het researchveld wordt óók betrapt', howToWarnings.length > 0);

  const quiet: string[] = [];
  console.warn = (...args: unknown[]) => void quiet.push(args.map(String).join(' '));
  buildVariantBUserPrompt({ originalContent: article, researchContext: buildVariantBResearchContext(outputs) });
  console.warn = originalWarn;
  assert('correcte velden geven GEEN waarschuwing', quiet.length === 0);

  // Zonder research geen loze kop.
  const bare = buildVariantBUserPrompt({ originalContent: article, researchContext: '' as ResearchContext });
  assert('lege research → geen research-kop', !bare.includes('## SEO RESEARCH CONTEXT'));
  assert('lege research → artikel + instructie blijven intact', bare.includes(article) && bare.includes('Variant B'));
}

// ── 7. Bedrading ─────────────────────────────────────────────
// Twee bugklassen die een review langs de vorige versie van deze suite kreeg —
// artikel en research verwisselen, en stap 8 zijn stap-7-prose afpakken — zijn
// inmiddels type-onmogelijk gemaakt (benoemde velden i.p.v. uitwisselbare
// strings; `resolveStepContext` i.p.v. een stappenlijst aan de aanroepzijde).
// Wat hier resteert is bewust smal: een gedragstest op de contextkeuze, plus één
// tripwire op het letterlijke patroon dat de oorspronkelijke bug vormde.
console.log('\n7. Bedrading — contextkeuze en de oude tail-slice');
{
  const outputs = outputsUpTo(7);

  // Gedrag, niet grep: dit is exact wat de pipeline per stap aanroept.
  const forStep8 = resolveStepContext(8, outputs, accumulate(outputs));
  assert('stap 8 houdt de definitieve prose uit stap 7', hasStep(forStep8, 7));
  assert('stap 8 verliest de achterhaalde stap-6-draft', !hasStep(forStep8, 6));
  assert('stap 8 houdt de research', [1, 2, 3, 4, 5].every((n) => hasStep(forStep8, n)));

  const full = accumulate(outputs);
  assert(
    'stap 1 t/m 7 krijgen onveranderd de volledige accumulatie',
    [1, 2, 3, 4, 5, 6, 7].every((step) => resolveStepContext(step, outputs, full) === full),
  );

  // Tripwire op de oorspronkelijke fout. Bewust bescheiden: dit vangt het
  // letterlijke patroon, niet elke denkbare positie-gebaseerde truncatie —
  // `.substring(len - n)` glipt er bijvoorbeeld langs. Het gedrag hierboven is
  // de eigenlijke bewaking; dit is de goedkope extra rem.
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const file of ['seo-pipeline.ts', 'seo-pipeline-utils.ts']) {
    const code = stripComments(readFileSync(new URL(`../../src/lib/ai/${file}`, import.meta.url), 'utf8'));
    assert(`geen negatieve slice op context in ${file}`, !/\.slice\(\s*-/.test(code));
  }
}

console.log(`\n${'='.repeat(56)}`);
console.log(`TOTAAL: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
