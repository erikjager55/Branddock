/**
 * FINALIZE-fase: leidt gestructureerde metadata af uit het rapport
 * (titel/categorie/tags/samenvatting/takeaways), markeert welke bronnen
 * daadwerkelijk geciteerd zijn (`used`), en repareert/voegt de `## Sources`-
 * sectie toe wanneer die ontbreekt.
 */

import { createGeminiStructuredCompletion } from "@/lib/ai/gemini-client";
import { anthropicClient } from "@/lib/ai/anthropic-client";
import { resolveFeatureModel } from "@/lib/ai/feature-models.server";
import { resolveCallBudget } from "@/lib/ai/call-budget";
import { coerceCategory } from "@/lib/knowledge-resources/categories";
import type { SourceRef } from "../types";
import { FINALIZE_SYSTEM_PROMPT, buildFinalizePrompt } from "../prompts";

export interface FinalizeInput {
  workspaceId: string;
  topic: string;
  markdown: string;
  sources: SourceRef[];
  signal: AbortSignal;
}

export interface FinalizeOutput {
  markdown: string;
  suggestedTitle: string;
  suggestedCategory: string;
  suggestedTags: string[];
  summary: string;
  keyTakeaways: string[];
  /** Bronnen met bijgewerkte `used`-vlag. */
  sources: SourceRef[];
}

interface FinalizeLlmResult {
  suggestedTitle?: string;
  suggestedCategory?: string;
  suggestedTags?: unknown;
  summary?: unknown;
  keyTakeaways?: unknown;
}

/**
 * Voltooit het rapport. Gooit niet: bij een falende metadata-call vallen
 * titel/samenvatting terug op heuristieken uit het topic + de markdown.
 */
export async function runFinalize(input: FinalizeInput): Promise<FinalizeOutput> {
  // Markeer `used` op basis van INLINE-citaties in de body — niet op de
  // (model-geproduceerde) `## Sources`-lijst, want die noemt elke bron en zou
  // anders alles ten onrechte als geciteerd markeren.
  const citedNumbers = extractCitedNumbers(stripSourcesSection(input.markdown));
  const sources = input.sources.map((s) => ({
    ...s,
    used: citedNumbers.has(s.index),
  }));

  const markdown = withCanonicalSources(input.markdown, sources);

  let meta: FinalizeLlmResult = {};
  try {
    meta = await extractMetadata(input.workspaceId, input.topic, markdown, input.signal);
  } catch (error) {
    console.warn(
      "[deep-research/finalize] metadata extraction failed, using fallback:",
      error instanceof Error ? error.message : error,
    );
  }

  return {
    markdown,
    suggestedTitle: cleanTitle(meta.suggestedTitle, input.topic),
    suggestedCategory: coerceCategory(meta.suggestedCategory),
    suggestedTags: toStringArray(meta.suggestedTags).slice(0, 6),
    summary: typeof meta.summary === "string" && meta.summary.trim()
      ? meta.summary.trim()
      : firstParagraph(markdown),
    keyTakeaways: toStringArray(meta.keyTakeaways).slice(0, 6),
    sources,
  };
}

/** Haalt alle `[n]`-citatie-nummers uit de markdown. */
export function extractCitedNumbers(markdown: string): Set<number> {
  const cited = new Set<number>();
  const regex = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const n = Number(match[1]);
    if (Number.isFinite(n)) cited.add(n);
  }
  return cited;
}

/**
 * Vervangt een eventueel door het model geproduceerde `## Sources`-sectie door
 * een canonieke variant, opgebouwd uit de ECHTE {@link SourceRef}s. Dit borgt
 * citatie-integriteit: het model kan geen niet-bestaande/gedupliceerde
 * bronnummers de Sources-lijst in smokkelen.
 */
function withCanonicalSources(markdown: string, sources: SourceRef[]): string {
  const body = stripSourcesSection(markdown).trimEnd();
  const section = buildSourcesSection(sources);
  return section ? `${body}\n\n${section}\n` : body;
}

/** Verwijdert een bestaande `## Sources`-sectie (tot het eind of de volgende H2). */
function stripSourcesSection(markdown: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^##\s+Sources\s*$/i.test(l.trim()));
  if (start === -1) return markdown;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && /^##\s+/.test(line.trim())) {
      end = i;
      break;
    }
  }
  return [...lines.slice(0, start), ...lines.slice(end)].join("\n");
}

/** Bouwt een canonieke `## Sources`-sectie uit de echte bronnen (geciteerd eerst). */
function buildSourcesSection(sources: SourceRef[]): string {
  const cited = sources.filter((s) => s.used);
  const list = (cited.length > 0 ? cited : sources)
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((s) => `[${s.index}] ${s.title}${s.url ? ` — ${s.url}` : ""}`)
    .join("\n");
  return list ? `## Sources\n${list}` : "";
}

async function extractMetadata(
  workspaceId: string,
  topic: string,
  markdown: string,
  signal: AbortSignal,
): Promise<FinalizeLlmResult> {
  const resolved = await resolveFeatureModel(workspaceId, "deep-research-clarify");
  const prompt = buildFinalizePrompt(topic, markdown);

  if (resolved.provider === "google") {
    return createGeminiStructuredCompletion<FinalizeLlmResult>(
      FINALIZE_SYSTEM_PROMPT,
      prompt,
      // Thinking uit (zie plan.ts) — anders trunceert gemini-2.5-flash de JSON
      // en vallen titel/tags/takeaways/summary terug op zwakke heuristieken.
      {
        model: resolved.model,
        temperature: 0.2,
        maxOutputTokens: 1536,
        thinkingConfig: { thinkingBudget: 0 },
        abortSignal: signal,
      },
    );
  }

  const budget = resolveCallBudget(800);
  const { content } = await anthropicClient.createChatCompletion(
    [
      { role: "system", content: FINALIZE_SYSTEM_PROMPT },
      { role: "user", content: `${prompt}\n\nReturn ONLY the JSON object.` },
    ],
    {
      model: resolved.model,
      maxTokens: budget.maxTokens,
      timeoutMs: budget.timeoutMs,
      abortSignal: signal,
    },
  );
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned) as FinalizeLlmResult;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

function cleanTitle(value: string | undefined, topic: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim().slice(0, 120);
  }
  return `Research: ${topic.trim()}`.slice(0, 120);
}

/** Eerste niet-heading-paragraaf als samenvattings-fallback. */
function firstParagraph(markdown: string): string {
  const lines = markdown.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith("#") && !t.startsWith(">")) {
      return t.slice(0, 400);
    }
  }
  return markdown.trim().slice(0, 400);
}
