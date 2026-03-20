// =============================================================================
// Semantic Scholar Query Builder — Builds academic search queries from campaign context
// =============================================================================

import { GOAL_LABELS } from '@/features/campaigns/lib/goal-types';

// ─── Types ──────────────────────────────────────────────

export interface ScholarQuery {
  query: string;
  queryLayer: 'behavioral' | 'effectiveness';
}

// ─── COM-B Labels ───────────────────────────────────────

const COMB_LABELS: Record<string, string> = {
  capability: 'capability knowledge skills',
  opportunity: 'opportunity environment social influence',
  motivation: 'motivation beliefs desires',
};

// ─── Query Builder ──────────────────────────────────────

/**
 * Build 1-2 academic search queries from campaign context.
 * Queries are kept focused and academic-search friendly (no boolean operators).
 */
export function buildScholarQueries(params: {
  campaignGoalType: string;
  comBTarget?: 'capability' | 'opportunity' | 'motivation';
}): ScholarQuery[] {
  const { campaignGoalType, comBTarget } = params;

  const goalLabel = (
    GOAL_LABELS[campaignGoalType] ?? campaignGoalType
  ).toLowerCase();

  const queries: ScholarQuery[] = [];

  // 1. Behavioral science query — targets papers on behavioral interventions
  const comBComponent = comBTarget ? ` ${COMB_LABELS[comBTarget]}` : '';
  queries.push({
    query: `behavior change ${goalLabel}${comBComponent}`,
    queryLayer: 'behavioral',
  });

  // 2. Strategy effectiveness query — targets papers on marketing effectiveness
  queries.push({
    query: `campaign effectiveness ${goalLabel}`,
    queryLayer: 'effectiveness',
  });

  return queries;
}
