/**
 * Deterministic audit scoring for brand assets.
 *
 * Calculates completeness and activation readiness without AI calls.
 * Used by the auditor to provide instant scores for 2 of the 5 dimensions.
 */

import { prisma } from "@/lib/prisma";
import {
  getAssetCompletenessPercentage,
  type CompletenessInput,
} from "@/lib/brand-asset-completeness";
import type { AssetAuditScore, AuditGrade } from "@/types/brand-alignment";

/** Map a 0-100 score to a letter grade */
export function scoreToGrade(score: number): AuditGrade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

/** Fetch all brand assets and compute completeness per asset */
export async function computeAssetCompleteness(
  workspaceId: string
): Promise<{ assets: AssetCompletenessRow[]; avgCompleteness: number }> {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      frameworkType: true,
      frameworkData: true,
    },
    orderBy: { name: "asc" },
  });

  const rows: AssetCompletenessRow[] = assets.map((a) => {
    const input: CompletenessInput = {
      description: a.description ?? "",
      frameworkType: a.frameworkType,
      frameworkData: a.frameworkData,
    };
    return {
      assetId: a.id,
      assetName: a.name,
      frameworkType: a.frameworkType ?? "UNKNOWN",
      completenessPercent: getAssetCompletenessPercentage(input),
    };
  });

  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.completenessPercent, 0) / rows.length)
      : 0;

  return { assets: rows, avgCompleteness: avg };
}

export interface AssetCompletenessRow {
  assetId: string;
  assetName: string;
  frameworkType: string;
  completenessPercent: number;
}

/** Compute Activation Readiness: do we have enough to run campaigns? */
export async function computeActivationReadiness(
  workspaceId: string
): Promise<number> {
  const [personaCount, productCount, styleguide, strategyCount] =
    await Promise.all([
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
      prisma.brandStyleguide.findFirst({
        where: { workspaceId },
        select: {
          primaryFontName: true,
          contentGuidelines: true,
          colors: { select: { id: true } },
        },
      }),
      prisma.businessStrategy.count({ where: { workspaceId } }),
    ]);

  let score = 0;

  // Personas (25 points): at least 2 for full score
  score += Math.min(personaCount, 2) * 12.5;

  // Products (20 points): at least 2
  score += Math.min(productCount, 2) * 10;

  // Brandstyle (25 points): font + guidelines + colors
  if (styleguide) {
    if (styleguide.primaryFontName) score += 8;
    if (styleguide.contentGuidelines) score += 8;
    if ((styleguide.colors?.length ?? 0) >= 3) score += 9;
  }

  // Strategy (15 points)
  if (strategyCount > 0) score += 15;

  // Competitors (15 points)
  const competitorCount = await prisma.competitor.count({ where: { workspaceId } });
  score += Math.min(competitorCount, 2) * 7.5;

  return Math.round(Math.min(score, 100));
}
