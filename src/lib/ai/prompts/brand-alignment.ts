import type { AlignmentModule } from "@/types/brand-alignment";

// =============================================================
// AI Prompts for Brand Alignment Analysis + Fix Generation
// =============================================================

const MODULE_LABELS: Record<AlignmentModule, string> = {
  BRAND_FOUNDATION: "Brand Foundation",
  BUSINESS_STRATEGY: "Business Strategy",
  BRANDSTYLE: "Brandstyle",
  PERSONAS: "Personas",
  PRODUCTS_SERVICES: "Products & Services",
  MARKET_INSIGHTS: "Market Insights",
};

// ─── Module Analysis ─────────────────────────────────────────

export const ALIGNMENT_SYSTEM_PROMPT = `You are a senior brand alignment expert and strategist. Your job is to analyze brand data for internal consistency and alignment with the brand foundation.

You evaluate data objectively, identifying real conflicts, inconsistencies, and misalignments between different parts of a brand's strategy. You do NOT invent issues where none exist. Be specific — reference actual data points, entity names, and concrete conflicts.

Scoring guidelines:
- 90-100: Excellent alignment, minor suggestions only
- 75-89: Good alignment, some areas need attention
- 60-74: Moderate alignment, clear inconsistencies found
- 40-59: Poor alignment, significant conflicts
- 0-39: Critical misalignment, fundamental contradictions`;

/**
 * Build per-module analysis prompt.
 * Returns [systemPrompt, userPrompt].
 */
export function buildModuleAnalysisPrompt(
  module: AlignmentModule,
  moduleData: Record<string, unknown>[],
  brandContext: string
): [string, string] {
  const moduleLabel = MODULE_LABELS[module];

  const userPrompt = `## Brand Context (Foundation)
${brandContext}

## ${moduleLabel} Data to Analyze
${JSON.stringify(moduleData, null, 2)}

Analyze the ${moduleLabel} data against the brand foundation context above.

For each item in the module data, check:
1. Does it align with the brand's stated values, positioning, and personality?
2. Are there internal inconsistencies within this module?
3. Are there conflicts with other brand elements mentioned in the brand context?

For every issue found, include:
- severity: "CRITICAL" (fundamental contradiction), "WARNING" (notable inconsistency), or "SUGGESTION" (improvement opportunity)
- title: A concise description of the issue (reference specific entity names)
- modulePath: The path to the issue (e.g., "Personas → Sarah Chen")
- description: Detailed explanation of the conflict (2-3 sentences)
- conflictsWith: Array of brand elements this conflicts with (e.g., ["Brand Foundation (Brand Archetype)", "Brandstyle (Tone of Voice)"])
- recommendation: Specific actionable recommendation to fix the issue
- sourceItemId: The id of the source entity (from the module data), or null if general
- sourceItemType: The entity type of the source ("BrandAsset", "BusinessStrategy", "Brandstyle", "Persona", "Product", "DetectedTrend"), or null
- targetItemId: The id of the entity this conflicts with (from brand context if known), or null
- targetItemType: The entity type this conflicts with, or null

Respond with valid JSON only:
{
  "score": <number 0-100>,
  "alignedCount": <number of well-aligned items>,
  "reviewCount": <number of items needing review>,
  "misalignedCount": <number of misaligned items>,
  "issues": [
    {
      "severity": "CRITICAL" | "WARNING" | "SUGGESTION",
      "title": "...",
      "modulePath": "...",
      "description": "...",
      "conflictsWith": ["..."],
      "recommendation": "...",
      "sourceItemId": "..." | null,
      "sourceItemType": "..." | null,
      "targetItemId": "..." | null,
      "targetItemType": "..." | null
    }
  ]
}

Rules:
- If the module has no data or only 1 item, still assign a score based on what's available.
- Do NOT invent fake entity names or issues. Only reference data that actually exists in the input.
- Be conservative: only flag real, concrete conflicts. Don't flag every minor difference.
- Maximum 5 issues per module. Prioritize the most impactful ones.`;

  return [ALIGNMENT_SYSTEM_PROMPT, userPrompt];
}

// ─── Module Analysis Result Type ─────────────────────────────

