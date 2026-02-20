import { prisma } from "@/lib/prisma";
import { MODULE_CONFIG } from "./module-config";
import type { AlignmentModule, FixOptionsResponse, FixOption } from "@/types/brand-alignment";

// =============================================================
// Fix options generator — mock for now
// Later: replace with real AI-powered fix suggestions
// =============================================================

/**
 * Generate 3 fix options (A/B/C) for a given alignment issue.
 */
export async function generateFixOptions(
  issueId: string,
  workspaceId: string
): Promise<FixOptionsResponse> {
  const issue = await prisma.alignmentIssue.findFirst({
    where: { id: issueId, workspaceId },
  });

  if (!issue) {
    throw new Error("Issue not found");
  }

  // Determine source and target labels from module path
  const sourceLabel = issue.modulePath || "Source module";
  const targetLabel =
    issue.conflictsWith.length > 0
      ? issue.conflictsWith[0]
      : "Target module";

  // Get mock current content based on source/target types
  const currentContent = await getMockContent(issue);

  // Generate 3 fix options
  const sourceModule = getModuleFromType(issue.sourceItemType);
  const targetModule = getModuleFromType(issue.targetItemType);

  const options: FixOption[] = [
    {
      key: "A",
      title: `Adjust ${sourceLabel}`,
      description: `Modify the source content in ${sourceLabel} to align with ${targetLabel}. This approach changes the source to match the established target.`,
      preview: generatePreviewText(issue.title, "source"),
      affectedModule: sourceModule,
    },
    {
      key: "B",
      title: `Adjust ${targetLabel}`,
      description: `Modify the target content in ${targetLabel} to accommodate ${sourceLabel}. This approach updates the target to be compatible with the source.`,
      preview: generatePreviewText(issue.title, "target"),
      affectedModule: targetModule,
    },
    {
      key: "C",
      title: "Acknowledge & Document",
      description:
        "Keep both as-is but document the intentional divergence. Add a note explaining why these elements differ and under what circumstances each applies.",
      preview: null,
      affectedModule: sourceModule,
    },
  ];

  return {
    issueId: issue.id,
    issueSummary: issue.description,
    currentContent: {
      source: {
        label: sourceLabel,
        content: currentContent.source,
      },
      target: {
        label: targetLabel,
        content: currentContent.target,
      },
    },
    options,
  };
}

/**
 * Apply a fix option and mark the issue as FIXED.
 */
export async function applyFixOption(
  issueId: string,
  optionKey: "A" | "B" | "C",
  workspaceId: string
) {
  const issue = await prisma.alignmentIssue.findFirst({
    where: { id: issueId, workspaceId, status: "OPEN" },
  });

  if (!issue) {
    throw new Error("Issue not found or already resolved");
  }

  // For now, just mark as FIXED (real implementation would update affected entities)
  const updated = await prisma.alignmentIssue.update({
    where: { id: issueId },
    data: {
      status: "FIXED",
      fixAppliedAt: new Date(),
      fixOption: optionKey,
    },
  });

  // Mock updated entities based on option
  const updatedEntities =
    optionKey === "C"
      ? []
      : [
          {
            type: issue.sourceItemType ?? "Unknown",
            id: issue.sourceItemId ?? "unknown",
            field: "description",
            oldValue: "Original content (before fix)",
            newValue: "Updated content aligned with brand guidelines",
          },
        ];

  return {
    success: true,
    issueId: updated.id,
    newStatus: "FIXED" as const,
    updatedEntities,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function getModuleFromType(
  itemType: string | null
): AlignmentModule {
  switch (itemType) {
    case "BrandAsset":
      return "BRAND_FOUNDATION";
    case "BusinessStrategy":
      return "BUSINESS_STRATEGY";
    case "Brandstyle":
      return "BRANDSTYLE";
    case "Persona":
      return "PERSONAS";
    case "Product":
      return "PRODUCTS_SERVICES";
    case "MarketInsight":
      return "MARKET_INSIGHTS";
    default:
      return "BRAND_FOUNDATION";
  }
}

async function getMockContent(issue: {
  sourceItemType: string | null;
  targetItemType: string | null;
  title: string;
}) {
  // Mock content for demo purposes
  const contentMap: Record<string, { source: string; target: string }> = {
    Persona: {
      source:
        "Target audience: millennials (25-34), digital-first mindset, casual communication style, value authenticity and social proof.",
      target:
        "Brand positioning: premium enterprise solution for decision-makers, formal and authoritative messaging, emphasis on ROI and business outcomes.",
    },
    Product: {
      source:
        'Product description uses casual tone: "Super easy to set up, awesome features that just work!"',
      target:
        "Brand voice guidelines: Professional, authoritative, and knowledgeable. Avoid colloquialisms and casual language.",
    },
    BusinessStrategy: {
      source:
        "Growth target: 200% increase in SMB customer base over 12 months through aggressive pricing and freemium model.",
      target:
        "Market positioning: Premium enterprise solution with high-touch onboarding and dedicated support.",
    },
    BrandAsset: {
      source:
        "Core values: sustainability, innovation, and transparency across all brand touchpoints.",
      target:
        "Product descriptions focus on features and pricing without reflecting core brand values or sustainability commitments.",
    },
  };

  const key = issue.sourceItemType ?? "BrandAsset";
  return (
    contentMap[key] ?? {
      source: `Current content in ${issue.sourceItemType ?? "source"} module`,
      target: `Current content in ${issue.targetItemType ?? "target"} module`,
    }
  );
}

function generatePreviewText(
  issueTitle: string,
  side: "source" | "target"
): string {
  if (side === "source") {
    return "The updated content will be revised to align with brand guidelines, maintaining consistency across all touchpoints while preserving the original intent.";
  }
  return "The target content will be updated to accommodate the source perspective, creating a more flexible framework that supports both approaches.";
}
