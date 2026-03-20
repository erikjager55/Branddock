import { prisma } from "@/lib/prisma";
import { SCAN_STEPS } from "./scan-steps";
import { fetchModuleData } from "./data-fetcher";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import {
  buildModuleAnalysisPrompt,
  type ModuleAnalysisResult,
} from "@/lib/ai/prompts/brand-alignment";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import type { AlignmentModule } from "@/types/brand-alignment";

// =============================================================
// AI-powered scan orchestrator — 8-step progressive scan
// Uses Claude Sonnet to analyze each module against brand context
// =============================================================

const MODULES: AlignmentModule[] = [
  "BRAND_FOUNDATION",
  "BUSINESS_STRATEGY",
  "BRANDSTYLE",
  "PERSONAS",
  "PRODUCTS_SERVICES",
  "MARKET_INSIGHTS",
];

// Module weights for overall score calculation
const MODULE_WEIGHTS: Record<AlignmentModule, number> = {
  BRAND_FOUNDATION: 1.5,
  BUSINESS_STRATEGY: 1.2,
  BRANDSTYLE: 1.0,
  PERSONAS: 1.0,
  PRODUCTS_SERVICES: 1.0,
  MARKET_INSIGHTS: 0.8,
};

// In-memory scan progress tracking (per scanId)
const scanProgress = new Map<
  string,
  {
    currentStep: number;
    completedSteps: string[];
    progress: number;
    cancelled: boolean;
  }
>();

export function getScanProgress(scanId: string) {
  return scanProgress.get(scanId) ?? null;
}

export function cancelScan(scanId: string): boolean {
  const progress = scanProgress.get(scanId);
  if (progress) {
    progress.cancelled = true;
    return true;
  }
  return false;
}

/**
 * Run an 8-step AI-powered alignment scan.
 * Step 0: Fetch brand context
 * Steps 1-6: Analyze each module with Claude
 * Step 7: Calculate final score and write to DB
 */
