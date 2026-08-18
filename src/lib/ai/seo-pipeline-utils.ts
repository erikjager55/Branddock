/**
 * Pure helpers voor de SEO-pipeline — gate-logica (welke deliverables draaien de
 * pipeline) én contextassemblage (welke stap-outputs gaan mee in welke prompt).
 * Bewust in de lib-laag zonder feature-dependency, zodat de orchestrator hier
 * veilig op kan leunen en smoke-tests ze DB- en key-loos kunnen draaien; het
 * UI-veld leeft apart in `content-type-inputs` en deelt dezelfde default-constante.
 */
import {
  WEBSITE_DELIVERABLE_TYPES,
  LONG_FORM_SEO_TYPES,
  DEFAULT_LONG_FORM_OPTIMIZATION_GOALS,
  SEO_STEP_DEFINITIONS,
  type OptimizationGoal,
} from "./seo-pipeline.types";

function isGoal(value: unknown): value is OptimizationGoal {
  return value === "seo" || value === "geo";
}

/**
 * Actieve optimalisatie-doelen uit de opgeslagen `contentTypeInputs.optimizationGoals`.
 * Geen opgeslagen waarde → de per-type default (long-form: SEO-aan; anders geen).
 * Een expliciet lege array betekent bewust geen doelen (opt-out).
 */
export function resolveOptimizationGoals(
  contentTypeInputs: Record<string, unknown> | null | undefined,
  typeId: string,
): OptimizationGoal[] {
  const stored = contentTypeInputs?.optimizationGoals;
  if (Array.isArray(stored)) return stored.filter(isGoal);
  return LONG_FORM_SEO_TYPES.has(typeId) ? [...DEFAULT_LONG_FORM_OPTIMIZATION_GOALS] : [];
}

/**
 * Beslist of de SEO-pipeline draait. Website-types: altijd (mits keyword).
 * Long-form: alleen als het SEO-doel aanstaat. Buiten beide sets: nooit.
 * Gedeeld door de orchestrator + smoke zodat de regel één bron heeft.
 */
export function shouldRunSeoPipeline(
  typeId: string,
  contentTypeInputs: Record<string, unknown> | null | undefined,
  hasPrimaryKeyword: boolean,
): boolean {
  if (!hasPrimaryKeyword) return false;
  if (WEBSITE_DELIVERABLE_TYPES.has(typeId)) return true;
  if (LONG_FORM_SEO_TYPES.has(typeId)) {
    return resolveOptimizationGoals(contentTypeInputs, typeId).includes("seo");
  }
  return false;
}

// ─── Contextassemblage ───────────────────────────────────────

/**
 * De contextvelden die elke pipeline-stap in zijn prompt krijgt. Eén object en
 * geen zeven opeenvolgende `string`-parameters: die waren onderling verwisselbaar
 * zonder typefout, en het meetscript gaf er in de praktijk vier kale `''` achter
 * elkaar aan door.
 */
export interface SeoStepContextInput {
  accumulatedOutputs: string;
  brandContext: string;
  personaContext: string;
  productContext: string;
  briefContext: string;
  voiceDirective: string;
  contentType: string;
}

/**
 * Gemerkt string-type: alléén `buildVariantBResearchContext` levert het op. Zo is
 * het artikel doorgeven waar research hoort geen leesfout meer maar een
 * compileerfout — een review kreeg die verwisseling eerder langs zowel de
 * typechecker als 38 smoke-checks, omdat beide velden gewoon `string` waren.
 */
export type ResearchContext = string & { readonly __researchContext: unique symbol };

export interface VariantBPromptInput {
  /** Het definitieve artikel uit stap 7 — variant A. */
  originalContent: string;
  /** De researchstappen (1-5), zonder prose. */
  researchContext: ResearchContext;
}

/**
 * Eén bron voor het blokformaat waarin stap-outputs in een prompt landen.
 * `runSeoPipeline` gebruikt dit om `accumulatedContext` op te bouwen en
 * `buildStepContext` om er een deelverzameling uit te renderen — zodat "dezelfde
 * vorm" een gedeelde functie is en niet drie plekken die uit elkaar kunnen lopen.
 */
