// =============================================================
// Signal Extractor — Structured data extraction per source
//
// Phase 2 of the trend research pipeline.
// Extracts structured signals (claims, evidence, data points,
// entities) from scraped content. Runs in parallel per source.
// =============================================================

import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { buildSignalExtractionPrompt } from '@/lib/ai/prompts/trend-analysis';

// Use Gemini Pro for higher quality signal extraction (Flash was too unreliable)
const EXTRACTION_MODEL = 'gemini-3.1-pro-preview';

export type SourceType = 'news' | 'research' | 'industry_report' | 'blog' | 'analysis' | 'government' | 'other';
export type SourceAuthority = 'major_publication' | 'industry_specialist' | 'company_blog' | 'general' | 'unknown';

export interface Signal {
  claim: string;
  evidence: string;
  dataPoints: string[];
  entities: string[];
  sourceUrl: string;
  sourceName: string;
  sourceType: SourceType;
  publicationDate: string | null;
  sourceAuthority: SourceAuthority;
}

interface ExtractionResult {
  signals?: Array<{
    claim?: string;
    evidence?: string;
    dataPoints?: string[];
    entities?: string[];
    sourceType?: string;
    publicationDate?: string;
    sourceAuthority?: string;
  }>;
}

const VALID_SOURCE_TYPES: Set<string> = new Set([
  'news', 'research', 'industry_report', 'blog', 'analysis', 'government', 'other',
]);

const VALID_SOURCE_AUTHORITIES: Set<string> = new Set([
  'major_publication', 'industry_specialist', 'company_blog', 'general', 'unknown',
]);

/**
 * Extract structured signals from a single scraped source.
 * Uses Gemini Pro for higher quality extraction (~2-4s per source).
 */
export async function extractSignals(
  content: string,
  sourceUrl: string,
  sourceName: string,
): Promise<Signal[]> {
  try {
    const prompt = buildSignalExtractionPrompt(sourceUrl, sourceName, content);

    const result = await createGeminiStructuredCompletion<ExtractionResult>(
      'You are a research data extraction specialist. Extract structured facts only. Return valid JSON.',
      prompt,
      { model: EXTRACTION_MODEL, temperature: 0.1, maxOutputTokens: 3000 },
    );

    if (!result?.signals?.length) {
      console.warn(`[SignalExtractor] No signals in response for ${sourceName}. Result keys:`, result ? Object.keys(result) : 'null');
      return [];
    }

    const filtered = result.signals
      .filter((s) => s.claim && s.claim.trim().length > 5)
      .slice(0, 8)
      .map((s) => ({
        claim: s.claim!.slice(0, 500),
        evidence: (s.evidence ?? s.claim ?? '').slice(0, 500),
        dataPoints: Array.isArray(s.dataPoints) ? s.dataPoints.filter(Boolean).slice(0, 5) : [],
        entities: Array.isArray(s.entities) ? s.entities.filter(Boolean).slice(0, 5) : [],
        sourceUrl,
        sourceName,
        sourceType: VALID_SOURCE_TYPES.has(s.sourceType ?? '') ? s.sourceType as SourceType : 'other',
        publicationDate: s.publicationDate && s.publicationDate !== 'unknown' ? s.publicationDate.slice(0, 10) : null,
        sourceAuthority: VALID_SOURCE_AUTHORITIES.has(s.sourceAuthority ?? '') ? s.sourceAuthority as SourceAuthority : 'unknown',
      }));

    console.log(`[SignalExtractor] ${sourceName}: ${filtered.length} signals extracted`);
    return filtered;
  } catch (error) {
    console.warn(`[SignalExtractor] Failed for ${sourceName}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Extract signals from multiple sources in parallel.
 * Uses Promise.allSettled to avoid one failure killing all extractions.
 */
export async function extractSignalsFromSources(
  sources: Array<{ name: string; url: string; content: string }>,
  onProgress?: (completed: number, total: number) => void,
): Promise<Signal[]> {
  let completed = 0;
  const total = sources.length;

  const promises = sources.map(async (source) => {
    const signals = await extractSignals(source.content, source.url, source.name);
    completed++;
    onProgress?.(completed, total);
    return signals;
  });

  const results = await Promise.allSettled(promises);

  const allSignals: Signal[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allSignals.push(...result.value);
    }
  }

  return allSignals;
}
