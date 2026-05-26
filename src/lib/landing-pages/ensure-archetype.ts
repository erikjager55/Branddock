/**
 * Lazy brand-archetype classification (Pad C V2-1).
 *
 * Doel: bij landing-page generation auto-classificeren wanneer BrandStyleguide
 * nog geen archetype heeft. Resultaat wordt gepersist zodat volgende calls het
 * uit canvas-context lezen (geen tweede AI-call). Bestaande workspaces krijgen
 * zo zonder migratie-script hun archetype gevuld op het moment dat ze het
 * daadwerkelijk nodig hebben (variant-generator gebruikt het voor tone-hints,
 * brand-render-rules voor visuele decisions).
 *
 * Failure-mode: bij classifier-error wordt **niet** ge-throwed — archetype
 * blijft null en de variant-generator valt terug op layoutStyle-only. Doel is
 * dat een classifier-hapering nooit een landing-page generation blokkeert.
 *
 * Module-design: pure helpers (buildClassifierInputFromBrand,
 * hasSufficientSignalForClassification) zijn geïsoleerd van Prisma-import,
 * zodat smoke-tests ze kunnen importeren zonder DATABASE_URL.
 */
import type { BrandContextBlock } from "@/lib/ai/prompt-templates";
import {
  type BrandArchetype,
  type ClassifierConfidence,
  type ClassifierInput,
} from "./brand-archetype-classifier";

export interface EnsureArchetypeResult {
  archetype: BrandArchetype | null;
  /** True wanneer deze call de classifier draaide (i.t.t. cache-hit / skip). */
  classified: boolean;
  /** Aanwezig wanneer classifier draaide en succesvol terugkwam. */
  confidence?: ClassifierConfidence;
  inputTokens?: number;
  outputTokens?: number;
}

/** Pure mapping van BrandContextBlock naar ClassifierInput. Geen side effects. */
export function buildClassifierInputFromBrand(
  brand: BrandContextBlock,
): ClassifierInput {
  return {
    brandName: brand.brandName ?? null,
    brandPersonality: brand.brandPersonality ?? null,
    brandArchetypeText: brand.brandArchetype ?? null,
    brandEssence: brand.brandEssence ?? null,
    brandPurpose: brand.brandPurpose ?? null,
    brandPromise: brand.brandPromise ?? null,
    brandStory: brand.brandStory ?? null,
    brandValues: brand.brandValues ?? null,
    industry: brand.industry ?? null,
    brandColors: brand.brandColors ?? null,
    brandImageryStyle: brand.brandImageryStyle ?? null,
    brandToneOfVoice: brand.brandToneOfVoice ?? null,
  };
}

/**
 * Returnt true wanneer er genoeg brand-signal is om een classifier-call te
 * rechtvaardigen. Voorkomt verspilde Anthropic-tokens op kale workspaces.
 */
export function hasSufficientSignalForClassification(
  input: ClassifierInput,
): boolean {
  return (
    !!input.brandName ||
    !!input.brandPersonality ||
    !!input.brandArchetypeText ||
    !!input.brandEssence ||
    !!input.brandPurpose ||
    !!input.brandPromise ||
    !!input.brandStory ||
    (input.brandValues?.length ?? 0) > 0
  );
}

/**
 * Ensure BrandStyleguide.archetype is set voor deze workspace. Als al gezet:
 * no-op + return current. Als null + signal aanwezig: classify via Anthropic +
 * persist + return. Als null + geen signal: skip zonder AI-call.
 *
 * Bij failure (AI-error, parse-fail, DB-error): returnt archetype=null zonder
 * te throwen. Caller beslist of dat een hard-fail moet zijn.
 */
export async function ensureBrandArchetype(
  workspaceId: string,
  currentArchetype: BrandArchetype | null,
  brand: BrandContextBlock,
): Promise<EnsureArchetypeResult> {
  if (currentArchetype) {
    return { archetype: currentArchetype, classified: false };
  }

  const input = buildClassifierInputFromBrand(brand);

  if (!hasSufficientSignalForClassification(input)) {
    return { archetype: null, classified: false };
  }

  try {
    // Lazy imports — module-load van prisma triggert DATABASE_URL check; door
    // dit dynamisch te doen kunnen pure-helper smokes deze module laden
    // zonder DB-context.
    const { classifyBrandArchetype } = await import("./brand-archetype-classifier");
    const { prisma } = await import("@/lib/prisma");
    const result = await classifyBrandArchetype(input);
    await prisma.brandStyleguide.update({
      where: { workspaceId },
      data: {
        archetype: result.archetype,
        archetypeConfidence: result.confidence,
        archetypeReasoning: result.reasoning,
      },
    });
    return {
      archetype: result.archetype,
      classified: true,
      confidence: result.confidence,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  } catch (err) {
    console.error(
      `[ensureBrandArchetype] Classification failed for workspace ${workspaceId}:`,
      err instanceof Error ? err.message : err,
    );
    return { archetype: null, classified: false };
  }
}
