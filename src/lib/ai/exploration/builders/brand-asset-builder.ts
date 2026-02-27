// ─── Brand Asset Builder for AI Exploration ─────────────────
// Implements ItemTypeConfig for brand asset items.
// Supports asset-specific dimensions based on asset slug.
// ────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import type { ItemTypeConfig, DimensionQuestion } from '../item-type-registry';
import { generateReport, resolveModelConfig } from '../exploration-llm';
import type { GeneratedReport } from '../exploration-llm';

// ─── Framework-Specific Dimensions ─────────────────────────

const PURPOSE_WHEEL_DIMENSIONS: DimensionQuestion[] = [
  {
    key: 'core_purpose',
    title: 'Core Purpose',
    icon: 'Target',
    question:
      "Let's start with the heart of your purpose. Why does your organization exist beyond making money? What fundamental belief or conviction drives everything you do? Try to express this as a clear, compelling statement.",
  },
  {
    key: 'impact_type',
    title: 'Impact & Reach',
    icon: 'Lightbulb',
    question:
      "Now let's explore your impact. The IDEO Purpose Wheel identifies 5 types of impact: Enable Potential, Reduce Friction, Foster Prosperity, Encourage Exploration, and Kindle Happiness. Which of these best describes how your purpose manifests? How does this impact look in practice for your customers and stakeholders?",
  },
  {
    key: 'mechanism',
    title: 'Mechanism & Delivery',
    icon: 'Cog',
    question:
      "How do you deliver on this purpose? What is the specific mechanism — the products, services, approach, or methodology — through which your impact is achieved? Be specific about what makes your delivery unique.",
  },
  {
    key: 'pressure_test',
    title: 'Pressure Test & Alignment',
    icon: 'FlaskConical',
    question:
      "Finally, let's pressure-test your purpose. If this purpose were truly at the center of your organization: What would it unlock for employees? How would it change product decisions? What partnerships would you pursue or decline? Would a stranger recognize this purpose from your actions?",
  },
];

// ─── Dimension Questions per Asset Slug ────────────────────

const SOCIAL_RELEVANCY_DIMENSIONS: DimensionQuestion[] = [
  {
    key: 'purpose_clarity',
    title: 'Purpose Clarity',
    icon: 'Compass',
    question:
      "Let's start by exploring your brand's purpose. Why does your organization exist beyond making profit? What change do you want to see in the world, and how does your brand contribute to that change?",
  },
  {
    key: 'mens',
    title: 'Impact op Mens',
    icon: 'Heart',
    question:
      "Now let's look at your brand's impact on people. How do your products or services contribute to personal growth, well-being, or a healthier lifestyle? Think about both your customers and your employees.",
  },
  {
    key: 'milieu',
    title: 'Impact op Milieu',
    icon: 'Leaf',
    question:
      "Let's explore your environmental impact. What steps has your organization taken toward sustainability? This can include your production process, packaging, operations, or the way your products help reduce environmental impact.",
  },
  {
    key: 'maatschappij',
    title: 'Impact op Maatschappij',
    icon: 'Globe',
    question:
      "Finally, let's discuss your societal contribution. How does your brand help improve society — whether through fighting inequality, building community, promoting education, or making professional tools accessible to a wider audience?",
  },
];

const PURPOSE_STATEMENT_DIMENSIONS: DimensionQuestion[] = [
  {
    key: 'why',
    title: 'Waarom — Bestaansrecht',
    icon: 'Compass',
    question:
      "Let's define your brand's reason for existence. Why was your organization founded? What fundamental problem or inequality in the world drove its creation? Go deeper than your product — what belief or conviction is at the core?",
  },
  {
    key: 'how',
    title: 'Hoe — Unieke Aanpak',
    icon: 'Lightbulb',
    question:
      "Now let's explore your unique approach. How do you fulfill your purpose in a way that's distinctly yours? What makes your method, process, or philosophy different from others trying to solve the same problem?",
  },
  {
    key: 'impact',
    title: 'Impact — Gewenst Effect',
    icon: 'Rocket',
    question:
      "Let's articulate the impact you aim to create. When your purpose is fully realized, what does the world look like? How do people think, feel, and act differently because of your brand's existence?",
  },
  {
    key: 'alignment',
    title: 'Alignment — Organisatie & Uitvoering',
    icon: 'Target',
    question:
      "Finally, let's assess alignment. How well does your current organization reflect your purpose? Is your purpose visible in daily decisions, product development, and how you treat employees and customers? Where are the gaps?",
  },
];

