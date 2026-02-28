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
  if (itemType === 'brand_asset' && itemSubType === 'golden-circle') {
    return [
      { key: 'why', title: 'WHY — Core Belief', icon: 'Heart', question: 'Why does your organization exist? What is the fundamental belief that drives everything you do?' },
      { key: 'how', title: 'HOW — Unique Approach', icon: 'Settings', question: 'How do you bring your WHY to life? What processes, values, or methods make your approach unique?' },
      { key: 'what', title: 'WHAT — Offering', icon: 'Package', question: 'What exactly do you offer? How do your products or services prove your WHY and HOW?' },
      { key: 'coherence', title: 'Inside-Out Coherence', icon: 'Target', question: 'How consistently does your organization communicate from WHY → HOW → WHAT? Where are the gaps?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-essence') {
    return [
      { key: 'core_identity', title: 'Core Identity', icon: 'Fingerprint', question: 'If your brand were a person, how would you describe their essential character in one sentence?' },
      { key: 'emotional_connection', title: 'Emotional Connection', icon: 'Heart', question: 'What emotion should people feel every time they interact with your brand?' },
      { key: 'differentiation', title: 'Unique DNA', icon: 'Sparkles', question: 'What makes your brand fundamentally different from everything else in your category?' },
      { key: 'consistency', title: 'Essence in Action', icon: 'Layers', question: 'Where does your brand essence show up most clearly — and where does it get lost?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-promise') {
    return [
      { key: 'commitment', title: 'Core Commitment', icon: 'Shield', question: 'What is the one promise your brand makes to every customer, every time?' },
      { key: 'proof', title: 'Proof & Delivery', icon: 'CheckCircle', question: 'How do you consistently deliver on this promise? What evidence can customers point to?' },
      { key: 'gap_analysis', title: 'Promise Gap', icon: 'AlertTriangle', question: 'Where is the biggest gap between what you promise and what customers actually experience?' },
      { key: 'evolution', title: 'Future Promise', icon: 'TrendingUp', question: 'How should your brand promise evolve as your market and customers change?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'mission-statement') {
    return [
      { key: 'purpose', title: 'Purpose & Direction', icon: 'Compass', question: 'What is your organization trying to achieve right now? What is the primary mission?' },
      { key: 'audience', title: 'Who You Serve', icon: 'Users', question: 'Who are the primary beneficiaries of your mission? How does it improve their lives?' },
      { key: 'approach', title: 'How You Deliver', icon: 'Rocket', question: 'What is your unique approach to fulfilling this mission? What sets your method apart?' },
      { key: 'measurement', title: 'Impact & Measurement', icon: 'BarChart2', question: 'How do you know if your mission is succeeding? What does progress look like?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'vision-statement') {
    return [
      { key: 'future_state', title: 'Future State', icon: 'Eye', question: 'What does the world look like when your organization has fully succeeded? Paint the picture.' },
      { key: 'ambition', title: 'Scale of Ambition', icon: 'Mountain', question: 'How ambitious is your vision? Does it inspire people to go beyond what seems possible today?' },
      { key: 'relevance', title: 'Stakeholder Relevance', icon: 'Users', question: 'How does this vision connect to what your employees, customers, and partners care about?' },
      { key: 'pathway', title: 'Vision to Action', icon: 'Map', question: 'What are the key milestones between today and your vision? What needs to happen first?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-archetype') {
    return [
      { key: 'archetype_fit', title: 'Archetype Identity', icon: 'Crown', question: 'Which archetype best represents your brand — and why? What traits does your brand naturally embody?' },
      { key: 'behavior', title: 'Archetypal Behavior', icon: 'Activity', question: 'How does this archetype show up in your brand\u2019s communication, products, and customer interactions?' },
      { key: 'shadow', title: 'Shadow Side', icon: 'Moon', question: 'What is the shadow side of your archetype? How do you avoid falling into those negative patterns?' },
      { key: 'storytelling', title: 'Narrative Power', icon: 'BookOpen', question: 'How does your archetype shape the stories you tell? What recurring narrative themes define your brand?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'transformative-goals') {
    return [
      { key: 'transformation', title: 'Desired Transformation', icon: 'Sparkles', question: 'What fundamental change does your brand want to create in people\u2019s lives or in the world?' },
      { key: 'barriers', title: 'Barriers to Change', icon: 'Shield', question: 'What stands in the way of this transformation? What obstacles do your customers face?' },
      { key: 'enablers', title: 'How You Enable', icon: 'Zap', question: 'How does your brand specifically help people overcome these barriers and achieve transformation?' },
      { key: 'evidence', title: 'Transformation Evidence', icon: 'Award', question: 'What evidence exists that your brand has already created this transformation? Share concrete examples.' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-personality') {
    return [
      { key: 'traits', title: 'Core Traits', icon: 'User', question: 'If your brand were a person at a dinner party, how would other guests describe them? Name 3-5 key personality traits.' },
      { key: 'voice', title: 'Voice & Tone', icon: 'MessageCircle', question: 'How does your brand speak? What words would it use — and never use? What\u2019s the tone in different situations?' },
      { key: 'relationships', title: 'Relationship Style', icon: 'Heart', question: 'What kind of relationship does your brand build with people? A trusted advisor? A fun friend? A wise mentor?' },
      { key: 'boundaries', title: 'Personality Boundaries', icon: 'AlertCircle', question: 'What is your brand personality NOT? What traits would feel inauthentic or off-brand?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-story') {
    return [
      { key: 'origin', title: 'Origin Story', icon: 'BookOpen', question: 'How did your brand begin? What problem or moment sparked its creation?' },
      { key: 'struggle', title: 'Challenge & Struggle', icon: 'Mountain', question: 'What challenges has your brand overcome? What makes the journey compelling?' },
      { key: 'turning_point', title: 'Turning Point', icon: 'Star', question: 'What was the defining moment that shaped who your brand is today?' },
      { key: 'future_chapter', title: 'The Next Chapter', icon: 'ArrowRight', question: 'What is the next chapter of your brand story? Where is the narrative heading?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brandhouse-values') {
    return [
      { key: 'core_values', title: 'Core Values', icon: 'Heart', question: 'What are the 3-5 non-negotiable values that guide every decision in your organization?' },
      { key: 'lived_values', title: 'Values in Practice', icon: 'CheckCircle', question: 'How do these values show up in daily operations, hiring, and customer interactions?' },
      { key: 'tension', title: 'Value Tensions', icon: 'Scale', question: 'When have your values been tested? How do you handle conflicts between competing values?' },
      { key: 'cultural_fit', title: 'Cultural Expression', icon: 'Building', question: 'How do your values shape your internal culture? Would employees recognize these values in their daily work?' },
    ];
  }
  return [
    { key: 'definition', title: 'Definition & Scope', icon: 'FileText', question: 'What does this brand asset mean for your organization?' },
    { key: 'current_state', title: 'Current State', icon: 'BarChart2', question: 'How would you describe the current state of this brand asset?' },
    { key: 'differentiation', title: 'Differentiation', icon: 'Zap', question: 'How does this set you apart from competitors?' },
    { key: 'activation', title: 'Activation & Application', icon: 'Rocket', question: 'How is this activated across your organization?' },
  ];
}
