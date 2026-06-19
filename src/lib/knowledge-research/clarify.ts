/**
 * Genereert de verfijningsvragen die vóór een deep-research-run aan de
 * gebruiker worden gesteld. Brand-aware: als `useBrandContext` aan staat én
 * er een workspace-context beschikbaar is, krijgt het model die mee.
 */

import { createGeminiStructuredCompletion } from "@/lib/ai/gemini-client";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import { resolveFeatureModel } from "@/lib/ai/feature-models.server";
import { resolveCallBudget } from "@/lib/ai/call-budget";
import type { ClarifyQuestion } from "./types";
import {
  CLARIFY_SYSTEM_PROMPT,
  buildClarifyPrompt,
} from "./prompts";

/** Ruwe response-vorm van de clarify-LLM-call. */
interface ClarifyLlmResult {
  questions?: Array<{ id?: string; question?: string; placeholder?: string }>;
}

export interface GenerateClarifyInput {
  workspaceId: string;
  topic: string;
  /** Default false (consistent met de run-route): merk-context alleen op verzoek. */
  useBrandContext?: boolean;
  signal?: AbortSignal;
}

const MAX_QUESTIONS = 3;

/**
 * Genereert 2-3 verfijningsvragen voor een topic via het
 * `deep-research-clarify` feature-model (default Gemini Flash). Valt bij een
 * niet-Google-provider terug op Anthropic. Bij fouten of lege output wordt een
 * deterministische fallback-set teruggegeven zodat de UI nooit leeg blijft.
 */
export async function generateClarifyingQuestions(
  input: GenerateClarifyInput,
): Promise<ClarifyQuestion[]> {
  const useBrand = input.useBrandContext === true;

  let brandBlock: string | undefined;
  if (useBrand) {
    try {
      const ctx = await getBrandContext(input.workspaceId);
      brandBlock = formatBrandContext(ctx);
    } catch {
      // Merk-context is optioneel — ga zonder verder.
    }
  }

  const prompt = buildClarifyPrompt(input.topic, brandBlock);

  try {
    const resolved = await resolveFeatureModel(
      input.workspaceId,
      "deep-research-clarify",
    );

    const raw =
      resolved.provider === "google"
        ? await createGeminiStructuredCompletion<ClarifyLlmResult>(
            CLARIFY_SYSTEM_PROMPT,
            prompt,
            // Thinking uit (zie plan.ts) — anders trunceert gemini-2.5-flash de JSON.
            {
              model: resolved.model,
              temperature: 0.4,
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingBudget: 0 },
              abortSignal: input.signal,
            },
          )
        : await callViaAnthropic(resolved.model, prompt, input.signal);

    const questions = normalizeQuestions(raw);
    if (questions.length > 0) return questions;
  } catch (error) {
    console.warn(
      "[deep-research/clarify] question generation failed, using fallback:",
      error instanceof Error ? error.message : error,
    );
  }

  return fallbackQuestions(input.topic);
}

/** Anthropic-pad: parse de JSON uit een gewone chat-completion. */
async function callViaAnthropic(
  model: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<ClarifyLlmResult> {
  const budget = resolveCallBudget(800);
  const { content } = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: CLARIFY_SYSTEM_PROMPT },
      { role: "user", content: `${prompt}\n\nReturn ONLY the JSON object.` },
    ],
    { model, maxTokens: budget.maxTokens, timeoutMs: budget.timeoutMs, abortSignal: signal },
  );
  return parseJsonObject<ClarifyLlmResult>(content);
}

/** Trim markdown-fences en pak het eerste JSON-object uit een string. */
function parseJsonObject<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && start < end) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned) as T;
}

/** Normaliseer + valideer de LLM-vragen naar stabiele ClarifyQuestion[]. */
function normalizeQuestions(raw: ClarifyLlmResult): ClarifyQuestion[] {
  const list = Array.isArray(raw?.questions) ? raw.questions : [];
  return list
    .filter((q): q is { question: string; id?: string; placeholder?: string } =>
      typeof q?.question === "string" && q.question.trim().length > 0,
    )
    .slice(0, MAX_QUESTIONS)
    .map((q, i) => ({
      id: typeof q.id === "string" && q.id.trim() ? q.id.trim() : `q${i + 1}`,
      question: q.question.trim(),
      placeholder:
        typeof q.placeholder === "string" && q.placeholder.trim()
          ? q.placeholder.trim()
          : undefined,
    }));
}

/** Deterministische fallback wanneer de LLM-call faalt of leeg is. */
function fallbackQuestions(topic: string): ClarifyQuestion[] {
  const t = topic.trim();
  return [
    {
      id: "q1",
      question: `Wat is het doel van dit onderzoek naar "${t}" — welke beslissing of output moet het ondersteunen?`,
      placeholder: "bijv. input voor een strategie, een blog, een investeringskeuze",
    },
    {
      id: "q2",
      question: "Op welke regio, markt of doelgroep moet de focus liggen?",
      placeholder: "bijv. NL/EU, B2B SaaS, Gen-Z",
    },
    {
      id: "q3",
      question: "Welke tijdshorizon of recentheid is relevant?",
      placeholder: "bijv. laatste 12 maanden, 2025-2026 vooruitblik",
    },
  ];
}