const DEFAULT_BRAND_ASSET_DIMENSIONS: DimensionQuestion[] = [
  {
    key: 'definition',
    title: 'Definition & Scope',
    icon: 'FileText',
    question:
      "Let's start by defining this brand asset clearly. What does it mean for your organization specifically? How would you explain it to someone unfamiliar with your brand?",
  },
  {
    key: 'current_state',
    title: 'Current State',
    icon: 'BarChart2',
    question:
      "How would you describe the current state of this brand asset? Is it well-defined and actively used, or still in development? What's working well and what needs improvement?",
  },
  {
    key: 'differentiation',
    title: 'Differentiation',
    icon: 'Zap',
    question:
      "How does this brand asset set you apart from competitors? What makes your approach unique in your market? Can you give specific examples?",
  },
  {
    key: 'activation',
    title: 'Activation & Application',
    icon: 'Rocket',
    question:
      "Finally, how is this brand asset activated across your organization? How does it influence marketing, product development, customer experience, and internal culture? Where do you see the biggest opportunity for better activation?",
  },
];

// ─── Dimension Resolver ────────────────────────────────────

function getDimensionsForAsset(slug: string, frameworkType?: string): DimensionQuestion[] {
  // Framework-specific dimensions take priority
  if (frameworkType === 'PURPOSE_WHEEL') return PURPOSE_WHEEL_DIMENSIONS;

  switch (slug) {
    case 'social-relevancy':
      return SOCIAL_RELEVANCY_DIMENSIONS;
    case 'purpose-statement':
      return PURPOSE_STATEMENT_DIMENSIONS;
    default:
      return DEFAULT_BRAND_ASSET_DIMENSIONS;
  }
}

// ─── Field Mapping per Framework / Slug ──────────────────

const PURPOSE_WHEEL_FIELD_MAPPING = [
  { field: 'frameworkData.statement', label: 'Purpose Statement', type: 'text' as const },
  { field: 'frameworkData.impactType', label: 'Impact Type', type: 'string' as const },
  { field: 'frameworkData.mechanism', label: 'Mechanism', type: 'text' as const },
  { field: 'frameworkData.pressureTest', label: 'Pressure Test', type: 'text' as const },
];

const SOCIAL_RELEVANCY_FIELD_MAPPING = [
  { field: 'content', label: 'Beschrijving', type: 'text' as const },
  { field: 'frameworkData.pillars.mens.description', label: 'Mens — Beschrijving', type: 'text' as const },
  { field: 'frameworkData.pillars.milieu.description', label: 'Milieu — Beschrijving', type: 'text' as const },
  { field: 'frameworkData.pillars.maatschappij.description', label: 'Maatschappij — Beschrijving', type: 'text' as const },
];

const PURPOSE_STATEMENT_FIELD_MAPPING = [
  { field: 'content.why', label: 'Waarom — Bestaansrecht', type: 'text' as const },
  { field: 'content.how', label: 'Hoe — Unieke Aanpak', type: 'text' as const },
  { field: 'content.impact', label: 'Impact — Gewenst Effect', type: 'text' as const },
];

const DEFAULT_FIELD_MAPPING = [
  { field: 'content', label: 'Content', type: 'text' as const },
  { field: 'description', label: 'Beschrijving', type: 'text' as const },
];

