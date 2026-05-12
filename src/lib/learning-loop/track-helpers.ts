/**
 * Track-helpers — gedeelde utilities voor wrapper-niveau AI-call tracking.
 *
 * Geïmporteerd door zowel `ai-caller.ts` (Anthropic + OpenAI dispatcher)
 * als `gemini-client.ts`. Deze utilities zitten in `learning-loop/`
 * om circulaire dependencies te vermijden (ai-caller → gemini-client).
 *
 * Cat 2 — leerlus-werkstroom sessie 2.
 */

import type {
  AICallPayload,
  AICallResponseMetadata,
} from "@/types/learning-loop";

import { prisma } from "@/lib/prisma";
import type { PropertyEvalRunResult } from "@/lib/content-test/types";
import { trackAICallStart, trackAICallComplete } from "./call-tracker";

/**
 * Opt-in tracking-input voor AI-wrapper-functies.
 * Wordt door callers (canvas-orchestrator, strategy-chain, etc.)
 * meegegeven aan `createStructuredCompletion` en lower-level wrappers.
 */
export interface AICallTracking {
  workspaceId: string;
  parentEntityType: string;
  parentEntityId: string;
  /** Unique source identifier — bijv. "src/lib/ai/canvas-orchestrator.ts:generateText". */
  sourceIdentifier: string;
  /** Optional brand-context snapshot (volledige BrandContextBlock). */
  brandContext?: unknown;
  /** Multi-call paden (strategy-pipeline, tool-loops). 0 voor single-call. */
  callOrder?: number;
  /** Audit-velden uit cat 2(a) decision 5. */
  wasFromCache?: boolean;
  cacheAgeSeconds?: number;
  /**
   * Semver van prompt-template versie (content-test #5.A foundation).
   * Lookup via `getPromptVersionForType(contentType)` of expliciet doorgegeven.
   * Persistent in AICallSnapshot.promptVersion voor regressie-tracking.
   */
  promptVersion?: string;
}

/**
 * Trackt AI-call start. Returned traceId of null bij failure.
 * Tracking-failures swallowen — observability mag niet kritiek zijn.
 */
export async function tryTrackStart(
  tracking: AICallTracking,
  payload: AICallPayload,
): Promise<string | null> {
  try {
    const result = await trackAICallStart({
      workspaceId: tracking.workspaceId,
      brandContext: tracking.brandContext ?? null,
      payload,
      sourceType: "inline",
      sourceIdentifier: tracking.sourceIdentifier,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      parentEntityType: tracking.parentEntityType,
      parentEntityId: tracking.parentEntityId,
      callOrder: tracking.callOrder ?? 0,
      promptVersion: tracking.promptVersion,
    });
    return result.traceId;
  } catch (err) {
    console.warn(
      "[track-helpers] trackAICallStart failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Trackt AI-call completion. No-op als traceId null is.
 */
export async function tryTrackComplete(
  traceId: string | null,
  metadata: AICallResponseMetadata,
): Promise<void> {
  if (!traceId) return;
  try {
    await trackAICallComplete({ traceId, responseMetadata: metadata });
  } catch (err) {
    console.warn(
      "[track-helpers] trackAICallComplete failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Persisteer Layer 1 property-eval-resultaten op AICallTrace
 * (content-test #5.A foundation).
 *
 * Wordt aangeroepen door de orchestrator NA sanitize-variants + property-eval
 * orchestrator-call, ongeacht of er block-violations zijn. Block-violations
 * worden afzonderlijk afgehandeld (SSE error-event, generation blocked) zodat
 * de trace alsnog audit-trail bevat van wat er mis ging.
 *
 * Tracking-failures swallowen — observability mag niet kritiek zijn.
 */
export async function tryTrackPropertyEvalResults(
  traceId: string | null,
  evalResults: PropertyEvalRunResult,
): Promise<void> {
  if (!traceId) return;
  try {
    await prisma.aICallTrace.update({
      where: { id: traceId },
      data: {
        propertyEvalResults: {
          passed: evalResults.passed,
          runtimeMs: evalResults.runtimeMs,
          results: evalResults.results,
          blockViolations: evalResults.blockViolations,
          warnings: evalResults.warnings,
        } as object,
      },
    });
  } catch (err) {
    console.warn(
      "[track-helpers] tryTrackPropertyEvalResults failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Bouw error-metadata wanneer AI-call faalt.
 * Wordt aangeroepen vanuit catch-blocks in wrapper-functies.
 */
export function buildErrorMetadata(
  startTime: number,
  err: unknown,
  tracking: AICallTracking,
): AICallResponseMetadata {
  return {
    inputTokens: 0,
    outputTokens: 0,
    stopReason: "error",
    latencyMs: Date.now() - startTime,
    errorCode: "CALL_FAILED",
    errorMessage: err instanceof Error ? err.message : String(err),
    wasFromCache: tracking.wasFromCache ?? false,
    cacheAgeSeconds: tracking.cacheAgeSeconds,
  };
}