export async function runScan(scanId: string, workspaceId: string) {
  // Initialize progress
  scanProgress.set(scanId, {
    currentStep: 0,
    completedSteps: [],
    progress: 0,
    cancelled: false,
  });

  const moduleResults: {
    moduleName: AlignmentModule;
    score: number;
    alignedCount: number;
    reviewCount: number;
    misalignedCount: number;
    issues: ModuleAnalysisResult["issues"];
  }[] = [];

  let failedModules = 0;

  try {
    // ─── Step 0: Gather brand context ──────────────────────────
    const state = scanProgress.get(scanId);
    if (!state || state.cancelled) {
      await markCancelled(scanId);
      return;
    }

    state.currentStep = 0;
    state.progress = 5;

    let brandContextStr: string;
    try {
      const brandContextBlock = await getBrandContext(workspaceId);
      brandContextStr = formatBrandContext(brandContextBlock);
    } catch (error) {
      console.error("[scanner] Failed to fetch brand context:", error);
      brandContextStr = "No brand context available.";
    }

    state.completedSteps.push(SCAN_STEPS[0]);
    state.progress = 12;

    // ─── Steps 1-6: Per-module AI analysis ───────────────────
    for (let i = 0; i < MODULES.length; i++) {
      const stepState = scanProgress.get(scanId);
      if (!stepState || stepState.cancelled) {
        await markCancelled(scanId);
        return;
      }

      const module = MODULES[i];
      stepState.currentStep = i + 1;
      stepState.progress = 12 + Math.round(((i + 1) / MODULES.length) * 63);

      try {
        // Fetch module data
        const moduleData = await fetchModuleData(workspaceId, module);

        // Skip AI call if module has no data
        if (moduleData.itemCount === 0) {
          moduleResults.push({
            moduleName: module,
            score: 75,
            alignedCount: 0,
            reviewCount: 0,
            misalignedCount: 0,
            issues: [],
          });
          stepState.completedSteps.push(SCAN_STEPS[i + 1]);
          continue;
        }

        // Build prompt and call Claude
        const [systemPrompt, userPrompt] = buildModuleAnalysisPrompt(
          module,
          moduleData.items,
          brandContextStr
        );

        const result =
          await createClaudeStructuredCompletion<ModuleAnalysisResult>(
            systemPrompt,
            userPrompt,
            { maxTokens: 4000, temperature: 0.3, timeoutMs: 60_000 }
          );

        // Clamp score to valid range
        const score = Math.max(0, Math.min(100, Math.round(result.score)));

        moduleResults.push({
          moduleName: module,
          score,
          alignedCount: Math.max(0, result.alignedCount),
          reviewCount: Math.max(0, result.reviewCount),
          misalignedCount: Math.max(0, result.misalignedCount),
          issues: (result.issues ?? []).slice(0, 5),
        });
      } catch (error) {
        console.error(
          `[scanner] Module ${module} analysis failed:`,
          error instanceof Error ? error.message : error
        );
        failedModules++;
        // Use fallback score for failed modules
        moduleResults.push({
          moduleName: module,
          score: 75,
          alignedCount: 0,
          reviewCount: 0,
          misalignedCount: 0,
          issues: [],
        });
      }

      stepState.completedSteps.push(SCAN_STEPS[i + 1]);
    }

    // ─── Check if too many modules failed ────────────────────
    if (failedModules > 3) {
      await prisma.alignmentScan.update({
        where: { id: scanId },
        data: { status: "FAILED" },
      });
      scanProgress.delete(scanId);
      return;
    }

    // ─── Step 7: Calculate final score ───────────────────────
    const finalState = scanProgress.get(scanId);
    if (!finalState || finalState.cancelled) {
      await markCancelled(scanId);
      return;
    }

    finalState.currentStep = 7;
    finalState.progress = 88;

    // Weighted average of module scores
    let weightedSum = 0;
    let totalWeight = 0;
    for (const result of moduleResults) {
      const weight = MODULE_WEIGHTS[result.moduleName];
      weightedSum += result.score * weight;
      totalWeight += weight;
    }
    const overallScore =
      totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 75;

    const totalItems = moduleResults.reduce(
      (sum, m) => sum + m.alignedCount + m.reviewCount + m.misalignedCount,
      0
    );
    const alignedCount = moduleResults.reduce(
      (sum, m) => sum + m.alignedCount,
      0
    );
    const reviewCount = moduleResults.reduce(
      (sum, m) => sum + m.reviewCount,
      0
    );
    const misalignedCount = moduleResults.reduce(
      (sum, m) => sum + m.misalignedCount,
      0
    );

    // Collect all issues across modules
    const allIssues = moduleResults.flatMap((m) =>
      m.issues.map((issue) => ({
        severity: issue.severity,
        title: issue.title,
        modulePath: issue.modulePath,
        description: issue.description,
        conflictsWith: issue.conflictsWith,
        recommendation: issue.recommendation,
        sourceItemId: issue.sourceItemId ?? null,
        sourceItemType: issue.sourceItemType ?? null,
        targetItemId: issue.targetItemId ?? null,
        targetItemType: issue.targetItemType ?? null,
        status: "OPEN" as const,
        workspaceId,
      }))
    );

    // ─── Step 8: Write to DB ─────────────────────────────────
    finalState.progress = 95;

    const now = new Date();
    await prisma.alignmentScan.update({
      where: { id: scanId },
      data: {
        score: overallScore,
        totalItems: Math.max(totalItems, moduleResults.length),
        alignedCount,
        reviewCount,
        misalignedCount,
        status: "COMPLETED",
        completedAt: now,
        moduleScores: {
          create: moduleResults.map((m) => ({
            moduleName: m.moduleName,
            score: m.score,
            alignedCount: m.alignedCount,
            reviewCount: m.reviewCount,
            misalignedCount: m.misalignedCount,
            lastCheckedAt: now,
          })),
        },
        issues: {
          create: allIssues,
        },
      },
    });

    finalState.completedSteps.push(SCAN_STEPS[7]);
    finalState.progress = 100;
  } catch (error) {
    console.error("[scanner] Scan failed:", error);
    try {
      await prisma.alignmentScan.update({
        where: { id: scanId },
        data: { status: "FAILED" },
      });
    } catch {
      // Ignore DB error during failure handling
    }
  } finally {
    // Cleanup in-memory state after a delay
    setTimeout(() => scanProgress.delete(scanId), 60_000);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

async function markCancelled(scanId: string) {
  await prisma.alignmentScan.update({
    where: { id: scanId },
    data: { status: "CANCELLED" },
  });
  scanProgress.delete(scanId);
}
