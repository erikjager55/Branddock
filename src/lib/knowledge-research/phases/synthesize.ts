/**
 * SYNTHESIZE-fase: smelt de gelezen + geverifieerde bronnen samen tot een
 * geciteerd markdown-rapport via Anthropic (synthesis-feature-model, default
 * Sonnet 4.6, budget 6000 output-tokens). Merk-injectie als er een
 * brand-context-blok is meegegeven.
 */

import { anthropicClient } from "@/lib/ai/anthropic-client";
import { resolveFeatureModel, assertProvider } from "@/lib/ai/feature-models.server";
import { resolveCallBudget } from "@/lib/ai/call-budget";
import type { ClarifyAnswer } from "../types";
import type { NumberedSource } from "../prompts";
import { SYNTHESIZE_SYSTEM_PROMPT, buildSynthesizePrompt } from "../prompts";

export interface SynthesizeInput {
  workspaceId: string;
  topic: string;
  answers: ClarifyAnswer[];
  sources: NumberedSource[];
  /** Reeds geformatteerd brand-context-blok (alleen als useBrandContext). */
  brandContext?: string;
  /** Aanvullende Exa-context-tekst (optioneel). */
  exaContext?: string;
  /** Fact-check-notities uit de verify-fase (optioneel). */
  verificationNotes?: string;
  signal: AbortSignal;
}

export interface SynthesizeOutput {
  markdown: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Genereert het geciteerde markdown-rapport. Gooit door bij abort of wanneer
 * de LLM-call faalt — de orchestrator beschouwt een lege synthese als fataal
 * (er valt zonder rapport niets te leveren).
 */
export async function runSynthesize(
  input: SynthesizeInput,
): Promise<SynthesizeOutput> {
  if (input.signal.aborted) throw new DOMException("Aborted", "AbortError");

  const resolved = await resolveFeatureModel(
    input.workspaceId,
    "deep-research-synthesis",
  );
  // Synthese loopt via de Anthropic-wrapper; borg de provider defensief.
  assertProvider(resolved, "anthropic", "deep-research-synthesis");

  // 8000 output-tokens (~28-32k chars) geeft ruime marge boven waargenomen
  // rapporten (~13-15k chars); de Anthropic-client faalt hard bij max_tokens-
  // truncatie, dus headroom voorkomt dat een lang rapport de run laat mislukken.
  const budget = resolveCallBudget(8000);

  // Voeg Exa-context als pseudo-bron toe aan het einde van de prompt-context,
  // zonder hem als citeerbaar nummer aan te bieden (geen stabiele per-URL ref).
  const extraContext = input.exaContext?.trim()
    ? `\n\nSupplementary neural-search context (background only, do not cite by number):\n${input.exaContext.trim()}`
    : "";

  const prompt =
    buildSynthesizePrompt(input.topic, input.answers, input.sources, {
      brandContext: input.brandContext,
      verificationNotes: input.verificationNotes,
    }) + extraContext;

  const { content, inputTokens, outputTokens } =
    await anthropicClient.createChatCompletion(
      [
        { role: "system", content: SYNTHESIZE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      {
        model: resolved.model,
        maxTokens: budget.maxTokens,
        timeoutMs: budget.timeoutMs,
        abortSignal: input.signal,
      },
    );

  const markdown = content.trim();
  if (!markdown) {
    throw new Error("Synthesis produced an empty report");
  }

  return { markdown, inputTokens, outputTokens };
}