function getFieldMappingForAsset(slug: string, frameworkType?: string) {
  // Framework-specific field mapping takes priority
  if (frameworkType === 'PURPOSE_WHEEL') return PURPOSE_WHEEL_FIELD_MAPPING;

  switch (slug) {
    case 'social-relevancy':
      return SOCIAL_RELEVANCY_FIELD_MAPPING;
    case 'purpose-statement':
      return PURPOSE_STATEMENT_FIELD_MAPPING;
    default:
      return DEFAULT_FIELD_MAPPING;
  }
}

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
      if (typeof item.content === 'string') {
        parts.push(`Content: ${(item.content as string).slice(0, 200)}`);
      }
    }
  }
  if (item.frameworkType) parts.push(`Framework: ${item.frameworkType}`);
  if (item.frameworkData) {
    try {
      const fw =
        typeof item.frameworkData === 'string'
          ? JSON.parse(item.frameworkData as string)
          : item.frameworkData;

      if (item.frameworkType === 'PURPOSE_WHEEL' && typeof fw === 'object' && fw !== null) {
        const pwd = fw as Record<string, string>;
        if (pwd.statement) parts.push(`Current Purpose Statement: "${pwd.statement}"`);
        if (pwd.impactType) parts.push(`Impact Type: ${pwd.impactType}`);
        if (pwd.impactDescription) parts.push(`Impact Description: ${pwd.impactDescription}`);
        if (pwd.mechanism) parts.push(`Mechanism: ${pwd.mechanism}`);
        if (pwd.pressureTest) parts.push(`Pressure Test: ${pwd.pressureTest}`);
      } else if (typeof fw === 'object' && fw !== null) {
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

// ─── Current Field Value Resolver ─────────────────────────

function resolveCurrentFieldValues(
  item: Record<string, unknown>,
  fieldMapping: { field: string; label: string; type: string }[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  let parsedContent: Record<string, unknown> | null = null;
  try {
    if (typeof item.content === 'string') parsedContent = JSON.parse(item.content as string);
  } catch { /* plain text content */ }

  let parsedFramework: Record<string, unknown> | null = null;
  try {
    if (typeof item.frameworkData === 'string') parsedFramework = JSON.parse(item.frameworkData as string);
  } catch { /* noop */ }

  for (const fm of fieldMapping) {
    if (fm.field.startsWith('content.')) {
      const key = fm.field.replace('content.', '');
      values[fm.field] = parsedContent?.[key] ?? null;
    } else if (fm.field.startsWith('frameworkData.')) {
      const path = fm.field.replace('frameworkData.', '').split('.');
      let obj: Record<string, unknown> | null = parsedFramework;
      for (const segment of path) {
        if (!obj || typeof obj !== 'object') { obj = null; break; }
        obj = obj[segment] as Record<string, unknown> | null;
      }
      values[fm.field] = typeof obj === 'string' ? obj : (obj as unknown) ?? null;
    } else if (fm.field === 'content') {
      values[fm.field] = typeof item.content === 'string' ? item.content : null;
    } else {
      values[fm.field] = item[fm.field] ?? null;
    }
  }

  return values;
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

  getDimensions(item?: Record<string, unknown>) {
    if (item) {
      const slug = (item.slug as string) ?? '';
      const frameworkType = item.frameworkType as string | undefined;
      return getDimensionsForAsset(slug, frameworkType);
    }
    return DEFAULT_BRAND_ASSET_DIMENSIONS;
  },

  buildItemContext(item) {
    return buildBrandAssetContext(item);
  },

  buildIntro(item) {
    const name = item.name as string;
    const slug = (item.slug as string) ?? '';
    const frameworkType = item.frameworkType as string | undefined;
    const description = item.description as string | null;

    if (frameworkType === 'PURPOSE_WHEEL') {
      return `Welcome to the AI Exploration for **${name}** — The reason your organization exists beyond profit. I'll guide you through 4 dimensions based on the IDEO Purpose Wheel methodology: your core purpose, impact type, delivery mechanism, and a pressure test to validate alignment. Let's begin!`;
    }

    const dimensions = getDimensionsForAsset(slug, frameworkType);
    return `Welcome to the AI Exploration for **${name}**${description ? ` — ${description}` : ''}. I'll guide you through ${dimensions.length} key dimensions to build a validated understanding of this brand asset. Let's begin!`;
  },

  async generateInsights(item, session) {
    const name = item.name as string;
    const slug = (item.slug as string) ?? '';
    const sessionId = (session as { id: string }).id;
    const modelId = (session as { modelId?: string }).modelId;

    console.log('[brand-asset-builder] generateInsights: sessionId:', sessionId, '| slug:', slug, '| modelId:', modelId);

    const frameworkType = (item.frameworkType as string) ?? undefined;
    const dimensions = getDimensionsForAsset(slug, frameworkType);
    const fieldMapping = getFieldMappingForAsset(slug, frameworkType);

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

    // Resolve current field values based on slug-specific mapping
    const currentFieldValues = resolveCurrentFieldValues(item, fieldMapping);

    // Resolve model config
    const modelConfig = resolveModelConfig(modelId);

    // Generate report via LLM
    const report: GeneratedReport = await generateReport({
      itemType: 'brand_asset',
      itemName: name,
      itemContext: buildBrandAssetContext(item),
      dimensions,
      allQA,
      fieldMapping,
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
