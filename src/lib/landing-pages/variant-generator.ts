/**
 * Landing-page structured variant generator (Fase 2 van web-page-builder
 * spec docs/specs/web-page-types/landing-page.md §4b).
 *
 * Genereert variants als gestructureerd JSON (LandingPageVariantContent),
 * niet als markdown-blob. Dit vervangt de heuristische parseMarkdownArticle-
 * route in variant-to-puck-data.ts voor landing-page deliverables.
 *
 * Architectuur:
 *  1. buildLandingPageVariantPrompt(params) — pure prompt-builder
 *  2. parseLandingPageVariantResponse(text) — pure JSON-extractor + Zod-validator
 *  3. generateLandingPageVariant(params) — orchestrator: Anthropic call → parse → retry-on-validation-failure
 *
 * Beslissingen (gedocumenteerd voor retroactive review):
 *  - **Provider Anthropic**: claude-sonnet-4-5+ is sterk in structured JSON output
 *    + dezelfde stack als strategy-flow + F-VAL judge. Bewuste afwijking van
 *    OpenAI dat content-generation default doet, omdat schema-strictness hier
 *    belangrijker is dan throughput.
 *  - **Geen tool-use, wel prompt-driven JSON**: vermijdt extra dispatch-laag
 *    in anthropicClient wrapper. JSON-extractor handelt code-fences + prose-leak.
 *  - **1 retry op validation-failure**: stuurt Claude de validation-errors
 *    terug zodat hij kan corrigeren. Geen oneindige loop — bij 2e fail throw.
 *  - **Backward-compat**: deze generator wordt door Fase 3 wiring opt-in via
 *    een dispatch in variant-to-puck-data. Bestaande markdown-blob route blijft
 *    werken voor legacy deliverables.
 */

import type { HumanVoiceMode } from "@prisma/client";
import { anthropicClient } from "../ai/anthropic-client";
import { LONG_FORM_SEO_TYPES } from "../ai/seo-pipeline.types";
import { buildGeoDirective } from "../ai/prompts/geo-directives";
import { buildHumanVoiceDirective } from "../studio/human-voice-directive";
import type { BrandContextBlock } from "../ai/prompt-templates";
import {
  landingPageVariantSchema,
  type LandingPageVariantContent,
  validateLandingPageVariant,
} from "./variant-schema";
import type { BrandArchetype } from "./brand-archetype-classifier";
import type { LayoutStyle } from "./design-system";
import type { ProductContext } from "../ai/canvas-context";
import { formatAngleInstruction, type CreativeAngle } from "../ai/canvas-angle-generator";
import {
  getVariantSchemaForType,
  hasOwnVariantSchema,
  type PageVariantContent,
} from "./page-type-schemas";
import { sanitizeLongFormGeoVariant } from "./sanitize-geo-sources";

// ─── Types ───────────────────────────────────────────────

export interface LandingPageGenerationParams {
  /** W1 (plan §1 Optie A) — content-type-dispatch: faq-page/product-page/
   *  microsite krijgen een eigen schema + system-prompt; landing-page,
   *  comparison-page en onbekende types volgen het bestaande LP-pad
   *  byte-compatibel. Default: 'landing-page'. */
  contentType?: string;
  /** Brand-context van Branddock workspace (kleuren, voice, tagline, etc.). */
  brand: Partial<BrandContextBlock>;
  /** Doelgroep-persona — bepaalt copy-tone en pijnpunten. */
  persona?: {
    name?: string;
    role?: string;
    painPoints?: string[];
    goals?: string[];
    /** Geserialiseerde persona-beschrijving uit canvas-context (vrije tekst).
     *  Wordt onder de structured velden gerendered zodat de generator brede
     *  context heeft. */
    serialized?: string;
  };
  /** W2 (plan §2.3) — gekoppeld product voor een product-page. Levert de échte
   *  naam/description/pricing/feature→benefit-paren/useCases zodat de generator
   *  niet hoeft te verzinnen. Alleen gezet voor product-page; andere types
   *  negeren dit veld. */
  product?: ProductContext | null;
  /** User-prompt — wat moet deze landing-page bereiken. */
  userPrompt: string;
  /** Optionele locale (default 'nl-NL' bij Branddock NL workspaces). */
  locale?: string;
  /** Of we problem-articulatie sectie willen (default true voor B2B). */
  includeProblem?: boolean;
  /** Of we pricing-sectie willen (default false voor lead-gen LPs). */
  includePricing?: boolean;
  /** Sub-Sprint E — Brand-archetype voor tone-aware micro-copy. */
  archetype?: BrandArchetype | null;
  /** Sub-Sprint E — LayoutStyle bepaalt content-depth (MINIMAL=sparse, EDITORIAL=lush). */
  layoutStyle?: LayoutStyle | null;
  /** DTS C1 — vocabulary-rails uit BrandVoiceguide. Min 1 item nodig om effect te hebben. */
  vocabularyDo?: string[] | null;
  vocabularyDont?: string[] | null;
  /** DTS C2 — voice few-shot sample uit BrandVoiceguide.voiceSample. */
  voiceSample?: string | null;
  /** Variant-axis voor batch-generatie. Forceert structureel verschillende
   *  invalshoeken: temperature-variatie alleen is niet genoeg om garant 2
   *  echt-verschillende variants te krijgen omdat de prompt zelf één 'beste
   *  antwoord' framing forceert. Met axis krijgt variant A bv 'problem-led'
   *  (pijn vooraan + crisis-framing) en variant B 'benefit-led' (outcome
   *  vooraan + transformation-framing). */
  variantAxis?: VariantAxis | null;
  /** P3b — dynamische creative-angle (uit canvas-angle-generator). Wanneer gezet
   *  vervangt dit de generieke variantAxis als divergentie-frame (brand-/context-
   *  specifiek). `angleInstruction` = formatAngleInstruction-output (prompt-blok);
   *  `angleLabel` = het korte NL label dat in de UI getoond wordt. */
  angleInstruction?: string | null;
  angleLabel?: string | null;
  /** Audit 2026-06-10 — Human Voice Directive gating (pariteit met
   *  canvas-orchestrator). 'OFF' = geen HVD; alles anders (BASELINE/STRICT,
   *  default BASELINE) injecteert de anti-AI-tell-laag in het system-prompt.
   *  Vóór deze fix kreeg het LP-pad nooit een em-dash-verbod: 92% van
   *  LP-deliverables bevatte em-dash-lijm vs 25% op het orchestrator-pad. */
  humanVoiceMode?: HumanVoiceMode | null;
  /** Knowledge-context — door de gebruiker geselecteerd bronmateriaal (Step 1
   *  picker), vooraf geserialiseerd via serializeContextForPrompt (zelf-
   *  bevattende ## headings). Wordt raw in de gedeelde stijl-stack geïnjecteerd
   *  zodat alle 5 web-page-types hun copy hierin gronden. Leeg/undefined wanneer
   *  niets geselecteerd is → de prompt blijft dan byte-identiek (golden-set). */
  additionalContextText?: string;
}

export type VariantAxis =
  | "problem-led"
  | "benefit-led"
  | "rational"
  | "emotional"
  | "story-led"
  | "data-led";

const VARIANT_AXIS_HINTS: Record<VariantAxis, string> = {
  "problem-led":
    "Open met de pijn van de doelgroep. Hero-headline benoemt het probleem direct (vraag-vorm of confronterende stelling). Problem-sectie is het emotionele hart van de pagina. Bridge van 'pijn' naar 'oplossing' is hard en duidelijk.",
  "benefit-led":
    "Open met de outcome. Hero-headline beschrijft het eindresultaat dat de doelgroep wil bereiken. Features-sectie is het hart van de pagina, ge-framed als concrete vooruitgangen. Geen lange pijn-uitwijding, direct naar transformation.",
  rational:
    "Argumenten op cijfers, mechaniek en evidence. Concrete getallen in headlines waar mogelijk. Testimonials nadruk op meetbare resultaten (uren bespaard, conversie-lift). Geen superlatieven, geen emotie-driven taal.",
  emotional:
    "Argumenten op identiteit, gevoel en aspiratie. Headlines spreken tot wie de lezer wil zijn. Testimonials nadruk op transformatie van persoon/team. Sensorische taal en aspirational verbs.",
  "story-led":
    "Hero-headline introduceert protagonist + spanning. Sections lopen narrative-arc: situatie → conflict → resolutie. Final-CTA als climax. Geen losse feature-lijstjes, alles ingebed in verhaal.",
  "data-led":
    "Hero-headline bevat een verrassend cijfer. Stats-sectie prominent, vóór social proof. Features ge-framed als percentage/factor-verbeteringen. FAQ-antwoorden onderbouwd met data-points.",
};

export interface BuiltPrompt {
  system: string;
  user: string;
}

// ─── Prompt-builder ──────────────────────────────────────

/**
 * Bouwt het Anthropic prompt-paar (system + user) voor landing-page
 * variant-generatie. Pure functie — geen side-effects, testable in isolation.
 */
