// =============================================================
// Brandstyle Analysis Engine
//
// Orchestrates URL scraping / PDF parsing → preprocessing →
// two-phase AI analysis → DB write.
// Runs as a fire-and-forget background task, updating analysis
// status in the database progressively so the frontend can poll.
//
// AI: Claude Sonnet 4.5 via createClaudeStructuredCompletion
// Phase 1: Visual Identity (colors + typography + logo)
// Phase 2: Voice & Imagery (tone + photography + illustration)
// =============================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createClaudeStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import {
  scrapeUrl,
  type ScrapedData,
  type CssVariable,
  type ColorFrequency,
  type ScrapedBrandImage,
} from './url-scraper';
import { parsePdf, type ParsedPdfData } from './pdf-parser';
import {
  buildVisualIdentityPrompt,
  buildVoiceImageryPrompt,
  buildPdfAnalysisPrompt,
  VISUAL_IDENTITY_SYSTEM,
  VOICE_IMAGERY_SYSTEM,
  PDF_ANALYSIS_SYSTEM_PROMPT,
  type ProcessedData,
  type ProcessedColorGroup,
} from './analysis-prompts';
import {
  hexToRgb,
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

interface VisualIdentityResult {
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
  colorDonts: string[];
}

interface VoiceImageryResult {
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
}

interface CombinedResult extends VisualIdentityResult, VoiceImageryResult {}

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
  try {
    await prisma.brandStyleguide.update({
      where: { id: styleguideId },
      data: {
        status: 'ERROR',
        analysisStatus: 'ERROR',
        errorMessage,
      },
    });
  } catch (dbErr) {
    console.error(`[brandstyle-analysis] Failed to persist error status for ${styleguideId}:`, dbErr);
  }
}

// ─── Public API ───────────────────────────────────────

/**
 * Analyze a URL and generate a brand styleguide.
 * Runs as a background task — updates DB status progressively.
 *
 * Steps:
 * 1. SCANNING_STRUCTURE → scrape URL + preprocess data
 * 2. EXTRACTING_COLORS → AI Call 1: Visual Identity (colors + typography + logo)
 * 3. ANALYZING_TYPOGRAPHY → (part of Call 1, quick transition)
 * 4. DETECTING_COMPONENTS → AI Call 2: Voice & Imagery (tone + photography)
 * 5. GENERATING_STYLEGUIDE → DB write + finalize
 */
