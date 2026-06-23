/**
 * Prompt-builders voor de Deep Research-pipeline.
 *
 * Elke functie bouwt context (topic, antwoorden, optioneel brand-context-blok,
 * genummerde bronnen) in een prompt-string. De synthese-prompt dwingt inline
 * `[n]`-citaties + een `## Sources`-sectie af die ALLEEN de meegegeven nummers
 * gebruikt — de finalize-fase verifieert dit achteraf.
 */

import type { ClarifyAnswer, SourceRef } from "./types";
import { RESOURCE_CATEGORIES } from "../knowledge-resources/categories";

/** Eén genummerde bron met (optioneel) geëxtraheerde inhoud voor de synthese. */
export interface NumberedSource {
  index: number;
  title: string;
  url: string;
  /** Geëxtraheerde/gescrapete inhoud; leeg als read overgeslagen is. */
  content: string;
}

/** Formatteert de antwoorden van de gebruiker als compacte context-regels. */
function formatAnswers(answers: ClarifyAnswer[]): string {
  const filled = answers.filter((a) => a.answer.trim().length > 0);
  if (filled.length === 0) return "(no refinements provided)";
  return filled
    .map((a) => `- ${a.question.trim()}: ${a.answer.trim()}`)
    .join("\n");
}

/** Optioneel brand-context-blok (al geformatteerd via formatBrandContext). */
function brandBlock(brandContext?: string): string {
  if (!brandContext || !brandContext.trim()) return "";
  return `\n\n${brandContext.trim()}\n`;
}

// ─── Clarify ────────────────────────────────────────────────

export const CLARIFY_SYSTEM_PROMPT =
  "You are a research-scoping assistant. Given a topic, you produce a small set " +
  "of clarifying questions that narrow the scope so a deep research run targets " +
  "exactly what the user needs. Return ONLY valid JSON.";

/**
 * Bouwt de clarify-prompt. Vraagt om 2-3 korte, hoog-renderende vragen
 * (scope/doel/diepte) die de onderzoeksrun scherper maken. Brand-aware:
 * als er een merk-context is, mag het model die meewegen maar niet herhalen.
 */
export function buildClarifyPrompt(topic: string, brandContext?: string): string {
  return `Topic to research: "${topic.trim()}"
${brandBlock(brandContext)}
Generate 2-3 clarifying questions that would most sharpen this research.
Focus on: intended scope, the decision/output the user needs, depth, time horizon, region/segment.
Keep each question short (one sentence), and write them in English. Do not ask more than 3.

Return JSON exactly in this shape:
{
  "questions": [
    { "id": "q1", "question": "...", "placeholder": "short example answer" }
  ]
}`;
}

// ─── Plan ───────────────────────────────────────────────────

export const PLAN_SYSTEM_PROMPT =
  "You are a research planner. You decompose a topic into focused sub-questions " +
  "and concrete web search queries. Return ONLY valid JSON.";

/**
 * Bouwt de plan-prompt: decompositie van topic + antwoorden naar
 * sub-vragen en concrete zoekqueries.
 */
export function buildPlanPrompt(
  topic: string,
  answers: ClarifyAnswer[],
  maxQueries: number,
  brandContext?: string,
): string {
  return `Research topic: "${topic.trim()}"

User refinements:
${formatAnswers(answers)}
${brandBlock(brandContext)}
Break this down into 3-5 focused sub-questions, then derive up to ${maxQueries} diverse
web search queries that together cover the topic from multiple angles (definitions,
data/statistics, expert analysis, counter-arguments, recent developments).
Each query should be concise (< 100 chars) and target a distinct angle.

Return JSON exactly in this shape:
{
  "subQuestions": ["...", "..."],
  "searchQueries": ["...", "..."]
}`;
}

// ─── Verify ─────────────────────────────────────────────────

export const VERIFY_SYSTEM_PROMPT =
  "You are an adversarial fact-checker. You scrutinize claims against the supplied " +
  "sources, flag unsupported or contradicted statements, and note where sources " +
  "disagree. You never invent sources. Return ONLY valid JSON.";

/**
 * Bouwt de verify-prompt: adversariële claim-check over de genummerde bronnen.
 * Het model identificeert de kern-claims en markeert welke onvoldoende
 * onderbouwd of tegengesproken zijn.
 */