export function renderStepBlock(step: number, rawText: string): string {
  const label = SEO_STEP_DEFINITIONS.find((d) => d.step === step)?.label ?? `Step ${step}`;
  return `\n\n## Step ${step}: ${label}\n${rawText}\n---`;
}

/**
 * Rendert een deelverzameling van de pipeline-outputs in hetzelfde formaat als
 * `SeoPipelineState.accumulatedContext`. Altijd oplopend op stapnummer, ongeacht
 * de volgorde in `outputs` (parallelle waves leveren niet-deterministisch aan).
 *
 * Waarom selecteren en niet de accumulatedContext slicen: een tail-slice houdt de
 * LAATSTE bytes over, en dat zijn de meest recente stappen — de prose, niet de
 * research. `accumulatedContext.slice(-20000)` in de variant-B-generator viel
 * daardoor altijd binnen de prose-staart: stap 6 + stap 7 zijn samen mediaan
 * 29.953 tekens over 31 gemeten runs, ruim meer dan het venster, dus de research
 * (stap 1-5) werd nooit bereikt — 31/31 runs kregen 0 van de 5 researchstappen.
 * Selecteren op stapnummer is expliciet en begint nooit midden in een zin.
 *
 * Het parametertype is structureel en niet `SeoStepOutput[]`, zodat callers een
 * deelverzameling of een fixture kunnen doorgeven zonder een `name` te verzinnen.
 *
 * ⚠️ Een gevraagde stap die niet in `outputs` zit, wordt overgeslagen — bewust,
 * want een deelverzameling doorgeven moet kunnen. Binnen `runSeoPipeline` kan dat
 * niet vóórkomen (de waves garanderen dat stap 1-7 aanwezig zijn vóór de enige
 * twee selectieve aanroepen), maar voor een nieuwe caller is het een foot-gun:
 * een selectie die een nog niet uitgevoerde stap noemt, levert stil een armere
 * prompt. Selecteer daarom alleen stappen waarvan je weet dat ze klaar zijn.
 */
export function buildStepContext(
  outputs: readonly { step: number; rawText: string }[],
  steps: readonly number[],
): string {
  const wanted = new Set(steps);
  return outputs
    .filter((o) => wanted.has(o.step))
    .sort((a, b) => a.step - b.step)
    .map((o) => renderStepBlock(o.step, o.rawText))
    .join('');
}

// ─── Context-selectie per stap ───────────────────────────────
// De accumulatedContext groeit elke stap met het volledige blok van de vorige.
// Voor de meeste stappen is dat precies goed. Twee uitzonderingen:
//
// • Variant B kreeg via een tail-slice uitsluitend prose en nul research —
//   gemeten over 31 herspeelde runs: 31/31 kreeg 0 van de 5 researchstappen.
// • Stap 8 (checklist-only) kreeg zowel de stap-6-draft als de stap-7-revisie.
//   Twee versies van hetzelfde artikel, terwijl zijn eigen prompt zegt "step 7
//   already delivered the final prose". Scheelt mediaan 14.549 tekens input
//   (spreiding 9.808-18.229). Effect op de checklist-output gemeten over 4 cases
//   (`npm run fidelity:variant-b -- step8`): geen overtredingen in beide armen,
//   titleTag-lengtes identiek, faqSchema overal gevuld. Zie
//   tasks/seo-pipeline-speedup.md.
//
// De researchstappen zijn 1-5; 6-7 zijn prose, 8 is de checklist.
export const RESEARCH_STEPS = [1, 2, 3, 4, 5] as const;

