// ─── Brand Asset Builder for AI Exploration ─────────────────
// Implements ItemTypeConfig for brand asset items.
// ────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import type { ItemTypeConfig, DimensionQuestion } from '../item-type-registry';
import { generateReport, resolveModelConfig } from '../exploration-llm';
import type { GeneratedReport } from '../exploration-llm';

// ─── Dimension Questions ───────────────────────────────────

const BRAND_ASSET_DIMENSIONS: DimensionQuestion[] = [
  {
    key: 'definition_clarity',
    title: 'Definition & Clarity',
    icon: 'FileText',
    question:
      "Let's start by examining the definition of this brand asset. How would you describe its core meaning and role within your brand? What makes it distinct and meaningful to your organization?",
  },
  {
    key: 'audience_relevance',
    title: 'Audience Relevance',
    icon: 'Users',
    question:
      "Now let's explore audience relevance. How does this brand asset resonate with your target audience? Can you describe situations where this asset directly influences how customers perceive or interact with your brand?",
  },
  {
    key: 'competitive_differentiation',
    title: 'Competitive Differentiation',
    icon: 'TrendingUp',
    question:
      "Let's look at competitive positioning. How does this brand asset set you apart from competitors? What unique perspective or value does it communicate that others in your market don't?",
  },
  {
    key: 'strategic_application',
    title: 'Strategic Application',
    icon: 'Zap',
    question:
      "Finally, let's discuss strategic application. How do you currently use this brand asset across your marketing channels and touchpoints? Where do you see the biggest opportunities to leverage it more effectively?",
  },
];

// ─── Field Mapping ─────────────────────────────────────────

export const BRAND_ASSET_FIELD_MAPPING = [
  { field: 'description', label: 'Description', type: 'text' as const },
];

// ─── Item Context Builder ─────────────────────────────────

function buildBrandAssetContext(item: Record<string, unknown>): string {
  const parts: string[] = [];
  parts.push(`Name: ${item.name}`);
  if (item.description) parts.push(`Description: ${item.description}`);
  if (item.category) parts.push(`Category: ${item.category}`);
  if (item.status) parts.push(`Status: ${item.status}`);
  if (item.content) {
    try {
      const content =
        typeof item.content === 'string'
          ? JSON.parse(item.content as string)
          : item.content;
      if (typeof content === 'object' && content !== null) {
        const entries = Object.entries(content as Record<string, unknown>);
        const summary = entries
          .filter(([, v]) => typeof v === 'string' && (v as string).length > 0)
          .map(([k, v]) => `${k}: ${v}`)
          .slice(0, 5)
          .join('\n');
        if (summary) parts.push(`Content:\n${summary}`);
      }
    } catch {
      // ignore parse errors
    }
  }
  if (item.frameworkType) parts.push(`Framework: ${item.frameworkType}`);
  if (item.frameworkData) {
    try {
      const fw =
        typeof item.frameworkData === 'string'
          ? JSON.parse(item.frameworkData as string)
          : item.frameworkData;
      if (typeof fw === 'object' && fw !== null) {
        const entries = Object.entries(fw as Record<string, unknown>);
        const summary = entries
          .filter(([, v]) => typeof v === 'string' && (v as string).length > 0)
          .map(([k, v]) => `${k}: ${v}`)
          .slice(0, 5)
          .join('\n');
        if (summary) parts.push(`Framework Data:\n${summary}`);
      }
    } catch {
      // ignore
    }
  }
  return parts.join('\n');
}

// ─── Config ────────────────────────────────────────────────

