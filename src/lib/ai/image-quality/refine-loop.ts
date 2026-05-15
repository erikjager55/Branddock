// =============================================================
// Pattern D — Image-to-image refine loop (image-quality-chain ADR pending).
//
// Wanneer een gegenereerde image laag scoort op visual-fidelity, kan een
// refine-pass de problemen targetten via image-to-image regeneration. Deze
// module bouwt de diagnostic-hint uit de dimension-breakdown en construeert
// de modified prompt voor de refine-call.
//
// Heuristiek-gebaseerd (geen ML): map dimension → action-template. Werkt
// voor de huidige 5 dimensies van `visual-ai-judge.ts`. Nieuwe dimensies
// vereisen een toevoeging aan DIMENSION_REFINE_HINTS.
//
// Triggering en provider-keuze leven in de route die deze module gebruikt;
// hier alleen pure-functions voor hint-extraction + prompt-modification.
// =============================================================

import type { VisualDimensionKey } from "@/lib/brand-fidelity/visual-ai-judge";

/**
 * Default threshold waaronder refine-loop in aanmerking komt. Komt overeen
 * met `thresholdMet` flag in `ContentVisualFidelityScore` (default 70). We
 * pakken 65 zodat alleen duidelijk-onder-publishable scores triggeren, niet
 * marginale gevallen waar regenerate kosten-baten-twijfelachtig is.
 */
export const REFINE_TRIGGER_THRESHOLD = 65;

/**
 * Max aantal refine-iteraties per DeliverableComponent. Voorkomt runaway
 * cost wanneer een image structureel niet boven de threshold komt. iterations
 * worden bijgehouden in `DeliverableComponent.iterationCount`.
 */
export const REFINE_MAX_ITERATIONS = 2;

/**
 * Per-dimensie diagnostic-hint templates. Worden gecombineerd in volgorde
 * van severity (lowest score first) tot een refine-prompt-modification.
 *
 * Belangrijk: de hints zijn instructies aan het IMAGE-model (Gemini Image,
 * Flux), niet aan een tekst-model. Dus actionable visual directives, geen
 * meta-commentaar over de score zelf.
 */
const DIMENSION_REFINE_HINTS: Record<VisualDimensionKey, string> = {
  "style-coherence":
    "match the brand's visual style more strictly — reduce stylistic deviation, maintain consistent rendering approach",
  "mood-fit":
    "shift the mood and atmosphere to better align with the brand personality (warmer/cooler, more confident/playful as appropriate)",
  composition:
    "improve composition: clearer focal point, balanced negative space, follow rule-of-thirds, remove visual clutter",
  "text-in-image":
    "remove ALL text from the image — no captions, no signage, no typography overlays, no logo letters, no embedded words",
  "logo-fidelity":
    "remove any logos or brand marks — the image must not contain competitor logos or hallucinated brand identifiers",
  "subject-identity":
    "preserve the original subject more faithfully — maintain recognizable identity, pose, and key visual traits from the source",
};

/**
 * Resultaat van diagnostic-hint extraction. Geeft de caller voldoende
 * informatie om een refine-call te schedulen + UI-feedback te tonen.
 */
export interface RefineHint {
  /** Concrete instructie-tekst om aan het image-model door te geven. */
  instruction: string;
  /** Dimensies die de hint targette (sorted by severity ascending). */
  targetedDimensions: VisualDimensionKey[];
  /** Originele scores per gerichte dimensie — voor logging + UI-context. */
  scores: Record<VisualDimensionKey, number>;
}

/**
 * Extract refine-hint uit een gestructureerde dimension-breakdown.
 * Returns null wanneer alle dimensies ≥ threshold (geen refine nodig) of
 * wanneer geen valide dimensies meekomen.
 *
 * Strategie:
 * - Pak alle dimensies met score < REFINE_TRIGGER_THRESHOLD
 * - Sort ascending op score (slechtste eerst)
 * - Concateneer hint-templates met "; " separator
 * - Max 3 hints in instructie — voorkomt prompt-bloat
 */
export function extractRefineHint(
  dimensions: Record<string, { score: number; rationale?: string }>,
): RefineHint | null {
  const entries = Object.entries(dimensions)
    .filter(([key, dim]) => {
      // Skip unknown dimensies (geen hint-template = geen actie)
      const hasTemplate = (DIMENSION_REFINE_HINTS as Record<string, string>)[key];
      return (
        typeof hasTemplate === "string" &&
        typeof dim.score === "number" &&
        dim.score < REFINE_TRIGGER_THRESHOLD
      );
    })
    .sort(([, a], [, b]) => a.score - b.score);

  if (entries.length === 0) return null;

  const targeted = entries.slice(0, 3);
  const instructions = targeted.map(([key]) =>
    DIMENSION_REFINE_HINTS[key as VisualDimensionKey],
  );

  const scores: Record<VisualDimensionKey, number> = {} as Record<
    VisualDimensionKey,
    number
  >;
  for (const [key, dim] of targeted) {
    scores[key as VisualDimensionKey] = dim.score;
  }

  return {
    instruction: instructions.join("; "),
    targetedDimensions: targeted.map(([key]) => key as VisualDimensionKey),
    scores,
  };
}

/**
 * Bouw een refine-prompt uit de originele prompt + diagnostic hint.
 * Output is een single prompt geschikt voor image-to-image providers
 * (Gemini Image compose, FLUX Pro Kontext img2img).
 *
 * Strategie: prepend de instructie voor maximum impact (image-model wegen
 * vroege tokens zwaarder), behoud de originele subject-context als anchor.
 */
export function buildRefinePromptModification(
  originalPrompt: string,
  hint: RefineHint,
): string {
  return `Improve this image: ${hint.instruction}. Keep the original subject and composition intent: ${originalPrompt}`;
}
