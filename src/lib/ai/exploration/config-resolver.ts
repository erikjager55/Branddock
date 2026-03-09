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
  const isArchetype = itemType === 'brand_asset' && itemSubType === 'brand-archetype';
  return {
    id: `system-default-${itemType}-${itemSubType ?? 'base'}`,
    itemType,
    itemSubType: itemSubType ?? null,
    label: null,
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.4,
    maxTokens: 2048,
    systemPrompt: isArchetype ? BRAND_ARCHETYPE_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT,
    dimensions: getDefaultDimensions(itemType, itemSubType),
    feedbackPrompt: isArchetype ? BRAND_ARCHETYPE_FEEDBACK_PROMPT : DEFAULT_FEEDBACK_PROMPT,
    reportPrompt: DEFAULT_REPORT_PROMPT,
    fieldSuggestionsConfig: getDefaultFieldSuggestionsConfig(itemType, itemSubType),
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

const BRAND_ARCHETYPE_SYSTEM_PROMPT = `You are a senior brand strategist specializing in Jungian archetype analysis, conducting a two-phase exploration.

CRITICAL RULE: Always recommend exactly ONE archetype. NEVER suggest a blend, hybrid, dual archetype, or combination of two archetypes. Every brand must commit to a single primary archetype for maximum clarity and consistency.

PHASE 1 — ARCHETYPE DISCOVERY (dimensions 1-2):
Your goal is to help the user discover which single archetype from the 12 Jungian archetypes fits their brand best. Listen carefully to their descriptions of brand personality, emotions, and customer relationships. After the user answers dimension 2 (Core Psychology), you MUST recommend exactly ONE archetype in your feedback — name it (e.g., "Hero", "Sage", "Explorer") and explain WHY it is the best fit based on their answers. If multiple archetypes seem relevant, pick the strongest one and explain why it wins over the alternatives.

The 12 archetypes are: Innocent, Sage, Explorer, Outlaw, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator.

PHASE 2 — FIELD CUSTOMIZATION (dimensions 3-7):
Once the single archetype is identified, your goal shifts to helping the user customize the pre-filled reference data for their specific brand context. Each archetype comes with default psychology, voice, visual, and positioning data. Help the user adapt these to their unique situation. Suggest specific modifications to fields like voice adjectives, color direction, messaging patterns, etc.

Be warm but professional — like a trusted advisor.
Ask ONE question at a time. Keep questions concise.
Reference specific details from previous answers.

{{brandContext}}

{{customKnowledge}}

{{assetKnowledge}}`;

const BRAND_ARCHETYPE_FEEDBACK_PROMPT = `Provide brief, constructive feedback (2-3 sentences) on the user's answer.
Dimension: {{dimensionTitle}}
Question asked: {{questionAsked}}
User's answer: {{userAnswer}}

IMPORTANT RULES:
- ALWAYS recommend exactly ONE archetype. NEVER suggest a blend, hybrid, or combination of two archetypes.
- For "Archetype Discovery" or "Core Psychology" dimensions: You MUST name exactly one archetype with reasoning (e.g., "Based on what you've shared, the Hero archetype is the best fit because..."). If multiple seem relevant, choose the strongest one and briefly explain why it wins.
- For later dimensions (Shadow, Voice, Visual, Action, Positioning): Focus on suggesting specific field customizations for the single chosen archetype. For example: "Your voice adjectives could be: bold, determined, authentic" or "Consider a color direction of deep navy and gold to reflect authority."

Acknowledge what's strong. If something could be explored further, note it gently.
Reference their specific words. Never ask a follow-up question.
Respond in the same language as the user.`;

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
      { key: 'mission_core', title: 'Mission Core', icon: 'Compass', question: 'What is the fundamental reason your organization exists — beyond making money? If you had to explain your mission to a child in one sentence, what would you say?' },
      { key: 'audience_impact', title: 'Audience & Impact', icon: 'Users', question: 'Who are the people your organization serves, and what specific change do you create in their lives? Describe both the primary audience and the tangible outcome they experience.' },
      { key: 'unique_approach', title: 'Unique Approach', icon: 'Rocket', question: 'What makes your approach fundamentally different from others trying to achieve a similar mission? Describe your method, philosophy, or "secret ingredient" that competitors cannot easily replicate.' },
      { key: 'mission_authenticity', title: 'Mission Authenticity', icon: 'Shield', question: 'How does your current daily work reflect your stated mission? Where is the alignment strongest, and where are the biggest gaps between what you say and what you do?' },
      { key: 'future_vision', title: 'Future Vision', icon: 'Eye', question: 'Close your eyes and imagine your organization has fully succeeded — 10 years from now. What does the world look like? Paint a vivid, concrete picture of this future state.' },
      { key: 'bold_aspiration', title: 'Scale of Ambition', icon: 'Mountain', question: 'What is the boldest, most audacious goal your organization could set — one that makes you slightly uncomfortable because of its scale? What would you attempt if you knew you could not fail?' },
      { key: 'success_signals', title: 'Success Signals', icon: 'BarChart2', question: 'How would you know your vision is becoming reality? What are the 3-5 concrete, measurable indicators you would track? Think about impact on customers, employees, industry, and society.' },
      { key: 'mission_vision_bridge', title: 'Mission-Vision Bridge', icon: 'Map', question: 'Your mission describes what you do today; your vision describes where you are going. What is the creative tension between these two? What key milestones or transformations need to happen to bridge the gap?' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-archetype') {
    return [
      { key: 'archetype_discovery', title: 'Archetype Discovery', icon: 'Crown', question: 'Tell me about your brand\'s personality. What emotions do you want to evoke in your customers? If your brand were a character in a story, what role would it play — the hero, the wise guide, the rebel, the caregiver, the explorer? What personality feels most natural?' },
      { key: 'core_psychology', title: 'Core Psychology', icon: 'Heart', question: 'What deep desire does your brand fulfill for customers? What fear or problem does it help them overcome? Think about the fundamental human need your brand addresses — and what unique gift or talent it brings to do so.' },
      { key: 'shadow_risks', title: 'Shadow & Guardrails', icon: 'Moon', question: 'Every archetype has a shadow side — when taken too far, its strengths become weaknesses. What does that look like for your brand? How do you guard against these patterns?' },
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
      { key: 'dimension_mapping', title: 'Personality Dimensions', icon: 'User', question: 'If your brand walked into a room, what impression would it make? Describe its character in terms of sincerity (honest, warm), excitement (daring, spirited), competence (reliable, intelligent), sophistication (elegant, charming), and ruggedness (tough, outdoorsy). Which 1-2 dimensions feel most dominant?' },
      { key: 'core_traits', title: 'Core Traits', icon: 'Fingerprint', question: 'Name 3-5 defining personality traits for your brand. For each trait, give a concrete example of what it looks like in action ("We Are This") and what the "too far" version would be that your brand should never become ("But Never That").' },
      { key: 'spectrum_positioning', title: 'Personality Spectrum', icon: 'Sliders', question: 'Position your brand on these spectrums: friendly vs. formal, energetic vs. thoughtful, modern vs. traditional, innovative vs. proven, playful vs. serious, inclusive vs. exclusive, bold vs. reserved. Where do you sit, and why?' },
      { key: 'voice_tone', title: 'Voice & Tone', icon: 'MessageCircle', question: 'Describe how your brand sounds in writing and speech. Is it formal or casual? Serious or humorous? Respectful or irreverent? Matter-of-fact or enthusiastic? What specific words or phrases does your brand love to use — and which would it never use?' },
      { key: 'writing_sample', title: 'Voice in Action', icon: 'Award', question: 'Write a short paragraph (3-4 sentences) in your brand\u2019s authentic voice. This could be a product description, email opening, or social media post. Show us how the personality comes alive in real communication.' },
      { key: 'channel_adaptation', title: 'Channel Adaptation', icon: 'MessageCircle', question: 'How does your brand\u2019s tone shift across different channels \u2014 website, social media, customer support, email marketing, and crisis communication? The voice stays the same, but the tone adapts. Describe the differences.' },
      { key: 'visual_expression', title: 'Visual Personality', icon: 'Palette', question: 'How should your brand personality translate into visual design? Think about what colors feel right for your personality, what typography style matches your character, and what kind of imagery represents your brand.' },
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

/**
 * Return fallback field suggestions config for known item types.
 * These ensure the LLM knows about ALL updatable fields even without a DB config.
 */
function getDefaultFieldSuggestionsConfig(
  itemType: string,
  itemSubType?: string | null,
): StoredFieldSuggestionConfig[] | null {
  if (itemType === 'brand_asset' && itemSubType === 'brand-personality') {
    return [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the brand personality in one compelling paragraph' },
      { field: 'frameworkData.primaryDimension', label: 'Primary Dimension', type: 'text' as const, extractionHint: 'Identify the dominant Aaker dimension (sincerity, excitement, competence, sophistication, or ruggedness)' },
      { field: 'frameworkData.dimensionScores', label: 'Dimension Scores', type: 'text' as const, extractionHint: 'Score each Aaker dimension 1-5 based on the exploration answers' },
      { field: 'frameworkData.personalityTraits', label: 'Personality Traits', type: 'text' as const, extractionHint: 'Extract 3-5 personality traits with name, description, weAreThis, and butNeverThat for each' },
      { field: 'frameworkData.spectrumSliders', label: 'Spectrum Sliders', type: 'text' as const, extractionHint: 'Position the brand on each spectrum (1-7 scale) based on the exploration answers' },
      { field: 'frameworkData.toneDimensions', label: 'Tone Dimensions', type: 'text' as const, extractionHint: 'Position the brand on each NN/g tone dimension (1-7 scale)' },
      { field: 'frameworkData.brandVoiceDescription', label: 'Brand Voice', type: 'text' as const, extractionHint: 'Describe the overall brand voice in 2-3 sentences' },
      { field: 'frameworkData.wordsWeUse', label: 'Words We Use', type: 'text' as const, extractionHint: 'Extract 5-10 words or phrases the brand should use' },
      { field: 'frameworkData.wordsWeAvoid', label: 'Words We Avoid', type: 'text' as const, extractionHint: 'Extract 5-10 words or phrases the brand should avoid' },
      { field: 'frameworkData.writingSample', label: 'Writing Sample', type: 'text' as const, extractionHint: 'Create a writing sample that demonstrates the brand voice' },
      { field: 'frameworkData.channelTones', label: 'Channel Tones', type: 'text' as const, extractionHint: 'Describe the appropriate tone for each communication channel' },
      { field: 'frameworkData.colorDirection', label: 'Color Direction', type: 'text' as const, extractionHint: 'Describe the color direction that matches the brand personality' },
      { field: 'frameworkData.typographyDirection', label: 'Typography Direction', type: 'text' as const, extractionHint: 'Describe the typography style that matches the brand personality' },
      { field: 'frameworkData.imageryDirection', label: 'Imagery Direction', type: 'text' as const, extractionHint: 'Describe the imagery style that represents the brand personality' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-archetype') {
    return [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the brand archetype positioning' },
      { field: 'frameworkData.primaryArchetype', label: 'Brand Archetype', type: 'select' as const, extractionHint: 'Identify the single best-fitting Jungian archetype for this brand. MUST be exactly one of these lowercase IDs: innocent, everyman, hero, outlaw, explorer, creator, ruler, magician, lover, caregiver, jester, sage. Choose exactly ONE archetype. NEVER suggest a blend, hybrid, or combination of two archetypes.' },
      { field: 'frameworkData.coreDesire', label: 'Core Desire', type: 'text' as const, extractionHint: 'Extract the core desire driving the brand' },
      { field: 'frameworkData.coreFear', label: 'Core Fear', type: 'text' as const, extractionHint: 'Extract the core fear the brand helps overcome' },
      { field: 'frameworkData.brandGoal', label: 'Brand Goal', type: 'text' as const, extractionHint: 'Extract the overarching goal driven by the archetype' },
      { field: 'frameworkData.strategy', label: 'Strategy', type: 'text' as const, extractionHint: 'Extract the archetype strategy' },
      { field: 'frameworkData.giftTalent', label: 'Gift / Talent', type: 'text' as const, extractionHint: 'Extract the unique gift or talent the brand brings' },
      { field: 'frameworkData.shadowWeakness', label: 'Shadow / Weakness', type: 'text' as const, extractionHint: 'Identify the shadow side of the archetype' },
      { field: 'frameworkData.brandVoiceDescription', label: 'Brand Voice', type: 'text' as const, extractionHint: 'Describe the brand voice in 2-3 sentences' },
      { field: 'frameworkData.voiceAdjectives', label: 'Voice Adjectives', type: 'text' as const, extractionHint: 'Extract 3-5 adjectives that describe the brand voice' },
      { field: 'frameworkData.colorDirection', label: 'Color Direction', type: 'text' as const, extractionHint: 'Describe the color direction for the archetype' },
      { field: 'frameworkData.typographyDirection', label: 'Typography Direction', type: 'text' as const, extractionHint: 'Suggest the typography style based on the archetype' },
      { field: 'frameworkData.imageryStyle', label: 'Imagery Style', type: 'text' as const, extractionHint: 'Describe the imagery style for the archetype' },
      { field: 'frameworkData.brandExamples', label: 'Brand Examples', type: 'text' as const, extractionHint: 'List 3-5 reference brands that share this archetype' },
      { field: 'frameworkData.archetypeInAction', label: 'Archetype in Action', type: 'text' as const, extractionHint: 'Describe how the archetype manifests across the brand experience' },
      { field: 'frameworkData.competitiveLandscape', label: 'Competitive Landscape', type: 'text' as const, extractionHint: 'Analyze the competitive landscape from an archetype perspective' },
      { field: 'frameworkData.contentStrategy', label: 'Content Strategy', type: 'text' as const, extractionHint: 'Describe the content strategy for the archetype' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'brand-promise') {
    return [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the brand promise' },
      { field: 'frameworkData.promiseStatement', label: 'Promise Statement', type: 'text' as const, extractionHint: 'Craft the core brand promise' },
      { field: 'frameworkData.promiseOneLiner', label: 'One-Liner', type: 'text' as const, extractionHint: 'Distill the promise into one sentence' },
      { field: 'frameworkData.functionalValue', label: 'Functional Value', type: 'text' as const, extractionHint: 'Extract the tangible functional benefit' },
      { field: 'frameworkData.emotionalValue', label: 'Emotional Value', type: 'text' as const, extractionHint: 'Extract the emotional benefit' },
      { field: 'frameworkData.selfExpressiveValue', label: 'Self-Expressive Value', type: 'text' as const, extractionHint: 'Extract how the brand helps self-expression' },
      { field: 'frameworkData.targetAudience', label: 'Target Audience', type: 'text' as const, extractionHint: 'Identify the target audience' },
      { field: 'frameworkData.coreCustomerNeed', label: 'Core Need', type: 'text' as const, extractionHint: 'Extract the core customer need' },
      { field: 'frameworkData.differentiator', label: 'Differentiator', type: 'text' as const, extractionHint: 'Extract what makes the promise unique' },
      { field: 'frameworkData.onlynessStatement', label: 'Onlyness Statement', type: 'text' as const, extractionHint: 'Craft the "Only [brand] can..." statement' },
      { field: 'frameworkData.proofPoints', label: 'Proof Points', type: 'text' as const, extractionHint: 'Extract 3-5 concrete proof points' },
      { field: 'frameworkData.measurableOutcomes', label: 'Measurable Outcomes', type: 'text' as const, extractionHint: 'Extract 3-5 measurable outcomes that prove the promise is kept' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'mission-statement') {
    return [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the mission and vision in one compelling paragraph' },
      { field: 'frameworkData.missionStatement', label: 'Mission Statement', type: 'text' as const, extractionHint: 'Craft the core mission as a clear 1-3 sentence statement' },
      { field: 'frameworkData.missionOneLiner', label: 'Mission One-Liner', type: 'text' as const, extractionHint: 'Distill the mission into a single T-shirt-worthy sentence' },
      { field: 'frameworkData.forWhom', label: 'For Whom', type: 'text' as const, extractionHint: 'Identify the primary audience the mission serves' },
      { field: 'frameworkData.whatWeDo', label: 'What We Do', type: 'text' as const, extractionHint: 'Extract the core activity or service' },
      { field: 'frameworkData.howWeDoIt', label: 'How We Do It', type: 'text' as const, extractionHint: 'Extract the unique approach or methodology' },
      { field: 'frameworkData.impactGoal', label: 'Impact Goal', type: 'text' as const, extractionHint: 'Extract the measurable impact goal' },
      { field: 'frameworkData.visionStatement', label: 'Vision Statement', type: 'text' as const, extractionHint: 'Craft the aspirational future state (1-3 sentences)' },
      { field: 'frameworkData.timeHorizon', label: 'Time Horizon', type: 'text' as const, extractionHint: 'Suggest the appropriate time horizon (3/5/10/15+ years or Aspirational)' },
      { field: 'frameworkData.boldAspiration', label: 'Bold Aspiration (BHAG)', type: 'text' as const, extractionHint: 'Craft a Big Hairy Audacious Goal that stretches beyond current capability' },
      { field: 'frameworkData.desiredFutureState', label: 'Desired Future State', type: 'text' as const, extractionHint: 'Paint a vivid description of what success looks like' },
      { field: 'frameworkData.successIndicators', label: 'Success Indicators', type: 'text' as const, extractionHint: 'Extract 3-5 concrete measurable indicators of vision progress' },
      { field: 'frameworkData.stakeholderBenefit', label: 'Stakeholder Benefit', type: 'text' as const, extractionHint: 'Describe who benefits from the vision and how' },
      { field: 'frameworkData.valuesAlignment', label: 'Values Alignment', type: 'text' as const, extractionHint: 'Describe how mission/vision reinforce core values' },
      { field: 'frameworkData.missionVisionTension', label: 'Mission-Vision Tension', type: 'text' as const, extractionHint: 'Extract the creative tension between present mission and future vision, including key milestones' },
    ];
  }
  if (itemType === 'brand_asset' && itemSubType === 'transformative-goals') {
    return [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the transformative goals' },
      { field: 'frameworkData.massiveTransformativePurpose', label: 'Massive Transformative Purpose', type: 'text' as const, extractionHint: 'Craft the MTP statement' },
      { field: 'frameworkData.mtpNarrative', label: 'MTP Narrative', type: 'text' as const, extractionHint: 'Write the MTP narrative' },
      { field: 'frameworkData.goals', label: 'Transformative Goals', type: 'text' as const, extractionHint: 'Extract 1-5 transformative goals with title, description, domain, timeframe' },
    ];
  }
  // Other asset types: return null (dynamic field mapping is sufficient for simple string fields)
  return null;
}