export async function analyzeUrl(styleguideId: string, url: string): Promise<void> {
  try {
    // Step 1: Scrape + preprocess
    await updateStatus(styleguideId, 'SCANNING_STRUCTURE');
    let scraped: ScrapedData;
    try {
      scraped = await scrapeUrl(url);
    } catch (err) {
      await markError(styleguideId, `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const processed = preprocessScrapeData(scraped);

    // Step 2: AI Call 1 — Visual Identity
    await updateStatus(styleguideId, 'EXTRACTING_COLORS');
    let visualResult: VisualIdentityResult;
    try {
      const prompt = buildVisualIdentityPrompt(processed);
      visualResult = await createClaudeStructuredCompletion<VisualIdentityResult>(
        VISUAL_IDENTITY_SYSTEM,
        prompt,
        { temperature: 0.2, maxTokens: 4096 },
      );
    } catch (err) {
      await markError(styleguideId, `Visual identity analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Validate colors
    if (!visualResult.colors || !Array.isArray(visualResult.colors)) {
      await markError(styleguideId, 'AI response missing colors array');
      return;
    }

    // Step 3: Quick transition (visual identity includes typography)
    await updateStatus(styleguideId, 'ANALYZING_TYPOGRAPHY');
    await delay(200);

    // Step 4: AI Call 2 — Voice & Imagery
    await updateStatus(styleguideId, 'DETECTING_COMPONENTS');
    let voiceResult: VoiceImageryResult;
    try {
      const prompt = buildVoiceImageryPrompt(processed);
      voiceResult = await createClaudeStructuredCompletion<VoiceImageryResult>(
        VOICE_IMAGERY_SYSTEM,
        prompt,
        { temperature: 0.3, maxTokens: 4096 },
      );
    } catch (err) {
      await markError(styleguideId, `Voice & imagery analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Step 5: Write to DB
    await updateStatus(styleguideId, 'GENERATING_STYLEGUIDE');
    const combined: CombinedResult = { ...visualResult, ...voiceResult };
    await writeResultToDb(styleguideId, combined, processed.logoUrls, processed.brandImages);

    // Done — clear any stale errorMessage from previous failed runs
    await prisma.brandStyleguide.update({
      where: { id: styleguideId },
      data: {
        status: 'COMPLETE',
        analysisStatus: 'COMPLETE',
        errorMessage: null,
      },
    });
  } catch (err) {
    await markError(styleguideId, `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Analyze a PDF and generate a brand styleguide.
 * Uses a single AI call since PDFs have less structured data than web pages.
 */
export async function analyzePdf(
  styleguideId: string,
  buffer: Buffer,
  fileName: string,
): Promise<void> {
  try {
    // Step 1: Parse PDF
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

    // Step 2: Preparing data
    await updateStatus(styleguideId, 'EXTRACTING_COLORS');
    await delay(200);

    // Step 3: Typography prep
    await updateStatus(styleguideId, 'ANALYZING_TYPOGRAPHY');
    await delay(200);

    // Step 4: AI analysis (single combined call for PDFs)
    await updateStatus(styleguideId, 'DETECTING_COMPONENTS');
    const prompt = buildPdfAnalysisPrompt({
      fileName: parsed.fileName,
      text: parsed.text,
      hexColors: parsed.hexColors,
      fontMentions: parsed.fontMentions,
      metadata: parsed.metadata,
    });

    let result: CombinedResult;
    try {
      result = await createClaudeStructuredCompletion<CombinedResult>(
        PDF_ANALYSIS_SYSTEM_PROMPT,
        prompt,
        { temperature: 0.2, maxTokens: 6000 },
      );
    } catch (err) {
      await markError(styleguideId, `AI analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (!result.colors || !Array.isArray(result.colors)) {
      await markError(styleguideId, 'AI response missing colors array');
      return;
    }

    // Step 5: Write to DB
    await updateStatus(styleguideId, 'GENERATING_STYLEGUIDE');
    await writeResultToDb(styleguideId, result);

    // Done — clear any stale errorMessage from previous failed runs
    await prisma.brandStyleguide.update({
      where: { id: styleguideId },
      data: {
        status: 'COMPLETE',
        analysisStatus: 'COMPLETE',
        errorMessage: null,
      },
    });
  } catch (err) {
    await markError(styleguideId, `Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Preprocessing ────────────────────────────────────

/**
 * Preprocess scraped data for AI analysis.
 * - Deduplicates colors using perceptual distance (Delta E approximation)
 * - Groups colors by source: CSS variables > frequency > other
 * - Consolidates fonts
 */
function preprocessScrapeData(scraped: ScrapedData): ProcessedData {
  // Defensive defaults for scraper fields that might be empty
  const colorGroups = buildColorGroups(
    scraped.cssVariables ?? [],
    scraped.colorFrequency ?? [],
    scraped.cssColors ?? [],
  );

  // Deduplicate and sort fonts by likely importance
  const fonts = deduplicateFonts(scraped.cssFonts ?? []);

  return {
    url: scraped.url,
    title: scraped.title,
    description: scraped.description,
    bodyText: scraped.bodyText ?? '',
    colorGroups,
    fonts,
    fontSizes: scraped.fontSizes ?? [],
    logoUrls: scraped.logoUrls ?? [],
    cssVariables: scraped.cssVariables ?? [],
    brandImages: scraped.brandImages ?? [],
  };
}

/**
 * Build color groups with deduplication.
 * Priority: CSS variables > frequency-ranked > remaining.
 */
function buildColorGroups(
  cssVariables: CssVariable[],
  colorFrequency: ColorFrequency[],
  allColors: string[],
): ProcessedColorGroup {
  const seen = new Set<string>();

  // 1. Colors from CSS variables (highest confidence)
  const fromVariables: Array<{ name: string; hex: string }> = [];
  for (const v of cssVariables) {
    if (v.context !== 'root') continue;
    const hex = extractHexFromValue(v.value);
    if (hex && !seen.has(hex)) {
      seen.add(hex);
      fromVariables.push({ name: v.name, hex });
    }
  }

  // 2. Frequency-ranked colors (skip already seen)
  const byFrequency: ColorFrequency[] = [];
  for (const cf of colorFrequency) {
    const hex = cf.hex.toUpperCase();
    if (!seen.has(hex) && !isTooSimilarToAny(hex, seen)) {
      seen.add(hex);
      byFrequency.push(cf);
    }
  }

  // 3. Remaining unique colors
  const other: string[] = [];
  for (const hex of allColors) {
    const upper = hex.toUpperCase();
    if (!seen.has(upper) && !isTooSimilarToAny(upper, seen)) {
      seen.add(upper);
      other.push(upper);
    }
  }

  return { fromVariables, byFrequency, other };
}

/**
 * Check if a color is perceptually too similar to any color in the set.
 * Uses a simplified Delta E approximation (not full CIE2000, but sufficient).
 */
function isTooSimilarToAny(hex: string, existingHexes: Set<string>): boolean {
  const rgb1 = hexToRgb(hex);
  if (!rgb1) return false;

  for (const existing of existingHexes) {
    const rgb2 = hexToRgb(existing);
    if (!rgb2) continue;

    // Simplified perceptual distance (weighted Euclidean in RGB space)
    // Threshold ~35 corresponds roughly to ΔE < 5 for most colors
    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;
    const rmean = (rgb1.r + rgb2.r) / 2;

    // Weighted RGB distance (accounts for human perception)
    const distance = Math.sqrt(
      (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db
    );

    if (distance < 35) return true;
  }

  return false;
}

/** Extract a hex color from a CSS value (e.g., "#1FD1B2", "rgb(31, 209, 178)", "hsl(166, 74%, 47%)") */
function extractHexFromValue(value: string): string | null {
  // Hex colors (3, 4, 6, or 8 digits)
  const hexMatch = value.match(/#[0-9A-Fa-f]{3,8}\b/);
  if (hexMatch) {
    return normalizeHex(hexMatch[0])?.toUpperCase() ?? null;
  }

  // RGB/RGBA
  const rgbMatch = value.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    }
  }

  // HSL/HSLA
  const hslMatch = value.match(/hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]);
    const l = parseInt(hslMatch[3]);
    if (h <= 360 && s <= 100 && l <= 100) {
      return hslToHex(h, s, l)?.toUpperCase() ?? null;
    }
  }

  return null;
}

/** Convert HSL to hex */
function hslToHex(h: number, s: number, l: number): string | null {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return `#${[
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Deduplicate fonts — remove near-duplicates and sort by importance */
function deduplicateFonts(fonts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const font of fonts) {
    const key = font.toLowerCase().replace(/['"]/g, '').trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(font);
    }
  }

  return result;
}

// ─── DB Write ─────────────────────────────────────────

/**
 * Write AI analysis results to the database.
 * Deletes existing colors first to prevent accumulation on re-analysis.
 */
async function writeResultToDb(
  styleguideId: string,
  result: CombinedResult,
  logoUrls?: string[],
  brandImages?: ScrapedBrandImage[],
): Promise<void> {
  // Delete existing colors before creating new ones
  await prisma.styleguideColor.deleteMany({ where: { styleguideId } });

  // Update styleguide fields
  await prisma.brandStyleguide.update({
    where: { id: styleguideId },
    data: {
      // Logo
      logoVariations: logoUrls && logoUrls.length > 0
        ? logoUrls
            .filter((u) => !u.startsWith('[')) // Skip "[SVG logo found in HTML]" markers
            .map((url, i) => ({
              name: `Logo ${i + 1}`,
              url,
              type: url.endsWith('.svg') ? 'SVG' : url.endsWith('.png') ? 'PNG' : 'Image',
            }))
        : Prisma.JsonNull,
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

      // Imagery — guard against empty objects from AI
      photographyStyle: isNonEmptyObject(result.photographyStyle)
        ? (result.photographyStyle as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      photographyGuidelines: result.photographyGuidelines || [],
      illustrationGuidelines: result.illustrationGuidelines || [],
      imageryDonts: result.imageryDonts || [],
      colorDonts: result.colorDonts || [],

      // Brand images from scraping
      brandImages: brandImages && brandImages.length > 0
        ? (brandImages as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
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

// ─── Helpers ──────────────────────────────────────────

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

/** Check if a value is a non-empty object (has at least one truthy property) */
function isNonEmptyObject(val: unknown): boolean {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  return Object.values(val as Record<string, unknown>).some((v) => v != null && v !== '');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