export function buildLandingPageVariantPrompt(
  params: LandingPageGenerationParams,
): BuiltPrompt {
  const locale = params.locale ?? "nl-NL";
  const includeProblem = params.includeProblem ?? true;
  const includePricing = params.includePricing ?? false;

  const opts: SystemPromptOpts = {
    locale,
    includeProblem,
    includePricing,
    archetype: params.archetype ?? null,
    layoutStyle: params.layoutStyle ?? null,
    vocabularyDo: params.vocabularyDo ?? null,
    vocabularyDont: params.vocabularyDont ?? null,
    voiceSample: params.voiceSample ?? null,
    variantAxis: params.variantAxis ?? null,
    angleInstruction: params.angleInstruction ?? null,
    humanVoiceMode: params.humanVoiceMode ?? null,
    additionalContextText: params.additionalContextText,
  };
  // W1 — type-dispatch: eigen prompt voor faq/product/microsite; al het
  // andere (landing-page, comparison-page, onbekend) volgt het bestaande
  // LP-pad ongewijzigd.
  const contentType = params.contentType ?? "landing-page";
  const system =
    contentType === "faq-page"
      ? buildFaqSystemPrompt(opts)
      : contentType === "product-page"
      ? buildProductSystemPrompt(opts)
      : contentType === "microsite"
      ? buildMicrositeSystemPrompt(opts)
      : LONG_FORM_SEO_TYPES.has(contentType)
      ? buildLongFormGeoSystemPrompt(opts)
      : buildSystemPrompt(opts);
  const user = buildUserPrompt(params, { locale });
  return { system, user };
}

// ─── Tone + content-depth hints (Sub-Sprint E) ────────────

const ARCHETYPE_TONE_HINTS: Record<BrandArchetype, string> = {
  INNOCENT: 'optimistic, simple, honest, hopeful: use positive verbs, avoid corporate jargon',
  EXPLORER: 'adventurous, independent, authentic: speak to autonomy and discovery',
  SAGE: 'authoritative, considered, knowledgeable: evidence-led, no exaggeration',
  HERO: 'bold, confident, action-led: strong verbs, no hedging, "you can"-framing',
  OUTLAW: 'rebellious, direct, anti-establishment: challenge conventions explicitly',
  MAGICIAN: 'visionary, transformative, mysterious: speak to possibility and change',
  REGULAR_GUY: 'down-to-earth, friendly, inclusive: plain language, no superlatives',
  LOVER: 'intimate, passionate, sensual: evoke emotion and beauty',
  JESTER: 'playful, witty, light: humor where appropriate, never preachy',
  CARETAKER: 'warm, protective, supportive: empathy first, reassurance throughout',
  CREATOR: 'inventive, original, expressive: celebrate craft and intentionality',
  RULER: 'premium, authoritative, refined: quiet confidence, no sales-y exclamation',
};

const LAYOUT_DEPTH_HINTS: Record<LayoutStyle, string> = {
  MINIMAL: 'Sparse content. Body sentences max 14 words. Each section feels considered. White-space respect: say less.',
  EDITORIAL: 'Magazine-style depth. Body paragraphs 2-3 sentences. Sub-headlines that develop the theme. Reward attentive readers.',
  COMMERCIAL: 'Tight, scannable. Direct value-prop. Bullet-friendly. Quick wins above the fold.',
  EXPERIENTIAL: 'Story-driven. Hero headline emotional. Build narrative through sections. Pay off at final CTA.',
  PLAYFUL: 'Warm + casual. Conversational tone. Concrete examples over abstract claims. Joy in micro-copy.',
};

interface SystemPromptOpts {
  locale: string;
  includeProblem: boolean;
  includePricing: boolean;
  archetype: BrandArchetype | null;
  layoutStyle: LayoutStyle | null;
  vocabularyDo?: string[] | null;
  vocabularyDont?: string[] | null;
  voiceSample?: string | null;
  variantAxis?: VariantAxis | null;
  angleInstruction?: string | null;
  humanVoiceMode?: HumanVoiceMode | null;
  additionalContextText?: string;
}

/**
 * W1 — gedeelde stijl-stack (tone/depth/vocab/voice/HVD/axis-blokken),
 * geëxtraheerd uit buildSystemPrompt zodat de per-type prompts dezelfde
 * brand-voice-erfenis krijgen. String-output is byte-identiek aan de
 * oorspronkelijke inline-compositie — het LP-pad merkt niets.
 */
function buildSharedStyleBlocks(opts: SystemPromptOpts): string {
  const toneBlock = opts.archetype
    ? `\n# BRAND-ARCHETYPE: ${opts.archetype}\nTone: ${ARCHETYPE_TONE_HINTS[opts.archetype]}\n`
    : '';
  const depthBlock = opts.layoutStyle
    ? `\n# CONTENT-DEPTH (LayoutStyle: ${opts.layoutStyle})\n${LAYOUT_DEPTH_HINTS[opts.layoutStyle]}\n`
    : '';
  // DTS C1 — vocabulary-rails. Activeert bij ≥1 item (conform interface-doc
  // "Min 1 item nodig"); rendert per zijde alleen wat gevuld is. Voedt de
  // Merkstijl-pijler (voice-centroid-similarity) — eerder eiste dit ≥3 in
  // BEIDE arrays, waardoor sparse-vocab merken de rails misten en lager
  // scoorden op stijl.
  const doList = (Array.isArray(opts.vocabularyDo) ? opts.vocabularyDo : [])
    .filter((w) => typeof w === 'string' && w.trim().length > 0);
  const dontList = (Array.isArray(opts.vocabularyDont) ? opts.vocabularyDont : [])
    .filter((w) => typeof w === 'string' && w.trim().length > 0);
  const vocabLines: string[] = [];
  if (doList.length > 0) vocabLines.push(`Gebruik deze woorden/zinnen waar natuurlijk: ${doList.map((w) => `"${w}"`).join(', ')}.`);
  if (dontList.length > 0) vocabLines.push(`Vermijd deze: ${dontList.map((w) => `"${w}"`).join(', ')}.`);
  const vocabBlock = vocabLines.length > 0
    ? `\n# BRAND VOICE: VOCABULAIRE-DISCIPLINE (wordsWeUse)\n${vocabLines.join('\n')}\n`
    : '';
  // DTS C2 — voice few-shot sample
  const sample = opts.voiceSample?.trim();
  const voiceBlock = sample && sample.length >= 30
    ? `\n# VOICE-VOORBEELD (match dit rhythm + sentence-length + vocabulaire)\n> ${sample.replace(/\n/g, '\n> ')}\n`
    : '';
  // Audit 2026-06-10 — Human Voice Directive (anti-AI-tell-laag, pariteit met
  // canvas-orchestrator.ts:320-327). Default aan (BASELINE); alleen expliciete
  // 'OFF' slaat over. NA het vocab/voice-blok geplaatst: de HVD verwijst naar
  // "de Brand Voice sectie hierboven" voor de wordsWeUse-uitzondering.
  const hvdBlock =
    opts.humanVoiceMode === 'OFF'
      ? ''
      : `\n${buildHumanVoiceDirective({ language: opts.locale.toLowerCase().startsWith('en') ? 'en' : 'nl' })}\n`;
  // Variant-axis block — forceert structureel andere invalshoek voor
  // batch-variants. Zonder dit produceert temperature-variatie alleen
  // bijna-identieke output omdat de rest van de prompt deterministische
  // 'beste-antwoord' framing eist. We zetten dit BOVENAAN de prompt en
  // herhalen het EISEND in de output-regels zodat Claude geneigd is om
  // het te respecteren ook al klinken beide aanpakken op zich logisch.
  // P3b — dynamische creative-angle wint als divergentie-frame (brand-specifiek,
  // rijker dan de generieke axis). Valt terug op de axis wanneer geen angle.
  const axisBlock = opts.angleInstruction
    ? `\n# !! CREATIVE ANGLE (HARD CONSTRAINT) !!\n${opts.angleInstruction}\n`
    : opts.variantAxis
    ? `\n# !! VARIANT-INVALSHOEK (HARD CONSTRAINT) !!: ${opts.variantAxis.toUpperCase()}\n${VARIANT_AXIS_HINTS[opts.variantAxis]}\n\nDIT IS GEEN OPTIE, het is de KERN van deze variant. Andere variants in dezelfde batch volgen een EXPLICIET ANDERE as (bv: problem-led ↔ benefit-led). Onze users zien de variants NAAST ELKAAR en moeten ze direct kunnen onderscheiden:\n  - Hero-headline moet de gekozen invalshoek meteen tonen\n  - Volgorde van secties moet de invalshoek versterken\n  - Tone en woordkeus moet substantieel afwijken\nWanneer beide variants 'rond hetzelfde middenpad' uitkomen, hebben we GEFAALD. Neem het risico van een uitgesproken kant.\n`
    : '';
  // Knowledge-context — door de gebruiker geselecteerd bronmateriaal (Step 1
  // picker), al geserialiseerd mét zelf-bevattende ## headings door
  // serializeContextForPrompt. Raw injecteren (zoals canvas-orchestrator) om een
  // geneste dubbele heading te vermijden. Leeg wanneer niets geselecteerd is →
  // het no-knowledge-pad blijft byte-identiek (golden-set-veiligheid).
  const knowledgeBlock = opts.additionalContextText?.trim()
    ? `\n${opts.additionalContextText.trim()}\n`
    : '';
  return `${toneBlock}${depthBlock}${vocabBlock}${voiceBlock}${hvdBlock}${axisBlock}${knowledgeBlock}`;
}

