// =============================================================
// Brandstyle Analysis Engine
//
// Orchestrates URL scraping / PDF parsing → AI analysis → DB write.
// Runs as a fire-and-forget background task, updating analysis status
// in the database progressively so the frontend can poll for progress.
// =============================================================

import { prisma } from '@/lib/prisma';
import { openaiClient } from '@/lib/ai/openai-client';
import { scrapeUrl, type ScrapedData } from './url-scraper';
import { parsePdf, type ParsedPdfData } from './pdf-parser';
import {
  BRANDSTYLE_ANALYSIS_SYSTEM_PROMPT,
  buildUrlAnalysisPrompt,
  buildPdfAnalysisPrompt,
} from './analysis-prompts';
import {
  hexToRgbString,
  hexToHslString,
  hexToCmykString,
  contrastWithWhite,
  contrastWithBlack,
} from '@/features/brandstyle/utils/color-utils';

// ─── Types ────────────────────────────────────────────

interface AnalyzedColor {
  name: string;
  hex: string;
  category: 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'NEUTRAL' | 'SEMANTIC';
  tags: string[];
  notes?: string;
}

interface AnalysisResult {
  colors: AnalyzedColor[];
  primaryFontName: string | null;
  primaryFontUrl: string | null;
  typeScale: Array<{
    level: string;
    name: string;
    size: string;
    lineHeight: string;
    weight: string;
  }>;
  logoGuidelines: string[];
  logoDonts: string[];
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: Array<{ text: string; type: 'do' | 'dont' }>;
  photographyStyle: {
    mood?: string;
    subjects?: string;
    composition?: string;
  } | null;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  imageryDonts: string[];
  colorDonts: string[];
}

// ─── Status updater ───────────────────────────────────

type AnalysisStatus =
  | 'SCANNING_STRUCTURE'
  | 'EXTRACTING_COLORS'
  | 'ANALYZING_TYPOGRAPHY'
  | 'DETECTING_COMPONENTS'
  | 'GENERATING_STYLEGUIDE'
  | 'COMPLETE'
  | 'ERROR';

async function updateStatus(styleguideId: string, status: AnalysisStatus): Promise<void> {
  await prisma.brandStyleguide.update({
    where: { id: styleguideId },
    data: { analysisStatus: status },
  });
}

async function markError(styleguideId: string, errorMessage: string): Promise<void> {
  console.error(`[brandstyle-analysis] Error for ${styleguideId}:`, errorMessage);
  await prisma.brandStyleguide.update({
    where: { id: styleguideId },
    data: {
      status: 'ERROR',
      analysisStatus: 'ERROR',
    },
  });
}

// ─── Public API ───────────────────────────────────────

/**
 * Analyze a URL and generate a brand styleguide.
 * Runs as a background task — updates DB status progressively.
 */
