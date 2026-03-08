// =============================================================
// Signal Extractor — Structured data extraction per source
//
// Phase 2 of the trend research pipeline.
// Extracts structured signals (claims, evidence, data points,
// entities) from scraped content. Runs in parallel per source.
// =============================================================

import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { buildSignalExtractionPrompt } from '@/lib/ai/prompts/trend-analysis';

const FLASH_MODEL = 'gemini-2.5-flash';

export type SourceType = 'news' | 'research' | 'industry_report' | 'blog' | 'analysis' | 'government' | 'other';

export interface Signal {
  claim: string;
  evidence: string;
  dataPoints: string[];
  entities: string[];
  sourceUrl: string;
  sourceName: string;
  sourceType: SourceType;
}

interface ExtractionResult {
  signals?: Array<{
    claim?: string;
    evidence?: string;
    dataPoints?: string[];
    entities?: string[];
    sourceType?: string;
  }>;
}

const VALID_SOURCE_TYPES: Set<string> = new Set([
  'news', 'research', 'industry_report', 'blog', 'analysis', 'government', 'other',
]);

/**
 * Extract structured signals from a single scraped source.
 * Uses Gemini Flash for speed (~1-2s per source, ~$0.001 per call).
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
      { model: FLASH_MODEL, temperature: 0.1, maxOutputTokens: 3000 },
    );

    if (!result?.signals?.length) return [];

    return result.signals
      .filter((s) => s.claim && s.claim.trim().length > 10)
      .slice(0, 8)
      .map((s) => ({
        claim: s.claim!.slice(0, 500),
        evidence: (s.evidence ?? '').slice(0, 500),
        dataPoints: Array.isArray(s.dataPoints) ? s.dataPoints.filter(Boolean).slice(0, 5) : [],
        entities: Array.isArray(s.entities) ? s.entities.filter(Boolean).slice(0, 5) : [],
        sourceUrl,
        sourceName,
        sourceType: VALID_SOURCE_TYPES.has(s.sourceType ?? '') ? s.sourceType as SourceType : 'other',
      }));
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
