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
}

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

  const system = buildSystemPrompt({ locale, includeProblem, includePricing });
  const user = buildUserPrompt(params, { locale });
  return { system, user };
}

function buildSystemPrompt(opts: {
  locale: string;
  includeProblem: boolean;
  includePricing: boolean;
}): string {
  return `# ROL
Je bent een conversion rate optimization (CRO) specialist met 12+ jaar ervaring met B2B SaaS en breed bedrijfsleven landing-pages. Je weet dat elk woord op een landing-page de bezoeker richting conversie beweegt of er vanaf — neutrale copy bestaat niet.

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
    "testimonials": [{ "quote": string, "authorName": string, "authorRole": string, "authorCompany": string, "outcome": string | optional }] (1-3 items),
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
 * Genereer een landing-page variant via Anthropic. Bij validation-failure
 * één retry waarbij de errors als feedback worden teruggegeven. Bij 2e fail
 * throw — caller moet vangen en gracefully degraden (bv fallback naar markdown-route).
 *
 * Verbruikt ANTHROPIC_API_KEY env-var via anthropicClient singleton.
 */
export async function generateLandingPageVariant(
  params: LandingPageGenerationParams,
): Promise<GenerationResult> {
  const prompt = buildLandingPageVariantPrompt(params);

  const firstResponse = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    { useCase: "CHAT", maxTokens: 4096 },
  );

  const firstParse = parseLandingPageVariantResponse(firstResponse.content);
  if (firstParse.success) {
    return {
      variant: firstParse.data,
      inputTokens: firstResponse.inputTokens,
      outputTokens: firstResponse.outputTokens,
      retried: false,
    };
  }

  // Retry with error feedback
  const errorFeedback = firstParse.errors
    .map((e) => `- ${e.path || "(root)"}: ${e.message}`)
    .join("\n");
  const retryUserPrompt = `${prompt.user}

# VORIGE POGING WAS ONGELDIG
De vorige JSON-output schond het schema:
${errorFeedback}

Genereer opnieuw, deze keer schema-conform. JSON-only output.`;

  const retryResponse = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: prompt.system },
      { role: "user", content: retryUserPrompt },
    ],
    { useCase: "CHAT", maxTokens: 4096 },
  );

  const retryParse = parseLandingPageVariantResponse(retryResponse.content);
  if (retryParse.success) {
    return {
      variant: retryParse.data,
      inputTokens: firstResponse.inputTokens + retryResponse.inputTokens,
      outputTokens: firstResponse.outputTokens + retryResponse.outputTokens,
      retried: true,
    };
  }

  throw new Error(
    `Landing-page variant generation failed after retry. Errors: ${retryParse.errors
      .map((e) => `${e.path}: ${e.message}`)
      .join("; ")}`,
  );
}

// Re-export schema voor convenient consumer-import
export { landingPageVariantSchema };