// Readonly<Partial<…>>: `Partial` omdat stap 1-7 géén entry hebben en `undefined`
// opleveren — zonder dat belooft het type een waarde voor elke number-sleutel
// terwijl de callers juist op undefined leunen. `Readonly` eromheen omdat Partial
// alléén de schrijfbescherming zou weggooien die de vorige vorm wél gaf.
export const STEP_CONTEXT_OVERRIDES: Readonly<Partial<Record<number, readonly number[]>>> = {
  // Bewust uitgeschreven i.p.v. RESEARCH_STEPS in te spreiden: dit gaat over de
  // checklist-stap en mag niet stil meebewegen met een constante over variant B.
  8: [1, 2, 3, 4, 5, 7],
};

/**
 * Welke context krijgt stap N? Zonder override alles wat ervóór kwam.
 *
 * Bestaat als functie zodat de aanroepzijde geen stappenlijst meer kan doorgeven:
 * een review liet zien dat `buildStepContext(state.outputs, [1,2,3,4,5])` op het
 * stap-8-pad — waarmee de checklist zijn definitieve prose verliest — langs alle
 * checks én langs de typechecker glipte. Hier valt niets te verwisselen.
 */
export function resolveStepContext(
  step: number,
  outputs: readonly { step: number; rawText: string }[],
  accumulatedContext: string,
): string {
  const override = STEP_CONTEXT_OVERRIDES[step];
  return override ? buildStepContext(outputs, override) : accumulatedContext;
}

/**
 * De research-context voor variant B. Aparte functie zodat de pipeline en de
 * smoke gegarandeerd dezelfde selectie gebruiken — de oorspronkelijke bug zat
 * niet in de selectielogica maar in wát de aanroeper doorgaf.
 */
export function buildVariantBResearchContext(
  outputs: readonly { step: number; rawText: string }[],
): ResearchContext {
  return buildStepContext(outputs, RESEARCH_STEPS) as ResearchContext;
}

/**
 * De user-prompt van variant B. Puur en zonder AI-afhankelijkheid, zodat een
 * smoke kan asserten dat de belofte in de kop ("preserve all SEO elements from
 * this research") gedekt wordt door wat eronder staat.
 *
 * Lege research laat de sectie wég in plaats van een kop boven niets te zetten:
 * dat leest als "er is geen research" en is een andere instructie dan "hier is
 * de research". Bereikbaar via directe aanroep van `generateAlternativeVariant`
 * (benchmark-script); binnen de pipeline zelf niet, want die breekt af als stap 7
 * ontbreekt en 1-5 gaan daar altijd aan vooraf.
 */
export function buildVariantBUserPrompt(input: VariantBPromptInput): string {
  const { originalContent, researchContext } = input;
  // Invariant: research komt altijd uit `buildStepContext` en draagt dus
  // `## Step N:`-koppen. Tekst zonder die koppen is prose, geen research — dat
  // betekent dat de twee velden verwisseld zijn. Benoemde velden maken die fout
  // zichtbaar maar niet onmogelijk, en de typechecker ziet twee strings.
  // Waarschuwen, niet gooien: een verkeerd gevulde prompt is een codefout, maar
  // een lopende generatie afbreken maakt het voor de gebruiker alleen erger.
  // `startsWith`, niet `includes`: how-to-artikelen dragen zélf koppen als
  // "## Step 1: selecting FSC Accoya" (het zusterscript documenteert precies dat),
  // dus `includes` gaf een false negative op de content waar de verwisseling het
  // meest waarschijnlijk is. Output van `buildStepContext` begint altijd met de
  // blok-separator; een artikel nooit.
  if (researchContext.trim() && !researchContext.startsWith('\n\n## Step ')) {
    console.warn(
      '[seo-pipeline] variant-B-prompt: researchContext bevat geen enkel "## Step N:"-blok — vrijwel zeker is prose in het researchveld beland.',
    );
  }
  const researchBlock = researchContext.trim()
    ? `\n## SEO RESEARCH CONTEXT (preserve all SEO elements from this research)\n${researchContext}\n`
    : '';
  return `## ORIGINAL PAGE (Variant A)
${originalContent}
${researchBlock}
Write the complete alternative version (Variant B). Different creative angle, same SEO foundation. Return the full markdown page in the "draft" field.`;
}
