// ─── Persona Builder for AI Exploration ─────────────────────
// Implements ItemTypeConfig for persona items.
// Extracts logic from the existing persona analysis routes.
// ────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import type { ItemTypeConfig, DimensionQuestion } from '../item-type-registry';
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

// ─── Field Suggestion Generator ────────────────────────────

function generateFieldSuggestions(
  persona: Record<string, unknown>,
  extracted: {
    goals: string[];
    motivations: string[];
    frustrations: string[];
    behaviors: string[];
    coreValues: string[];
    buyingTriggers: string[];
    decisionCriteria: string[];
  },
) {
  const suggestions: Array<{
    id: string;
    field: string;
    label: string;
    currentValue: string | string[] | null;
    suggestedValue: string | string[];
    reason: string;
    status: 'pending';
  }> = [];

  let idx = 0;
  const addSuggestion = (
    field: string,
    label: string,
    current: string | string[] | null,
    suggested: string | string[],
    reason: string,
  ) => {
    idx++;
    suggestions.push({
      id: `fs-${idx}`,
      field,
      label,
      currentValue: current,
      suggestedValue: suggested,
      reason,
      status: 'pending',
    });
  };

  // Tagline
  if (!persona.tagline) {
    const occupation = (persona.occupation as string) ?? 'professional';
    addSuggestion(
      'tagline',
      'Tagline',
      null,
      `${occupation} focused on achieving measurable results`,
      'A tagline helps quickly identify the persona across modules.',
    );
  }

  // Goals
  const currentGoals = (persona.goals as string[]) ?? [];
  if (currentGoals.length < 2 && extracted.goals.length > 0) {
    addSuggestion(
      'goals',
      'Goals',
      currentGoals,
      [...new Set([...currentGoals, ...extracted.goals])].slice(0, 5),
      'Enriched from analysis answers to provide a more complete picture.',
    );
  }

  // Frustrations
  const currentFrustrations = (persona.frustrations as string[]) ?? [];
  if (currentFrustrations.length < 2 && extracted.frustrations.length > 0) {
    addSuggestion(
      'frustrations',
      'Frustrations',
      currentFrustrations,
      [...new Set([...currentFrustrations, ...extracted.frustrations])].slice(0, 5),
      'Pain points identified during the exploration can inform content strategy.',
    );
  }

  // Behaviors
  const currentBehaviors = (persona.behaviors as string[]) ?? [];
  if (currentBehaviors.length < 2 && extracted.behaviors.length > 0) {
    addSuggestion(
      'behaviors',
      'Behaviors',
      currentBehaviors,
      [...new Set([...currentBehaviors, ...extracted.behaviors])].slice(0, 5),
      'Behavioral patterns help predict engagement across channels.',
    );
  }

  // Buying triggers
  const currentTriggers = (persona.buyingTriggers as string[]) ?? [];
  if (currentTriggers.length === 0 && extracted.buyingTriggers.length > 0) {
    addSuggestion(
      'buyingTriggers',
      'Buying Triggers',
      currentTriggers,
      extracted.buyingTriggers.slice(0, 4),
      'Buying triggers inform campaign timing and messaging.',
    );
  }

  return suggestions;
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

  async generateInsights(item, _session) {
    const persona = item;
    const goals = (persona.goals as string[]) ?? [];
    const motivations = (persona.motivations as string[]) ?? [];
    const frustrations = (persona.frustrations as string[]) ?? [];
    const behaviors = (persona.behaviors as string[]) ?? [];
    const coreValues = (persona.coreValues as string[]) ?? [];
    const buyingTriggers = (persona.buyingTriggers as string[]) ?? [];
    const decisionCriteria = (persona.decisionCriteria as string[]) ?? [];

    const name = persona.name as string;

    return {
      dimensions: PERSONA_DIMENSIONS.map((d) => ({
        key: d.key,
        title: d.title,
        icon: d.icon,
        summary: `Analysis of the ${d.title.toLowerCase()} dimension has been completed for ${name}.`,
      })),

      executiveSummary: `The AI analysis of ${name} has evaluated ${PERSONA_DIMENSIONS.length} strategic dimensions, providing actionable insights for brand positioning and communication strategy.`,

      findings: [
        {
          title: 'Demographic Profile',
          description: `${name} represents a ${(persona.occupation as string) ?? 'professional'} segment with specific needs and behaviors.`,
        },
        {
          title: 'Motivations & Goals',
          description:
            goals.length > 0
              ? `Primary goals: ${goals.slice(0, 2).join(', ')}`
              : 'Goals not yet defined — enrichment recommended.',
        },
        {
          title: 'Challenges',
          description:
            frustrations.length > 0
              ? `Key frustrations: ${frustrations.slice(0, 2).join(', ')}`
              : 'Frustrations not yet identified.',
        },
        {
          title: 'Value Alignment',
          description: coreValues.length > 0
            ? `Core values (${coreValues.slice(0, 3).join(', ')}) form the foundation for brand affinity.`
            : 'Core values form the foundation for brand affinity.',
        },
        {
          title: 'Behavioral Patterns',
          description:
            behaviors.length > 0
              ? `Behaviors: ${behaviors.slice(0, 2).join(', ')}`
              : 'Behavioral patterns require further exploration.',
        },
      ],

      recommendations: [
        `Integrate ${name}'s demographic profile into all communication touchpoints`,
        'Develop persona-specific customer journeys for the defined target audience',
        'Create content that makes the unique value proposition tangible and accessible',
        frustrations.length > 0
          ? `Build thought leadership around solutions for: ${frustrations[0]}`
          : 'Build thought leadership around solutions for customer challenges',
        coreValues.length > 0
          ? `Translate core values (${coreValues.slice(0, 3).join(', ')}) into concrete behaviors and decision criteria`
          : 'Translate values into concrete behaviors and decision criteria',
      ],

      fieldSuggestions: generateFieldSuggestions(persona, {
        goals,
        motivations,
        frustrations,
        behaviors,
        coreValues,
        buyingTriggers,
        decisionCriteria,
      }),

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
