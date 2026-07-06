// =============================================================
// Agents registry — F-VAL-poort (ADR 2026-07-05 D5, agents-motor-wiring).
//
// Elke content-producerende agent-output gaat door de bestaande
// F-VAL-motor (`runFidelityForExternalContent`). De motor persisteert
// zelf de domein-rijen (ContentReviewLog + BrandReviewFinding — zichtbaar
// in Brand Alignment, domain-first write-through); deze helper registreert
// daarnaast een FINDINGS-artefact met de score op de agent-run.
// =============================================================

import { runFidelityForExternalContent } from "@/lib/brand-fidelity/external-content-runner";
import type { BrandclawTool } from "@/lib/brandclaw/orchestrator/types";
import { recordArtifact } from "./run-collector";

export interface BrandFitReviewResult {
  compositeScore: number;
  findingsCount: number;
  reviewLogId: string;
}

/**
 * Draait de F-VAL-review en registreert (tenzij uitgezet) een
 * FINDINGS-artefact op de run. Throws bij motor-fouten — caller beslist
 * over error-afhandeling (tools mappen naar isError).
 */
export async function runBrandFitReview(args: {
  runId: string;
  workspaceId: string;
  contentText: string;
  sourceType: "paste" | "url" | "file";
  sourceUrl?: string;
  userId?: string;
  title?: string;
  registerArtifact?: boolean;
}): Promise<BrandFitReviewResult> {
  const review = await runFidelityForExternalContent({
    workspaceId: args.workspaceId,
    contentText: args.contentText,
    sourceType: args.sourceType,
    sourceUrl: args.sourceUrl,
    userId: args.userId,
  });

  const compositeScore = review.result.compositeScore;

  if (args.registerArtifact !== false) {
    recordArtifact(args.runId, {
      type: "FINDINGS",
      title: args.title ?? "Brand fidelity review",
      content: {
        reviewLogId: review.reviewLogId,
        compositeScore,
        findingsCount: review.findingsCount,
        scorerVersion: review.result.scorerVersion,
        note: "Detailed findings are persisted as BrandReviewFinding rows and visible in Brand Alignment.",
      },
      fidelityScore: compositeScore,
    });
  }

  return { compositeScore, findingsCount: review.findingsCount, reviewLogId: review.reviewLogId };
}

/**
 * Orchestrator-tool voor de Brand Guardian: F-VAL-review op aangeleverde
 * tekst of URL. Compact resultaat richting het model; de details landen
 * als FINDINGS-artefact + domein-rijen.
 */
export const reviewBrandFitTool: BrandclawTool = {
  definition: {
    name: "review_brand_fit",
    description:
      "Run a full brand-fidelity (F-VAL) review on a piece of content. Provide the raw content text, or a source_url when the content was fetched from a page. Returns the composite brand-fit score (0-100) and the number of findings; details are stored as review findings for the user.",
    input_schema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The full content text to review (plain text).",
        },
        source_url: {
          type: "string",
          description: "Optional: the URL the content came from.",
        },
        title: {
          type: "string",
          description: "Optional short label for this review, shown on the findings artifact.",
        },
      },
      required: ["content"],
    },
  },
  async execute(input, ctx) {
    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!content) {
      return { content: { error: "content is required" }, isError: true, errorCode: "INVALID_INPUT" };
    }
    const sourceUrl = typeof input.source_url === "string" ? input.source_url : undefined;
    try {
      const result = await runBrandFitReview({
        runId: ctx.runId,
        workspaceId: ctx.workspaceId,
        contentText: content,
        sourceType: sourceUrl ? "url" : "paste",
        sourceUrl,
        userId: ctx.triggerSource ?? undefined,
        title: typeof input.title === "string" ? input.title : undefined,
      });
      return {
        content: {
          compositeScore: result.compositeScore,
          findingsCount: result.findingsCount,
          reviewLogId: result.reviewLogId,
          note: "A FINDINGS artifact with the score has been attached to this run; detailed findings are visible in Brand Alignment. Summarize the verdict and the most important improvements in your final answer.",
        },
      };
    } catch (err) {
      return {
        content: { error: err instanceof Error ? err.message : "Brand fidelity review failed" },
        isError: true,
        errorCode: "FVAL_FAILED",
      };
    }
  },
};