function buildSystemPrompt(opts: SystemPromptOpts): string {
  const styleBlocks = buildSharedStyleBlocks(opts);
  // DTS C6 — sectie-blueprint hint uit render-constraints (alleen wanneer archetype gezet)
  // Maakt sectie-density consistent per merk (RULER 5 secties tight, SAGE 8 editorial)
  let blueprintBlock = '';
  if (opts.archetype) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RENDER_CONSTRAINTS_BY_ARCHETYPE } = require('./render-constraints') as typeof import('./render-constraints');
    const c = RENDER_CONSTRAINTS_BY_ARCHETYPE[opts.archetype];
    blueprintBlock = `\n# SECTIE-BLUEPRINT\nDoel: ${c.targetSectionCount} secties. Aanbevolen volgorde: ${c.sectionBlueprint.join(' → ')}.\nLeg de focus daar; AI mag een sectie skippen wanneer het niet relevant is, maar wijk niet drastisch af.\n`;
  }

  // #10 design-quality — design-direction commitment block. Geïnspireerd
  // door (a) Anthropic frontend-design Skill 4-vragen framework en (b)
  // user's HNG 6-onderdelen prompt-guideline. Forceert dat de generator
  // VÓÓR copy-keuzes commit aan een visuele richting i.p.v. veilig-midden.
  const designDirectionBlock = `
# DESIGN-DIRECTION COMMITMENT
Voordat je copy schrijft, commit eerst aan deze 4 visuele beslissingen
(maar SCHRIJF deze niet in output, alleen interne richtlijn):

1. AESTHETIC EXTREME: kies één en stuur ALLE keuzes ernaar:
   - 'refined minimalism' (witruimte, beperkt palet, premium typografie)
   - 'bold maximalism' (grote contrasten, asymmetrie, durf-kleur)
   - 'editorial magazine' (long-form, serif display, rythme uit spacing)
   - 'industrial/technical' (mono-typografie, grid, data-driven feel)
   - 'warm humanist' (zachte palet, ronde vormen, persoonlijke taal)
   - 'rebellious/anti-corporate' (sharp edges, contrast, unexpected layout)
   Wees uitgesproken: een variant die 'op alle merken zou kunnen passen'
   is mislukt.

2. TRANSFORMATIE-ARC: articuleer in 1 zin de reis die de lezer maakt:
   'van ... naar ...' (bv: 'van frustratie naar controle', 'van handmatig
   naar geautomatiseerd', 'van isolatie naar community'). Alle copy moet
   die arc reflecteren: pijn-bullets aan de 'van'-kant, features +
   testimonial + CTA aan de 'naar'-kant.

3. REFERENCE-AESTHETIC: denk aan welk merk visueel/tonaal de norm zet
   voor deze pagina. Bv: 'Linear voor B2B-clarity', 'Patagonia voor
   purpose-driven', 'Apple voor premium-restraint', 'Notion voor
   playful-pragmatic'. Niet copiëren, gebruik als compass voor
   tone-of-voice en woordkeus.

4. ANTI-DEFAULTS: vermijd actief:
   - 'Welkom bij ...', 'Ontdek de ...', 'De #1 platform voor ...'
   - Synoniemen-spreuken zonder concreet voordeel
   - 'Wij geloven dat ...' filler-zinnen
   - Vage outcome-claims zonder cijfer of context
   - Generic feature-namen ('Krachtig', 'Eenvoudig', 'Flexibel')
   Vervang elk klisjee met iets specifieks of laat het weg.
`;

  return `# ROL
Je bent een Senior UX-conversion strategist + brand-copywriter met 12+
jaar ervaring. Voor deze opdracht ben je in de huid van een art-director
die een one-shot variant aflevert die concurreert met de bron-website
op visuele kwaliteit en commerciële scherpte.
${styleBlocks}${blueprintBlock}${designDirectionBlock}
# OPDRACHT
Genereer een complete landing-page variant als **gestructureerd JSON** volgens het schema hieronder. Antwoord uitsluitend met het JSON-object (zonder prose, toelichting of code-fences).

# OUTPUT-SCHEMA
{
  "hero": {
    "headline": string (max 60 tekens, DESCRIPTIEF: noem concreet WAT je verkoopt + de differentiator. Slaagt voor de 5-seconden-test (als de lezer ALLEEN dit leest, weet hij exact wat het product is) ÉN draagt de emotionele register. Een descriptieve kern, GEEN vage benefit-slogan. Goed: "Verkoold gevelhout dat een leven lang zwart blijft". Fout: "Tijdloze schoonheid in hout"),
    "subhead": string (1-2 zinnen, max ~25 woorden, maakt de headline GELOOFWAARDIG: hoe het werkt + waarom de claim klopt, niet een tweede slogan),
    "primaryCta": string (laagdrempelige EERSTE actie passend bij een koude lezer: een micro-commitment, bv "Vraag stalen aan"/"Bekijk demo"/"Plan adviesgesprek", NIET een zware ask als "Koop nu"/"Vraag offerte" voor een eerste bezoek. Action-led werkwoord),
    "secondaryCta": string | optional (Hobson's Choice +1, bv "Bekijk demo"),
    "heroVisualUrl": string | optional (placeholder voor v2),
    "imageBrief": { "subject": string (max 200 tekens, concreet sectie-specifiek onderwerp), "sceneType": "object" | "process" | "location" | "detail" | "person", "composition": string (max 200 tekens, compositie-richting in 1 zin), "avoid": string | optional (wat dit beeld NIET toont) } (visuele richting voor de hero-foto: de SCÈNE die de hero-belofte toont, geen abstracte sfeer)
  },
  "trust": {
    "type": "logos" | "testimonial-quote" | "authority-statement",
    "items": [{ "label": string, "mediaUrl": string | optional }] (1-7 items)
  },${opts.includeProblem ? `
  "problem": {
    "heading": string (pijn als vraag of stelling),
    "painBullets": string[] (3-5 concrete frustraties),
    "bridgingSentence": string (brug naar oplossing, voorkomt doom-and-gloom)
  },` : ""}
  "features": {
    "sectionHeading": string,
    "items": [{ "icon": string (lucide-icon naam, geen emoji), "heading": string (2-4 woorden), "body": string (1-2 zinnen benefit-frame), "imageBrief": { "subject": string (max 200 tekens), "sceneType": "object" | "process" | "location" | "detail" | "person", "composition": string (max 200 tekens), "avoid": string | optional } }] (3 of 4 items; 5 verstoort grid-balans. Elke feature BEWIJST één pilaar van de hero-belofte, dus geen losse willekeurige features. Samen dekken ze de kern-belofte uit de headline/subhead)
  },
  "socialProof": {
    "testimonials": [{ "quote": string, "authorName": string, "authorRole": string, "authorCompany": string, "outcome": string | optional }] (EXACT 1 item. Gebruik UITSLUITEND testimonials/namen/cijfers die in de brand-context of opdracht staan; staan die er niet, schrijf dan een kwalitatieve quote zonder cijfers en vul authorName met een generieke functie-aanduiding (bv "Eigenaar van een grand café") en authorCompany met een sector-aanduiding of leeg. Laat authorName NOOIT leeg en verzin NOOIT echte bedrijfsnamen, persoonsnamen of resultaatcijfers),
    "impactStats": [{ "value": string, "label": string }] | optional (max 4 items, ALLEEN met cijfers uit de aangeleverde context; geen brondata = veld weglaten)
  },${opts.includePricing ? `
  "pricing": {
    "tiers": [{ "name": string, "price": string, "features": string[], "highlighted": boolean }] (EXACT 3 tiers, decoy-effect)
  },` : ""}
  "faq": {
    "items": [{ "question": string, "answer": string (2-4 zinnen) }] (5-8 items, gesorteerd op gewicht)
  },
  "finalCta": {
    "heading": string (belofte herhalen),
    "riskReducer": string (concreet drempel-verlagend element, bv "Vrijblijvend en binnen 24 uur reactie"; vermijd opsommende ontkenningen als "Geen X nodig"),
    "primaryCta": string (MOET IDENTIEK zijn aan hero.primaryCta, single-CTA discipline)
  }
}

# KRITISCHE REGELS (overtreding = automatic rejection)
1. **Single-CTA discipline**: finalCta.primaryCta MOET letterlijk identiek zijn aan hero.primaryCta. Geen synoniemen, geen variatie. Alle CTA's op de pagina drijven naar dezelfde actie.
2. **Headline = descriptief, max 60 tekens**: na 5 seconden moet de lezer exact weten WAT je verkoopt. Noem het product + de differentiator (descriptieve kern + emotionele register), geen vage benefit-slogan. Geen "Welkom bij..." of "De #1 oplossing voor...".
3. **Readability**: schrijf op 5e-7e graders niveau. Max 50 "moeilijke" woorden (3+ lettergrepen) per pagina. Vermijd jargon en leg acroniemen uit.
4. **Features 3-5 items**: paradox of choice. Belangrijkste feature eerst (anchoring).
5. **FAQ 5-8 items**: dek 3+ koop-barrières (prijs / implementatie / lock-in / security / vergelijking / geschiktheid).
6. **Cijfers uitsluitend uit context**: een concreet getal uit de brand-context ("30 uur per maand bespaard") wint van "geweldig product", maar een verzonnen getal is ERGER dan geen getal. Geen cijfers in de context = kwalitatief formuleren.
7. **Geen stockfoto-uitstraling**: alle copy authentiek en specifiek voor de brand.
8. **Locale ${opts.locale}**: alle content in deze taal.
9. **Transformatie-arc consistent**: pijn-bullets aan de 'van'-kant, features/testimonial/CTA aan de 'naar'-kant van de gekozen transformatie. Geen mismatch tussen problem-articulation en outcome-claims.
10. **Specifiek > generiek**: vervang elk woord dat op meerdere merken zou passen ("krachtig platform", "innovatieve oplossing") door iets dat ALLEEN bij DIT merk past (concrete output, sector-term, uitspraak die de bron-website zou kunnen onderschrijven).
11. **Geen herhaal-vocabulaire**: gebruik elk content-woord MAX 2× in de hele page (uitgezonderd: brand-naam, lidwoorden, kleine functiewoorden). Specifiek: "vakkundig"/"vakmanschap"/"professioneel"/"kwaliteit"/"deskundig" mogen samen niet vaker dan 3× verschijnen; herhaal-effect verzwakt de boodschap.
12. **Houd de bron-website-stijl aan, improviseer NIET**: tone-of-voice, sector-termen, klant-aanspreking en typische zinsstructuren komen uit de aangeleverde brand-context. Gebruik uitsluitend voorbeelden die bij DIT merk en DEZE sector passen. Geen generic SaaS-frasen voor traditionele branches en omgekeerd.
13. **Feature-pilaren binden terug op de hero (PAS-narratief)**: elke feature BEWIJST één pilaar van de hero-belofte; samen dekken ze de kern uit headline+subhead. De problem-sectie (van-kant) → features+testimonial (naar-kant) vormen één doorlopende boog. Geen losse, willekeurige features die "niet van elkaar weten".
14. **CTA = laagdrempelige eerste ask (micro-commitment)**: de primaire CTA is een lichte eerste stap passend bij een koude lezer (stalen/demo/adviesgesprek), NIET een zware ask (offerte/koop) die te vroeg komt en afschrikt. De single-CTA-discipline (regel 1) blijft: kies één lichte ask en herhaal die.
15. **Image-briefs = bewijs + onderlinge diversiteit**: elke feature-imageBrief visualiseert HET BEWIJS van DIE specifieke feature (reiniging → textiel in een wasserij-omgeving; levering → bezorgbus; duurzaamheid → certificaat-label op materiaal). De 3-4 feature-briefs MOETEN onderling verschillende sceneTypes hebben (minimaal 3 verschillende van de 5 types) óf duidelijk verschillende subjects. Max 1 "person"-scene per pagina, en NOOIT een frontale geposeerde portret-pose (geen "persoon kijkt met gekruiste armen in de camera"); kies candid/werkend/over-de-schouder. Subjects zijn concreet en fotografeerbaar (een object, een handeling, een plek), geen abstracties als "kwaliteit" of "vertrouwen". Beschrijf subjects UNBRANDED (geen logo's, merknamen of lettering op objecten/kleding/voertuigen) en neem in elke "avoid" standaard "brand logos or lettering" op (image-modellen verzinnen anders pseudo-logo's).
16. **Maximaal 1 opsommende ontkenning per pagina**: constructies als "geen X, geen Y" zijn maximaal 1 keer toegestaan op de hele pagina en NOOIT als drieslag of met een "alleen Z"-afsluiting ("geen X, geen Y, alleen Z" is verboden). Formuleer voordelen positief: wat de lezer WEL krijgt.

# COGNITIEVE FUNDAMENTEN (waarom dit werkt)
- Fogg's Behavior Model: elke sectie moet motivatie + ability + trigger versterken
- Cialdini's principes: social proof + authority + scarcity stapelen voor robuuste persuasie
- Kahneman's biases: anchoring in pricing, loss aversion in CTA-copy, paradox of choice → max 3-5 opties

# JSON-ONLY OUTPUT
Genereer ALLEEN het JSON-object, zonder prefix-zin, markdown code-fence of post-script. Begin direct met { en eindig met }.`;
}

