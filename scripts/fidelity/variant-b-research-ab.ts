// =============================================================
// Variant-B research-context A/B — gepaard, op herspeelde échte runs.
//
// Vraag: variant B kreeg via `accumulatedContext.slice(-20000)` uitsluitend prose
// en nul research, terwijl zijn prompt vraagt om "preserve all SEO elements from
// this research". De prose-staart (stap 6 + 7, mediaan-som 29.953 tekens) vult het
// venster van 20.000 volledig, dus de research werd nooit bereikt.
// (mediaan-som gemeten met de `blocks`-fase van dit script.)
// Levert de échte research een betere variant B op — en blijft hij genoeg
// vérschillen van variant A, wat zijn hele bestaansreden is?
//
// Waarom herspelen i.p.v. volledige pipelines draaien: de stap-8-prompts in het
// AICallSnapshot-archief bevatten de volledige ruwe outputs van stap 1-7 van een
// echte run, zodat beide armen één variant-B-call kosten in plaats van twee
// pipelines van 7,5 minuut. De armen delen gegarandeerd hetzelfde artikel en
// dezelfde research — een zuiverder gepaarde vergelijking dan twee losse runs.
// ⚠️ "Exact" is het niet: `originalContent` komt uit de gearchiveerde variant-B-
// prompt van een pre-Fase-4a-pipeline en wijkt bij de meeste cases ~100-300 tekens
// af van `step7.revisedContent`. Voor de gepaarde vergelijking maakt dat niets uit
// (beide armen krijgen hetzelfde artikel), voor absolute uitspraken over één run wel.
//
// Beide armen roepen de ECHTE `generateAlternativeVariant` aan (geen kopie van
// de promptopbouw), zodat de meting kapotgaat als de generator verandert.
//
// Draaien: `npm run fidelity:variant-b -- <fase>` (laadt .env.local; een kale
// `npx tsx` faalt op DATABASE_URL).
//   list | blocks | calibrate  → read-only, gratis
//   step8 [n]                  → meet de stap-8-override, BETAALD (2 calls/case)
//   run [n]                    → 2 generaties + 2 scorings per case, BETAALD
// Env: ANTHROPIC_API_KEY (generatie) + OPENAI_API_KEY (cross-family judge).
// Lokale DB — geen prod-toegang nodig.
// =============================================================

import fs from 'node:fs';
import { prisma } from '@/lib/prisma';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { runFidelityScoring } from '@/lib/brand-fidelity/fidelity-runner';
import { generateAlternativeVariant, runStructuredStep } from '@/lib/ai/seo-pipeline';
import type { ResearchContext } from '@/lib/ai/seo-pipeline-utils';
import {
  buildStepContext,
  renderStepBlock,
  RESEARCH_STEPS,
  STEP_CONTEXT_OVERRIDES,
} from '@/lib/ai/seo-pipeline-utils';
import { SEO_STEP_DEFINITIONS, type PublicationPrep } from '@/lib/ai/seo-pipeline.types';

const OUT_DIR = process.env.AB_OUT_DIR ?? '/tmp';
const STEP8_SRC = 'src/lib/ai/seo-pipeline.ts:runStructuredStep:8';
const VARIANTB_SRC = 'src/lib/ai/seo-pipeline.ts:generateAlternativeVariant';

/** Laatste vaste regel van de variant-B-systemprompt; alles erná is de voiceDirective. */
const SYSTEM_TAIL = 'Do NOT generate a table of contents with anchor links. Do NOT use --- horizontal rules.\n';

interface StepOutput {
  step: number;
  rawText: string;
}

interface Arm {
  label: string;
  contextChars: number;
  chars: number;
  composite: number | null;
  thresholdMet: boolean | null;
  pillars: { style?: number; judge?: number; rules?: number };
  overlapWithA: number;
}

interface ArmResult {
  workspace: string;
  contentType: string;
  deliverableId: string;
  before: Arm;
  after: Arm;
}

interface Case {
  deliverableId: string;
  workspaceId: string;
  workspaceName: string;
  contentType: string | null;
  outputs: StepOutput[];
  originalContent: string;
  voiceDirective: string;
  primaryKeyword: string;
}

