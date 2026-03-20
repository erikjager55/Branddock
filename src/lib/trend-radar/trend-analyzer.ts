// =============================================================
// Trend Analyzer — AI-powered trend detection from signals
//
// Two modes:
//  1. synthesizeTrends() — NEW: signal-based synthesis (Phase 3)
//  2. analyzeTrends() / analyzeMultipleSources() — Legacy (cron)
//
// Includes dedup check against existing trends in workspace.
// =============================================================

import { prisma } from '@/lib/prisma';
import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { createStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import {
  buildTrendAnalysisSystemPrompt,
  buildTrendAnalysisUserPrompt,
  buildMultiSourceSystemPrompt,
  buildMultiSourceUserPrompt,
  buildSynthesisSystemPrompt,
  buildSynthesisUserPrompt,
} from '@/lib/ai/prompts/trend-analysis';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';
import type { Signal } from './signal-extractor';

// ─── Shared Types ───────────────────────────────────────────

/** Sanitized trend output type, shared by all analysis functions. */
export type SanitizedTrend = {
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
  // Extended fields for new pipeline
  dataPoints: string[];
  evidenceCount: number;
  sourceUrls: string[];
  whyNow: string | null;
};

// ─── Enum Validation ────────────────────────────────────────

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

// ─── Slug Generation ────────────────────────────────────────

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

  const existing = await prisma.detectedTrend.findUnique({ where: { slug } });
  if (existing) {
    attempt++;
    slug = `${base}-${attempt}`;
  }

  existingSlugs.add(slug);
  return slug;
}

// ─── Phase 3: Signal-based Synthesis (NEW) ──────────────────

interface SynthesizedTrendRaw {
  title: string;
  description: string;
  whyNow?: string;
  category: string;
  scope: string;
  impactLevel: string;
  timeframe: string;
  direction?: string;
  confidence?: number;
  supportingSignalIndices?: number[];
  sourceUrls?: string[];
  primarySourceUrl?: string;
  dataPoints?: string[];
  evidenceCount?: number;
  rawExcerpt?: string;
  industries?: string[];
  tags?: string[];
  howToUse?: string[];
}

interface SynthesisResult {
  trends: SynthesizedTrendRaw[];
}

/**
 * Synthesize trends from pre-extracted signals.
 * Phase 3 of the new pipeline — takes structured signals instead of raw content.
 */
