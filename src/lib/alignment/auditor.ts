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
  ImprovementImpact,
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
    completenessResult.assets.map((a) => a.assetName),
    workspaceId
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
  assetNames: string[],
  workspaceId: string
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
    const raw = await createClaudeStructuredCompletion<unknown>(
      systemPrompt,
      userPrompt,
      { maxTokens: 8000, temperature: 0.3 },
      {
        // BrandAudit record exists pas na deze AI-call — gebruik Workspace als parent
        workspaceId,
        parentEntityType: 'Workspace',
        parentEntityId: workspaceId,
        sourceIdentifier: 'src/lib/alignment/auditor.ts:runAiAnalysis',
      },
    );
    return normalizeAiAuditResponse(raw);
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

// ─── AI response validation ─────────────────────────────────

/**
 * Validates and coerces the raw AI completion into a well-formed
 * AiAuditResponse. Coerces recoverable deviations (string numbers,
 * lowercase enums, missing arrays) and throws only when the response
 * is not an object at all — the caller's catch then serves the
 * deterministic fallback. Without this, a missing assetAssessments
 * array 500s the audit route and an off-enum impact/effort value gets
 * persisted and crashes the audit view on every subsequent render.
 */
function normalizeAiAuditResponse(raw: unknown): AiAuditResponse {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(
      `AI audit response is not an object (got ${Array.isArray(raw) ? "array" : typeof raw})`
    );
  }
  const o = raw as Record<string, unknown>;
  return {
    clarityScore: toFiniteNumber(o.clarityScore, 50),
    claritySummary: toNonEmptyString(o.claritySummary, "No clarity summary provided."),
    differentiationScore: toFiniteNumber(o.differentiationScore, 50),
    differentiationSummary: toNonEmptyString(
      o.differentiationSummary,
      "No differentiation summary provided."
    ),
    assetAssessments: normalizeAssetAssessments(o.assetAssessments),
    improvements: normalizeImprovements(o.improvements),
  };
}

function normalizeAssetAssessments(
  value: unknown
): AiAuditResponse["assetAssessments"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const o = item as Record<string, unknown>;
    // Without a usable name the assessment can never match an asset.
    if (typeof o.assetName !== "string" || o.assetName.trim() === "") return [];
    return [
      {
        assetName: o.assetName,
        qualityScore: toFiniteNumber(o.qualityScore, 5),
        qualitySummary: toNonEmptyString(o.qualitySummary, "No AI assessment available."),
        improvements: Array.isArray(o.improvements)
          ? o.improvements.filter((s): s is string => typeof s === "string")
          : [],
      },
    ];
  });
}

function normalizeImprovements(value: unknown): AiAuditResponse["improvements"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const o = item as Record<string, unknown>;
    const title = toNullableString(o.title);
    if (!title) return [];
    return [
      {
        title,
        description: toNonEmptyString(o.description, ""),
        impact: normalizeImpactEffort(o.impact, "impact"),
        effort: normalizeImpactEffort(o.effort, "effort"),
        assetName: toNullableString(o.assetName),
        frameworkType: toNullableString(o.frameworkType),
      },
    ];
  });
}

function normalizeImpactEffort(
  value: unknown,
  field: "impact" | "effort"
): ImprovementImpact {
  const upper = typeof value === "string" ? value.toUpperCase() : "";
  if (upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") return upper;
  console.warn("[auditor] Invalid enum value in AI response, using MEDIUM", {
    field,
    value,
  });
  return "MEDIUM";
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

// ─── Helpers ────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clamp10(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}