function buildUserPrompt(
  params: LandingPageGenerationParams,
  opts: { locale: string },
): string {
  const brand = params.brand;
  const persona = params.persona;

  const brandLines: string[] = [];
  if (brand.brandName) brandLines.push(`- Brand: ${brand.brandName}`);
  if (brand.brandPromise) brandLines.push(`- Belofte: ${brand.brandPromise}`);
  if (brand.brandToneOfVoice) brandLines.push(`- Tone-of-voice: ${brand.brandToneOfVoice}`);
  if (brand.brandVoiceguide) brandLines.push(`- Voice guide: ${brand.brandVoiceguide}`);
  if (brand.brandColors) brandLines.push(`- Kleuren: ${brand.brandColors}`);
  if (brand.targetAudience) brandLines.push(`- Doelgroep (brand-niveau): ${brand.targetAudience}`);
  if (brand.industry) brandLines.push(`- Industrie: ${brand.industry}`);
  const brandBlock = brandLines.length > 0 ? brandLines.join("\n") : "- (geen brand-context aangeleverd)";

  const personaLines: string[] = [];
  if (persona?.name) personaLines.push(`- Naam: ${persona.name}`);
  if (persona?.role) personaLines.push(`- Rol: ${persona.role}`);
  if (persona?.painPoints && persona.painPoints.length > 0) {
    personaLines.push(`- Pijnpunten:\n  ${persona.painPoints.map((p) => `* ${p}`).join("\n  ")}`);
  }
  if (persona?.goals && persona.goals.length > 0) {
    personaLines.push(`- Doelen:\n  ${persona.goals.map((g) => `* ${g}`).join("\n  ")}`);
  }
  if (persona?.serialized && persona.serialized.trim().length > 0) {
    personaLines.push(`- Beschrijving:\n  ${persona.serialized.split("\n").map((l) => `  ${l}`).join("\n")}`);
  }
  const personaBlock = personaLines.length > 0 ? personaLines.join("\n") : "- (geen persona aangeleverd — schrijf voor breed publiek)";

  const opdrachtLabel =
    USER_PROMPT_LABELS[params.contentType ?? ""] ?? "LANDING-PAGE OPDRACHT";

  // W2 (plan §2.3) — productblok: de generator schrijft UITSLUITEND over dit
  // product, met de échte data. Het anti-hallucinatie-mandaat staat hard in
  // het blok zelf. Alleen voor product-page — andere types negeren een
  // (per ongeluk) meegegeven product zodat hun prompt onveranderd blijft.
  const productSection =
    params.product && params.contentType === "product-page"
      ? `\n\n# GEKOPPELD PRODUCT (schrijf UITSLUITEND hierover)\n${buildProductBlock(params.product)}`
      : "";

  return `# BRAND-CONTEXT
${brandBlock}

# DOELGROEP
${personaBlock}${productSection}

# ${opdrachtLabel}
${params.userPrompt}

# LOCALE
${opts.locale}

# OUTPUT
Genereer nu het JSON-object volgens schema. JSON-only, geen prose.`;
}

/**
 * W2 (plan §2.3) — rendert het ProductContext-blok voor de user-prompt. Toont
 * naam/description/category/pricing + feature→benefit-paren (gezipt op index;
 * een losse feature of benefit blijft staan) + useCases. Sluit af met een
 * harde anti-hallucinatie-regel: de generator mag geen features/specs/prijzen
 * verzinnen die niet in dit blok staan.
 */
function buildProductBlock(product: ProductContext): string {
  const lines: string[] = [];
  lines.push(`- Naam: ${product.name}`);
  if (product.category) lines.push(`- Categorie: ${product.category}`);
  if (product.description) lines.push(`- Beschrijving: ${product.description}`);
  if (product.pricingModel) lines.push(`- Prijsmodel: ${product.pricingModel}`);
  if (product.pricingDetails) lines.push(`- Prijsdetails: ${product.pricingDetails}`);

  const featureCount = Math.max(product.features.length, product.benefits.length);
  if (featureCount > 0) {
    lines.push(`- Feature → benefit-paren:`);
    for (let i = 0; i < featureCount; i++) {
      const feature = product.features[i];
      const benefit = product.benefits[i];
      if (feature && benefit) lines.push(`  * ${feature} → ${benefit}`);
      else if (feature) lines.push(`  * ${feature}`);
      else if (benefit) lines.push(`  * (benefit) ${benefit}`);
    }
  }
  if (product.useCases.length > 0) {
    lines.push(`- Use-cases:\n  ${product.useCases.map((u) => `* ${u}`).join("\n  ")}`);
  }

  // W2 (plan §2.1) — pageFlavor-preset stuurt welke conditionele secties de
  // generator benadrukt; één template, drie nadruk-presets.
  lines.push(`- Pagina-type: ${PAGE_FLAVOR_HINTS[derivePageFlavor(product)]}`);

  lines.push(
    `\nANTI-HALLUCINATIE: gebruik UITSLUITEND de features, benefits, use-cases, specs en prijzen uit dit blok. Verzin er geen bij: geen extra features, geen verzonnen specs, geen prijzen die hier niet staan. Ontbreekt prijsinformatie, laat de pricing-sectie dan weg of verwijs naar contact.`,
  );
  return lines.join("\n");
}

export type PageFlavor = "saas" | "physical" | "service";

const PAGE_FLAVOR_HINTS: Record<PageFlavor, string> = {
  saas:
    "SOFTWARE/SaaS. Benadruk processSteps ('zo werkt het') en integraties; geen fysieke specs-tabel tenzij de context echte specs noemt. Pricing alleen bij aangeleverde prijsinfo.",
  physical:
    "FYSIEK PRODUCT. Vul de specs-sectie met de aangeleverde specs (materiaal/afmetingen/compatibiliteit); benadruk tastbaar gebruik. Geen processSteps.",
  service:
    "DIENST. Benadruk processSteps ('zo werken we', 3-5 stappen); geen specs-tabel. Pricing alleen wanneer de context een prijs noemt, anders naar contact verwijzen.",
};

