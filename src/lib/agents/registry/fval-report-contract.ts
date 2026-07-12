// =============================================================
// Agents registry — artifact-contract met F-VAL op content-REPORTs
// (ADR 2026-07-05 D5: "elke content-output toont fidelity-score + findings —
// nooit een stille lage score"; dogfood r1 bevinding #1 / r2 bevinding #5).
//
// Wrapper om het gedeelde artifactOutputContract: zelfde parse, base-persist
// ongewijzigd (atomaire run-finalize), daarná F-VAL op de zojuist aangemaakte
// content-REPORTs via runBrandFitReview (fval-gate) — die levert de
// 4-min-deadline en de alignment/dashboard-cache-invalidatie (CLAUDE.md
// regel #10) gratis mee; de score landt ook als ContentReviewLog in
// Brand Alignment, zelfde pad als Vera's review.
//
// Scoping-regels:
//   - alleen op een COMPLETED, niet-getrunceerde run: in de propose-flow
//     (AWAITING_CONFIRMATION) is het REPORT een meta-narratief bij de
//     proposal — de échte content krijgt zijn score op het confirm-pad;
//     partiële (truncated) output scoren is ruis;
//   - alleen REPORT-artefacten met `content.markdown`;
//   - géén answerFallback (generiek antwoord ≠ kanaal-content);
//   - ≥ MIN_WORDS woorden (fidelity-floor-conventie, zie fidelity-runner);
//   - fail-soft over het HELE enrichment-blok: de run is al gefinaliseerd —
//     elke throw hier zou de gecommitte COMPLETED-status onterecht naar
//     FAILED flippen én de billable-charge skippen (review-CRITICAL).
//
// Alleen content-producerende agents gebruiken dit contract (nu: de
// content-creator). Eigen module zodat de brand-fidelity-import niet in het
// gedeelde contract van álle agents lekt.
// =============================================================

import { prisma } from "@/lib/prisma";
import type { AgentOutputContract } from "@/lib/brandclaw/orchestrator/types";
import { artifactOutputContract } from "./artifact-contract";
import { runBrandFitReview } from "./fval-gate";
import type { AgentArtifactDraft, AgentFinalizeResult } from "./types";

/** Zelfde floor als de fidelity-runner: stubs scoren is ruis, geen signaal. */
const MIN_WORDS = 50;

export const reportScoringOutputContract: AgentOutputContract<
  AgentArtifactDraft[],
  AgentFinalizeResult
> = {
  id: "agent-artifacts+report-fval@1",
  parse: (finalMessage, outcome) => artifactOutputContract.parse(finalMessage, outcome),
  async persist(parsed, args) {
    const result = await artifactOutputContract.persist(parsed, args);
    if (result.status !== "COMPLETED" || args.outcome.truncated) return result;
    if (result.artifactIds.length === 0) return result;

    try {
      const reports = await prisma.agentArtifact.findMany({
        where: {
          id: { in: result.artifactIds },
          workspaceId: args.ctx.workspaceId,
          type: "REPORT",
          fidelityScore: null,
        },
        select: { id: true, content: true },
      });

      for (const report of reports) {
        const content = (report.content ?? {}) as Record<string, unknown>;
        if (content.answerFallback === true) continue;
        const markdown = typeof content.markdown === "string" ? content.markdown : "";
        if (markdown.trim().split(/\s+/).length < MIN_WORDS) continue;

        const review = await runBrandFitReview({
          runId: args.ctx.runId,
          workspaceId: args.ctx.workspaceId,
          contentText: markdown,
          sourceType: "paste",
          userId: args.ctx.userId ?? undefined,
          // Geen extra FINDINGS-artefact: de score hoort óp het REPORT zelf.
          registerArtifact: false,
        });
        await prisma.agentArtifact.update({
          where: { id: report.id },
          data: { fidelityScore: review.compositeScore },
        });
      }
    } catch (err) {
      // Fail-soft: score is enrichment, geen integriteit — warn en door.
      console.warn("[fval-report-contract] scoring failed (swallowed)", {
        runId: args.ctx.runId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return result;
  },
};