export async function analyzeUrl(styleguideId: string, url: string): Promise<void> {
  try {
    // Step 1: Scan website structure
    await updateStatus(styleguideId, 'SCANNING_STRUCTURE');
    let scraped: ScrapedData;
    try {
      scraped = await scrapeUrl(url);
    } catch (err) {
      await markError(styleguideId, `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Step 2: Extract colors
    await updateStatus(styleguideId, 'EXTRACTING_COLORS');
    // Colors are already extracted by scrapeUrl, small delay for UX
    await delay(1000);

    // Step 3: Analyze typography
    await updateStatus(styleguideId, 'ANALYZING_TYPOGRAPHY');
    await delay(500);

    // Step 4: Detect components — this is where AI analysis happens
    await updateStatus(styleguideId, 'DETECTING_COMPONENTS');
    const prompt = buildUrlAnalysisPrompt({
      url: scraped.url,
      title: scraped.title,
      description: scraped.description,
      bodyText: scraped.bodyText,
      cssColors: scraped.cssColors,
      cssFonts: scraped.cssFonts,
      logoUrls: scraped.logoUrls,
    });

    let result: AnalysisResult;
    try {
      result = await runAiAnalysis(prompt);
    } catch (err) {
      await markError(styleguideId, `AI analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Step 5: Generate styleguide — write to DB
    await updateStatus(styleguideId, 'GENERATING_STYLEGUIDE');
    await writeResultToDb(styleguideId, result);

    // Done
    await prisma.brandStyleguide.update({
      where: { id: styleguideId },
      data: {
        status: 'COMPLETE',
        analysisStatus: 'COMPLETE',
      },
    });
  } catch (err) {
    await markError(styleguideId, `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Analyze a PDF and generate a brand styleguide.
 * Runs as a background task — updates DB status progressively.
 */
export async function analyzePdf(
  styleguideId: string,
  buffer: Buffer,
  fileName: string,
): Promise<void> {
  try {
    // Step 1: Scan PDF structure
    await updateStatus(styleguideId, 'SCANNING_STRUCTURE');
    let parsed: ParsedPdfData;
    try {
      parsed = await parsePdf(buffer, fileName);
    } catch (err) {
      await markError(styleguideId, `Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (!parsed.text || parsed.text.trim().length < 50) {
      await markError(styleguideId, 'PDF contains too little text content to analyze. The PDF may be image-only or corrupted.');
      return;
    }

    // Step 2: Extract colors
    await updateStatus(styleguideId, 'EXTRACTING_COLORS');
    await delay(800);

    // Step 3: Analyze typography
    await updateStatus(styleguideId, 'ANALYZING_TYPOGRAPHY');
    await delay(500);

    // Step 4: AI analysis
    await updateStatus(styleguideId, 'DETECTING_COMPONENTS');
    const prompt = buildPdfAnalysisPrompt({
      fileName: parsed.fileName,
      text: parsed.text,
      hexColors: parsed.hexColors,
      fontMentions: parsed.fontMentions,
      metadata: parsed.metadata,
    });

    let result: AnalysisResult;
    try {
      result = await runAiAnalysis(prompt);
    } catch (err) {
      await markError(styleguideId, `AI analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Step 5: Write to DB
    await updateStatus(styleguideId, 'GENERATING_STYLEGUIDE');
    await writeResultToDb(styleguideId, result);

    // Done
    await prisma.brandStyleguide.update({
      where: { id: styleguideId },
      data: {
        status: 'COMPLETE',
        analysisStatus: 'COMPLETE',
      },
    });
  } catch (err) {
    await markError(styleguideId, `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Internal ─────────────────────────────────────────

/**
 * Run the AI structured completion to analyze brand data
 */
async function runAiAnalysis(userPrompt: string): Promise<AnalysisResult> {
  const result = await openaiClient.createStructuredCompletion<AnalysisResult>(
    [
      { role: 'system', content: BRANDSTYLE_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    {
      useCase: 'ANALYSIS',
      temperature: 0.3,
      maxTokens: 4096,
    },
  );

  // Validate the result has at least colors
  if (!result.colors || !Array.isArray(result.colors)) {
    throw new Error('AI response missing colors array');
  }

  return result;
}

/**
 * Write AI analysis results to the database.
 * Deletes existing colors first to prevent accumulation on re-analysis.
 */
async function writeResultToDb(styleguideId: string, result: AnalysisResult): Promise<void> {
  // Delete existing colors before creating new ones (prevents accumulation)
  await prisma.styleguideColor.deleteMany({ where: { styleguideId } });

  // Update styleguide fields
  await prisma.brandStyleguide.update({
    where: { id: styleguideId },
    data: {
      // Logo
      logoGuidelines: result.logoGuidelines || [],
      logoDonts: result.logoDonts || [],

      // Typography
      primaryFontName: result.primaryFontName || null,
      primaryFontUrl: result.primaryFontUrl || null,
      typeScale: result.typeScale || null,

      // Tone of Voice
      contentGuidelines: result.contentGuidelines || [],
      writingGuidelines: result.writingGuidelines || [],
      examplePhrases: result.examplePhrases || null,

      // Imagery
      photographyStyle: result.photographyStyle || null,
      photographyGuidelines: result.photographyGuidelines || [],
      illustrationGuidelines: result.illustrationGuidelines || [],
      imageryDonts: result.imageryDonts || [],
      colorDonts: result.colorDonts || [],
    },
  });

  // Create color records with computed values (RGB, HSL, CMYK, contrast)
  const colors = (result.colors || []).slice(0, 12);
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const hex = normalizeHex(color.hex?.trim());
    if (!hex) continue;

    await prisma.styleguideColor.create({
      data: {
        name: color.name || `Color ${i + 1}`,
        hex,
        rgb: hexToRgbString(hex) || null,
        hsl: hexToHslString(hex) || null,
        cmyk: hexToCmykString(hex) || null,
        category: validateCategory(color.category),
        tags: color.tags || [],
        notes: color.notes || null,
        contrastWhite: contrastWithWhite(hex),
        contrastBlack: contrastWithBlack(hex),
        sortOrder: i,
        styleguideId,
      },
    });
  }
}

type ColorCategory = 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'NEUTRAL' | 'SEMANTIC';

function validateCategory(cat: string): ColorCategory {
  const valid: ColorCategory[] = ['PRIMARY', 'SECONDARY', 'ACCENT', 'NEUTRAL', 'SEMANTIC'];
  return valid.includes(cat as ColorCategory) ? (cat as ColorCategory) : 'NEUTRAL';
}

function normalizeHex(hex: string | undefined | null): string | null {
  if (!hex) return null;
  const clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`;
  }
  if (clean.length === 6) {
    return `#${clean}`;
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