/**
 * W2 (plan §2.1) — leidt de pageFlavor af uit category + pricingModel. Heuristiek
 * met service- en saas-signaalwoorden; valt terug op prijsmodel-patronen en
 * uiteindelijk 'saas' (het meest voorkomende Branddock-producttype).
 */
export function derivePageFlavor(product: Pick<ProductContext, "category" | "pricingModel">): PageFlavor {
  const cat = (product.category ?? "").toLowerCase();
  const pm = (product.pricingModel ?? "").toLowerCase();
  const hay = `${cat} ${pm}`;
  const serviceSignals = ["service", "dienst", "consult", "agency", "bureau", "coaching", "training", "advies", "project"];
  const saasSignals = ["saas", "software", "platform", "app", "tool", "api", "cloud", "subscription"];
  if (serviceSignals.some((s) => hay.includes(s))) return "service";
  if (saasSignals.some((s) => hay.includes(s))) return "saas";
  if (/(subscription|monthly|per maand|maandelijks|mrr|abonnement)/.test(pm)) return "saas";
  if (/(one-?time|eenmalig|per stuk|per unit|aankoop|koop)/.test(pm)) return "physical";
  return "saas";
}

// ─── Per-type system-prompts (W1, plan §2.1/§3/§4) ───────

/** Gedeeld imageBrief-schemafragment voor de per-type OUTPUT-SCHEMA-blokken. */
const IMAGE_BRIEF_JSON =
  '{ "subject": string (max 200 tekens, concreet en UNBRANDED; geen logo\'s/merknaam-lettering op objecten), "sceneType": "object" | "process" | "location" | "detail" | "person", "composition": string (max 200 tekens), "avoid": string (neem standaard "brand logos or lettering" op) }';

/** Gedeelde anti-fabricage-regel — letterlijk per plan §3.2. */
const ANTI_FABRICATION_RULE =
  'Verzin geen prijzen, termijnen, garanties of beleid: staat het feit niet in de aangeleverde context, sla de vraag/sectie dan over of verwijs naar contact. Geen cijfers buiten de context; geen echte persoons- of bedrijfsnamen verzinnen.';

function buildFaqSystemPrompt(opts: SystemPromptOpts): string {
  return `# ROL
Je bent een Senior support-content-strateeg + brand-copywriter. Je schrijft
een standalone FAQ-pagina die echte klantvragen beantwoordt, geen
marketing-vragen (de klassieke NN/g-faalwijze van FAQ-pagina's).
${buildSharedStyleBlocks(opts)}
# OPDRACHT
Genereer een complete FAQ-pagina als **gestructureerd JSON** volgens het schema hieronder. Antwoord uitsluitend met het JSON-object (zonder prose, toelichting of code-fences).

# OUTPUT-SCHEMA
{
  "hero": {
    "headline": string (max 60 tekens, conversationeel in merkstem zoals "We helpen je graag", NIET droog "FAQ" of "Veelgestelde vragen" zonder merkstem),
    "subline": string (1-2 zinnen: waar deze pagina bij helpt + uitnodigende toon)
  },
  "popularQuestions": [{ "question": string (max 120 tekens, volledige vraagzin in KLANTTAAL met front-loaded keyword), "answer": string }] (3-5 items: de vragen met de hoogste koop-angst-lading EERST; denk verzending/levertijd/retour/prijs-onzekerheid),
  "categories": [{ "label": string (max 40 tekens, TAAK-gebaseerd en werkwoord-gedreven zoals "Bestellen & betalen"; nooit "Algemeen" als eerste), "items": [{ "question": string (max 120 tekens), "answer": string }] (3-5 per categorie) }] (1-3 categorieën),
  "contactEscape": {
    "heading": string ("Staat je vraag er niet bij?"-strekking, in merkstem),
    "body": string (1-2 zinnen: hoe en hoe snel er geholpen wordt; alleen kanalen/termijnen uit de context),
    "ctaLabel": string (max 48 tekens, action-led)
  },
  "closingCta": { "heading": string (zachte vervolgstap-belofte), "ctaLabel": string (max 48 tekens) }
}

# KRITISCHE REGELS (overtreding = automatic rejection)
1. **Antwoord-eerst (AEO)**: de EERSTE zin van elk antwoord beantwoordt de vraag volledig en zelfstandig leesbaar (40-60 woorden kern); daarna pas toelichting. Het antwoord moet citeerbaar zijn zonder de vraag erbij.
2. **Klanttaal**: vragen geformuleerd zoals een klant ze zou typen, niet zoals het bedrijf erover praat. Front-load het kernwoord ("Retourneren: hoe werkt het?").
3. **Anti-fabricage**: ${ANTI_FABRICATION_RULE}
4. **Bron-gedreven vragen**: leid vragen uitsluitend af uit de aangeleverde brand-context, producten, persona-bezwaren en opdracht; mix pre-purchase (bezwaren) en post-purchase (gebruik).
5. **Geen duplicaten**: een vraag staat in popularQuestions OF in een categorie, nooit in beide; geen near-duplicate vragen.
6. **Zinnen ≤25 woorden** (GOV.UK-leesbaarheid); schrijf op 5e-7e graders niveau.
7. **Locale ${opts.locale}**: alle content in deze taal.
8. **Volgorde = waarschijnlijkheid**: binnen elke lijst de meest waarschijnlijke klantvraag eerst.

# JSON-ONLY OUTPUT
Genereer ALLEEN het JSON-object, zonder prefix-zin, markdown code-fence of post-script. Begin direct met { en eindig met }.`;
}

function buildProductSystemPrompt(opts: SystemPromptOpts): string {
  return `# ROL
Je bent een Senior product-marketeer + conversion-copywriter. Je schrijft een
product/service-pagina volgens de bewezen arc: belofte → bewijs → diepte →
conversie (patroon van best-in-class pagina's als Stripe, Mollie, Linear).
${buildSharedStyleBlocks(opts)}
# OPDRACHT
Genereer een complete product/service-pagina als **gestructureerd JSON** volgens het schema hieronder. Antwoord uitsluitend met het JSON-object (zonder prose, toelichting of code-fences).

# OUTPUT-SCHEMA
{
  "hero": {
    "headline": string (max 60 tekens, OUTCOME-headline: de uitkomst voor de klant, niet de productcategorie. Goed: "Genereer sneller inkomsten". Fout: "Billing software"),
    "subline": string (1-2 zinnen die het GROOTSTE bezwaar van de doelgroep afvangen),
    "primaryCta": string (laagdrempelige self-serve eerste stap, action-led),
    "secondaryCta": string | optional (tweede koopmodus: demo/adviesgesprek/offerte; dual-CTA-patroon),
    "imageBrief": ${IMAGE_BRIEF_JSON} (de productcontext of dienst-in-uitvoering als scène)
  },
  "problem": { "heading": string, "body": string (korte alinea: de pijn zonder dit product, herkenbaar en concreet) },
  "solution": { "heading": string, "body": string (korte alinea: hoe dit product/deze dienst die pijn wegneemt; de brug naar de features) },
  "features": [{ "heading": string (2-6 woorden, benefit-led), "body": string (1-3 zinnen: feature-uitleg in benefit-frame; "wat je krijgt, wat dat betekent"), "imageBrief": ${IMAGE_BRIEF_JSON} }] (3-6 items in GEBRUIKSVOLGORDE van de klant, niet interne prioriteit; elke feature bewijst één pilaar van de hero-belofte),
  "useCases": [{ "heading": string, "body": string }] | optional (0-3 "voor wie / wanneer"-kaarten; alleen wanneer de context use-cases bevat),
  "specs": [{ "label": string, "value": string }] | optional (2-12 rijen, ALLEEN specificaties die letterlijk in de context staan; weglaten bij een dienst of ontbrekende specs),
  "processSteps": [{ "heading": string, "body": string }] | optional (3-5 stappen "zo werken we"; gebruik dit bij een DIENST i.p.v. specs),
  "pricing": { "heading": string, "body": string } | optional (UITSLUITEND wanneer prijsinformatie in de context staat; formuleer zoals aangeleverd; "vanaf"-indicatie mag, verzonnen bedragen nooit),
  "faq": [{ "question": string (max 120 tekens), "answer": string }] (3-4 bezwaar-gedreven vragen vlak voor de final CTA),
  "finalCta": {
    "heading": string (belofte herhalen),
    "body": string (1-2 zinnen risico-reductie/volgende stap),
    "primaryCta": string (MOET IDENTIEK zijn aan hero.primaryCta; single-CTA discipline),
    "secondaryCta": string | optional (zelfde tweede koopmodus als de hero)
  }
}

# KRITISCHE REGELS (overtreding = automatic rejection)
1. **Single-CTA discipline**: finalCta.primaryCta letterlijk identiek aan hero.primaryCta.
2. **Outcome boven categorie**: de headline beschrijft wat de klant BEREIKT; de subline maakt het geloofwaardig.
3. **Features = gebruiksvolgorde + bewijs**: orden features zoals de klant ze tegenkomt; elke feature-body eindigt impliciet of expliciet op het voordeel ("which means …"-methodiek).
4. **Anti-fabricage**: ${ANTI_FABRICATION_RULE} Geen testimonials of klantnamen; die sectie bestaat bewust niet in dit schema.
5. **Specs vs processSteps**: een fysiek/technisch product krijgt specs; een dienst krijgt processSteps; nooit allebei leeg verzinnen; weglaten mag.
6. **Image-briefs = bewijs + diversiteit**: elke feature-brief visualiseert het bewijs van DIE feature; onderling verschillende sceneTypes/subjects; max 1 "person"-scene; subjects UNBRANDED en "avoid" bevat standaard "brand logos or lettering".
7. **Readability**: 5e-7e graders niveau, zinnen ≤25 woorden, geen jargon zonder uitleg.
8. **Locale ${opts.locale}**: alle content in deze taal.
9. **Specifiek > generiek**: geen woorden die op elk merk passen; gebruik sector-termen en concrete output uit de context.

# JSON-ONLY OUTPUT
Genereer ALLEEN het JSON-object, zonder prefix-zin, markdown code-fence of post-script. Begin direct met { en eindig met }.`;
}

