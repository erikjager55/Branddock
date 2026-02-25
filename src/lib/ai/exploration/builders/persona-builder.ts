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

      executiveSummary: `De AI-analyse van ${name} heeft ${PERSONA_DIMENSIONS.length} strategische dimensies geanalyseerd en biedt inzichten voor merkpositionering en communicatie.`,

      findings: [
        {
          title: 'Demografisch Profiel',
          description: `${name} vertegenwoordigt een ${(persona.occupation as string) ?? 'professional'} segment met specifieke behoeften.`,
        },
        {
          title: 'Motivatie & Doelen',
          description:
            goals.length > 0
              ? `Primaire doelen: ${goals.slice(0, 2).join(', ')}`
              : 'Doelen nog niet specifiek gedefinieerd — verrijking aanbevolen.',
        },
        {
          title: 'Uitdagingen',
          description:
            frustrations.length > 0
              ? `Kernfrustraties: ${frustrations.slice(0, 2).join(', ')}`
              : 'Frustraties nog niet geïdentificeerd.',
        },
        {
          title: 'Waarde-Aansluiting',
          description: `${coreValues.length > 0 ? `Kernwaarden (${coreValues.slice(0, 3).join(', ')}) ` : ''}vormen de basis voor merkaffiniteit.`,
        },
        {
          title: 'Gedragspatronen',
          description:
            behaviors.length > 0
              ? `Gedrag: ${behaviors.slice(0, 2).join(', ')}`
              : 'Gedragspatronen verdienen verdere verdieping.',
        },
      ],

      recommendations: [
        `Integreer het demografisch profiel van ${name} in alle communicatie-uitingen`,
        'Ontwikkel persona-specifieke customer journeys voor de gedefinieerde doelgroep',
        'Creëer content die de unieke waarde tastbaar en begrijpelijk maakt',
        frustrations.length > 0
          ? `Bouw thought leadership rond oplossingen voor: ${frustrations[0]}`
          : 'Bouw thought leadership rond oplossingen voor klantuitdagingen',
        coreValues.length > 0
          ? `Vertaal de kernwaarden (${coreValues.slice(0, 3).join(', ')}) naar concrete gedragingen en besliscriteria`
          : 'Vertaal waarden naar concrete gedragingen en besliscriteria',
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