export const brandAssetItemConfig: ItemTypeConfig = {
  lockType: 'brandAsset',

  async fetchItem(itemId, workspaceId) {
    const asset = await prisma.brandAsset.findFirst({
      where: { id: itemId, workspaceId },
    });
    return asset as unknown as Record<string, unknown> | null;
  },

  getDimensions() {
    return BRAND_ASSET_DIMENSIONS;
  },

  buildItemContext(item) {
    return buildBrandAssetContext(item);
  },

  buildIntro(item) {
    const name = item.name as string;
    const category = item.category as string | null;
    const categoryLabel = category
      ? category.charAt(0) + category.slice(1).toLowerCase()
      : 'Brand';
    return `Welcome to the AI Exploration for **${name}** (${categoryLabel} asset). I'll guide you through ${BRAND_ASSET_DIMENSIONS.length} key dimensions to validate and strengthen this brand asset. Let's begin!`;
  },

  async generateInsights(item, session) {
    const name = item.name as string;
    const sessionId = (session as { id: string }).id;
    const modelId = (session as { modelId?: string }).modelId;

    console.log('[brand-asset-builder] generateInsights: sessionId:', sessionId, '| modelId:', modelId);

    const messages = await prisma.explorationMessage.findMany({
      where: { sessionId },
      orderBy: { orderIndex: 'asc' },
    });

    console.log('[brand-asset-builder] Found messages:', messages.length);

    // Build Q&A pairs from messages
    const allQA: { question: string; answer: string; dimensionKey: string }[] = [];
    let lastQuestion: { content: string; dimensionKey: string } | null = null;

    for (const msg of messages) {
      if (msg.type === 'AI_QUESTION') {
        const meta = msg.metadata as { dimensionKey?: string } | null;
        lastQuestion = { content: msg.content, dimensionKey: meta?.dimensionKey ?? '' };
      } else if (msg.type === 'USER_ANSWER' && lastQuestion) {
        allQA.push({
          question: lastQuestion.content,
          answer: msg.content,
          dimensionKey: lastQuestion.dimensionKey,
        });
        lastQuestion = null;
      }
    }

    console.log('[brand-asset-builder] Built Q&A pairs:', allQA.length);

    // Build current field values
    const currentFieldValues: Record<string, unknown> = {};
    for (const fm of BRAND_ASSET_FIELD_MAPPING) {
      currentFieldValues[fm.field] = item[fm.field] ?? null;
    }

    // Resolve model config
    const modelConfig = resolveModelConfig(modelId);

    // Generate report via LLM
    const report: GeneratedReport = await generateReport({
      itemType: 'brand_asset',
      itemName: name,
      itemContext: buildBrandAssetContext(item),
      dimensions: BRAND_ASSET_DIMENSIONS,
      allQA,
      fieldMapping: BRAND_ASSET_FIELD_MAPPING,
      currentFieldValues,
      modelConfig,
    });

    // Transform to ExplorationInsightsData format
    return {
      dimensions: report.dimensions,
      executiveSummary: report.executiveSummary,
      findings: report.findings,
      recommendations: report.recommendations,
      fieldSuggestions: report.fieldSuggestions.map((s, i) => ({
        id: `suggestion-${i}`,
        field: s.field,
        label: s.label,
        currentValue: (currentFieldValues[s.field] as string | string[] | null) ?? null,
        suggestedValue: s.suggestedValue,
        reason: s.reason,
        status: 'pending' as const,
      })),
      researchBoostPercentage: 15,
      completedAt: new Date().toISOString(),
    };
  },

  async updateResearchMethod(itemId) {
    // Mark AI_EXPLORATION as COMPLETED
    await prisma.brandAssetResearchMethod.updateMany({
      where: { brandAssetId: itemId, method: 'AI_EXPLORATION' },
      data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
    });

    // Recalculate validation percentage
    const methods = await prisma.brandAssetResearchMethod.findMany({
      where: { brandAssetId: itemId },
    });

    const WEIGHTS: Record<string, number> = {
      AI_EXPLORATION: 0.15,
      WORKSHOP: 0.30,
      INTERVIEWS: 0.25,
      QUESTIONNAIRE: 0.30,
    };

    let totalWeight = 0;
    let completedWeight = 0;
    for (const m of methods) {
      const w = WEIGHTS[m.method] ?? 0.25;
      totalWeight += w;
      if (m.status === 'COMPLETED') completedWeight += w;
    }

    const validationPercentage = totalWeight > 0
      ? Math.round((completedWeight / totalWeight) * 100)
      : 0;

    await prisma.brandAsset.update({
      where: { id: itemId },
      data: { coveragePercentage: validationPercentage },
    });

    return validationPercentage;
  },
};