export async function synthesizeTrends(params: {
  query: string;
  signals: Signal[];
  sourceCount: number;
  workspaceId: string;
  researchJobId?: string;
  brandContext?: BrandContextBlock;
  maxTrends?: number;
}): Promise<{
  trends: SanitizedTrend[];
  error?: string;
}> {
  try {
    if (params.signals.length === 0) {
      return { trends: [] };
    }

    // Build numbered signal list for cross-referencing (include authority metadata)
    const numberedSignals = params.signals.map((s, i) => ({
      index: i,
      claim: s.claim,
      evidence: s.evidence,
      dataPoints: s.dataPoints,
      entities: s.entities,
      sourceUrl: s.sourceUrl,
      sourceName: s.sourceName,
      sourceType: s.sourceType,
      sourceAuthority: s.sourceAuthority,
      publicationDate: s.publicationDate,
    }));

    const systemPrompt = buildSynthesisSystemPrompt(params.brandContext);
    const userPrompt = buildSynthesisUserPrompt({
      query: params.query,
      signals: numberedSignals,
      sourceCount: params.sourceCount,
    });

    // Resolve configurable model for trend synthesis
    const { model: trendModel, provider: trendProvider } = await resolveFeatureModel(params.workspaceId, 'trend-synthesis');

    const result = await createStructuredCompletion<SynthesisResult>(
      trendProvider, trendModel,
      systemPrompt,
      userPrompt,
      { temperature: 0.4, maxTokens: 10000, timeoutMs: 180_000 },
    );

    if (!result?.trends?.length) {
      return { trends: [] };
    }

    // Fetch existing trends for dedup
    const existingTrends = await prisma.detectedTrend.findMany({
      where: { workspaceId: params.workspaceId },
      select: { title: true, slug: true },
    });
    const existingTitles = new Set(existingTrends.map((t) => t.title.toLowerCase()));
    const existingSlugs = new Set(existingTrends.map((t) => t.slug));

    // Build set of valid source URLs
    const validSourceUrls = new Set(params.signals.map((s) => s.sourceUrl));
    const fallbackSourceUrl = params.signals[0]?.sourceUrl ?? '';

    const maxCount = params.maxTrends ?? 10;
    const sanitized: SanitizedTrend[] = [];

    for (const raw of result.trends.slice(0, maxCount)) {
      if (existingTitles.has(raw.title.toLowerCase())) continue;

      const slug = await generateUniqueSlug(raw.title, existingSlugs);
      existingTitles.add(raw.title.toLowerCase());

      // Resolve primary source URL
      const primaryUrl = raw.primarySourceUrl && validSourceUrls.has(raw.primarySourceUrl)
        ? raw.primarySourceUrl
        : raw.sourceUrls?.find((u) => validSourceUrls.has(u)) ?? fallbackSourceUrl;

      // Resolve all source URLs
      const resolvedSourceUrls = (raw.sourceUrls ?? []).filter((u) => validSourceUrls.has(u));
      if (resolvedSourceUrls.length === 0 && primaryUrl) resolvedSourceUrls.push(primaryUrl);

      // Calculate evidence count from signal indices or explicit count
      const evidenceCount = raw.evidenceCount
        ?? raw.supportingSignalIndices?.length
        ?? resolvedSourceUrls.length
        ?? 1;

      // Calculate relevance score from confidence (judge will refine this)
      const confidence = raw.confidence != null ? Math.max(0, Math.min(100, raw.confidence)) : 65;

      sanitized.push({
        title: raw.title.slice(0, 200),
        slug,
        description: raw.description || '',
        category: sanitizeEnum(raw.category, VALID_CATEGORIES, 'TECHNOLOGY'),
        scope: sanitizeEnum(raw.scope, VALID_SCOPES, 'MESO'),
        impactLevel: sanitizeEnum(raw.impactLevel, VALID_IMPACTS, 'MEDIUM'),
        timeframe: sanitizeEnum(raw.timeframe, VALID_TIMEFRAMES, 'MEDIUM_TERM'),
        relevanceScore: confidence, // Will be replaced by composite score in Phase 4
        direction: raw.direction && (VALID_DIRECTIONS as readonly string[]).includes(raw.direction)
          ? raw.direction
          : null,
        confidence,
        rawExcerpt: raw.rawExcerpt?.slice(0, 2000) ?? null,
        aiAnalysis: `Synthesized from ${evidenceCount} sources: ${raw.description}`,
        industries: Array.isArray(raw.industries) ? raw.industries.slice(0, 10) : [],
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10) : [],
        howToUse: Array.isArray(raw.howToUse) ? raw.howToUse.slice(0, 5) : [],
        sourceUrl: primaryUrl,
        detectionSource: 'AI_RESEARCH',
        researchJobId: params.researchJobId,
        workspaceId: params.workspaceId,
        dataPoints: Array.isArray(raw.dataPoints) ? raw.dataPoints.slice(0, 10) : [],
        evidenceCount,
        sourceUrls: resolvedSourceUrls,
        whyNow: raw.whyNow?.slice(0, 500) ?? null,
      });
    }

    return { trends: sanitized };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during trend synthesis';
    return { trends: [], error: message };
  }
}

// ─── Legacy: Single-source analysis (cron/source-scan) ──────

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
  sourceUrl?: string;
  rawExcerpt?: string;
  industries?: string[];
  tags?: string[];
  howToUse?: string[];
}

interface TrendAnalysisResult {
  trends: DetectedTrendRaw[];
}

