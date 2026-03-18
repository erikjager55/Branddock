// =============================================================================
// Are.na Query Builder — Distills strategy input into 3 search queries
// =============================================================================

import { prisma } from '@/lib/prisma';

type QueryLayer = 'strategic' | 'human' | 'creative';

export interface ArenaQuery {
  query: string;
  layer: QueryLayer;
}

interface QueryInput {
  workspaceId: string;
  campaignGoalType?: string;
  personaIds?: string[];
}

/**
 * Build 3 parallel Are.na search queries from the available strategy input.
 * Each query targets a different associative layer:
 *
 * 1. Strategic — strategy type + brand name
 * 2. Human — persona psychographics + pain points
 * 3. Creative — brand values + brand name as cultural association
 *
 * Returns up to 3 queries. If insufficient data for a layer, it's omitted.
 */
export async function buildArenaQueries(input: QueryInput): Promise<ArenaQuery[]> {
  const queries: ArenaQuery[] = [];

  // Fetch workspace brand name
  const workspace = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { name: true },
  });

  const brandName = workspace?.name || '';

  // ── Layer 1: Strategic ──────────────────────────────────
  // Combine campaign goal type with brand name as context signal
  const strategicParts: string[] = [];
  if (input.campaignGoalType) {
    const goalTerms = goalTypeToSearchTerms(input.campaignGoalType);
    strategicParts.push(goalTerms);
  }
  if (brandName) {
    strategicParts.push(brandName);
  }
  if (strategicParts.length > 0) {
    queries.push({
      query: strategicParts.join(' '),
      layer: 'strategic',
    });
  }

  // ── Layer 2: Human ──────────────────────────────────────
  // Extract psychographic signals from personas
  if (input.personaIds && input.personaIds.length > 0) {
    const personas = await prisma.persona.findMany({
      where: {
        id: { in: input.personaIds },
        workspaceId: input.workspaceId,
      },
      select: {
        coreValues: true,
        frustrations: true,
        personalityType: true,
      },
      take: 3,
    });

    const humanParts: string[] = [];

    // Pick psychographic keywords from personas
    for (const p of personas) {
      if (p.personalityType) humanParts.push(p.personalityType);
      // Take first 2 core values
      for (const v of p.coreValues.slice(0, 2)) {
        humanParts.push(v);
      }
      // Take first frustration as pain point signal
      if (p.frustrations.length > 0) {
        humanParts.push(p.frustrations[0]);
      }
    }

    if (humanParts.length > 0) {
      // Limit query length — Are.na search works best with concise queries (~80 chars)
      const humanQuery = humanParts.slice(0, 5).join(' ').slice(0, 80);
      queries.push({
        query: humanQuery,
        layer: 'human',
      });
    }
  }

  // ── Layer 3: Creative ───────────────────────────────────
  // Brand values + brand name as cultural/visual association
  const brandValues = await prisma.brandAsset.findFirst({
    where: {
      workspaceId: input.workspaceId,
      frameworkType: 'BRANDHOUSE_VALUES',
    },
    select: { frameworkData: true },
  });

  const creativeParts: string[] = [];

  if (brandValues?.frameworkData) {
    try {
      const data = typeof brandValues.frameworkData === 'string'
        ? JSON.parse(brandValues.frameworkData)
        : brandValues.frameworkData;

      // Extract value names from BrandHouse Values structure
      const valueNames: string[] = [];
      if (data.anchorValue1?.name) valueNames.push(data.anchorValue1.name);
      if (data.aspirationValue1?.name) valueNames.push(data.aspirationValue1.name);
      if (data.ownValue?.name) valueNames.push(data.ownValue.name);

      creativeParts.push(...valueNames.slice(0, 3));
    } catch {
      // Ignore parse errors
    }
  }

  // Fall back to brand essence or personality keywords
  if (creativeParts.length === 0) {
    const essence = await prisma.brandAsset.findFirst({
      where: {
        workspaceId: input.workspaceId,
        frameworkType: 'BRAND_ESSENCE',
      },
      select: { frameworkData: true },
    });

    if (essence?.frameworkData) {
      try {
        const data = typeof essence.frameworkData === 'string'
          ? JSON.parse(essence.frameworkData)
          : essence.frameworkData;

        if (data.essenceStatement) creativeParts.push(data.essenceStatement);
        if (data.discriminator) creativeParts.push(data.discriminator);
      } catch {
        // Ignore parse errors
      }
    }
  }

  if (brandName && creativeParts.length < 3) creativeParts.push(brandName);

  if (creativeParts.length > 0) {
    queries.push({
      query: creativeParts.slice(0, 4).join(' '),
      layer: 'creative',
    });
  }

  return queries;
}

/**
 * Convert campaign goal type ID to search-friendly terms.
 * Maps internal IDs like "THOUGHT_LEADERSHIP" to more associative search terms.
 */
function goalTypeToSearchTerms(goalType: string): string {
  const mapping: Record<string, string> = {
    BRAND_AWARENESS: 'brand awareness strategy',
    LEAD_GENERATION: 'lead generation marketing',
    PRODUCT_LAUNCH: 'product launch strategy',
    THOUGHT_LEADERSHIP: 'thought leadership positioning',
    COMMUNITY_BUILDING: 'community building engagement',
    CUSTOMER_RETENTION: 'customer retention loyalty',
    REBRANDING: 'rebranding identity transformation',
    EMPLOYER_BRANDING: 'employer brand culture',
    CRISIS_COMMUNICATION: 'crisis communication reputation',
    EVENT_PROMOTION: 'event promotion experience',
    CONTENT_MARKETING: 'content marketing storytelling',
    SOCIAL_MEDIA_GROWTH: 'social media growth culture',
    SALES_ENABLEMENT: 'sales enablement conversion',
    PARTNERSHIP_MARKETING: 'partnership co-branding collaboration',
    SUSTAINABILITY_COMMUNICATION: 'sustainability purpose impact',
  };

  return mapping[goalType] || goalType.toLowerCase().replace(/_/g, ' ');
}
