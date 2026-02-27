import { prisma } from '@/lib/prisma';
import type { ExplorationConfigData, StoredDimension, StoredFieldSuggestionConfig } from './config.types';

/**
 * Resolve the exploration config for a given item type.
 * Priority: workspace + type + subtype → workspace + type (subtype null) → system defaults
 */
export async function resolveExplorationConfig(
  workspaceId: string,
  itemType: string,
  itemSubType?: string | null,
): Promise<ExplorationConfigData> {
  try {
    // 1. Try exact match (type + subtype)
    let config = itemSubType
      ? await prisma.explorationConfig.findUnique({
          where: {
            workspaceId_itemType_itemSubType: {
              workspaceId, itemType, itemSubType,
            },
          },
        })
      : null;

    // 2. Fallback: type-level config (subtype = null)
    if (!config) {
      config = await prisma.explorationConfig.findFirst({
        where: { workspaceId, itemType, itemSubType: null },
      });
    }

    // 3. No DB config → system defaults
    if (!config) {
      return getSystemDefault(itemType, itemSubType);
    }

    // 4. Fetch custom knowledge items for this config
    const knowledgeItems = await prisma.explorationKnowledgeItem.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: 'asc' },
    });

    const customKnowledge = formatKnowledgeItems(knowledgeItems);

    return {
      id: config.id,
      itemType: config.itemType,
      itemSubType: config.itemSubType,
      label: config.label,
      provider: config.provider,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemPrompt: config.systemPrompt,
      dimensions: config.dimensions as unknown as StoredDimension[],
      feedbackPrompt: config.feedbackPrompt,
      reportPrompt: config.reportPrompt,
      fieldSuggestionsConfig: config.fieldSuggestionsConfig as unknown as StoredFieldSuggestionConfig[] | null,
      contextSources: config.contextSources,
      isActive: config.isActive,
      customKnowledge,
    };
  } catch (error) {
    // DB lookup failed (model not yet pushed, stale client, etc.) → use defaults
    console.warn('[resolveExplorationConfig] DB lookup failed, using system defaults:',
      error instanceof Error ? error.message : error,
    );
    return getSystemDefault(itemType, itemSubType);
  }
}

// ─── Knowledge Items Formatter ──────────────────────────────

function formatKnowledgeItems(
  items: { title: string; content: string; category: string | null }[],
): string {
  if (items.length === 0) return '';

  const sections = items.map((item) => {
    const categoryTag = item.category ? ` [${item.category}]` : '';
    return `### ${item.title}${categoryTag}\n${item.content}`;
  });

  return `## Custom Knowledge\n${sections.join('\n\n')}`;
}

// ─── System Defaults ────────────────────────────────────────
// Backwards compatible — werkt zonder DB config

function getSystemDefault(itemType: string, itemSubType?: string | null): ExplorationConfigData {
  return {
    id: `system-default-${itemType}-${itemSubType ?? 'base'}`,
    itemType,
    itemSubType: itemSubType ?? null,
    label: null,
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.4,
    maxTokens: 2048,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    dimensions: getDefaultDimensions(itemType, itemSubType),
    feedbackPrompt: DEFAULT_FEEDBACK_PROMPT,
    reportPrompt: DEFAULT_REPORT_PROMPT,
    fieldSuggestionsConfig: null,
    contextSources: ['brand_asset', 'product'],
    isActive: true,
    customKnowledge: '',
  };
}

const DEFAULT_SYSTEM_PROMPT = `You are a senior brand strategist conducting a structured exploration session.
Guide the user through strategic dimensions with thoughtful questions.
Be warm but professional — like a trusted advisor.
Ask ONE question at a time. Keep questions concise.
Reference specific details from previous answers.

{{brandContext}}

{{customKnowledge}}`;

const DEFAULT_FEEDBACK_PROMPT = `Provide brief, constructive feedback (2-3 sentences) on the user's answer.
Dimension: {{dimensionTitle}}
Question asked: {{questionAsked}}
User's answer: {{userAnswer}}
Acknowledge what's strong. If something could be explored further, note it gently.
Reference their specific words. Never ask a follow-up question.
Respond in the same language as the user.`;

const DEFAULT_REPORT_PROMPT = `Generate an analysis report based on the exploration session.
Item: {{itemName}} ({{itemType}})
{{itemDescription}}

Answers per dimension:
{{allAnswers}}

Brand Context:
{{brandContext}}

{{customKnowledge}}

Generate JSON:
{
  "executiveSummary": "2-3 paragraph strategic summary",
  "findings": [{ "title": "...", "description": "..." }],
  "recommendations": ["..."],
  "fieldSuggestions": [{ "field": "...", "label": "...", "suggestedValue": "...", "reason": "..." }]
}
Respond with valid JSON only.`;

function getDefaultDimensions(itemType: string, itemSubType?: string | null): StoredDimension[] {
  if (itemType === 'persona') {
    return [
      { key: 'demographics', title: 'Demographics Profile', icon: 'Users', question: "Can you tell me more about this persona's background — age range, location, education, professional context?" },
      { key: 'goals_motivations', title: 'Goals & Motivations', icon: 'TrendingUp', question: "What are this persona's primary objectives — both professional and personal?" },
      { key: 'challenges_frustrations', title: 'Challenges & Pain Points', icon: 'Heart', question: "What are the main obstacles this persona faces? What pain points do they experience?" },
      { key: 'value_proposition', title: 'Value Alignment', icon: 'Zap', question: "How does your brand's offering connect with this persona's needs?" },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'social-relevancy') {
    return [
      { key: 'purpose_clarity', title: 'Purpose Clarity', icon: 'Compass', question: 'Why does your organization exist beyond making profit?' },
      { key: 'mens', title: 'Impact op Mens', icon: 'Heart', question: 'How do your products or services contribute to personal growth and well-being?' },
      { key: 'milieu', title: 'Impact op Milieu', icon: 'Leaf', question: 'What steps has your organization taken toward sustainability?' },
      { key: 'maatschappij', title: 'Impact op Maatschappij', icon: 'Globe', question: 'How does your brand help improve society?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'purpose-statement') {
    return [
      { key: 'why', title: 'Waarom — Bestaansrecht', icon: 'Compass', question: 'Why was your organization founded? What fundamental belief is at the core?' },
      { key: 'how', title: 'Hoe — Unieke Aanpak', icon: 'Lightbulb', question: "How do you fulfill your purpose in a way that's distinctly yours?" },
      { key: 'impact', title: 'Impact — Gewenst Effect', icon: 'Rocket', question: 'When your purpose is fully realized, what does the world look like?' },
      { key: 'alignment', title: 'Alignment — Organisatie & Uitvoering', icon: 'Target', question: 'How well does your current organization reflect your purpose?' },
    ];
  }
  return [
    { key: 'definition', title: 'Definition & Scope', icon: 'FileText', question: 'What does this brand asset mean for your organization?' },
    { key: 'current_state', title: 'Current State', icon: 'BarChart2', question: 'How would you describe the current state of this brand asset?' },
    { key: 'differentiation', title: 'Differentiation', icon: 'Zap', question: 'How does this set you apart from competitors?' },
    { key: 'activation', title: 'Activation & Application', icon: 'Rocket', question: 'How is this activated across your organization?' },
  ];
}
