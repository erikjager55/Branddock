// =============================================================================
// Exa Query Builder — Builds 2-3 neural search queries from strategy context
// =============================================================================

import { GOAL_LABELS } from '@/features/campaigns/lib/goal-types';

// ─── Types ──────────────────────────────────────────────

export interface ExaQuery {
  query: string;
  queryLayer: 'analogy' | 'cultural' | 'trend';
}

interface BuildExaQueriesParams {
  campaignGoalType: string;
  brandName?: string;
  brandValues?: string[];
  activatedTrends?: string[];
}

// ─── Constants ──────────────────────────────────────────

/** Contrasting industries for cross-industry analogy queries */
const CONTRASTING_INDUSTRIES: string[] = [
  'healthcare',
  'hospitality',
  'gaming',
  'aerospace',
  'fashion',
  'education',
  'sports',
  'logistics',
  'entertainment',
  'fintech',
  'architecture',
  'agriculture',
];

/** Cultural themes for cultural tension queries */
const CULTURAL_THEMES: string[] = [
  'authenticity vs performance',
  'digital fatigue',
  'conscious consumerism',
  'community belonging',
  'purpose-driven brands',
  'nostalgia in branding',
  'trust in institutions',
  'slow living movement',
  'creator economy',
  'generational values shift',
];

// ─── Query Builder ──────────────────────────────────────

/**
 * Build 2-3 Exa search queries from strategy context.
 * Each query targets a different enrichment layer:
 *
 * 1. Cross-industry analogy — the goal type applied in an unexpected industry
 * 2. Cultural tension — brand values intersected with cultural themes
 * 3. Trend-driven (optional) — activated trends combined with campaign goal
 *
 * All queries are kept concise (< 100 chars) for best neural search results.
 */
export function buildExaQueries(params: BuildExaQueriesParams): ExaQuery[] {
  const { campaignGoalType, brandName, brandValues, activatedTrends } = params;
  const queries: ExaQuery[] = [];

  const goalLabel = GOAL_LABELS[campaignGoalType]
    || campaignGoalType.toLowerCase().replace(/_/g, ' ');

  // ── Query 1: Cross-industry analogy ───────────────────
  // Pick a contrasting industry based on the goal type hash for deterministic variety
  const industryIndex = simpleHash(campaignGoalType) % CONTRASTING_INDUSTRIES.length;
  const contrastIndustry = CONTRASTING_INDUSTRIES[industryIndex];

  const analogyQuery = cap(
    `${goalLabel} strategy in ${contrastIndustry}`,
    95,
  );
  queries.push({ query: analogyQuery, queryLayer: 'analogy' });

  // ── Query 2: Cultural tension ─────────────────────────
  // Combine brand values with a cultural theme
  const culturalParts: string[] = [];

  if (brandValues && brandValues.length > 0) {
    // Take first 2 values for conciseness
    culturalParts.push(brandValues.slice(0, 2).join(' '));
  } else if (brandName) {
    culturalParts.push(brandName);
  }

  // Pick a cultural theme based on goal type for variety
  const themeIndex = simpleHash(campaignGoalType + 'cultural') % CULTURAL_THEMES.length;
  culturalParts.push(CULTURAL_THEMES[themeIndex]);

  const culturalQuery = cap(culturalParts.join(' '), 95);
  queries.push({ query: culturalQuery, queryLayer: 'cultural' });

  // ── Query 3: Trend-driven (only if activatedTrends provided) ──
  if (activatedTrends && activatedTrends.length > 0) {
    const trendParts: string[] = [];

    // Take first activated trend name
    trendParts.push(activatedTrends[0]);

    // Add goal context
    trendParts.push(goalLabel);

    const trendQuery = cap(trendParts.join(' '), 95);
    queries.push({ query: trendQuery, queryLayer: 'trend' });
  }

  return queries;
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Simple deterministic hash from a string.
 * Used to pick contrasting industries and cultural themes
 * consistently for the same goal type.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/** Cap a string at maxLength, trimming at last word boundary if needed */
function cap(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const trimmed = text.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
}
