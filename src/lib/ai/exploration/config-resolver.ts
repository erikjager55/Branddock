import { prisma } from '@/lib/prisma';
import type { ExplorationConfigData, StoredDimension, StoredFieldSuggestionConfig } from './config.types';

/**
 * Fetch item-level knowledge sources and format as markdown.
 */
export async function fetchItemKnowledgeSources(
  workspaceId: string,
  itemType: string,
  itemId: string,
): Promise<string> {
  try {
    const sources = await prisma.itemKnowledgeSource.findMany({
      where: { workspaceId, itemType, itemId, isProcessed: true },
      orderBy: { createdAt: 'asc' },
    });

    if (sources.length === 0) return '';

    const sections = sources.map((s) => {
      const typeTag = ` [${s.sourceType}]`;
      const content = s.content ?? s.url ?? '';
      return `### ${s.title}${typeTag}\n${content}`;
    });

    return `## Asset Knowledge\n${sections.join('\n\n')}`;
  } catch (error) {
    console.warn('[fetchItemKnowledgeSources] Failed:', error instanceof Error ? error.message : error);
    return '';
  }
}

/**
 * Resolve the exploration config for a given item type.
 * Priority: workspace + type + subtype → workspace + type (subtype null) → system defaults
 */
export async function resolveExplorationConfig(
  workspaceId: string,
  itemType: string,
  itemSubType?: string | null,
  itemId?: string,
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
      const defaults = getSystemDefault(itemType, itemSubType);
      // Still fetch item-level knowledge even for system defaults
      if (itemId) {
        defaults.assetKnowledge = await fetchItemKnowledgeSources(workspaceId, itemType, itemId);
      }
      return defaults;
    }

    // 4. Fetch custom knowledge items for this config
    const knowledgeItems = await prisma.explorationKnowledgeItem.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: 'asc' },
    });

    const customKnowledge = formatKnowledgeItems(knowledgeItems);

    // 5. Fetch item-level knowledge sources
    const assetKnowledge = itemId
      ? await fetchItemKnowledgeSources(workspaceId, itemType, itemId)
      : '';

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
      assetKnowledge,
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
    assetKnowledge: '',
  };
}

const DEFAULT_SYSTEM_PROMPT = `You are a senior brand strategist conducting a structured exploration session.
Guide the user through strategic dimensions with thoughtful questions.
Be warm but professional — like a trusted advisor.
Ask ONE question at a time. Keep questions concise.
Reference specific details from previous answers.

{{brandContext}}

{{customKnowledge}}

{{assetKnowledge}}`;

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