/**
 * Splitst de accumulatedContext uit een stap-8-prompt terug in per-stap blokken.
 *
 * Let op: stap 6 levert ruwe markdown (mét eigen `## `-koppen), dus splitsen kan
 * alleen op de exacte `## Step <n>: <label>`-kop met een bekend stapnummer én
 * label. Een oplopende-volgorde-check vangt af dat een artikelkop toevallig het
 * patroon raakt; bij twijfel wordt de case overgeslagen i.p.v. half geparsed.
 *
 * ⚠️ Het laatste blok eindigt NIET aan het eind van de prompt: `accumulatedBlock()`
 * sluit de research af met een eigen `\n---\n`, waarna de voiceDirective en de
 * stap-8-instructies volgen. Zonder die grens slokte stap 7 die staart op —
 * 6.615 tot 9.694 tekens over het archief — en die vervuiling belandde via de
 * tail-slice uitsluitend in de OUD-arm, wat de A/B asymmetrisch scheeftrok.
 */
function parseSteps(step8Prompt: string): StepOutput[] {
  const headers: { step: number; start: number; end: number }[] = [];
  for (const def of SEO_STEP_DEFINITIONS) {
    const needle = `\n## Step ${def.step}: ${def.label}\n`;
    const idx = step8Prompt.indexOf(needle);
    if (idx !== -1) headers.push({ step: def.step, start: idx, end: idx + needle.length });
  }
  headers.sort((a, b) => a.start - b.start);
  if (headers.some((h, i) => i > 0 && h.step <= headers[i - 1].step)) return [];

  // Sluitmarkering van accumulatedBlock: het `\n---` van het laatste stapblok,
  // direct gevolgd door het `\n---\n` waarmee de wrapper afsluit.
  const terminator = step8Prompt.indexOf('\n---\n---\n', headers[headers.length - 1]?.end ?? 0);
  if (terminator === -1) return [];

  return headers.map((h, i) => {
    const stop = i + 1 < headers.length ? headers[i + 1].start : terminator;
    return { step: h.step, rawText: step8Prompt.slice(h.end, stop).replace(/\n---\s*$/, '') };
  });
}

function accumulateAll(outputs: StepOutput[]): string {
  return buildStepContext(outputs, outputs.map((o) => o.step));
}

/** De tail-slice zoals hij vóór de fix in de variant-B-generator stond. */
const OLD_SLICE_CHARS = 20000;

/**
 * Hoeveel van de vijf researchstappen overleefden de oude tail-slice?
 *
 * Positioneel bepaald, niet via `includes('## Step N:')`. Die substring-variant
 * was fout: artikelen bevatten zélf koppen als "## Step 1: selecting FSC Accoya".
 * Met de parser die destijds draaide rapporteerde precies één Zwarthout-case
 * "3/5 overlevers" — goed voor het gepubliceerde 28/29 en gemiddeld 0,10 — terwijl
 * de prose-staart (stap 6 + 7) het venster van 20.000 volledig vulde en er dus geen
 * research in kán liggen. (Met de inmiddels gerepareerde parser plus dezelfde
 * substring-telling zouden het er twee zijn; die combinatie is nooit gepubliceerd.)
 * Dezelfde klasse fout als de bug die deze taak repareert — de smoke-test doet het
 * wél goed, met unieke markers.
 */
function researchStepsSurvivingTailSlice(outputs: StepOutput[]): number {
  const ordered = [...outputs].sort((a, b) => a.step - b.step);
  const total = accumulateAll(ordered).length;
  const windowStart = Math.max(0, total - OLD_SLICE_CHARS);
  let offset = 0;
  let kept = 0;
  for (const o of ordered) {
    const blockEnd = offset + renderStepBlock(o.step, o.rawText).length;
    // Telt alleen als er ook echt iets van dit blok binnen het venster valt.
    if (o.step <= 5 && blockEnd > windowStart) kept++;
    offset = blockEnd;
  }
  return kept;
}

