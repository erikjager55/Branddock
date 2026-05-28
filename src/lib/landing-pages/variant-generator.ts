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

import { anthropicClient } from "../ai/anthropic-client";
import type { BrandContextBlock } from "../ai/prompt-templates";
import {
  landingPageVariantSchema,
  type LandingPageVariantContent,
  validateLandingPageVariant,
} from "./variant-schema";
import type { BrandArchetype } from "./brand-archetype-classifier";
import type { LayoutStyle } from "./design-system";

// ─── Types ───────────────────────────────────────────────

export interface LandingPageGenerationParams {
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
    "Open met de outcome. Hero-headline beschrijft het eindresultaat dat de doelgroep wil bereiken. Features-sectie is het hart van de pagina, ge-framed als concrete vooruitgangen. Geen lange pijn-uitwijding — direct naar transformation.",
  rational:
    "Argumenten op cijfers, mechaniek en evidence. Concrete getallen in headlines waar mogelijk. Testimonials nadruk op meetbare resultaten (uren bespaard, conversie-lift). Geen superlatieven, geen emotie-driven taal.",
  emotional:
    "Argumenten op identiteit, gevoel en aspiratie. Headlines spreken tot wie de lezer wil zijn. Testimonials nadruk op transformatie van persoon/team. Sensorische taal en aspirational verbs.",
  "story-led":
    "Hero-headline introduceert protagonist + spanning. Sections lopen narrative-arc: situatie → conflict → resolutie. Final-CTA als climax. Geen losse feature-lijstjes — alles ingebed in verhaal.",
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

  const system = buildSystemPrompt({
    locale,
    includeProblem,
    includePricing,
    archetype: params.archetype ?? null,
    layoutStyle: params.layoutStyle ?? null,
    vocabularyDo: params.vocabularyDo ?? null,
    vocabularyDont: params.vocabularyDont ?? null,
    voiceSample: params.voiceSample ?? null,
    variantAxis: params.variantAxis ?? null,
  });
  const user = buildUserPrompt(params, { locale });
  return { system, user };
}

// ─── Tone + content-depth hints (Sub-Sprint E) ────────────

const ARCHETYPE_TONE_HINTS: Record<BrandArchetype, string> = {
  INNOCENT: 'optimistic, simple, honest, hopeful — use positive verbs, avoid corporate jargon',
  EXPLORER: 'adventurous, independent, authentic — speak to autonomy and discovery',
  SAGE: 'authoritative, considered, knowledgeable — evidence-led, no exaggeration',
  HERO: 'bold, confident, action-led — strong verbs, no hedging, "you can"-framing',
  OUTLAW: 'rebellious, direct, anti-establishment — challenge conventions explicitly',
  MAGICIAN: 'visionary, transformative, mysterious — speak to possibility and change',
  REGULAR_GUY: 'down-to-earth, friendly, inclusive — plain language, no superlatives',
  LOVER: 'intimate, passionate, sensual — evoke emotion and beauty',
  JESTER: 'playful, witty, light — humor where appropriate, never preachy',
  CARETAKER: 'warm, protective, supportive — empathy first, reassurance throughout',
  CREATOR: 'inventive, original, expressive — celebrate craft and intentionality',
  RULER: 'premium, authoritative, refined — quiet confidence, no sales-y exclamation',
};

const LAYOUT_DEPTH_HINTS: Record<LayoutStyle, string> = {
  MINIMAL: 'Sparse content. Body sentences max 14 words. Each section feels considered. White-space respect — say less.',
  EDITORIAL: 'Magazine-style depth. Body paragraphs 2-3 sentences. Sub-headlines that develop the theme. Reward attentive readers.',
  COMMERCIAL: 'Tight, scannable. Direct value-prop. Bullet-friendly. Quick wins above the fold.',
  EXPERIENTIAL: 'Story-driven. Hero headline emotional. Build narrative through sections. Pay off at final CTA.',
  PLAYFUL: 'Warm + casual. Conversational tone. Concrete examples over abstract claims. Joy in micro-copy.',
};