{{assetKnowledge}}

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
      { key: 'mens', title: 'Impact on People', icon: 'Heart', question: 'How do your products or services contribute to personal growth and well-being?' },
      { key: 'milieu', title: 'Impact on Environment', icon: 'Leaf', question: 'What steps has your organization taken toward sustainability?' },
      { key: 'maatschappij', title: 'Impact on Society', icon: 'Globe', question: 'How does your brand help improve society?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'purpose-statement') {
    return [
      { key: 'origin_belief', title: 'Origin & Belief', icon: 'BookOpen', question: 'Tell me the story behind your organization. Why was it founded, and what fundamental problem or belief drove that decision?' },
      { key: 'impact_exploration', title: 'Impact Exploration', icon: 'Zap', question: 'Describe a moment when your organization was at its best — what happened, and why was that special?' },
      { key: 'mechanism', title: 'Mechanism & Approach', icon: 'Cog', question: "We've explored your 'why'. Now the 'how': through what unique mechanism or approach do you deliver this impact? What do you do differently from the rest?" },
      { key: 'pressure_test', title: 'Pressure Test', icon: 'Shield', question: 'Imagine your organization ceased to exist tomorrow. What would the world lose? What gap would remain that nobody else can fill?' },
      { key: 'articulation', title: 'Articulation & Formulation', icon: 'Target', question: "Based on everything we've discussed — how would you summarize your purpose in one powerful sentence? Think: clear, emotional, and actionable." },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'golden-circle') {
    return [
      { key: 'origin_story', title: 'Origin & Drive', icon: 'BookOpen', question: 'Tell me the story of your organization. Not what you do, but what drove you to start. What moment or belief was the spark?' },
      { key: 'why_deepdive', title: 'WHY — Core Belief', icon: 'Heart', question: 'Based on your story, I hear a deeper belief. Let\'s explore it: if you strip away all products and services, what remains? What do you fundamentally believe?' },
      { key: 'how_differentiation', title: 'HOW — Differentiating Approach', icon: 'Compass', question: 'Your WHY is clear. Now the HOW: what principles, values, or methods make your approach different from the rest? What are the guiding principles that drive your daily actions?' },
      { key: 'what_proof', title: 'WHAT — Proof & Offering', icon: 'Package', question: 'Your WHAT are the tangible proofs of your WHY. What products, services, or initiatives demonstrate that you truly live by your belief?' },
      { key: 'inside_out_test', title: 'Inside-Out Test', icon: 'Target', question: 'The power of the Golden Circle lies in its coherence. If a customer or employee had to guess your WHY based solely on your products — would they arrive at what you just told me?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-essence') {
    return [
      { key: 'brand_dna', title: 'Brand DNA', icon: 'Fingerprint', question: 'If your brand were a person in a room full of competitors, what would make people gravitate toward them? What is the single most defining characteristic?' },
      { key: 'value_landscape', title: 'Value Landscape', icon: 'Heart', question: 'Describe the best experience a customer has with your brand. What tangible result do they get, what feeling does it create, and how does it let them express who they are?' },
      { key: 'audience_truth', title: 'Audience Truth', icon: 'Users', question: 'What is the underlying tension, frustration, or deep desire your audience carries — the thing they might not say out loud but your brand uniquely addresses?' },
      { key: 'evidence_heritage', title: 'Evidence & Heritage', icon: 'ShieldCheck', question: "What concrete facts, achievements, or moments from your brand's history prove that your essence is real — not aspirational, but lived?" },
      { key: 'differentiation', title: 'Differentiation', icon: 'Target', question: 'Complete this sentence: "Only [your brand] can _____ because _____." What is the single most compelling reason to choose your brand?' },
      { key: 'essence_distillation', title: 'Essence Distillation', icon: 'Diamond', question: 'Based on everything we discussed, distill your brand into 3 words: adjective, adjective, noun. What would that be, and why those words?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-promise') {
    return [
      { key: 'promise_core', title: 'Promise Core', icon: 'Shield', question: 'What is the one promise your brand makes to every customer, every time — the commitment they can always count on? Can you distill that into a single sentence that could serve as a tagline?' },
      { key: 'value_layers', title: 'Value Layers', icon: 'Heart', question: 'Describe the best experience a customer has when you deliver on your promise. What tangible result do they get, what feeling does it create, and how does it let them express who they are?' },
      { key: 'audience_need', title: 'Audience & Need', icon: 'Users', question: 'Who is your promise for, and what deeper need does it address — the thing your audience might not say out loud but your brand uniquely solves?' },
      { key: 'onlyness', title: 'Onlyness & Differentiation', icon: 'Target', question: 'Complete this sentence: "Only [your brand] can _____ because _____." What makes your promise impossible to replicate?' },
      { key: 'evidence', title: 'Evidence & Outcomes', icon: 'ShieldCheck', question: 'What concrete proof exists that you deliver on your promise? Name 3-5 specific facts, metrics, or customer outcomes that demonstrate it.' },
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
      { key: 'archetype_discovery', title: 'Archetype Discovery', icon: 'Crown', question: 'If your brand were a character in a story, what role would it play? The hero who overcomes challenges? The wise guide who mentors? The rebel who challenges the status quo? Think about what role feels most natural — and which archetype(s) you recognize in your brand.' },
      { key: 'core_psychology', title: 'Core Psychology', icon: 'Heart', question: 'What is the deepest desire your brand fulfills for customers — and what fear does it help them overcome? What unique gift, talent, or strategy does your brand bring to the world that others can\'t easily replicate?' },
      { key: 'shadow_risks', title: 'Shadow & Risks', icon: 'Moon', question: 'Every archetype has a shadow side — when taken too far, its strengths become weaknesses. What does that look like for your brand? How do you guard against these patterns?' },
      { key: 'voice_messaging', title: 'Voice & Messaging', icon: 'MessageCircle', question: 'How does your archetype translate into the way your brand communicates? Describe your brand\'s voice in 3-5 adjectives. What words does your brand use — and what would it never say?' },
      { key: 'visual_expression', title: 'Visual Expression', icon: 'Palette', question: 'If you were to express your archetype visually — through colors, typography, imagery, and motifs — what direction feels right?' },
      { key: 'archetype_in_action', title: 'Archetype in Action', icon: 'Activity', question: 'How does your archetype come alive in marketing campaigns, customer experience, content strategy, and storytelling? Give a specific example.' },
      { key: 'competitive_positioning', title: 'Competitive Positioning', icon: 'Target', question: 'Which brands in your industry share a similar archetype? How do you differentiate within that territory? What positioning approach works best — similarity, aspiration, guidance, or inspiration?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'transformative-goals') {
    return [
      { key: 'origin_belief', title: 'MTP Foundation', icon: 'Sparkles', question: 'What massive, audacious change does your brand want to see in the world? Think beyond products \u2014 what is your Massive Transformative Purpose (MTP) that would make the world fundamentally better?' },
      { key: 'future_vision', title: 'Future Vision', icon: 'Eye', question: 'If your brand\u2019s mission succeeds completely, what does the world look like in 10-15 years? Paint a vivid picture of the future state you\u2019re working toward.' },
      { key: 'impact_scope', title: 'Impact Scope', icon: 'Globe', question: 'Which impact domains are most relevant for your brand? Consider People (health, education, inclusion), Planet (environment, sustainability, biodiversity), and Prosperity (economic empowerment, innovation, fair systems). Where can you make the biggest difference?' },
      { key: 'measurable_commitment', title: 'Measurable Commitments', icon: 'Target', question: 'What concrete, time-bound commitments can you make? Think of specific goals with deadlines and measurable targets.' },
      { key: 'theory_of_change', title: 'Theory of Change', icon: 'Map', question: 'How does your brand\u2019s daily activity lead to the transformative impact you described? Walk me through the chain: what you do \u2192 immediate effect \u2192 medium-term change \u2192 long-term transformation.' },
      { key: 'authenticity_alignment', title: 'Authenticity Alignment', icon: 'Shield', question: 'How authentic are these goals given your current brand DNA, operations, and history? Where is there strong alignment, and where might stakeholders see a gap between ambition and reality?' },
      { key: 'activation_strategy', title: 'Activation Strategy', icon: 'Rocket', question: 'How will these transformative goals be integrated into your brand strategy, communication themes, campaigns, and internal culture? Who are the key stakeholders, and what role does each play?' },
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