async function loadCases(): Promise<Case[]> {
  const rows = await prisma.$queryRaw<
    { deliverableId: string; workspaceId: string; src: string; content: string }[]
  >`
    SELECT t."parentEntityId" AS "deliverableId",
           s."workspaceId"    AS "workspaceId",
           s."sourceIdentifier" AS src,
           msg->>'content'    AS content
    FROM "AICallTrace" t
    JOIN "AICallSnapshot" s ON s.id = t."aiCallSnapshotId"
    CROSS JOIN LATERAL jsonb_array_elements(s.payload->'messages') AS msg
    WHERE s."sourceIdentifier" IN (${STEP8_SRC}, ${VARIANTB_SRC})
    ORDER BY s."createdAt" ASC
  `;

  const byDeliverable = new Map<string, { workspaceId: string; step8?: string; vbUser?: string; vbSystem?: string }>();
  for (const r of rows) {
    const entry = byDeliverable.get(r.deliverableId) ?? { workspaceId: r.workspaceId };
    if (r.src === STEP8_SRC && r.content.includes('## Step 7:')) entry.step8 = r.content;
    if (r.src === VARIANTB_SRC && r.content.startsWith('## ORIGINAL PAGE')) entry.vbUser = r.content;
    if (r.src === VARIANTB_SRC && r.content.includes(SYSTEM_TAIL)) entry.vbSystem = r.content;
    byDeliverable.set(r.deliverableId, entry);
  }

  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.workspaceId))] } },
    select: { id: true, name: true },
  });
  const workspaceNames = new Map(workspaces.map((w) => [w.id, w.name]));

  const cases: Case[] = [];
  let skippedPostFix = 0;
  let skippedUnparseable = 0;
  let skippedIncomplete = 0;
  let skippedShortArticle = 0;
  let skippedMissingSteps = 0;
  for (const [deliverableId, e] of byDeliverable) {
    if (!e.step8 || !e.vbUser || !e.vbSystem) {
      skippedIncomplete++;
      continue;
    }

    const outputs = parseSteps(e.step8);
    if (outputs.length === 0) {
      skippedUnparseable++;
      continue;
    }
    // Zonder de vijf researchstappen én stap 7 valt er niets te vergelijken.
    if (![1, 2, 3, 4, 5, 7].every((s) => outputs.some((o) => o.step === s && o.rawText.length > 200))) {
      skippedMissingSteps++;
      continue;
    }
    // ⚠️ Sinds de stap-8-override (18-08) zit stap 6 niet meer in de stap-8-prompt.
    // De OUD-arm reconstrueert de historische context uit precies die prompt, dus
    // op post-fix snapshots mist hij ~12-15K tekens en meet hij iets anders dan
    // hij beweert. Zulke cases horen niet stil mee te doen.
    if (!outputs.some((o) => o.step === 6 && o.rawText.length > 200)) {
      skippedPostFix++;
      continue;
    }

    const original = e.vbUser.split('\n\n## SEO RESEARCH CONTEXT')[0].replace(/^## ORIGINAL PAGE \(Variant A\)\n/, '');
    if (original.trim().length < 500) {
      skippedShortArticle++;
      continue;
    }

    cases.push({
      deliverableId,
      workspaceId: e.workspaceId,
      workspaceName: workspaceNames.get(e.workspaceId) ?? '?',
      // Wordt in de run-fase opgehaald; list/blocks/calibrate hebben hem niet nodig
      // en mogen niet stil krimpen omdat een deliverable ooit is verwijderd.
      contentType: null,
      outputs: outputs.filter((o) => o.step <= 7),
      originalContent: original,
      voiceDirective: e.vbSystem.split(SYSTEM_TAIL)[1] ?? '',
      // Uit het stap-2-blok; de stap-8-prompt gebruikt hem vandaag niet, maar een
      // lege stub zou stil fout meten zodra dat verandert.
      primaryKeyword: (outputs.find((o) => o.step === 2)?.rawText.match(/"primaryKeyword"\s*:\s*"([^"]+)"/)?.[1] ?? '').trim(),
    });
  }
  // Elke `continue` in een meetlus verdient een teller — die les komt uit precies
  // deze functie (gotchas.md 18-08): een ongetelde skip versmalt de steekproef stil.
  if (skippedIncomplete > 0) {
    console.warn(`⚠️  ${skippedIncomplete} kandidaat-run(s) overgeslagen: stap-8- of variant-B-prompt ontbreekt in het archief.`);
  }
  if (skippedMissingSteps > 0) {
    console.warn(`⚠️  ${skippedMissingSteps} run(s) overgeslagen: niet alle stappen 1-5 en 7 zitten met >200 tekens in de prompt.`);
  }
  if (skippedShortArticle > 0) {
    console.warn(`⚠️  ${skippedShortArticle} run(s) overgeslagen: het gearchiveerde artikel is korter dan 500 tekens.`);
  }
  if (skippedUnparseable > 0) {
    console.warn(`⚠️  ${skippedUnparseable} run(s) overgeslagen: de accumulatedContext was niet te parsen (sluitmarkering ontbreekt).`);
  }
  if (skippedPostFix > 0) {
    console.warn(
      `⚠️  ${skippedPostFix} run(s) overgeslagen: hun stap-8-prompt bevat geen stap-6-blok meer (post-fix snapshot). De OUD-arm is daar niet reconstrueerbaar.`,
    );
  }
  return cases;
}