/**
 * Analyze scraped content for trends using Gemini AI (single source).
 * @deprecated Use synthesizeTrends() for the new pipeline.
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
  trends: SanitizedTrend[];
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

    const existingTrends = await prisma.detectedTrend.findMany({
      where: { workspaceId: params.workspaceId },
      select: { title: true, slug: true },
    });
    const existingTitles = new Set(existingTrends.map((t) => t.title.toLowerCase()));
    const existingSlugs = new Set(existingTrends.map((t) => t.slug));

    const maxCount = params.maxTrends ?? 5;
    const sanitized: SanitizedTrend[] = [];
    for (const raw of result.trends.slice(0, maxCount)) {
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
        dataPoints: [],
        evidenceCount: 1,
        sourceUrls: [params.sourceUrl],
        whyNow: null,
      });
    }

    return { trends: sanitized };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during trend analysis';
    return { trends: [], error: message };
  }
}

/**
 * Analyze multiple scraped sources at once for cross-referenced trends.
 * @deprecated Use synthesizeTrends() for the new signal-based pipeline.
 */
export async function analyzeMultipleSources(params: {
  query: string;
  sources: Array<{ name: string; url: string; content: string }>;
  workspaceId: string;
  researchJobId?: string;
  brandContext?: BrandContextBlock;
  maxTrends?: number;
}): Promise<{
  trends: SanitizedTrend[];
  error?: string;
}> {
  try {
    if (params.sources.length === 0) {
      return { trends: [] };
    }

    const systemPrompt = buildMultiSourceSystemPrompt(params.brandContext);
    const userPrompt = buildMultiSourceUserPrompt({
      query: params.query,
      sources: params.sources,
    });

    const result = await createGeminiStructuredCompletion<TrendAnalysisResult>(
      systemPrompt,
      userPrompt,
      { temperature: 0.4, maxOutputTokens: 10000 },
    );

    if (!result?.trends?.length) {
      return { trends: [] };
    }

    const existingTrends = await prisma.detectedTrend.findMany({
      where: { workspaceId: params.workspaceId },
      select: { title: true, slug: true },
    });
    const existingTitles = new Set(existingTrends.map((t) => t.title.toLowerCase()));
    const existingSlugs = new Set(existingTrends.map((t) => t.slug));

    const validSourceUrls = new Set(params.sources.map((s) => s.url));
    const fallbackSourceUrl = params.sources[0]?.url ?? '';

    const maxCount = params.maxTrends ?? 10;
    const sanitized: SanitizedTrend[] = [];

    for (const raw of result.trends.slice(0, maxCount)) {
      if (existingTitles.has(raw.title.toLowerCase())) continue;

      const slug = await generateUniqueSlug(raw.title, existingSlugs);
      existingTitles.add(raw.title.toLowerCase());

      const trendSourceUrl = raw.sourceUrl && validSourceUrls.has(raw.sourceUrl)
        ? raw.sourceUrl
        : fallbackSourceUrl;

      sanitized.push({
        title: raw.title.slice(0, 200),
        slug,
        description: raw.description || '',
        category: sanitizeEnum(raw.category, VALID_CATEGORIES, 'TECHNOLOGY'),
        scope: sanitizeEnum(raw.scope, VALID_SCOPES, 'MESO'),
        impactLevel: sanitizeEnum(raw.impactLevel, VALID_IMPACTS, 'MEDIUM'),
        timeframe: sanitizeEnum(raw.timeframe, VALID_TIMEFRAMES, 'MEDIUM_TERM'),
        relevanceScore: Math.max(0, Math.min(100, raw.relevanceScore ?? 75)),
        direction: raw.direction && (VALID_DIRECTIONS as readonly string[]).includes(raw.direction)
          ? raw.direction
          : null,
        confidence: raw.confidence != null ? Math.max(0, Math.min(100, raw.confidence)) : null,
        rawExcerpt: raw.rawExcerpt?.slice(0, 2000) ?? null,
        aiAnalysis: `Synthesized from ${params.sources.length} sources: ${raw.description}`,
        industries: Array.isArray(raw.industries) ? raw.industries.slice(0, 10) : [],
        tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10) : [],
        howToUse: Array.isArray(raw.howToUse) ? raw.howToUse.slice(0, 5) : [],
        sourceUrl: trendSourceUrl,
        detectionSource: 'AI_RESEARCH',
        researchJobId: params.researchJobId,
        workspaceId: params.workspaceId,
        dataPoints: [],
        evidenceCount: 1,
        sourceUrls: [trendSourceUrl],
        whyNow: null,
      });
    }

    return { trends: sanitized };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during multi-source analysis';
    return { trends: [], error: message };
  }
}
