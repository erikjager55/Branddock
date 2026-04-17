/**
 * Brand Auditor — AI-powered brand strength analysis.
 *
 * Combines deterministic scoring (completeness, activation readiness)
 * with Claude AI analysis (clarity, differentiation) to produce
 * a comprehensive brand audit.
 */

import { prisma } from "@/lib/prisma";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { fetchAllModuleData } from "./data-fetcher";
import {
  computeAssetCompleteness,
  computeActivationReadiness,
  scoreToGrade,
} from "./audit-scoring";
import type {
  BrandAuditResult,
  AuditDimension,
  AssetAuditScore,
  ImprovementPoint,
  AuditDimensionKey,
} from "@/types/brand-alignment";

// ─── AI response shape ──────────────────────────────────────

interface AiAuditResponse {
  clarityScore: number;
  claritySummary: string;
  differentiationScore: number;
  differentiationSummary: string;
  assetAssessments: {
    assetName: string;
    qualityScore: number;
    qualitySummary: string;
    improvements: string[];
  }[];
  improvements: {
    title: string;
    description: string;
    impact: "HIGH" | "MEDIUM" | "LOW";
    effort: "LOW" | "MEDIUM" | "HIGH";
    assetName: string | null;
    frameworkType: string | null;
  }[];
}

// ─── Main entry point ───────────────────────────────────────