function buildMicrositeSystemPrompt(opts: SystemPromptOpts): string {
  return `# ROL
Je bent een Senior campagne-strateeg + storytelling-copywriter. Je schrijft een
campagne-microsite als ÉÉN lange scroll-pagina met ankersecties (IKEA Life at
Home / Patagonia Blue Heart-patroon): een these die hoofdstuk voor hoofdstuk
wordt bewezen en eindigt in één duidelijke deelname-actie.
${buildSharedStyleBlocks(opts)}
# OPDRACHT
Genereer een complete campagne-microsite als **gestructureerd JSON** volgens het schema hieronder. Antwoord uitsluitend met het JSON-object (zonder prose, toelichting of code-fences).

# OUTPUT-SCHEMA
{
  "heroManifest": {
    "navLabel": string (max 24 tekens, 1-2 woorden voor de ankernavigatie),
    "headline": string (max 80 tekens, THESE-headline met een meetbare claim of uitgesproken standpunt; moet zelfstandig de hele campagne communiceren),
    "subline": string (1-2 zinnen die de these laden),
    "primaryCta": string (de deelname-actie, action-led),
    "imageBrief": ${IMAGE_BRIEF_JSON} (full-bleed campagnebeeld)
  },
  "story": CHAPTER (verplicht; het verhaal/de aanleiding van de campagne),
  "impact": CHAPTER | optional (cijfers/resultaten/fases; alleen bij voldoende substantie in de context),
  "community": CHAPTER | optional (wie doet mee/bewijs uit de doelgroep; alleen bij voldoende substantie),
  "join": {
    "navLabel": string (max 24 tekens),
    "heading": string (de deelname-vraag),
    "body": string (1-3 zinnen: wat deelname inhoudt + waarom nu),
    "primaryCta": string (identieke strekking als heroManifest.primaryCta),
    "deadline": string | optional (einddatum/tijdvenster uit de context; HET urgentie-element van een campagne)
  }
}

CHAPTER = {
  "navLabel": string (max 24 tekens),
  "heading": string (hoofdstuk-kop die de arc verder vertelt),
  "intro": string | optional (1-2 zinnen hoofdstuk-inleiding),
  "blocks": [{ "heading": string | optional, "body": string (20-60 woorden; het vaste ritme vervangt animatie), "imageBrief": ${IMAGE_BRIEF_JSON} | optional }] (2-3 blokken),
  "stat": { "value": string (groot cijfer in merkstijl), "context": string (1 regel context) } | optional (ALLEEN cijfers uit de context),
  "quote": { "text": string, "attribution": string (functie-aanduiding, geen verzonnen naam) } | optional
}

# KRITISCHE REGELS (overtreding = automatic rejection)
1. **Storytelling-arc**: heroManifest stelt de these; story bewijst de aanleiding; impact/community verdiepen; join sluit af met actie. Elke sectie-kop vertelt de arc verder; de navLabels samen lezen als een verhaal.
2. **Zelfstandige hero**: de meerderheid scrollt niet ver; heroManifest moet de hele campagne alleen kunnen dragen.
3. **Urgentie via deadline**: tijdelijkheid onderscheidt een campagne van een evergreen pagina; neem de deadline op wanneer de context die geeft.
4. **20-60 woorden per blok**: korte, ritmische blokken; geen lange lappen tekst.
5. **Skip rather than pad**: laat impact/community weg wanneer de context te weinig substantie biedt; een dunne sectie verzwakt de arc.
6. **Anti-fabricage**: ${ANTI_FABRICATION_RULE}
7. **Image-briefs**: per hoofdstuk maximaal de blocks met een brief; onderling verschillende sceneTypes; subjects UNBRANDED en "avoid" bevat standaard "brand logos or lettering".
8. **Locale ${opts.locale}**: alle content in deze taal.
9. **Campagne-blueprint-mapping**: bevat de opdracht een campagne-strategie of verhaallijn, map die dan zo: kernconcept/these → heroManifest, aanleiding/strategie → story, fases/cijfers/resultaten → impact, bewijs/doelgroep-stemmen → community, aanbod + einddatum → join.

# JSON-ONLY OUTPUT
Genereer ALLEEN het JSON-object, zonder prefix-zin, markdown code-fence of post-script. Begin direct met { en eindig met }.`;
}

function buildLongFormGeoSystemPrompt(opts: SystemPromptOpts): string {
  return `# ROL
Je bent een Senior GEO-contentstrateeg + authority-copywriter. Je schrijft een
long-form artikel dat geoptimaliseerd is voor Generative Engine Optimization:
AI-antwoordmachines (ChatGPT, Perplexity, Google AI Overviews, Gemini) moeten
passages eruit zelfstandig kunnen CITEREN. Citeerbaarheid > vindbaarheid.
${buildSharedStyleBlocks(opts)}
${buildGeoDirective({ locale: opts.locale })}
# OPDRACHT
Genereer een compleet long-form GEO-artikel als **gestructureerd JSON** volgens het schema hieronder. Antwoord uitsluitend met het JSON-object (zonder prose, toelichting of code-fences).

# OUTPUT-SCHEMA
{
  "geoArticle": true,
  "hero": {
    "headline": string (max 80 tekens, het onderwerp/de kernvraag als heldere titel),
    "subline": string (1-2 zinnen die de scope van het artikel laden),
    "imageBrief": ${IMAGE_BRIEF_JSON} | optional
  },
  "answerFirstIntro": string (40-60 woorden die DE kernvraag meteen én zelfstandig beantwoorden — citeerbaar door een AI-engine zónder de rest van het artikel),
  "tldr": [string] (2-5 bullets: de key takeaways, elk zelfstandig leesbaar),
  "sections": [{ "heading": string, "body": string (de artikel-body in atomic chunks van 2-4 zinnen die elk los citeerbaar zijn) }] (min 1),
  "qa": [{ "question": string (max 120 tekens, klanttaal), "answer": string (antwoord-eerst, zelfstandig leesbaar) }] (min 2),
  "citeableStats": [{ "label": string, "value": string, "source": string | null (een titel of URL EXACT uit de "## CITEERBARE BRONNEN"- of "## GEVERIFIEERD BRONMATERIAAL"-lijst als het cijfer daaruit komt; null voor een eigen/first-party merk-cijfer of als er geen passende bron in die lijsten staat; NOOIT een interne laagnaam of verzonnen bron) }] (min 1),
  "definitions": [{ "term": string, "definition": string }] | optional (sleuteltermen helder gedefinieerd — entity-clarity),
  "comparison": { "caption": string | optional, "columns": [string] (min 2 koppen, incl. de eerste kenmerk-kolom), "rows": [{ "label": string, "cells": [string] }] } | optional (multi-kolom vergelijking — een van de hoogst-geciteerde formats),
  "listItems": [{ "rank": number, "title": string, "body": string }] | optional (genummerde listicle — een van de hoogst-geciteerde formats),
  "sources": [{ "title": string, "url": string }] | optional (de échte bronnen — titel + URL — uit het aangeleverde bronmateriaal die je in citeableStats[].source refereert),
  "finalCta": { "heading": string, "ctaLabel": string (max 48 tekens) }
}

# KRITISCHE REGELS (overtreding = automatic rejection)
1. **geoArticle = true**: het veld "geoArticle" MOET letterlijk true zijn (de discriminant; weglaten = rejection).
2. **Answer-first (AEO)**: answerFirstIntro, elke qa.answer EN de eerste zin van elke sectie beantwoorden hun punt volledig + zelfstandig leesbaar; een AI-engine moet die passage los kunnen citeren.
3. **Citeerbare stats — citeer alleen uit "## CITEERBARE BRONNEN" of "## GEVERIFIEERD BRONMATERIAAL"**: komt een cijfer uit het aangeleverde bronmateriaal, zet de source dan op een titel of URL EXACT zoals vermeld in de "## CITEERBARE BRONNEN"- of "## GEVERIFIEERD BRONMATERIAAL"-lijst (en neem een bijbehorende URL op in de top-level "sources"-lijst). De "## GEVERIFIEERD BRONMATERIAAL"-lijst bevat echte, gedateerde externe cijfers — geef die stats de VOORKEUR: kopieer de waarde letterlijk en gebruik de vermelde bron. Geef sowieso de voorkeur aan een echte bron boven weglaten — een uit dat bronmateriaal afgeleid cijfer hoort een bron te krijgen. Ontbreken beide lijsten, staat er geen passende bron in, of is het cijfer een eigen/first-party merk-gegeven (bv. "X restaurants gebruiken ons"), dan source null. NOOIT een bron of cijfer verzinnen, en NOOIT een interne laagnaam als bron: de woorden "brand-context", "briefing", "evidence pieces" en "delivery evidence" mogen niet in een source voorkomen.
4. **Atomic chunking**: schrijf sections in zelfstandige brokken van 2-4 zinnen — geen lange lappen; elk brok moet los citeerbaar zijn.
5. **Entity-clarity**: definieer sleuteltermen (definitions) en gebruik volledige entiteitsnamen, geen vage verwijzingen ("dit", "het systeem").
6. **Anti-fabricage**: ${ANTI_FABRICATION_RULE} Stats, bronnen, URLs en definities UITSLUITEND uit de context; verzin geen bronnen of links. Heeft een cijfer geen echte externe bron, laat de stat-source dan null — een verzonnen of interne-laag-"bron" is erger dan geen bron.
7. **Hoog-citeerbare formats**: gebruik comparison (multi-kolom) en/of listItems wanneer de inhoud zich ervoor leent — deze formats winnen AI-citaties.
8. **Geen markdown in veld-strings**: lever platte tekst; de renderer verzorgt de opmaak (geen **bold**, # of tabel-syntax in de strings).
9. **Readability**: 5e-7e graders niveau, zinnen ≤25 woorden, jargon alleen mét uitleg.
10. **Locale ${opts.locale}**: alle content in deze taal.

# JSON-ONLY OUTPUT
Genereer ALLEEN het JSON-object, zonder prefix-zin, markdown code-fence of post-script. Begin direct met { en eindig met }.`;
}