export function buildVerifyPrompt(
  topic: string,
  sources: NumberedSource[],
): string {
  const sourceBlock = sources
    .map(
      (s) =>
        `[${s.index}] ${s.title} — ${s.url}\n${s.content.slice(0, 1800)}`,
    )
    .join("\n\n");

  return `Topic: "${topic.trim()}"

Below are numbered sources. Identify the main factual claims relevant to the topic,
then check each against the sources. Flag claims that are unsupported, contradicted,
or where sources disagree. Cite the source number that supports or refutes each.

Sources:
${sourceBlock}

Return JSON exactly in this shape:
{
  "claimsChecked": <number of distinct claims you assessed>,
  "flagged": [
    { "claim": "...", "issue": "unsupported|contradicted|disputed", "sources": [1, 2] }
  ]
}`;
}

// ─── Synthesize ─────────────────────────────────────────────

export const SYNTHESIZE_SYSTEM_PROMPT =
  "You are a senior research analyst. You synthesize multiple sources into a clear, " +
  "well-structured markdown report. You ground every non-obvious claim in an inline " +
  "citation. You never fabricate facts or sources.";

/**
 * Bouwt de synthese-prompt. Dwingt af:
 *  - inline `[n]`-citaties bij elke niet-triviale claim,
 *  - een afsluitende `## Sources`-sectie die ALLEEN de meegegeven nummers gebruikt,
 *  - geen verzonnen bronnen/nummers,
 *  - merk-injectie als er een brand-context-blok is.
 */
export function buildSynthesizePrompt(
  topic: string,
  answers: ClarifyAnswer[],
  sources: NumberedSource[],
  options: { brandContext?: string; verificationNotes?: string },
): string {
  const sourceBlock = sources
    .map(
      (s) =>
        `[${s.index}] ${s.title} — ${s.url}\n${s.content.slice(0, 4000)}`,
    )
    .join("\n\n");

  const validNumbers = sources.map((s) => s.index).join(", ");

  const verification = options.verificationNotes?.trim()
    ? `\n\nFact-check notes (treat flagged claims with caution or omit them):\n${options.verificationNotes.trim()}\n`
    : "";

  return `Write a thorough, well-structured research report in markdown on:
"${topic.trim()}"

User refinements:
${formatAnswers(answers)}
${brandBlock(options.brandContext)}${verification}
Numbered sources (cite by number):
${sourceBlock}

STRICT REQUIREMENTS:
- Write the entire report in English.
- Cite every non-trivial factual claim inline using square-bracket numbers, e.g. "... grew 40% in 2025 [3]".
- You may ONLY cite these source numbers: ${validNumbers}. Never invent a number outside this set.
- Use markdown headings (##) to structure the report. Start with a short intro, then themed sections.
- Be honest about uncertainty and where sources disagree.
- End with a section titled exactly "## Sources" listing each cited source as "[n] Title — URL", using only the numbers above.
- Do not output anything after the Sources section.
- If a brand context is provided, tailor relevance and framing to that brand without inventing brand facts.`;
}

// ─── Finalize ───────────────────────────────────────────────

export const FINALIZE_SYSTEM_PROMPT =
  "You extract concise structured metadata from a research report. Return ONLY valid JSON.";

/**
 * Bouwt de finalize-prompt: leidt titel/categorie/tags/samenvatting/takeaways
 * af uit het gesynthetiseerde rapport. De categorie MOET uit de toegestane lijst
 * komen; finalize.ts coërceert nogmaals defensief.
 */
export function buildFinalizePrompt(topic: string, markdown: string): string {
  return `From the research report below (topic: "${topic.trim()}"), extract structured metadata.

Allowed categories (pick the single best fit): ${RESOURCE_CATEGORIES.join(", ")}.

Report:
${markdown.slice(0, 12_000)}

Return JSON exactly in this shape:
{
  "suggestedTitle": "concise title, < 80 chars",
  "suggestedCategory": "one of the allowed categories",
  "suggestedTags": ["3-6 short topical tags"],
  "summary": "2-3 sentence executive summary",
  "keyTakeaways": ["3-6 single-sentence takeaways"]
}`;
}

/** Helper-type om citatie-checks centraal te houden. */
export type CitationCheckable = Pick<SourceRef, "index">;
