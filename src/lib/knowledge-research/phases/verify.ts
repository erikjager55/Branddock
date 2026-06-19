/**
 * VERIFY-fase: adversariële claim-check over de gelezen bronnen via Anthropic
 * (synthesis-feature-model). Wordt overgeslagen bij minder dan 3 bronnen — dan
 * is kruisverificatie niet zinvol. Emit een `verify`-event met tellingen.
 */

import { anthropicClient } from "@/lib/ai/anthropic-client";
import { resolveFeatureModel } from "@/lib/ai/feature-models.server";
import { resolveCallBudget } from "@/lib/ai/call-budget";
import type { DeepResearchEvent } from "../types";
import type { NumberedSource } from "../prompts";
import { VERIFY_SYSTEM_PROMPT, buildVerifyPrompt } from "../prompts";

const MIN_SOURCES_FOR_VERIFY = 3;

export interface VerifyInput {
  workspaceId: string;
  topic: string;
  sources: NumberedSource[];
  sendEvent: (e: DeepResearchEvent) => void;
  signal: AbortSignal;
}

export interface VerifyOutput {
  /** Geformatteerde fact-check-notities voor de synthese (leeg = niets te melden). */
  notes: string;
  claimsChecked: number;
  flagged: number;
  warnings: string[];
}

interface VerifyLlmResult {
  claimsChecked?: number;
  flagged?: Array<{ claim?: string; issue?: string; sources?: number[] }>;
}

/**
 * Voert de adversariële verificatie uit. Gooit een AbortError bij afbreken;
 * andere fouten degraderen naar `warnings` met een lege notes-string.
 */
export async function runVerify(input: VerifyInput): Promise<VerifyOutput> {
  if (input.signal.aborted) throw new DOMException("Aborted", "AbortError");

  const empty: VerifyOutput = { notes: "", claimsChecked: 0, flagged: 0, warnings: [] };

  if (input.sources.length < MIN_SOURCES_FOR_VERIFY) {
    input.sendEvent({ type: "verify", claimsChecked: 0, flagged: 0 });
    return empty;
  }

  try {
    const resolved = await resolveFeatureModel(
      input.workspaceId,
      "deep-research-synthesis",
    );
    const budget = resolveCallBudget(2000);
    const prompt = buildVerifyPrompt(input.topic, input.sources);

    const { content } = await anthropicClient.createChatCompletion(
      [
        { role: "system", content: VERIFY_SYSTEM_PROMPT },
        { role: "user", content: `${prompt}\n\nReturn ONLY the JSON object.` },
      ],
      {
        model: resolved.model,
        maxTokens: budget.maxTokens,
        timeoutMs: budget.timeoutMs,
        abortSignal: input.signal,
      },
    );

    const parsed = parseVerify(content);
    const flaggedList = Array.isArray(parsed.flagged) ? parsed.flagged : [];
    const claimsChecked = Number(parsed.claimsChecked) || 0;

    input.sendEvent({
      type: "verify",
      claimsChecked,
      flagged: flaggedList.length,
    });

    return {
      notes: formatNotes(flaggedList),
      claimsChecked,
      flagged: flaggedList.length,
      warnings: [],
    };
  } catch (error) {
    // Abort doorgooien (de orchestrator normaliseert het naar een AbortError).
    // Check óók `signal.aborted` — de SDK's APIUserAbortError heeft niet altijd
    // een 'abort'-naam, dus naam-matching alleen is onbetrouwbaar.
    if (input.signal.aborted || (error instanceof Error && /abort/i.test(error.name))) {
      throw error;
    }
    input.sendEvent({ type: "verify", claimsChecked: 0, flagged: 0 });
    return {
      ...empty,
      warnings: [
        `Verification skipped: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      ],
    };
  }
}

function parseVerify(text: string): VerifyLlmResult {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned) as VerifyLlmResult;
}

function formatNotes(
  flagged: NonNullable<VerifyLlmResult["flagged"]>,
): string {
  const lines = flagged
    .filter((f) => typeof f?.claim === "string" && f.claim.trim())
    .map((f) => {
      const issue = f.issue ? ` [${f.issue}]` : "";
      const refs = Array.isArray(f.sources) && f.sources.length > 0
        ? ` (sources ${f.sources.join(", ")})`
        : "";
      return `- ${f.claim!.trim()}${issue}${refs}`;
    });
  return lines.join("\n");
}