/** Type-aware opdracht-label voor het user-prompt (LP behoudt het exacte oude label). */
const USER_PROMPT_LABELS: Record<string, string> = {
  "faq-page": "FAQ-PAGINA OPDRACHT",
  "product-page": "PRODUCT/SERVICE-PAGINA OPDRACHT",
  microsite: "CAMPAGNE-MICROSITE OPDRACHT",
  "blog-post": "LONG-FORM GEO-ARTIKEL OPDRACHT",
  "pillar-page": "LONG-FORM GEO-ARTIKEL OPDRACHT",
  whitepaper: "LONG-FORM GEO-ARTIKEL OPDRACHT",
  "case-study": "LONG-FORM GEO-ARTIKEL OPDRACHT",
  ebook: "LONG-FORM GEO-ARTIKEL OPDRACHT",
  "linkedin-article": "LONG-FORM GEO-ARTIKEL OPDRACHT",
  "thought-leadership": "LONG-FORM GEO-ARTIKEL OPDRACHT",
};

/** Union-veilige headline-accessor (diagnostiek/divergentie-checks). */
export function variantHeadline(v: PageVariantContent): string {
  if ("heroManifest" in v) return v.heroManifest.headline;
  return v.hero.headline;
}

/** Union-veilige hero-visual-accessor; faq-page heeft geen hero-beeldslot. */
export function variantHeroVisualUrl(v: PageVariantContent): string | null | undefined {
  if ("heroManifest" in v) return v.heroManifest.heroVisualUrl;
  return "heroVisualUrl" in v.hero ? v.hero.heroVisualUrl : null;
}

// ─── Response parser ─────────────────────────────────────

export type ParseResult =
  | { success: true; data: LandingPageVariantContent }
  | { success: false; errors: Array<{ path: string; message: string }>; rawText: string };

/**
 * Extraheert JSON uit Claude's response en valideert via Zod.
 * Tolereert: code-fences (```json ... ```), leading/trailing whitespace,
 * leading prose ("Hier is..."), trailing prose ("Hoop dat dit helpt!").
 * Pure functie.
 */
