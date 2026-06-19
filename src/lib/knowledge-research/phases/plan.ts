/**
 * PLAN-fase: decomponeert topic + verfijningen naar sub-vragen en concrete
 * zoekqueries via het clarify-feature-model (Gemini Flash). Resilient: bij
 * falen valt het terug op deterministische query-varianten.
 */

import { createGeminiStructuredCompletion } from "@/lib/ai/gemini-client";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { resolveFeatureModel } from "@/lib/ai/feature-models.server";
import { resolveCallBudget } from "@/lib/ai/call-budget";
import type { ClarifyAnswer } from "../types";
import { PLAN_SYSTEM_PROMPT, buildPlanPrompt } from "../prompts";

export interface ResearchPlan {
  subQuestions: string[];
  searchQueries: string[];
}

export interface PlanInput {
  workspaceId: string;
  topic: string;
  answers: ClarifyAnswer[];
  maxQueries: number;
  /** Reeds geformatteerd brand-context-blok (optioneel). */
  brandContext?: string;
  signal: AbortSignal;
}

interface PlanLlmResult {
  subQuestions?: unknown;
  searchQueries?: unknown;
}

/**
 * Bouwt een onderzoeksplan (sub-vragen + zoekqueries). Gooit nooit: bij een
 * lege of falende LLM-call wordt een deterministisch plan teruggegeven.
 */
export async function planResearch(input: PlanInput): Promise<ResearchPlan> {
  const prompt = buildPlanPrompt(
    input.topic,
    input.answers,
    input.maxQueries,
    input.brandContext,
  );

  try {
    const resolved = await resolveFeatureModel(
      input.workspaceId,
      "deep-research-clarify",
    );

    const raw =
      resolved.provider === "google"
        ? await createGeminiStructuredCompletion<PlanLlmResult>(
            PLAN_SYSTEM_PROMPT,
            prompt,
            // Thinking uit: voor gestructureerde JSON-extractie niet nodig, en
            // gemini-2.5-flash's thinking-tokens vraten anders het output-budget
            // op → MAX_TOKENS-truncatie. Ruim budget voor de JSON zelf.
            {
              model: resolved.model,
              temperature: 0.5,
              maxOutputTokens: 2048,
              thinkingConfig: { thinkingBudget: 0 },
              abortSignal: input.signal,
            },
          )
        : await planViaAnthropic(resolved.model, prompt, input.signal);

    const plan = normalizePlan(raw, input.maxQueries);
    if (plan.searchQueries.length >= 2) return plan;
  } catch (error) {
    console.warn(
      "[deep-research/plan] planning failed, using fallback queries:",
      error instanceof Error ? error.message : error,
    );
  }

  return fallbackPlan(input.topic, input.maxQueries);
}

async function planViaAnthropic(
  model: string,
  prompt: string,
  signal: AbortSignal,
): Promise<PlanLlmResult> {
  const budget = resolveCallBudget(1200);
  const { content } = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: `${prompt}\n\nReturn ONLY the JSON object.` },
    ],
    { model, maxTokens: budget.maxTokens, timeoutMs: budget.timeoutMs, abortSignal: signal },
  );
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned) as PlanLlmResult;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 2)
    .map((v) => v.trim());
}

function normalizePlan(raw: PlanLlmResult, maxQueries: number): ResearchPlan {
  return {
    subQuestions: toStringArray(raw.subQuestions).slice(0, 6),
    searchQueries: toStringArray(raw.searchQueries).slice(0, maxQueries),
  };
}

/** Deterministisch plan zodat de pipeline altijd kan doorzoeken. */
function fallbackPlan(topic: string, maxQueries: number): ResearchPlan {
  const year = new Date().getFullYear();
  const t = topic.trim();
  const queries = [
    `${t} overview ${year}`,
    `${t} market data statistics ${year}`,
    `${t} expert analysis`,
    `${t} challenges criticism`,
    `${t} recent developments ${year}`,
    `${t} best practices`,
  ].slice(0, maxQueries);
  return {
    subQuestions: [
      `What is ${t} and why does it matter?`,
      `What does the data say about ${t}?`,
      `What are the main debates around ${t}?`,
    ],
    searchQueries: queries,
  };
}