export async function runBrandAudit(
  workspaceId: string
): Promise<BrandAuditResult> {
  // 1. Deterministic scores
  const [completenessResult, activationScore, moduleData, latestScan] =
    await Promise.all([
      computeAssetCompleteness(workspaceId),
      computeActivationReadiness(workspaceId),
      fetchAllModuleData(workspaceId),
      prisma.alignmentScan.findFirst({
        where: { workspaceId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: { score: true },
      }),
    ]);

  const consistencyScore = latestScan?.score ?? 0;

  // 2. AI analysis for clarity + differentiation + per-asset quality
  const aiResult = await runAiAnalysis(
    moduleData,
    completenessResult.assets.map((a) => a.assetName)
  );

  // 3. Assemble dimensions
  const dimensions: AuditDimension[] = [
    {
      key: "completeness" as AuditDimensionKey,
      label: "Completeness",
      score: completenessResult.avgCompleteness,
      grade: scoreToGrade(completenessResult.avgCompleteness),
      summary: `${completenessResult.assets.filter((a) => a.completenessPercent >= 80).length} of ${completenessResult.assets.length} brand assets are well-filled (≥80%).`,
    },
    {
      key: "clarity" as AuditDimensionKey,
      label: "Clarity",
      score: clamp(aiResult.clarityScore),
      grade: scoreToGrade(clamp(aiResult.clarityScore)),
      summary: aiResult.claritySummary,
    },
    {
      key: "consistency" as AuditDimensionKey,
      label: "Consistency",
      score: Math.round(consistencyScore),
      grade: scoreToGrade(Math.round(consistencyScore)),
      summary: latestScan
        ? `Based on your latest alignment scan score of ${Math.round(consistencyScore)}%.`
        : "No alignment scan has been run yet. Run one to measure internal consistency.",
    },
    {
      key: "differentiation" as AuditDimensionKey,
      label: "Differentiation",
      score: clamp(aiResult.differentiationScore),
      grade: scoreToGrade(clamp(aiResult.differentiationScore)),
      summary: aiResult.differentiationSummary,
    },
    {
      key: "activation_readiness" as AuditDimensionKey,
      label: "Activation Readiness",
      score: activationScore,
      grade: scoreToGrade(activationScore),
      summary: `Your brand has ${activationScore >= 75 ? "strong" : activationScore >= 50 ? "adequate" : "insufficient"} foundations to run effective campaigns.`,
    },
  ];

  // 4. Merge AI asset scores with deterministic completeness
  const assetScores: AssetAuditScore[] = completenessResult.assets.map((a) => {
    const aiAsset = aiResult.assetAssessments.find(
      (aa) => aa.assetName.toLowerCase() === a.assetName.toLowerCase()
    );
    return {
      assetId: a.assetId,
      assetName: a.assetName,
      frameworkType: a.frameworkType,
      completenessPercent: a.completenessPercent,
      qualityScore: clamp10(aiAsset?.qualityScore ?? 5),
      qualitySummary: aiAsset?.qualitySummary ?? "No AI assessment available.",
      improvements: aiAsset?.improvements ?? [],
    };
  });

  // Sort weakest first
  assetScores.sort(
    (a, b) =>
      a.completenessPercent + a.qualityScore * 10 -
      (b.completenessPercent + b.qualityScore * 10)
  );

  // 5. Map improvements with asset IDs
  const improvements: ImprovementPoint[] = (aiResult.improvements ?? [])
    .slice(0, 10)
    .map((imp) => {
      const matchedAsset = imp.assetName
        ? completenessResult.assets.find(
            (a) => a.assetName.toLowerCase() === imp.assetName!.toLowerCase()
          )
        : null;
      return {
        title: imp.title,
        description: imp.description,
        impact: imp.impact,
        effort: imp.effort,
        assetId: matchedAsset?.assetId ?? null,
        assetName: matchedAsset?.assetName ?? imp.assetName ?? null,
        frameworkType: imp.frameworkType ?? matchedAsset?.frameworkType ?? null,
      };
    });

  // 6. Weighted overall score
  // Completeness 25%, Clarity 25%, Consistency 20%, Differentiation 20%, Activation 10%
  const overallScore = Math.round(
    dimensions[0].score * 0.25 +
      dimensions[1].score * 0.25 +
      dimensions[2].score * 0.2 +
      dimensions[3].score * 0.2 +
      dimensions[4].score * 0.1
  );

  // 7. Persist
  const audit = await prisma.brandAudit.create({
    data: {
      workspaceId,
      overallScore,
      dimensions: JSON.parse(JSON.stringify(dimensions)),
      assetScores: JSON.parse(JSON.stringify(assetScores)),
      improvements: JSON.parse(JSON.stringify(improvements)),
    },
  });

  return {
    id: audit.id,
    overallScore,
    dimensions,
    assetScores,
    improvements,
    createdAt: audit.createdAt.toISOString(),
  };
}

// ─── AI analysis ────────────────────────────────────────────

async function runAiAnalysis(
  moduleData: Awaited<ReturnType<typeof fetchAllModuleData>>,
  assetNames: string[]
): Promise<AiAuditResponse> {
  const brandDataSummary = moduleData
    .map((m) => {
      const itemSummaries = m.items
        .slice(0, 20)
        .map((item) => JSON.stringify(item, null, 0).slice(0, 800))
        .join("\n");
      return `## ${m.moduleName} (${m.itemCount} items)\n${itemSummaries}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a senior brand strategist performing a brand audit. Analyze the provided brand data and assess:

1. **Clarity** (0-100): How clear and distinct is the brand positioning? Is the purpose, promise, and essence well-articulated and easy to understand?
2. **Differentiation** (0-100): How distinguishable is this brand from competitors? Does it have a unique positioning, memorable story, and distinctive personality?
3. **Per-asset quality** (1-10 per asset): Rate each brand asset on depth and strategic quality.
4. **Improvement points**: List the top 5-10 most impactful improvements, prioritized by impact.

Be honest and specific. A score of 50 means average, 70 means good, 90+ means exceptional.
For improvements, focus on actionable, specific recommendations — not generic advice.`;

  const userPrompt = `Analyze this brand data and provide your audit:

${brandDataSummary}

Brand assets to assess individually: ${assetNames.join(", ")}

Respond as JSON matching this exact structure:
{
  "clarityScore": <number 0-100>,
  "claritySummary": "<1-2 sentences>",
  "differentiationScore": <number 0-100>,
  "differentiationSummary": "<1-2 sentences>",
  "assetAssessments": [
    {
      "assetName": "<exact asset name>",
      "qualityScore": <number 1-10>,
      "qualitySummary": "<1 sentence>",
      "improvements": ["<specific improvement>", "<specific improvement>"]
    }
  ],
  "improvements": [
    {
      "title": "<short title>",
      "description": "<1-2 sentences>",
      "impact": "HIGH" | "MEDIUM" | "LOW",
      "effort": "LOW" | "MEDIUM" | "HIGH",
      "assetName": "<asset name or null>",
      "frameworkType": "<framework type or null>"
    }
  ]
}`;

  try {
    return await createClaudeStructuredCompletion<AiAuditResponse>(
      systemPrompt,
      userPrompt,
      { maxTokens: 8000, temperature: 0.3 }
    );
  } catch (error) {
    console.error("[auditor] AI analysis failed, using fallback:", error);
    return {
      clarityScore: 50,
      claritySummary: "AI analysis unavailable. Score based on data completeness.",
      differentiationScore: 50,
      differentiationSummary:
        "AI analysis unavailable. Add competitor data for differentiation assessment.",
      assetAssessments: assetNames.map((name) => ({
        assetName: name,
        qualityScore: 5,
        qualitySummary: "AI assessment unavailable.",
        improvements: [],
      })),
      improvements: [
        {
          title: "Complete all brand assets",
          description: "Fill in all framework fields across your 12 brand assets for a complete brand foundation.",
          impact: "HIGH" as const,
          effort: "MEDIUM" as const,
          assetName: null,
          frameworkType: null,
        },
      ],
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clamp10(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}