export function parseLandingPageVariantResponse(text: string): ParseResult {
  const jsonText = extractJsonBlock(text);
  if (!jsonText) {
    return {
      success: false,
      errors: [{ path: "", message: "Geen JSON-object gevonden in response" }],
      rawText: text,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return {
      success: false,
      errors: [
        {
          path: "",
          message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      rawText: jsonText,
    };
  }

  const validation = validateLandingPageVariant(parsed);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors,
      rawText: jsonText,
    };
  }
  return { success: true, data: validation.data };
}

export type PageParseResult =
  | { success: true; data: PageVariantContent }
  | { success: false; errors: Array<{ path: string; message: string }>; rawText: string };

/**
 * W1 — type-aware variant van parseLandingPageVariantResponse: valideert
 * tegen het schema van het content-type (faq/product/microsite eigen schema;
 * al het andere het LP-schema). parseLandingPageVariantResponse blijft
 * bestaan voor LP-getypeerde consumers (tell-rewrite, auto-iterate).
 */
export function parsePageVariantResponse(
  text: string,
  contentType: string | null | undefined,
): PageParseResult {
  if (!hasOwnVariantSchema(contentType)) {
    return parseLandingPageVariantResponse(text);
  }
  const jsonText = extractJsonBlock(text);
  if (!jsonText) {
    return {
      success: false,
      errors: [{ path: "", message: "Geen JSON-object gevonden in response" }],
      rawText: text,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return {
      success: false,
      errors: [
        { path: "", message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}` },
      ],
      rawText: jsonText,
    };
  }
  const result = getVariantSchemaForType(contentType).safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      rawText: jsonText,
    };
  }
  // Vangnet: scrub interne context-laagnamen uit citeableStats[].source van GEO-articles
  // (leak-klasse Effie 2026-05-17). Aan de bron, zodat de opgeslagen variant schoon is en
  // render + geo-analysis + flatten-variant allemaal meeprofiteren.
  const data =
    (result.data as { geoArticle?: unknown }).geoArticle === true
      ? sanitizeLongFormGeoVariant(result.data as Record<string, unknown>)
      : result.data;
  return { success: true, data: data as PageVariantContent };
}

/**
 * Extraheer het eerste { ... } JSON-blok uit de tekst. Heeft balans-tellen
 * zodat geneste objects niet vroegtijdig stoppen op een binnen-string }.
 * Tolereert ```json fences. Retourneert null als geen balanced block te vinden.
 */
function extractJsonBlock(text: string): string | null {
  // Strip code-fences
  let working = text.trim();
  const fenceMatch = working.match(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/);
  if (fenceMatch) {
    working = fenceMatch[1].trim();
  }

  // Find first { and matching closing }
  const start = working.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < working.length; i++) {
    const c = working[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        return working.slice(start, i + 1);
      }
    }
  }
  return null;
}

// ─── Generator orchestrator ──────────────────────────────

/**
 * Prompt-template semver voor AICallSnapshot.promptVersion (learning-loop).
 * 2.0.0 = audit 2026-06-10: HVD-injectie + anti-fabricage + anti-drieslag +
 * de-em-dash + dynamische brand-voorbeelden (was ongeversioneerd).
 * 2.1.0 = GEO/SEO Fase 3: canonieke buildGeoDirective() ingebed in de long-form
 * GEO-prompt (gedeeld met de GEO-polish-stage zodat de paden niet driften).
 */
export const LP_VARIANT_PROMPT_VERSION = "2.1.0";

export interface GenerationResult {
  /** LP-shape voor landing-page/comparison-page; type-eigen shape (W1) voor
   *  faq-page/product-page/microsite. Consumers die LP-velden lezen moeten
   *  op contentType gaten of via de schema-dispatch narrowen. */
  variant: PageVariantContent;
  inputTokens: number;
  outputTokens: number;
  retried: boolean;
  /** P3b — het creative-angle-label van deze variant (null bij axis-fallback). */
  angleLabel?: string | null;
  /** Audit 2026-06-10 — werkelijk gebruikte prompt + model, zodat de route
   *  AICallSnapshot/AICallTrace kan schrijven (LP was onzichtbaar voor de
   *  prompt-registry/learning-loop). */
  prompt: BuiltPrompt;
  modelUsed: string;
}

/**
 * Genereer een landing-page variant via Anthropic. Single-shot — geen
 * generator-level retry. anthropicClient.createChatCompletion doet zelf
 * al 3 retries op transient errors (5xx/timeouts) met exponential backoff.
 *
 * Optionele `temperature` override stelt batch-callers in staat 2 variants
 * te produceren met verschillende creativiteits-niveaus (zie
 * generateLandingPageVariantBatch). Default = STRUCTURED-config (0.1).
 *
 * Bij JSON-validation-fail throw met detailed errors — caller toont een
 * "Probeer opnieuw" knop in UI.
 *
 * Verbruikt ANTHROPIC_API_KEY env-var via anthropicClient singleton.
 */
export async function generateLandingPageVariant(
  params: LandingPageGenerationParams,
  opts?: { temperature?: number; model?: string },
): Promise<GenerationResult> {
  const prompt = buildLandingPageVariantPrompt(params);

  // W1 — per-type output-budget: faq (tot 20 Q&A's), product (6 features +
  // specs) en microsite (4 chapters) zijn omvangrijker dan een LP; sinds de
  // F1 truncatie-throws betekent een krap budget een harde fout, geen stille
  // afkapping. LP behoudt exact het bestaande budget.
  const maxTokens = hasOwnVariantSchema(params.contentType) ? 6000 : 4500;

  // Audit 2026-06-10: model komt via canvas-model-routing uit de route
  // ('Website & Landing Pages' → claude-sonnet-4-6, benchmark 91). NB: op
  // sonnet-4-6+ dropt anthropic-client de temperature-param (deprecated) —
  // variant-divergentie leunt dan volledig op angles/axes, wat sinds P3a/P3b
  // toch al het primaire divergentie-mechanisme is.
  const response = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    {
      useCase: "STRUCTURED",
      // 3500 → 4500 (R7, audit 2026-06-10): 4-5 imageBriefs (~400 extra
      // output-tokens) mogen de JSON-staart niet afkappen.
      maxTokens,
      timeoutMs: 90_000,
      ...(opts?.model ? { model: opts.model } : {}),
      ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
    },
  );

  const parse = parsePageVariantResponse(response.content, params.contentType);
  if (!parse.success) {
    const errorList = parse.errors
      .map((e) => `${e.path || "(root)"}: ${e.message}`)
      .join("; ");
    throw new Error(
      `Landing-page variant validation failed. Errors: ${errorList}`,
    );
  }

  return {
    variant: parse.data,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    retried: false,
    angleLabel: params.angleLabel ?? null,
    prompt,
    modelUsed: opts?.model ?? "claude-sonnet-4-5-20250929",
  };
}

/**
 * Genereer N variants (1-4, P3a) parallel met gespreide temperature-waarden
 * voor meaningful variation. 2 is de default (user-keuze A/B); hogere counts
 * geven meer invalshoeken tegen evenredig meer generatie-tijd/kosten.
 *
 * Twee-fase strategie:
 *  1. Parallel via Promise.allSettled (snel, ~max van de N calls)
 *  2. Bij partial failure: sequential retry per failed index met recovery-temp.
 *     Levert reliability boost zonder de happy-path N× zo lang te maken.
 *
 * Worst-case timing schaalt met N (parallel ~90s + per gefaalde slot 1 retry).
 * Typische timing: parallel ~30-50s, geen retry nodig.
 *
 * Bij alle attempts fail throw met aggregated error-details.
 */
/**
 * P3a — gespreide temperatures per count (geen clustering → meer divergentie).
 * Pure + geëxporteerd voor deterministische smoke-tests.
 */
export function variantTemperatures(count: number): number[] {
  return count === 1 ? [0.4]
    : count === 2 ? [0.4, 0.7]
    : count === 3 ? [0.3, 0.55, 0.8]
    : [0.25, 0.45, 0.65, 0.85];
}

/**
 * P3a — N-aware generieke fallback-assen (klassieke CRO-divergentie), maximaal
 * onderling onderscheidend. Alleen gebruikt wanneer dynamische angles ontbreken.
 * Bij count===1 (of buiten 2-4): de user-axis als enige slot. Pure + geëxporteerd.
 */
export function fallbackAxes(count: number, userAxis: VariantAxis | null = null): (VariantAxis | null)[] {
  return count === 2 ? ["problem-led", "benefit-led"]
    : count === 3 ? ["problem-led", "benefit-led", "story-led"]
    : count === 4 ? ["problem-led", "benefit-led", "data-led", "emotional"]
    : [userAxis];
}

export async function generateLandingPageVariantBatch(
  params: LandingPageGenerationParams,
  count: 1 | 2 | 3 | 4 = 2,
  angles?: CreativeAngle[] | null,
  batchOpts?: { model?: string },
): Promise<GenerationResult[]> {
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new Error(`generateLandingPageVariantBatch: count must be an integer 1-4, got ${count}`);
  }
  const TEMPERATURES = variantTemperatures(count);
  // +0.1..0.15 recovery-buffer per gebruikte temp; `?? 0.5` blijft vangnet.
  const RECOVERY_TEMPERATURES: Record<number, number> = {
    0.25: 0.35, 0.3: 0.4, 0.4: 0.5, 0.45: 0.55,
    0.55: 0.62, 0.65: 0.72, 0.7: 0.55, 0.8: 0.88, 0.85: 0.92,
  };

  // P3b — wanneer dynamische creative-angles beschikbaar zijn (genoeg voor de
  // count) gebruiken we die als divergentie-frame (brand-specifiek). Anders de
  // generieke axis-paring (problem-led vs benefit-led, klassieke CRO A/B split).
  const useAngles = Array.isArray(angles) && angles.length >= count;
  const AXIS_PAIR = fallbackAxes(count, params.variantAxis ?? null);
  const slotParams = (i: number): LandingPageGenerationParams => {
    // Per-slot guard: `useAngles` borgt al length>=count, maar val per slot terug
    // op de axis als een angle onverhoopt ontbreekt (defensief tegen toekomstige
    // count>angles-mismatch) i.p.v. crashen op angles![i].
    const angle = useAngles ? angles![i] : null;
    return angle
      ? { ...params, angleInstruction: formatAngleInstruction(angle), angleLabel: angle.label, variantAxis: null }
      : { ...params, variantAxis: AXIS_PAIR[i] ?? params.variantAxis ?? null };
  };

  // Fase 1: parallel attempt — elk slot met eigen angle/axis + temperature
  const initial = await Promise.allSettled(
    TEMPERATURES.map((temperature, i) =>
      generateLandingPageVariant(slotParams(i), { temperature, model: batchOpts?.model }),
    ),
  );

  const results: (GenerationResult | null)[] = initial.map((r) =>
    r.status === "fulfilled" ? r.value : null,
  );

  // Log failures voor diagnostics
  initial.forEach((r, i) => {
    if (r.status === "rejected") {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.warn(
        `[variant-batch] Initial attempt for temp=${TEMPERATURES[i]} failed: ${msg}`,
      );
    }
  });

  // Fase 2: sequential retry voor failed slots met recovery-temperature.
  // Axis blijft behouden zodat retry niet alsnog naar identical fallback verglijdt.
  for (let i = 0; i < results.length; i++) {
    if (results[i] === null) {
      const retryTemp = RECOVERY_TEMPERATURES[TEMPERATURES[i]] ?? 0.5;
      try {
        console.warn(
          `[variant-batch] Retrying slot ${i} with recovery-temp ${retryTemp}...`,
        );
        results[i] = await generateLandingPageVariant(
          slotParams(i),
          { temperature: retryTemp, model: batchOpts?.model },
        );
      } catch (retryErr) {
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error(`[variant-batch] Slot ${i} retry also failed: ${msg}`);
      }
    }
  }

  const successes = results.filter((r): r is GenerationResult => r !== null);
  if (successes.length === 0) {
    throw new Error(
      `All ${count} variant-generations failed (incl. recovery retries). See server logs.`,
    );
  }

  // Diagnostic-log: print hero-headlines naast elkaar zodat we in server-logs
  // direct kunnen zien of de axis-divergentie effectief is. User-bevinding
  // 2026-05-27 dat variants nog 'identiek' lijken kunnen we hier herleiden.
  if (successes.length >= 2) {
    const headlines = successes.map((r, i) => `  [${i}] axis=${AXIS_PAIR[i] ?? 'none'} headline="${variantHeadline(r.variant)}"`).join('\n');
    console.log(`[variant-batch] Generated ${successes.length} variants:\n${headlines}`);
    // Crude similarity check: dezelfde eerste 3 woorden = waarschuwing.
    // N-way: elk paar vergelijken zodat de check ook bij 3/4 variants klopt.
    const firstWords = (s: string) => s.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    for (let j = 0; j < successes.length - 1; j++) {
      for (let k = j + 1; k < successes.length; k++) {
        if (firstWords(variantHeadline(successes[j].variant)) === firstWords(variantHeadline(successes[k].variant))) {
          console.warn(`[variant-batch] WARNING: variants ${j} en ${k} delen eerste 3 woorden van headline — axis-divergentie mogelijk niet effectief. Check prompt rendering + Anthropic response.`);
        }
      }
    }
  }

  // #5 60/30/10 color-distribution check per variant (#5 design-quality).
  // Schat anti-pattern: te veel brand-accent op de page. Niet-blokkerend —
  // alleen logging zodat we toekomstige UI-warning kunnen voeden.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dist = require('./color-distribution') as typeof import('./color-distribution');
    type Category = import('./color-distribution').ColorBudgetCategory;
    successes.forEach((r, i) => {
      // Schat section-bgs op basis van archetype + variant-content
      // Hero: useFullBleed wanneer heroVisualUrl gezet → secondary, anders dominant
      const heroBgCategory: Category = variantHeroVisualUrl(r.variant) ? 'secondary' : 'dominant';
      const sections: { componentType: string; areaPct: number; bgCategory: Category }[] = [
        { componentType: 'BrandHero', areaPct: dist.getComponentAreaPct('BrandHero'), bgCategory: heroBgCategory },
        { componentType: 'FeatureGrid', areaPct: dist.getComponentAreaPct('FeatureGrid'), bgCategory: 'dominant' },
        { componentType: 'Testimonial', areaPct: dist.getComponentAreaPct('Testimonial'), bgCategory: 'accent' },
        { componentType: 'FAQ', areaPct: dist.getComponentAreaPct('FAQ'), bgCategory: 'dominant' },
        { componentType: 'BrandCTA', areaPct: dist.getComponentAreaPct('BrandCTA'), bgCategory: 'dominant' },
        { componentType: 'Footer', areaPct: dist.getComponentAreaPct('Footer'), bgCategory: 'secondary' },
      ];
      const result = dist.estimateColorDistribution(sections);
      if (result.warning) {
        console.warn(`[variant-batch] color-distribution variant[${i}]: ${result.warning} (accent=${result.accentPct}%, dominant=${result.dominantPct}%, secondary=${result.secondaryPct}%)`);
      }
    });
  } catch (err) {
    // Non-critical — color-distribution check faalt = log + verder
    console.warn(`[variant-batch] color-distribution check failed (non-critical): ${err instanceof Error ? err.message : String(err)}`);
  }
  return successes;
}

// Re-export schema voor convenient consumer-import
export { landingPageVariantSchema };
