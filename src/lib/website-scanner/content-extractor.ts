// =============================================================
// Content Extractor — Gemini 3.1 Pro structured extraction
// =============================================================

import { createGeminiStructuredCompletion, GeminiSchemaType } from '@/lib/ai/gemini-client';
import { WEBSITE_EXTRACTION_SYSTEM_PROMPT, buildExtractionUserPrompt } from '@/lib/ai/prompts/website-scanner';
import type { CrawledPage, WebsiteExtraction } from './types';

// Gemini response schema for constrained decoding
const EXTRACTION_SCHEMA = {
  type: GeminiSchemaType.OBJECT,
  properties: {
    companyProfile: {
      type: GeminiSchemaType.OBJECT,
      properties: {
        name: { type: GeminiSchemaType.STRING },
        tagline: { type: GeminiSchemaType.STRING, nullable: true },
        description: { type: GeminiSchemaType.STRING },
        foundingYear: { type: GeminiSchemaType.NUMBER, nullable: true },
        headquarters: { type: GeminiSchemaType.STRING, nullable: true },
        industry: { type: GeminiSchemaType.STRING, nullable: true },
        employeeRange: { type: GeminiSchemaType.STRING, nullable: true },
        socialLinks: { type: GeminiSchemaType.OBJECT, properties: {} },
      },
      required: ['name', 'description'],
    },
    productsAndServices: {
      type: GeminiSchemaType.ARRAY,
      items: {
        type: GeminiSchemaType.OBJECT,
        properties: {
          name: { type: GeminiSchemaType.STRING },
          description: { type: GeminiSchemaType.STRING },
          category: { type: GeminiSchemaType.STRING },
          features: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
          benefits: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
          pricingModel: { type: GeminiSchemaType.STRING, nullable: true },
          imageUrls: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
        },
        required: ['name', 'description', 'category'],
      },
    },
    targetAudience: {
      type: GeminiSchemaType.ARRAY,
      items: {
        type: GeminiSchemaType.OBJECT,
        properties: {
          name: { type: GeminiSchemaType.STRING },
          description: { type: GeminiSchemaType.STRING },
          demographics: { type: GeminiSchemaType.OBJECT, properties: {} },
          needs: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
          painPoints: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
        },
        required: ['name', 'description'],
      },
    },
    brandSignals: {
      type: GeminiSchemaType.OBJECT,
      properties: {
        toneDescription: { type: GeminiSchemaType.STRING },
        writingStyle: { type: GeminiSchemaType.STRING },
        keyThemes: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
        wordsUsed: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
      },
      required: ['toneDescription', 'writingStyle'],
    },
    mentionedCompetitors: {
      type: GeminiSchemaType.ARRAY,
      items: {
        type: GeminiSchemaType.OBJECT,
        properties: {
          name: { type: GeminiSchemaType.STRING },
          relationship: { type: GeminiSchemaType.STRING },
        },
        required: ['name', 'relationship'],
      },
    },
    visualBranding: {
      type: GeminiSchemaType.OBJECT,
      properties: {
        primaryColors: { type: GeminiSchemaType.ARRAY, items: { type: GeminiSchemaType.STRING } },
        logoDescription: { type: GeminiSchemaType.STRING, nullable: true },
      },
    },
  },
  required: ['companyProfile', 'productsAndServices', 'targetAudience', 'brandSignals', 'mentionedCompetitors', 'visualBranding'],
};

/**
 * Extract structured information from crawled pages using Gemini 3.1 Pro.
 * Single call with all page content labeled by type.
 */
export async function extractWebsiteData(
  pages: CrawledPage[],
): Promise<WebsiteExtraction> {
  const userPrompt = buildExtractionUserPrompt(pages);

  const result = await createGeminiStructuredCompletion<WebsiteExtraction>(
    WEBSITE_EXTRACTION_SYSTEM_PROMPT,
    userPrompt,
    {
      model: 'gemini-3.1-pro-preview',
      temperature: 0.2,
      maxOutputTokens: 16000,
      responseSchema: EXTRACTION_SCHEMA as Record<string, unknown>,
      timeoutMs: 90_000,
    },
  );

  return result;
}