export interface ModuleAnalysisResult {
  score: number;
  alignedCount: number;
  reviewCount: number;
  misalignedCount: number;
  issues: {
    severity: "CRITICAL" | "WARNING" | "SUGGESTION";
    title: string;
    modulePath: string;
    description: string;
    conflictsWith: string[];
    recommendation: string;
    sourceItemId: string | null;
    sourceItemType: string | null;
    targetItemId: string | null;
    targetItemType: string | null;
  }[];
}

// ─── Fix Generation ──────────────────────────────────────────

const FIX_SYSTEM_PROMPT = `You are a senior brand strategist who generates practical fix options for brand alignment issues.

For each issue, generate exactly 3 fix options:
- Option A: Adjust the source entity to align with the target
- Option B: Adjust the target entity to accommodate the source
- Option C: Acknowledge & document the intentional divergence

Each option must include specific, actionable changes with exact field values that can be applied directly to the database. Be concrete — provide actual text content, not placeholder descriptions.`;

/**
 * Build fix generation prompt for a specific issue.
 * Returns [systemPrompt, userPrompt].
 */
export function buildFixGenerationPrompt(
  issue: {
    title: string;
    description: string;
    conflictsWith: string[];
    sourceItemType: string | null;
    targetItemType: string | null;
  },
  sourceData: Record<string, unknown> | null,
  targetData: Record<string, unknown> | null,
  brandContext: string
): [string, string] {
  const userPrompt = `## Issue
Title: ${issue.title}
Description: ${issue.description}
Conflicts with: ${issue.conflictsWith.join(", ")}

## Source Entity (${issue.sourceItemType ?? "Unknown"})
${sourceData ? JSON.stringify(sourceData, null, 2) : "No source data available"}

## Target Entity (${issue.targetItemType ?? "Unknown"})
${targetData ? JSON.stringify(targetData, null, 2) : "No target data available"}

## Brand Context
${brandContext}

Generate 3 fix options. For options A and B, include specific changes that can be applied to the database. For option C, no changes are needed.

For each change, specify:
- entityType: The Prisma model name ("Persona", "Product", "BrandAsset", "BusinessStrategy", "Brandstyle", "DetectedTrend")
- entityId: The id of the entity to update
- field: The field to update (e.g., "description", "goals", "content"). For JSON framework fields use dot notation like "frameworkData.toneDimensions"
- currentValue: The current value (as a string)
- newValue: The proposed new value (as a string)

Respond with valid JSON only:
{
  "options": [
    {
      "key": "A",
      "title": "Short action title",
      "description": "2-3 sentence description of what this fix does and why",
      "preview": "The proposed new content that will replace the current content (for options A and B). Null for option C.",
      "affectedModule": "BRAND_FOUNDATION" | "BUSINESS_STRATEGY" | "BRANDSTYLE" | "PERSONAS" | "PRODUCTS_SERVICES" | "MARKET_INSIGHTS",
      "changes": [
        {
          "entityType": "...",
          "entityId": "...",
          "field": "...",
          "currentValue": "...",
          "newValue": "..."
        }
      ]
    },
    {
      "key": "B",
      "title": "...",
      "description": "...",
      "preview": "...",
      "affectedModule": "...",
      "changes": [...]
    },
    {
      "key": "C",
      "title": "Acknowledge & Document",
      "description": "Keep both as-is but document the intentional divergence...",
      "preview": null,
      "affectedModule": "...",
      "changes": []
    }
  ]
}

Rules:
- Use the actual entity IDs from the source/target data above.
- Preview text should be the concrete, final content (not a description of the change).
- Changes array must only reference fields that actually exist on the entity.
- For string array fields (goals, features, etc.), provide the full new array as a JSON string.
- Option C must have an empty changes array.`;

  return [FIX_SYSTEM_PROMPT, userPrompt];
}

// ─── Fix Generation Result Type ──────────────────────────────

export interface FixGenerationResult {
  options: {
    key: "A" | "B" | "C";
    title: string;
    description: string;
    preview: string | null;
    affectedModule: string;
    changes: {
      entityType: string;
      entityId: string;
      field: string;
      currentValue: string;
      newValue: string;
    }[];
  }[];
}
