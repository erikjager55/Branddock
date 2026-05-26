/**
 * Brand-archetype AI-classifier (Pad C Sub-Sprint B).
 *
 * Classificeert workspace brand-context naar één van Jung's 12 archetypes
 * gebruikt door brand-emergent rendering (BrandHero/Features/etc.) voor
 * visuele design-keuzes. Anthropic-call met structured output.
 *
 * Verbruik: 1× per workspace (cached op BrandStyleguide.archetype).
 * Re-classify alleen wanneer brand-essence / archetype-asset materially
 * verandert (manueel via re-run-trigger).
 *
 * Pure logic + 1 AI-call. Caller is verantwoordelijk voor caching +
 * persistence in DB.
 */

import { anthropicClient } from "../ai/anthropic-client";

// ─── Public types ────────────────────────────────────────

export type BrandArchetype =
  | "INNOCENT"
  | "EXPLORER"
  | "SAGE"
  | "HERO"
  | "OUTLAW"
  | "MAGICIAN"
  | "REGULAR_GUY"
  | "LOVER"
  | "JESTER"
  | "CARETAKER"
  | "CREATOR"
  | "RULER";

export type ClassifierConfidence = "high" | "medium" | "low";

export interface ClassifierResult {
  archetype: BrandArchetype;
  confidence: ClassifierConfidence;
  reasoning: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ClassifierInput {
  brandName?: string | null;
  /** Vrije-tekst brand-personality (uit BrandAssetVersion). */
  brandPersonality?: string | null;
  /** Vrije-tekst brand-archetype (legacy free-form, indien aanwezig). */
  brandArchetypeText?: string | null;
  brandEssence?: string | null;
  brandPurpose?: string | null;
  brandPromise?: string | null;
  brandStory?: string | null;
  brandValues?: string[] | null;
  industry?: string | null;
  /** Visuele hints uit scraper: detected color-mood, photography-style, etc. */
  brandColors?: string | null;
  brandImageryStyle?: string | null;
  brandToneOfVoice?: string | null;
}

// ─── Constants ───────────────────────────────────────────

const ARCHETYPES_DESCRIPTION = `
INNOCENT      — purity, optimism, simplicity, honesty (Coca-Cola, Dove)
EXPLORER      — freedom, adventure, individuality, authenticity (Patagonia, Jeep, REI)
SAGE          — wisdom, knowledge, expertise, truth-seeking (Google, BBC, McKinsey, Branddock)
HERO          — courage, mastery, achievement, transformation (Nike, BMW, FedEx)
OUTLAW        — rebellion, revolution, disruption, breaking convention (Harley-Davidson, Virgin)
MAGICIAN      — transformation, vision, mystery, making dreams real (Disney, Apple, Tesla)
REGULAR_GUY   — belonging, down-to-earth, accessibility, friendship (IKEA, eBay, Levi's)
LOVER         — passion, intimacy, sensuality, beauty (Chanel, Häagen-Dazs, Victoria's Secret)
JESTER        — joy, humor, fun, lightheartedness (Old Spice, M&Ms, Skittles)
CARETAKER     — service, protection, nurture, compassion (Johnson & Johnson, Volvo, UNICEF)
CREATOR       — innovation, imagination, self-expression, originality (Lego, Adobe, Crayola)
RULER         — control, leadership, premium quality, exclusivity (Mercedes, Rolex, LINFI)
`;

// ─── Prompt builder ──────────────────────────────────────

function buildClassifierPrompt(input: ClassifierInput): {
  system: string;
  user: string;
} {
  const system = `Je bent een brand-strategy expert getraind in Jung's 12 brand-archetypes (Mark & Pearson framework). Je krijgt brand-context input en classificeert naar precies één archetype.

# Archetypes en kernkenmerken
${ARCHETYPES_DESCRIPTION}

# Methodologie
1. Identificeer de dominante drijver in de brand-context (control? wisdom? rebellion? joy? etc.)
2. Match aan het archetype waarvan de kernwaarden het sterkst overeenkomen
3. Kies ÉÉN archetype — geen hybrides (combinaties bestaan in praktijk, maar voor design-decisions hebben we 1 dominante nodig)
4. Score confidence op basis van hoe duidelijk de signalen zijn:
   - high: brand-essence + values + tone wijzen unaniem dezelfde kant op
   - medium: meerderheid van signalen, maar 1-2 conflicterend
   - low: weinig context óf gemengde signalen — gok beredeneerd

# Output-formaat
ALLEEN valid JSON, geen prose:
{
  "archetype": "RULER" | "MAGICIAN" | ... (één van de 12 enum-waardes EXACT),
  "confidence": "high" | "medium" | "low",
  "reasoning": "1-2 zinnen Nederlandse uitleg met concrete brand-signalen die de keuze ondersteunen"
}`;

  const facts: string[] = [];
  if (input.brandName) facts.push(`- Brand: ${input.brandName}`);
  if (input.industry) facts.push(`- Industrie: ${input.industry}`);
  if (input.brandPurpose) facts.push(`- Purpose: ${input.brandPurpose}`);
  if (input.brandEssence) facts.push(`- Essence: ${input.brandEssence}`);
  if (input.brandPromise) facts.push(`- Promise: ${input.brandPromise}`);
  if (input.brandPersonality) facts.push(`- Personality: ${input.brandPersonality}`);
  if (input.brandArchetypeText) facts.push(`- Bestaande archetype-tekst (legacy): ${input.brandArchetypeText}`);
  if (input.brandStory) facts.push(`- Story: ${input.brandStory}`);
  if (input.brandValues && input.brandValues.length > 0) {
    facts.push(`- Values: ${input.brandValues.join(", ")}`);
  }
  if (input.brandToneOfVoice) facts.push(`- Tone-of-voice: ${input.brandToneOfVoice}`);
  if (input.brandColors) facts.push(`- Brand-colors: ${input.brandColors}`);
  if (input.brandImageryStyle) facts.push(`- Imagery-style: ${input.brandImageryStyle}`);

  const factBlock = facts.length > 0 ? facts.join("\n") : "- (zeer beperkte context aangeleverd — classify op basis van wat er is)";

  const user = `Classificeer onderstaande brand naar één archetype.

# Brand-context
${factBlock}

# Output
Genereer JSON volgens schema. JSON-only.`;

  return { system, user };
}

// ─── Response parser ─────────────────────────────────────

function parseClassifierResponse(text: string): {
  success: boolean;
  data?: { archetype: BrandArchetype; confidence: ClassifierConfidence; reasoning: string };
  error?: string;
} {
  let working = text.trim();
  // Strip code-fences
  const fenceMatch = working.match(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/);
  if (fenceMatch) working = fenceMatch[1].trim();

  // Extract first { ... }
  const start = working.indexOf("{");
  if (start === -1) return { success: false, error: "Geen JSON-object gevonden" };
  let depth = 0;
  let inString = false;
  let escape = false;
  let jsonText: string | null = null;
  for (let i = start; i < working.length; i++) {
    const c = working[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) { jsonText = working.slice(start, i + 1); break; }
    }
  }
  if (!jsonText) return { success: false, error: "Unbalanced JSON braces" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    return { success: false, error: `JSON parse: ${err instanceof Error ? err.message : "unknown"}` };
  }

