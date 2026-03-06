// =============================================================
// Trend Analyzer — AI-powered trend detection from scraped content
//
// Uses Gemini 3.1 Pro to detect trends from website content changes.
// Includes dedup check against existing trends in workspace.
// =============================================================

import { prisma } from '@/lib/prisma';
import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { buildTrendAnalysisSystemPrompt, buildTrendAnalysisUserPrompt } from '@/lib/ai/prompts/trend-analysis';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';

interface DetectedTrendRaw {
  title: string;
  description: string;
  category: string;
  scope: string;
  impactLevel: string;
  timeframe: string;
  relevanceScore: number;
  direction?: string;
  confidence?: number;
  rawExcerpt?: string;
  industries?: string[];
  tags?: string[];
  howToUse?: string[];
}

interface TrendAnalysisResult {
  trends: DetectedTrendRaw[];
}

// Valid enum values for sanitization
const VALID_CATEGORIES = ['CONSUMER_BEHAVIOR', 'TECHNOLOGY', 'MARKET_DYNAMICS', 'COMPETITIVE', 'REGULATORY'] as const;
const VALID_SCOPES = ['MICRO', 'MESO', 'MACRO'] as const;
const VALID_IMPACTS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const VALID_TIMEFRAMES = ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'] as const;
const VALID_DIRECTIONS = ['rising', 'declining', 'stable'] as const;

function sanitizeEnum<T extends string>(value: string, valid: readonly T[], fallback: T): T {
  const upper = value?.toUpperCase?.() ?? '';
  if ((valid as readonly string[]).includes(upper)) return upper as T;
  if ((valid as readonly string[]).includes(value)) return value as T;
  return fallback;
}

/** Generate a unique slug from title, with retry on collision */
async function generateUniqueSlug(title: string, existingSlugs: Set<string>): Promise<string> {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);

  let slug = base;
  let attempt = 0;

  while (existingSlugs.has(slug)) {
    attempt++;
    slug = `${base}-${attempt}`;
  }

  // Also check DB
  const existing = await prisma.detectedTrend.findUnique({ where: { slug } });
  if (existing) {
    attempt++;
    slug = `${base}-${attempt}`;
  }

  existingSlugs.add(slug);
  return slug;
}

/**
 * Analyze scraped content for trends using Gemini AI.
 * Returns sanitized, deduplicated trends ready for DB insertion.
 */
export async function analyzeTrends(params: {
  sourceName: string;
  sourceUrl: string;
  content: string;
  workspaceId: string;
  researchJobId?: string;
  brandContext?: BrandContextBlock;
  maxTrends?: number;
  detectionSource?: 'MANUAL' | 'AI_RESEARCH';
}): Promise<{
  trends: Array<{
    title: string;
    slug: string;
    description: string;
    category: string;
    scope: string;
    impactLevel: string;
    timeframe: string;
    relevanceScore: number;
    direction: string | null;
    confidence: number | null;
    rawExcerpt: string | null;
    aiAnalysis: string | null;
    industries: string[];
    tags: string[];
    howToUse: string[];
    sourceUrl: string;
    detectionSource: string;
    researchJobId: string | undefined;
    workspaceId: string;
  }>;
  error?: string;
}> {
  try {
    const systemPrompt = buildTrendAnalysisSystemPrompt(params.brandContext);
    const userPrompt = buildTrendAnalysisUserPrompt({
      sourceName: params.sourceName,
      sourceUrl: params.sourceUrl,
      newContent: params.content,
    });

    const result = await createGeminiStructuredCompletion<TrendAnalysisResult>(
      systemPrompt,
      userPrompt,
      { temperature: 0.3, maxOutputTokens: 8000 },
    );

    if (!result?.trends?.length) {
      return { trends: [] };
    }

    // Fetch existing trend titles for dedup
    const existingTrends = await prisma.detectedTrend.findMany({
      where: { workspaceId: params.workspaceId },
      select: { title: true, slug: true },
    });
    const existingTitles = new Set(existingTrends.map((t) => t.title.toLowerCase()));
    const existingSlugs = new Set(existingTrends.map((t) => t.slug));

    const maxCount = params.maxTrends ?? 5;
    const sanitized = [];
    for (const raw of result.trends.slice(0, maxCount)) {
      // Skip if duplicate title
      if (existingTitles.has(raw.title.toLowerCase())) continue;

      const slug = await generateUniqueSlug(raw.title, existingSlugs);
      existingTitles.add(raw.title.toLowerCase());

      sanitized.push({
        title: raw.title.slice(0, 200),
        slug,
        description: raw.description || '',
        category: sanitizeEnum(raw.category, VALID_CATEGORIES, 'TECHNOLOGY'),
        scope: sanitizeEnum(raw.scope, VALID_SCOPES, 'MICRO'),
        impactLevel: sanitizeEnum(raw.impactLevel, VALID_IMPACTS, 'MEDIUM'),
        timeframe: sanitizeEnum(raw.timeframe, VALID_TIMEFRAMES, 'SHORT_TERM'),
        relevanceScore: Math.max(0, Math.min(100, raw.relevanceScore ?? 75)),
        direction: raw.direction && (VALID_DIRECTIONS as readonly string[]).includes(raw.direction)
          ? raw.direction
          : null,
        confidence: raw.confidence != null ? Math.max(0, Math.min(100, raw.confidence)) : null,
        rawExcerpt: raw.rawExcerpt?.slice(0, 2000) ?? null,
        aiAnalysis: raw.description ? `AI-detected from ${params.sourceName}: ${raw.description}` : null,
        industries: Array.isArray(raw.industries) ? raw.industries.slice(0, 10) : [],
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10) : [],
        howToUse: Array.isArray(raw.howToUse) ? raw.howToUse.slice(0, 5) : [],
        sourceUrl: params.sourceUrl,
        detectionSource: params.detectionSource ?? 'AI_RESEARCH',
        researchJobId: params.researchJobId,
        workspaceId: params.workspaceId,
      });
    }

    return { trends: sanitized };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during trend analysis';
    return { trends: [], error: message };
  }
}
