// =============================================================
// Query Generator — Diverse search query generation
//
// Phase 1 of the trend research pipeline.
// Generates 5-7 diverse search queries from different angles
// to maximize source diversity in the discovery phase.
// =============================================================

import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { buildQueryGenerationPrompt } from '@/lib/ai/prompts/trend-analysis';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';

const FLASH_MODEL = 'gemini-2.5-flash';

interface QueryGenerationResult {
  queries?: string[];
}

/**
 * Generate 5-7 diverse search queries from a base query.
 * Uses Gemini Flash for speed and cost efficiency.
 *
 * Falls back to simple query variations if AI generation fails.
 */
export async function generateDiverseQueries(
  baseQuery: string,
  brandContext?: BrandContextBlock,
): Promise<string[]> {
  try {
    const prompt = buildQueryGenerationPrompt(baseQuery, brandContext);

    const result = await createGeminiStructuredCompletion<string[] | QueryGenerationResult>(
      'You are a search query optimization expert. Return only a JSON array of search query strings.',
      prompt,
      { model: FLASH_MODEL, temperature: 0.5, maxOutputTokens: 1000 },
    );

    // Handle both array and { queries: [...] } response shapes
    const queries = Array.isArray(result)
      ? result
      : Array.isArray(result?.queries)
        ? result.queries
        : [];

    const valid = queries
      .filter((q): q is string => typeof q === 'string' && q.trim().length > 3)
      .slice(0, 7);

    if (valid.length >= 3) return valid;

    // Not enough queries — fall through to fallback
  } catch (error) {
    console.warn('[QueryGenerator] AI query generation failed, using fallback:', error instanceof Error ? error.message : error);
  }

  // Fallback: deterministic query variations
  return generateFallbackQueries(baseQuery);
}

/** Generate simple query variations without AI. */
function generateFallbackQueries(baseQuery: string): string[] {
  const year = new Date().getFullYear();
  return [
    `${baseQuery} emerging trends ${year}`,
    `${baseQuery} market growth statistics ${year}`,
    `${baseQuery} startup funding investment ${year}`,
    `${baseQuery} challenges problems regulations`,
    `${baseQuery} expert analysis forecast prediction`,
    `${baseQuery} consumer behavior shift adoption`,
  ];
}