  if (!parsed || typeof parsed !== "object") {
    return { success: false, error: "Response is geen object" };
  }
  const obj = parsed as Record<string, unknown>;

  const validArchetypes: BrandArchetype[] = [
    "INNOCENT", "EXPLORER", "SAGE", "HERO", "OUTLAW", "MAGICIAN",
    "REGULAR_GUY", "LOVER", "JESTER", "CARETAKER", "CREATOR", "RULER",
  ];
  const archetype = obj.archetype;
  if (typeof archetype !== "string" || !validArchetypes.includes(archetype as BrandArchetype)) {
    return { success: false, error: `Invalid archetype: ${archetype}` };
  }

  const validConfidences: ClassifierConfidence[] = ["high", "medium", "low"];
  const confidence = obj.confidence;
  if (typeof confidence !== "string" || !validConfidences.includes(confidence as ClassifierConfidence)) {
    return { success: false, error: `Invalid confidence: ${confidence}` };
  }

  const reasoning = obj.reasoning;
  if (typeof reasoning !== "string" || reasoning.length === 0) {
    return { success: false, error: "Missing reasoning" };
  }

  return {
    success: true,
    data: {
      archetype: archetype as BrandArchetype,
      confidence: confidence as ClassifierConfidence,
      reasoning,
    },
  };
}

// ─── Main classifier ─────────────────────────────────────

/**
 * Classify brand naar één Jung-archetype. Single Anthropic-call met
 * structured JSON output. Bij JSON-parse-fail of invalid-enum: throw.
 *
 * Caller cachet result in BrandStyleguide.archetype/Confidence/Reasoning.
 */
export async function classifyBrandArchetype(
  input: ClassifierInput,
): Promise<ClassifierResult> {
  const prompt = buildClassifierPrompt(input);
  const response = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    { useCase: "STRUCTURED", maxTokens: 500, timeoutMs: 60_000 },
  );

  const parsed = parseClassifierResponse(response.content);
  if (!parsed.success || !parsed.data) {
    throw new Error(
      `Brand-archetype classification failed: ${parsed.error ?? "unknown"}`,
    );
  }

  return {
    archetype: parsed.data.archetype,
    confidence: parsed.data.confidence,
    reasoning: parsed.data.reasoning,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}

// Expose internal functies voor smoke-tests
export { buildClassifierPrompt, parseClassifierResponse };