/**
 * Round-robin over workspaces, zodat één merk de uitkomst niet draagt. Niet
 * sorteren-op-een-lege-teller: die eerste opzet was een no-op (de sort draait vóór
 * de lus die de teller vult) en leverde gewoon de eerste n cases in DB-volgorde.
 */
function spreadOverWorkspaces(cases: Case[], n: number): Case[] {
  const perWorkspace = new Map<string, Case[]>();
  for (const c of cases) perWorkspace.set(c.workspaceName, [...(perWorkspace.get(c.workspaceName) ?? []), c]);
  const picked: Case[] = [];
  for (let round = 0; picked.length < n; round++) {
    const before = picked.length;
    for (const list of perWorkspace.values()) {
      if (picked.length >= n) break;
      if (list[round]) picked.push(list[round]);
    }
    if (picked.length === before) break; // alle workspaces uitgeput
  }
  return picked;
}

/** Grove overlap-maat: aandeel woorden van B dat ook in A voorkomt. */
function overlapRatio(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []);
  const wordsB = b.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  if (wordsB.length === 0) return 0;
  return wordsB.filter((w) => setA.has(w)).length / wordsB.length;
}

async function main() {
  const phase = process.argv[2] ?? 'list';
  const cases = await loadCases();

  if (phase === 'list') {
    console.log(`${cases.length} herspeelbare cases:\n`);
    const survivors: number[] = [];
    for (const c of cases) {
      const research = buildStepContext(c.outputs, RESEARCH_STEPS).length;
      const step7 = c.outputs.find((o) => o.step === 7)?.rawText.length ?? 0;
      const kept = researchStepsSurvivingTailSlice(c.outputs);
      survivors.push(kept);
      console.log(
        `  ${c.workspaceName.padEnd(14)} artikel=${String(c.originalContent.length).padStart(6)}  research=${String(research).padStart(6)}  stap7=${String(step7).padStart(6)}  oude slice hield ${kept}/5 researchstappen`,
      );
    }
    if (survivors.length === 0) {
      console.log('\n→ geen herspeelbare runs in het archief.');
      return;
    }
    const zero = survivors.filter((k) => k === 0).length;
    console.log(`\n→ ${zero}/${survivors.length} cases kregen ONDER DE OUDE CODE nul researchstappen door.`);
    console.log(`→ gemiddeld ${(survivors.reduce((a, b) => a + b, 0) / survivors.length).toFixed(2)} van de 5 researchstappen overleefde de tail-slice.`);
    return;
  }

  if (phase === 'blocks') {
    // Blokgroottes als échte verdeling over alle herspeelbare runs — niet één run
    // gepresenteerd als aggregaat. De mediaan is leidend; de spreiding hoort erbij,
    // want per stap loopt die flink uiteen.
    console.log(`Blokgroottes in accumulatedContext over ${cases.length} runs (tekens):\n`);
    console.log('stap                          mediaan     min     max');
    // Op stapnummer sleutelen, niet op positie: een `continue` bij een ontbrekende
    // stap zou een positionele array laten verschuiven en research/prose verkeerd
    // splitsen — exact de aanname die deze taak uit de pipeline haalt.
    const medians = new Map<number, number>();
    for (const def of SEO_STEP_DEFINITIONS.filter((d) => d.step <= 7)) {
      const sizes = cases
        .map((c) => c.outputs.find((o) => o.step === def.step))
        .filter((o): o is StepOutput => o !== undefined)
        .map((o) => renderStepBlock(o.step, o.rawText).length)
        .sort((a, b) => a - b);
      if (sizes.length === 0) continue;
      const median = sizes[Math.floor(sizes.length / 2)];
      medians.set(def.step, median);
      console.log(
        `${`${def.step}. ${def.label}`.padEnd(30)}${String(median).padStart(7)}${String(sizes[0]).padStart(8)}${String(sizes[sizes.length - 1]).padStart(8)}`,
      );
    }
    const sumOf = (steps: readonly number[]) => steps.reduce((total, step) => total + (medians.get(step) ?? 0), 0);
    const research = sumOf(RESEARCH_STEPS);
    const prose = sumOf([6, 7]);
    console.log(`\n  research (stap 1-5), mediaan-som : ${research}`);
    console.log(`  prose    (stap 6-7), mediaan-som : ${prose}`);
    console.log(
      `\n  → de oude tail-slice van ${OLD_SLICE_CHARS} viel binnen de prose-staart (${prose}), dus vóór stap 5.`,
    );
    console.log('    Niet "stap 7 alleen al is groter dan de slice" — stap 6 én 7 samen vullen het venster.');
    return;
  }

  if (phase === 'step8') {
    // Sluit het gat dat drie reviewers aanwezen: de stap-8-override haalde de
    // achterhaalde stap-6-draft uit de prompt van een stap die PERSISTENT wegschrijft
    // (settings.seoChecklist + contentTypeInputs.metaDescription), en tot nu toe was
    // alleen de OMVANG van die wijziging gemeten, niet het effect op de output.
    // Zelfde herspeel-truc als de variant-B-A/B: beide armen dezelfde echte state,
    // alleen de contextselectie verschilt.
    const n = Number(process.argv[3] ?? 4);
    if (!Number.isInteger(n) || n < 1) {
      console.error(`Ongeldig aantal cases: "${process.argv[3]}".`);
      process.exitCode = 1;
      return;
    }
    const picked = spreadOverWorkspaces(cases, n);
    const step8Results: unknown[] = [];
    console.log(`\n${picked.length} cases × 2 armen = ${picked.length * 2} stap-8-calls.\n`);

    const parse = (raw: string): PublicationPrep['checklist'] | null => {
      try {
        return (JSON.parse(raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()) as PublicationPrep).checklist;
      } catch {
        return null;
      }
    };

    for (const [i, c] of picked.entries()) {
      console.log(`\n[${i + 1}/${picked.length}] ${c.workspaceName} (${c.deliverableId})`);
      const model = await resolveFeatureModel(c.workspaceId, 'canvas-seo-research');
      const withDraft = buildStepContext(c.outputs, [1, 2, 3, 4, 5, 6, 7]);
      const withoutDraft = buildStepContext(c.outputs, STEP_CONTEXT_OVERRIDES[8] ?? []);
      console.log(`    context oud=${withDraft.length} · nieuw=${withoutDraft.length} (−${withDraft.length - withoutDraft.length})`);

      const arm = async (label: string, ctx: string) => {
        // buildPublicationPrepPrompt gebruikt alléén accumulatedOutputs + voiceDirective
        // (seo-prompts.ts), dus de overige velden mogen leeg. Wél expliciet leeg laten
        // i.p.v. een `as never`-stub: zodra iemand het keyword of de brand-context aan
        // de stap-8-prompt toevoegt, meet dit script anders stil met lege waarden.
        const raw = await runStructuredStep(
          8,
          { primaryKeyword: c.primaryKeyword, funnelStage: 'awareness', secondaryKeywordHints: [], competitorUrls: [] },
          {
            accumulatedOutputs: ctx,
            brandContext: '',
            personaContext: '',
            productContext: '',
            briefContext: '',
            voiceDirective: c.voiceDirective,
            contentType: 'landing-page',
          },
          model,
        );
        const cl = parse(raw);
        if (!cl) {
          console.log(`    ${label.padEnd(6)} PARSE-FOUT`);
          return null;
        }
        console.log(
          `    ${label.padEnd(6)} title=${cl.titleTag.length}t meta=${cl.metaDescription.length}t h1="${cl.h1.slice(0, 48)}" alt=${cl.imageAltTexts?.length ?? 0} faq=${cl.faqSchema ? 'ja' : 'nee'}`,
        );
        return cl;
      };

      const before = await arm('OUD', withDraft);
      const after = await arm('NIEUW', withoutDraft);
      if (!before || !after) continue;
      step8Results.push({
        workspace: c.workspaceName,
        deliverableId: c.deliverableId,
        contextChars: { before: withDraft.length, after: withoutDraft.length },
        before,
        after,
      });

      // De vraag is niet of de tekst identiek is (het model is niet deterministisch),
      // maar of de checklist er slechter van wordt: te lange velden of lege velden.
      const bad = (cl: PublicationPrep['checklist']) =>
        [
          cl.titleTag.length > 60 && 'titleTag>60',
          cl.metaDescription.length > 155 && 'metaDescription>155',
          !cl.h1.trim() && 'h1 leeg',
          !cl.headingStructure.trim() && 'headingStructure leeg',
        ].filter(Boolean) as string[];
      const bo = bad(before);
      const ba = bad(after);
      console.log(`    overtredingen: oud [${bo.join(', ') || 'geen'}] · nieuw [${ba.join(', ') || 'geen'}]`);
      if (before.h1.trim() !== after.h1.trim()) console.log(`    ⚠️  h1 verschilt tussen de armen`);
    }
    // Artefact wegschrijven, zodat de gepubliceerde tabel na te lopen is zonder
    // opnieuw te betalen — de `run`-fase doet dat al, deze deed het niet.
    const step8File = `${OUT_DIR}/variant-b-step8-ab.json`;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(step8File, JSON.stringify(step8Results, null, 2));
    console.log(`\nvolledig resultaat: ${step8File}`);
    return;
  }

  if (phase === 'calibrate') {
    // Een overlap van 95% zegt niets zonder ijkpunt: twee teksten over hetzelfde
    // onderwerp voor hetzelfde merk delen sowieso veel vocabulaire. Deze fase
    // meet die ondergrens op de gearchiveerde artikelen zelf.
    const byWs = new Map<string, Case[]>();
    for (const c of cases) byWs.set(c.workspaceName, [...(byWs.get(c.workspaceName) ?? []), c]);
    const sameBrand: number[] = [];
    const crossBrand: number[] = [];
    for (const list of byWs.values())
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++)
          sameBrand.push(overlapRatio(list[i].originalContent, list[j].originalContent));
    // Symmetrisch bemonsteren: álle merk-overstijgende paren, net als same-brand.
    // De eerdere versie nam alleen het eerste artikel per merk (n=6) en was dus
    // niet vergelijkbaar met de 120 same-brand-paren.
    const all = [...cases];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++)
        if (all[i].workspaceName !== all[j].workspaceName)
          crossBrand.push(overlapRatio(all[i].originalContent, all[j].originalContent));

    const mean = (x: number[]) => (x.length === 0 ? 'n.v.t.' : `${((x.reduce((a, b) => a + b, 0) / x.length) * 100).toFixed(1)}%`);
    console.log('IJKPUNT voor de overlap-maat:');
    console.log(`  twee artikelen van VERSCHILLENDE merken            : ${mean(crossBrand)}  (n=${crossBrand.length})`);
    console.log(`  twee VERSCHILLENDE artikelen (ander onderwerp), zelfde merk : ${mean(sameBrand)}  (n=${sameBrand.length})`);
    console.log('');
    console.log('  ⚠️  Dit ijkpunt meet "ander onderwerp, zelfde merk". Er zit GEEN ijkpunt in');
    console.log('      voor "zelfde onderwerp, andere invalshoek" — precies de vraag bij variant B.');
    console.log('      Lees de bovengrens dus als richting, niet als drempel: hoe dichter bij 100%,');
    console.log('      hoe minder er te kiezen valt tussen de twee varianten.');
    return;
  }

  const n = Number(process.argv[3] ?? 4);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`Ongeldig aantal cases: "${process.argv[3]}". Gebruik: run <positief geheel getal>`);
    process.exitCode = 1;
    return;
  }
  // Spreid over workspaces: één merk mag de uitkomst niet dragen. Round-robin,
  // niet sorteren-op-een-lege-teller — die eerste opzet was een no-op (de sort
  // draait vóór de lus die `seen` vult) en leverde daardoor gewoon de eerste n
  // cases in DB-volgorde: 2 merken in plaats van 4.
  const spread = spreadOverWorkspaces(cases, n);

  console.log(`\n${spread.length} cases × 2 armen = ${spread.length * 2} generaties + ${spread.length * 2} scorings.\n`);
  const results: ArmResult[] = [];

  for (const [i, c] of spread.entries()) {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: c.deliverableId },
      select: { contentType: true },
    });
    if (!deliverable) {
      console.warn(`    ⚠️  deliverable ${c.deliverableId} bestaat niet meer — case overgeslagen (scoring heeft hem nodig)`);
      continue;
    }
    const contentType = deliverable.contentType ?? 'landing-page';
    console.log(`\n[${i + 1}/${spread.length}] ${c.workspaceName} — ${contentType} (${c.deliverableId})`);
    const model = await resolveFeatureModel(c.workspaceId, 'canvas-seo-research');
    const stack = await assembleCanvasContext(c.deliverableId, c.workspaceId);

    // Arm OUD reproduceert exact het pad van vóór de fix: de volledige
    // accumulatedContext (stap 1-7, post-4a-vorm) met een tail-slice van 20.000.
    const oldContext = accumulateAll(c.outputs).slice(-20000);
    const newContext = buildStepContext(c.outputs, RESEARCH_STEPS);
    console.log(
      `    context oud=${oldContext.length} (research: ${researchStepsSurvivingTailSlice(c.outputs)}/5 stappen) · nieuw=${newContext.length} (5/5)`,
    );

    // Expliciete cast: dit script vóedt bewust een ANDERE context dan de
    // productiecode zou bouwen (de OUD-arm is de historische tail-slice). Het
    // brand-type is er om per ongeluk verwisselen te blokkeren, niet om een
    // opzettelijke meting in de weg te zitten — de cast maakt dat zichtbaar.
    const arm = async (label: string, ctx: string) => {
      const researchContext = ctx as ResearchContext;
      const t0 = Date.now();
      const draft = await generateAlternativeVariant({
        originalContent: c.originalContent,
        researchContext,
        voiceDirective: c.voiceDirective,
        textModel: model,
      });
      const outcome = await runFidelityScoring({
        workspaceId: c.workspaceId,
        deliverableId: c.deliverableId,
        contentTypeId: contentType,
        contentText: draft,
        stack,
        generatorProvider: model.provider,
        skipPersist: true,
      });
      const r = outcome?.result;
      const overlap = overlapRatio(c.originalContent, draft);
      console.log(
        `    ${label.padEnd(6)} composite=${r?.compositeScore ?? '-'} (style=${r?.pillars.style.score ?? '-'} judge=${r?.pillars.judge?.score ?? '-'} rules=${r?.pillars.rules.score ?? '-'}) · ${draft.length} tekens · overlap met A ${(overlap * 100).toFixed(1)}% · ${((Date.now() - t0) / 1000).toFixed(0)}s`,
      );
      return {
        label,
        contextChars: ctx.length,
        chars: draft.length,
        composite: r?.compositeScore ?? null,
        thresholdMet: r?.thresholdMet ?? null,
        pillars: { style: r?.pillars.style.score, judge: r?.pillars.judge?.score, rules: r?.pillars.rules.score },
        overlapWithA: overlap,
      };
    };

    const before = await arm('OUD', oldContext);
    const after = await arm('NIEUW', newContext);
    results.push({ workspace: c.workspaceName, contentType, deliverableId: c.deliverableId, before, after });
  }

  const file = `${OUT_DIR}/variant-b-research-ab.json`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(results, null, 2));

  console.log(`\n${'='.repeat(78)}`);
  console.log('case                          OUD    NIEUW     Δ   overlap oud→nieuw');
  const deltas: number[] = [];
  for (const r of results) {
    const d = r.before.composite !== null && r.after.composite !== null ? r.after.composite - r.before.composite : null;
    if (d !== null) deltas.push(d);
    console.log(
      `${`${r.workspace} ${r.contentType}`.padEnd(30)}${String(r.before.composite ?? '-').padStart(5)}${String(r.after.composite ?? '-').padStart(9)}${(d !== null ? (d > 0 ? `+${d}` : String(d)) : '-').padStart(6)}   ${(r.before.overlapWithA * 100).toFixed(0)}% → ${(r.after.overlapWithA * 100).toFixed(0)}%`,
    );
  }
  if (deltas.length > 0) {
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const brands = new Set(results.map((r) => r.workspace)).size;
    console.log(
      `\ngemiddelde Δ: ${mean > 0 ? '+' : ''}${mean.toFixed(1)} · spreiding ${Math.min(...deltas)} tot ${Math.max(...deltas)} · n=${deltas.length} over ${brands} merk(en)`,
    );
    if (deltas.length < 8 || brands < 3) {
      console.log('⚠️  Kleine, smalle steekproef — richtinggevend, niet conclusief.');
    }
  }
  console.log(`\nvolledig resultaat: ${file}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1; // niet process.exit(): dat draait vóór de disconnect hieronder
  })
  .finally(() => prisma.$disconnect());