function buildSystemPrompt(opts: {
  locale: string;
  includeProblem: boolean;
  includePricing: boolean;
  archetype: BrandArchetype | null;
  layoutStyle: LayoutStyle | null;
  vocabularyDo?: string[] | null;
  vocabularyDont?: string[] | null;
  voiceSample?: string | null;
  variantAxis?: VariantAxis | null;
}): string {
  const toneBlock = opts.archetype
    ? `\n# BRAND-ARCHETYPE: ${opts.archetype}\nTone: ${ARCHETYPE_TONE_HINTS[opts.archetype]}\n`
    : '';
  const depthBlock = opts.layoutStyle
    ? `\n# CONTENT-DEPTH (LayoutStyle: ${opts.layoutStyle})\n${LAYOUT_DEPTH_HINTS[opts.layoutStyle]}\n`
    : '';
  // DTS C1 — vocabulary-rails (alleen wanneer beide arrays minstens 3 items hebben)
  const hasVocab =
    Array.isArray(opts.vocabularyDo) && opts.vocabularyDo.length >= 3 &&
    Array.isArray(opts.vocabularyDont) && opts.vocabularyDont.length >= 3;
  const vocabBlock = hasVocab
    ? `\n# VOCABULAIRE-DISCIPLINE\nGebruik deze woorden/zinnen waar natuurlijk: ${opts.vocabularyDo!.map((w) => `"${w}"`).join(', ')}.\nVermijd deze: ${opts.vocabularyDont!.map((w) => `"${w}"`).join(', ')}.\n`
    : '';
  // DTS C2 — voice few-shot sample
  const sample = opts.voiceSample?.trim();
  const voiceBlock = sample && sample.length >= 30
    ? `\n# VOICE-VOORBEELD (match dit rhythm + sentence-length + vocabulaire)\n> ${sample.replace(/\n/g, '\n> ')}\n`
    : '';
  // Variant-axis block — forceert structureel andere invalshoek voor
  // batch-variants. Zonder dit produceert temperature-variatie alleen
  // bijna-identieke output omdat de rest van de prompt deterministische
  // 'beste-antwoord' framing eist. We zetten dit BOVENAAN de prompt en
  // herhalen het EISEND in de output-regels zodat Claude geneigd is om
  // het te respecteren ook al klinken beide aanpakken op zich logisch.
  const axisBlock = opts.variantAxis
    ? `\n# !! VARIANT-INVALSHOEK (HARD CONSTRAINT) !!: ${opts.variantAxis.toUpperCase()}\n${VARIANT_AXIS_HINTS[opts.variantAxis]}\n\nDIT IS GEEN OPTIE — het is de KERN van deze variant. Andere variants in dezelfde batch volgen een EXPLICIET ANDERE as (bv: problem-led ↔ benefit-led). Onze users zien de twee variants NAAST ELKAAR en moeten ze direct kunnen onderscheiden:\n  - Hero-headline moet de gekozen invalshoek meteen tonen\n  - Volgorde van secties moet de invalshoek versterken\n  - Tone en woordkeus moet substantieel afwijken\nWanneer beide variants 'rond hetzelfde middenpad' uitkomen, hebben we GEFAALD — neem het risico van een uitgesproken kant.\n`
    : '';
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
(maar SCHRIJF deze niet in output — alleen interne richtlijn):

1. AESTHETIC EXTREME — kies één en stuur ALLE keuzes ernaar:
   - 'refined minimalism' (witruimte, beperkt palet, premium typografie)
   - 'bold maximalism' (grote contrasten, asymmetrie, durf-kleur)
   - 'editorial magazine' (long-form, serif display, rythme uit spacing)
   - 'industrial/technical' (mono-typografie, grid, data-driven feel)
   - 'warm humanist' (zachte palet, ronde vormen, persoonlijke taal)
   - 'rebellious/anti-corporate' (sharp edges, contrast, unexpected layout)
   Wees uitgesproken — een variant die 'op alle merken zou kunnen passen'
   is mislukt.

2. TRANSFORMATIE-ARC — articuleer in 1 zin de reis die de lezer maakt:
   'van ... naar ...' (bv: 'van frustratie naar controle', 'van handmatig
   naar geautomatiseerd', 'van isolatie naar community'). Alle copy moet
   die arc reflecteren — pijn-bullets aan de 'van'-kant, features +
   testimonial + CTA aan de 'naar'-kant.

3. REFERENCE-AESTHETIC — denk aan welk merk visueel/tonaal de norm zet
   voor deze pagina. Bv: 'Linear voor B2B-clarity', 'Patagonia voor
   purpose-driven', 'Apple voor premium-restraint', 'Notion voor
   playful-pragmatic'. Niet copiëren — gebruik als compass voor
   tone-of-voice en woordkeus.

4. ANTI-DEFAULTS — vermijd actief:
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
${toneBlock}${depthBlock}${vocabBlock}${voiceBlock}${axisBlock}${blueprintBlock}${designDirectionBlock}
# OPDRACHT
Genereer een complete landing-page variant als **gestructureerd JSON** volgens het schema hieronder. Geen prose, geen toelichting, geen code-fences — alleen het JSON-object als response.

# OUTPUT-SCHEMA
{
  "hero": {
    "headline": string (max 44 tekens, 5-10 woorden, benefit-led — geen feature-led),
    "subhead": string (1-2 zinnen, context + pijnpunt-erkenning),
    "primaryCta": string (action-led werkwoord, bv "Start mijn proefperiode"),
    "secondaryCta": string | optional (Hobson's Choice +1, bv "Bekijk demo"),
    "heroVisualUrl": string | optional (placeholder voor v2)
  },
  "trust": {
    "type": "logos" | "testimonial-quote" | "authority-statement",
    "items": [{ "label": string, "mediaUrl": string | optional }] (1-7 items)
  },${opts.includeProblem ? `
  "problem": {
    "heading": string (pijn als vraag of stelling),
    "painBullets": string[] (3-5 concrete frustraties),
    "bridgingSentence": string (brug naar oplossing — voorkomt doom-and-gloom)
  },` : ""}
  "features": {
    "sectionHeading": string,
    "items": [{ "icon": string (lucide-icon naam, geen emoji), "heading": string (2-4 woorden), "body": string (1-2 zinnen benefit-frame) }] (3-5 items)
  },
  "socialProof": {
    "testimonials": [{ "quote": string, "authorName": string, "authorRole": string, "authorCompany": string, "outcome": string | optional }] (EXACT 1 item — sterkste single quote met outcome-cijfer wint van meerdere generieke quotes),
    "impactStats": [{ "value": string, "label": string }] | optional (max 4 items)
  },${opts.includePricing ? `
  "pricing": {
    "tiers": [{ "name": string, "price": string, "features": string[], "highlighted": boolean }] (EXACT 3 tiers — decoy-effect)
  },` : ""}
  "faq": {
    "items": [{ "question": string, "answer": string (2-4 zinnen) }] (5-8 items, gesorteerd op gewicht)
  },
  "finalCta": {
    "heading": string (belofte herhalen),
    "riskReducer": string (bv "Geen creditcard nodig"),
    "primaryCta": string (MOET IDENTIEK zijn aan hero.primaryCta — single-CTA discipline)
  }
}

# KRITISCHE REGELS (overtreding = automatic rejection)
1. **Single-CTA discipline**: finalCta.primaryCta MOET letterlijk identiek zijn aan hero.primaryCta. Geen synoniemen, geen variatie. Alle CTA's op de pagina drijven naar dezelfde actie.
2. **Headline max 44 tekens**: korter, benefit-led. Geen "Welkom bij..." of "De #1 oplossing voor...".
3. **Readability**: schrijf op 5e-7e graders niveau. Max 50 "moeilijke" woorden (3+ lettergrepen) per pagina. Geen jargon, geen acronymen zonder uitleg.
4. **Features 3-5 items**: paradox of choice. Belangrijkste feature eerst (anchoring).
5. **FAQ 5-8 items**: dek 3+ koop-barrières (prijs / implementatie / lock-in / security / vergelijking / geschiktheid).
6. **Concrete cijfers** in testimonials: "30 uur per maand bespaard" wint van "geweldig product".
7. **Geen stockfoto-uitstraling**: alle copy authentiek en specifiek voor de brand.
8. **Locale ${opts.locale}**: alle content in deze taal.
9. **Transformatie-arc consistent**: pijn-bullets aan de 'van'-kant, features/testimonial/CTA aan de 'naar'-kant van de gekozen transformatie. Geen mismatch tussen problem-articulation en outcome-claims.
10. **Specifiek > generiek**: vervang elk woord dat op meerdere merken zou passen ("krachtig platform", "innovatieve oplossing") door iets dat ALLEEN bij DIT merk past (concrete output, sector-term, uitspraak die de bron-website zou kunnen onderschrijven).

# COGNITIEVE FUNDAMENTEN (waarom dit werkt)
- Fogg's Behavior Model: elke sectie moet motivatie + ability + trigger versterken
- Cialdini's principes: social proof + authority + scarcity stapelen voor robuuste persuasie
- Kahneman's biases: anchoring in pricing, loss aversion in CTA-copy, paradox of choice → max 3-5 opties

# JSON-ONLY OUTPUT
Genereer ALLEEN het JSON-object. Geen "Hier is de landing-page:" prefix, geen markdown code-fence, geen post-script. Begin direct met { en eindig met }.`;
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

  return `# BRAND-CONTEXT
${brandBlock}

# DOELGROEP
${personaBlock}

# LANDING-PAGE OPDRACHT
${params.userPrompt}

# LOCALE
${opts.locale}

# OUTPUT
Genereer nu het JSON-object volgens schema. JSON-only, geen prose.`;
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

export interface GenerationResult {
  variant: LandingPageVariantContent;
  inputTokens: number;
  outputTokens: number;
  retried: boolean;
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
  opts?: { temperature?: number },
): Promise<GenerationResult> {
  const prompt = buildLandingPageVariantPrompt(params);

  const response = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    {
      useCase: "STRUCTURED",
      maxTokens: 3500,
      timeoutMs: 90_000,
      ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
    },
  );

  const parse = parseLandingPageVariantResponse(response.content);
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
  };
}

/**
 * Genereer N variants parallel met verschillende temperature-waarden voor
 * meaningful variation. 2 variants is de geadviseerde count voor user-keuze:
 *   - variant A (conservative, temp 0.3) — close to spec-by-the-book
 *   - variant B (creative, temp 0.7)     — more adventurous tone/framing
 *
 * Twee-fase strategie:
 *  1. Parallel via Promise.allSettled (snel, ~max(call_1, call_2))
 *  2. Bij partial failure: sequential retry per failed index met recovery-temp
 *     (creative 0.7 → 0.5; conservative 0.3 → 0.4). Levert reliability boost
 *     zonder elk de happy-path 2× zo lang te maken.
 *
 * Worst-case timing: 90s × 2 (2 sequential retries) + 90s parallel = ~4.5 min.
 * Typische timing: parallel ~30-50s, geen retry nodig.
 *
 * Bij alle attempts fail throw met aggregated error-details.
 */
export async function generateLandingPageVariantBatch(
  params: LandingPageGenerationParams,
  count: 1 | 2 = 2,
): Promise<GenerationResult[]> {
  const TEMPERATURES = count === 2 ? [0.4, 0.7] : [0.4];
  const RECOVERY_TEMPERATURES: Record<number, number> = { 0.4: 0.5, 0.7: 0.55 };

  // Variant-axis per slot: kiest structureel andere invalshoek per variant
  // zodat de twee outputs nooit bijna-identiek zijn. Default-paring is
  // problem-led vs benefit-led (klassieke CRO A/B split). Override via
  // params.variantAxis? Nee — voor batch overschrijven we expliciet om
  // het paar te garanderen. Single-shot callers respecteren params.variantAxis.
  const AXIS_PAIR: (VariantAxis | null)[] = count === 2
    ? ["problem-led", "benefit-led"]
    : [params.variantAxis ?? null];

  // Fase 1: parallel attempt — elk slot met eigen axis + temperature
  const initial = await Promise.allSettled(
    TEMPERATURES.map((temperature, i) =>
      generateLandingPageVariant(
        { ...params, variantAxis: AXIS_PAIR[i] ?? params.variantAxis ?? null },
        { temperature },
      ),
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
          { ...params, variantAxis: AXIS_PAIR[i] ?? params.variantAxis ?? null },
          { temperature: retryTemp },
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
    const headlines = successes.map((r, i) => `  [${i}] axis=${AXIS_PAIR[i] ?? 'none'} headline="${r.variant.hero.headline}"`).join('\n');
    console.log(`[variant-batch] Generated ${successes.length} variants:\n${headlines}`);
    // Crude similarity check: dezelfde eerste 3 woorden = waarschuwing
    const firstWords = (s: string) => s.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    if (successes.length >= 2 && firstWords(successes[0].variant.hero.headline) === firstWords(successes[1].variant.hero.headline)) {
      console.warn('[variant-batch] WARNING: Variants share first 3 words of headline — axis-divergentie mogelijk niet effectief. Check prompt rendering + Anthropic response.');
    }
  }
  return successes;
}

// Re-export schema voor convenient consumer-import
export { landingPageVariantSchema };
