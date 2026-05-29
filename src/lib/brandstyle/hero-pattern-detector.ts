/**
 * Hero pattern detector — vision-AI call die de hero-screenshot van de
 * bron-website classifieert in één van 6 layout-archetypes.
 *
 * Fase C van LP-fidelity verbeterplan (2026-05-27).
 *
 * Doel: de gegenereerde LP volgt het ECHTE layout-patroon van de bron
 * (centered editorial / image-split / full-bleed / etc.) i.p.v. een
 * archetype-default die niet matcht met wat de bron toont.
 *
 * Gated by `BRANDSTYLE_HERO_PATTERN=1` env var zodat we het apart kunnen
 * uitrollen + roll-backen zonder de complete analyzer te raken.
 */

import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";

export type HeroPattern =
  | "CENTERED_EDITORIAL"      // Tekst gecentreerd, geen image of subtiel
  | "IMAGE_RIGHT_SPLIT"        // Tekst links, image rechts (50/50 of 60/40)
  | "IMAGE_LEFT_SPLIT"         // Tekst rechts, image links
  | "FULL_BLEED_IMAGE"         // Image als achtergrond, tekst-overlay
  | "VIDEO_BG"                 // Video-loop als achtergrond
  | "TEXT_LEFT_FORM_RIGHT";    // Tekst links, signup-form/CTA rechts

export interface HeroPatternResult {
  pattern: HeroPattern;
  confidence: "high" | "medium" | "low";
  textAlignment: "left" | "center" | "right";
  hasHeroImage: boolean;
  reasoning: string;
}

export function isHeroPatternEnabled(): boolean {
  return process.env.BRANDSTYLE_HERO_PATTERN === "1";
}

const HERO_PATTERN_PROMPT = `Je krijgt een hero-screenshot van een website (de bovenste ~800px above-the-fold). Classifeer de layout volgens DEZE 6 patronen:

1. CENTERED_EDITORIAL — Tekst (h1 + sub + CTA) gecentreerd op de pagina. Geen prominente image, of alleen een klein/subtiel decoratief element. Vaak veel whitespace. Typische editorial brands.

2. IMAGE_RIGHT_SPLIT — Two-column layout: tekst-content (h1, sub, CTA) staat links, een grote image/illustration staat rechts. Roughly 50/50 of 60/40 verhouding.

3. IMAGE_LEFT_SPLIT — Spiegel van #2: image links, tekst rechts.

4. FULL_BLEED_IMAGE — Een grote image vult de hele hero (background-image). Tekst staat als overlay erbovenop met scrim/gradient voor leesbaarheid. Heel immersief.

5. VIDEO_BG — Een video-loop fungeert als achtergrond, tekst-overlay erbovenop. Vergelijkbaar met FULL_BLEED maar dynamisch.

6. TEXT_LEFT_FORM_RIGHT — Specifiek voor lead-gen LPs: tekst-pitch links, een signup-form of email-capture rechts.

OUTPUT FORMAT (strict JSON, geen prose):
{
  "pattern": "CENTERED_EDITORIAL" | "IMAGE_RIGHT_SPLIT" | "IMAGE_LEFT_SPLIT" | "FULL_BLEED_IMAGE" | "VIDEO_BG" | "TEXT_LEFT_FORM_RIGHT",
  "confidence": "high" | "medium" | "low",
  "textAlignment": "left" | "center" | "right",
  "hasHeroImage": boolean,
  "reasoning": "1-2 zinnen waarom je dit patroon herkent"
}

Wees streng — als geen van de 6 patterns matcht, kies de dichtstbijzijnde + confidence:"low".`;

/**
 * Detecteer hero-pattern uit een PNG-buffer screenshot. Returns null
 * wanneer Anthropic-call faalt; caller behandelt fallback (archetype-default).
 *
 * Kosten: 1 Claude Sonnet vision-call met 1 PNG-image (typisch ~600 tokens
 * input voor 1280x800 PNG + ~150 output) — verwaarloosbaar per scrape.
 */
export async function detectHeroPattern(
  heroPngBuffer: Buffer,
): Promise<HeroPatternResult | null> {
  try {
    const result = await createClaudeStructuredCompletion<HeroPatternResult>(
      "Je bent een visueel ontwerper die hero-layouts classifeert. Output strict JSON volgens schema.",
      HERO_PATTERN_PROMPT,
      {
        images: [{ buffer: heroPngBuffer, mediaType: "image/png" }],
        maxTokens: 500,
        timeoutMs: 30_000,
      },
    );
    if (
      result.pattern &&
      ["CENTERED_EDITORIAL", "IMAGE_RIGHT_SPLIT", "IMAGE_LEFT_SPLIT", "FULL_BLEED_IMAGE", "VIDEO_BG", "TEXT_LEFT_FORM_RIGHT"].includes(result.pattern)
    ) {
      return result;
    }
    console.warn("[hero-pattern] Invalid pattern in response:", result);
    return null;
  } catch (err) {
    console.warn(
      `[hero-pattern] Detection failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
