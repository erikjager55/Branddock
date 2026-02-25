// ─── Persona Builder for AI Exploration ─────────────────────
// Implements ItemTypeConfig for persona items.
// Extracts logic from the existing persona analysis routes.
// ────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import type { ItemTypeConfig, DimensionQuestion } from '../item-type-registry';
import { generateReport, resolveModelConfig } from '../exploration-llm';
import type { GeneratedReport } from '../exploration-llm';
import { calculatePersonaValidation } from '@/features/personas/constants/persona-research-methods';
import type { ResearchMethodSummary } from '@/features/personas/types/persona.types';

// ─── Dimension Questions ───────────────────────────────────

const PERSONA_DIMENSIONS: DimensionQuestion[] = [
  {
    key: 'demographics',
    title: 'Demographics Profile',
    icon: 'Users',
    question:
      "Let's start with the demographics dimension. Can you tell me more about this persona's background — their typical age range, location, education, and professional context? What defines their lifestyle and daily environment?",
  },
  {
    key: 'goals_motivations',
    title: 'Goals & Motivations',
    icon: 'TrendingUp',
    question:
      "Now let's explore goals and motivations. What are this persona's primary objectives — both professional and personal? What drives them to take action, and what does success look like for them?",
  },
  {
    key: 'challenges_frustrations',
    title: 'Challenges & Pain Points',
    icon: 'Heart',
    question:
      "Let's discuss challenges and frustrations. What are the main obstacles this persona faces? What keeps them up at night, and what pain points do they experience with current solutions?",
  },
  {
    key: 'value_proposition',
    title: 'Value Alignment',
    icon: 'Zap',
    question:
      "Finally, let's look at value alignment. How does your brand's offering connect with this persona's needs? What unique value does your product or service bring to their world?",
  },
];

// ─── Field Mapping ─────────────────────────────────────────

export const PERSONA_FIELD_MAPPING = [
  { field: 'tagline', label: 'Tagline', type: 'string' },
  { field: 'quote', label: 'Quote', type: 'text' },
  { field: 'occupation', label: 'Occupation', type: 'string' },
  { field: 'goals', label: 'Goals', type: 'string[]' },
  { field: 'motivations', label: 'Motivations', type: 'string[]' },
  { field: 'frustrations', label: 'Frustrations', type: 'string[]' },
  { field: 'behaviors', label: 'Behaviors', type: 'string[]' },
  { field: 'coreValues', label: 'Core Values', type: 'string[]' },
  { field: 'interests', label: 'Interests', type: 'string[]' },
  { field: 'buyingTriggers', label: 'Buying Triggers', type: 'string[]' },
  { field: 'decisionCriteria', label: 'Decision Criteria', type: 'string[]' },
];

// ─── Item Context Builder ─────────────────────────────────

export function buildPersonaContext(persona: Record<string, unknown>): string {
  const lines: string[] = [];
  const str = (key: string) => (persona[key] as string) ?? null;
  const arr = (key: string) => {
    const val = persona[key] as string[] | null;
    return val && val.length > 0 ? val.join(', ') : null;
  };

  if (str('name')) lines.push(`Name: ${str('name')}`);
  if (str('tagline')) lines.push(`Tagline: ${str('tagline')}`);
  if (str('age')) lines.push(`Age: ${str('age')}`);
  if (str('occupation')) lines.push(`Occupation: ${str('occupation')}`);
  if (str('location')) lines.push(`Location: ${str('location')}`);
  if (str('education')) lines.push(`Education: ${str('education')}`);
  if (str('income')) lines.push(`Income: ${str('income')}`);
  if (str('familyStatus')) lines.push(`Family: ${str('familyStatus')}`);
  if (str('personalityType')) lines.push(`Personality: ${str('personalityType')}`);
  if (arr('goals')) lines.push(`Goals: ${arr('goals')}`);
  if (arr('motivations')) lines.push(`Motivations: ${arr('motivations')}`);
  if (arr('frustrations')) lines.push(`Frustrations: ${arr('frustrations')}`);
  if (arr('behaviors')) lines.push(`Behaviors: ${arr('behaviors')}`);
  if (arr('coreValues')) lines.push(`Core values: ${arr('coreValues')}`);
  if (arr('interests')) lines.push(`Interests: ${arr('interests')}`);

  return lines.length > 0 ? lines.join('\n') : 'No details available yet — this is a new persona.';
}

// ─── Config ────────────────────────────────────────────────

export const personaItemConfig: ItemTypeConfig = {
  lockType: 'persona',

  async fetchItem(itemId, workspaceId) {
    const persona = await prisma.persona.findFirst({
      where: { id: itemId, workspaceId },
    });
    return persona as unknown as Record<string, unknown> | null;
  },

  getDimensions() {
    return PERSONA_DIMENSIONS;
  },

  buildItemContext(item) {
    return buildPersonaContext(item);
  },

  buildIntro(item) {
    const name = item.name as string;
    const tagline = item.tagline as string | null;
    return `Welcome to the AI Persona Analysis for **${name}**${tagline ? ` — ${tagline}` : ''}. I'll guide you through ${PERSONA_DIMENSIONS.length} key dimensions to build a comprehensive understanding of this persona. Let's begin!`;
  },

  async generateInsights(item, session) {
    const persona = item;
    const name = persona.name as string;

    // 1. Fetch all messages from the session
    const sessionId = (session as { id: string }).id;
    const modelId = (session as { modelId?: string }).modelId;

    const messages = await prisma.explorationMessage.findMany({
      where: { sessionId },
      orderBy: { orderIndex: 'asc' },
    });

    // 2. Build Q&A pairs from messages
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

    // 3. Build current field values
    const currentFieldValues: Record<string, unknown> = {};
    for (const fm of PERSONA_FIELD_MAPPING) {
      currentFieldValues[fm.field] = persona[fm.field] ?? null;
    }

    // 4. Resolve model config
    const modelConfig = resolveModelConfig(modelId);

    // 5. Generate report via LLM
    const report: GeneratedReport = await generateReport({
      itemType: 'persona',
      itemName: name,
      itemContext: buildPersonaContext(persona),
      dimensions: PERSONA_DIMENSIONS,
      allQA,
      fieldMapping: PERSONA_FIELD_MAPPING,
      currentFieldValues,
      modelConfig,
    });

    // 6. Transform to ExplorationInsightsData format
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
    await prisma.personaResearchMethod.updateMany({
      where: { personaId: itemId, method: 'AI_EXPLORATION' },
      data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
    });

    // Recalculate validation percentage
    const methods = await prisma.personaResearchMethod.findMany({
      where: { personaId: itemId },
    });

    return calculatePersonaValidation(
      methods.map((m) => ({
        method: m.method as ResearchMethodSummary['method'],
        status: m.status as ResearchMethodSummary['status'],
        progress: m.progress,
        completedAt: m.completedAt?.toISOString() ?? null,
        artifactsCount: m.artifactsCount,
      })),
    );
  },
};
