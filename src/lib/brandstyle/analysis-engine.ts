// =============================================================
// Brandstyle Analysis Engine
//
// Orchestrates URL scraping / PDF parsing → preprocessing →
// three-phase AI analysis → DB write.
// Runs as a fire-and-forget background task, updating analysis
// status in the database progressively so the frontend can poll.
//
// AI: Claude Sonnet 4.5 via createClaudeStructuredCompletion
// Phase 1: Visual Identity (colors + typography + logo)
// Phase 2: Voice & Imagery (tone + photography + illustration)
// Phase 3: Design Language (graphic elements + patterns + iconography + gradients + layout)
// =============================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createClaudeStructuredCompletion } from '@/lib/ai/exploration/ai-caller';
import {
  scrapeUrl,
  type ScrapedData,
  type CssVariable,
  type ColorFrequency,
} from './url-scraper';
import { parsePdf, type ParsedPdfData } from './pdf-parser';
import {
  buildVisualIdentityPrompt,
  buildVoiceImageryPrompt,
  buildDesignLanguagePrompt,
  buildPdfAnalysisPrompt,
  VISUAL_IDENTITY_SYSTEM,
  VOICE_IMAGERY_SYSTEM,
  DESIGN_LANGUAGE_SYSTEM,
  PDF_ANALYSIS_SYSTEM_PROMPT,
  type ProcessedData,
  type ProcessedColorGroup,
  type AuthoritativeColor,
} from './analysis-prompts';
import {
  hexToRgb,
  hexToRgbString,
  hexToHslString,
  hexToCmykString,
  contrastWithWhite,
  contrastWithBlack,
} from '@/features/brandstyle/utils/color-utils';
import { importScrapedImagesToMediaLibrary } from '@/lib/media/import-scraped-image';

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

/**
 * A color that will actually be written to the DB.
 * Hex is always the authoritative hex from scraping; name/category/tags
 * come from AI annotation (merged by hex match) with deterministic fallbacks.
 */
interface ResolvedColor {
  hex: string;
  name: string;
  category: 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'NEUTRAL' | 'SEMANTIC';
  tags: string[];
  notes: string | null;
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

interface DesignLanguageResult {
  graphicElements: {
    brandShapes?: string[];
    decorativeElements?: string[];
    visualDevices?: string[];
    usageNotes?: string;
  } | null;
  graphicElementsDonts: string[];
  patternsTextures: {
    patterns?: string[];
    textures?: string[];
    backgrounds?: string[];
    usageNotes?: string;
  } | null;
  iconographyStyle: {
    style?: string;
    strokeWeight?: string;
    cornerRadius?: string;
    sizing?: string;
    colorUsage?: string;
    usageNotes?: string;
  } | null;
  iconographyDonts: string[];
  gradientsEffects: Array<{
    name: string;
    type: string;
    colors: string[];
    angle?: string;
    usage?: string;
  }>;
  layoutPrinciples: {
    gridSystem?: string;
    spacingScale?: string;
    whitespacePhilosophy?: string;
    compositionRules?: string[];
    usageNotes?: string;
  } | null;
}

interface CombinedResult extends VisualIdentityResult, VoiceImageryResult, Partial<DesignLanguageResult> {}

// ─── Status updater ───────────────────────────────────

type AnalysisStatus =
  | 'SCANNING_STRUCTURE'
  | 'EXTRACTING_COLORS'
  | 'ANALYZING_TYPOGRAPHY'
  | 'DETECTING_COMPONENTS'
  | 'ANALYZING_VISUAL_LANGUAGE'
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
    // Load styleguide ownership info up-front — we need workspaceId + createdById
    // for routing scraped images into the Media Library.
    const styleguideMeta = await prisma.brandStyleguide.findUnique({
      where: { id: styleguideId },
      select: { workspaceId: true, createdById: true },
    });
    if (!styleguideMeta) {
      console.error(`[brandstyle-analysis] Styleguide ${styleguideId} not found`);
      return;
    }

    // Step 1: Scrape + preprocess (with Gemini fallback on failure)
    await updateStatus(styleguideId, 'SCANNING_STRUCTURE');
    let scraped: ScrapedData;
    try {
      scraped = await scrapeUrl(url);
    } catch (scrapeErr) {
      console.warn(`[brandstyle-analysis] Direct scrape failed for ${url}: ${scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr)}`);
      // Fallback: use Gemini with Google Search grounding to extract basic brand data
      try {
        scraped = await scrapeUrlViaGeminiFallback(url);
        console.log(`[brandstyle-analysis] Gemini fallback succeeded for ${url}`);
      } catch (fallbackErr) {
        // Both methods failed — report the original scrape error (more useful to the user)
        await markError(styleguideId, `Failed to fetch URL: ${scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr)}`);
        return;
      }
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

    // Step 5: AI Call 3 — Design Language
    let designResult: DesignLanguageResult | null = null;
    try {
      const dlPrompt = buildDesignLanguagePrompt(processed);
      designResult = await createClaudeStructuredCompletion<DesignLanguageResult>(
        DESIGN_LANGUAGE_SYSTEM,
        dlPrompt,
        { temperature: 0.3, maxTokens: 4096 },
      );
    } catch (err) {
      // Design language is non-critical — log and continue
      console.warn(`[brandstyle-analysis] Design language phase failed (non-critical): ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 5b: AI Call 4 — Visual Language (Vormentaal)
    let visualLanguageResult: import('./visual-language.types').VisualLanguageProfile | null = null;
    if (scraped.visualHeuristics) {
      try {
        await updateStatus(styleguideId, 'ANALYZING_VISUAL_LANGUAGE');
        const { analyzeVisualLanguage } = await import('./visual-language-analyzer');
        visualLanguageResult = await analyzeVisualLanguage(
          scraped.visualHeuristics,
          {
            colors: processed.colorGroups.fromVariables?.map((c: { hex: string }) => c.hex)
              ?? processed.colorGroups.byFrequency?.map((c: { hex: string }) => c.hex)
              ?? [],
            fonts: processed.fonts ?? [],
            photographyStyle: voiceResult.photographyStyle?.mood ?? undefined,
            designLanguageSummary: designResult?.layoutPrinciples?.usageNotes ?? undefined,
          },
          scraped.url,
        );
      } catch (err) {
        // Visual language is non-critical — log and continue
        console.warn(`[brandstyle-analysis] Visual language phase failed (non-critical): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 6: Write to DB
    await updateStatus(styleguideId, 'GENERATING_STYLEGUIDE');
    const combined: CombinedResult = { ...visualResult, ...voiceResult, ...(designResult ?? {}) };
    // Resolve the authoritative palette with AI annotations merged in
    const resolvedColors = resolveColors(processed.authoritativeColors, visualResult.colors);
    await writeResultToDb(
      styleguideId,
      combined,
      resolvedColors,
      processed.fonts,
      processed.logoUrls,
    );

    // Route scraped brand images into the Media Library instead of persisting
    // them on the styleguide. Fire-and-forget — failures are swallowed inside.
    if (processed.brandImages && processed.brandImages.length > 0) {
      try {
        const result = await importScrapedImagesToMediaLibrary(
          processed.brandImages.map((img) => ({
            url: img.url,
            alt: img.alt,
            context: img.context,
          })),
          {
            workspaceId: styleguideMeta.workspaceId,
            uploadedById: styleguideMeta.createdById,
            sourceUrl: scraped.url,
          },
        );
        console.log(
          `[brandstyle-analysis] Imported ${result.imported} scraped images to media library (${result.failed} failed)`,
        );
      } catch (err) {
        console.warn(
          '[brandstyle-analysis] Failed to import scraped images to media library:',
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // Write visual language separately (Json field, not part of CombinedResult)
    if (visualLanguageResult) {
      await prisma.brandStyleguide.update({
        where: { id: styleguideId },
        data: {
          visualLanguage: JSON.parse(JSON.stringify(visualLanguageResult)),
        },
      });
    }

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
    // For PDFs the AI output IS the authoritative source (no scraped palette to pin),
    // so we pass the AI colors through directly as ResolvedColor[].
    const pdfResolvedColors: ResolvedColor[] = (result.colors || [])
      .slice(0, 12)
      .map((c, i): ResolvedColor | null => {
        const hex = normalizeHex(c.hex?.trim());
        if (!hex) return null;
        return {
          hex,
          name: c.name || `Color ${i + 1}`,
          category: validateCategory(c.category),
          tags: c.tags ?? [],
          notes: c.notes ?? null,
        };
      })
      .filter((c): c is ResolvedColor => c !== null);
    await writeResultToDb(styleguideId, result, pdfResolvedColors, [], []);

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

  // Build the authoritative palette — this is what we will write to the DB,
  // regardless of what the AI returns. AI is only allowed to annotate.
  const authoritativeColors = buildAuthoritativePalette(colorGroups);

  // Deduplicate and sort fonts by likely importance
  const fonts = deduplicateFonts(scraped.cssFonts ?? []);

  return {
    url: scraped.url,
    title: scraped.title,
    description: scraped.description,
    bodyText: scraped.bodyText ?? '',
    colorGroups,
    authoritativeColors,
    fonts,
    fontSizes: scraped.fontSizes ?? [],
    logoUrls: scraped.logoUrls ?? [],
    cssVariables: scraped.cssVariables ?? [],
    brandImages: scraped.brandImages ?? [],
    visualHeuristics: scraped.visualHeuristics,
  };
}

/**
 * Pick the authoritative brand palette from the grouped scraper data.
 * Priority: CSS variables → frequency-ranked colors → other.
 * Max 12 entries total.
 */
function buildAuthoritativePalette(groups: ProcessedColorGroup): AuthoritativeColor[] {
  const MAX = 12;
  const out: AuthoritativeColor[] = [];
  const seen = new Set<string>();

  const push = (entry: AuthoritativeColor) => {
    if (out.length >= MAX) return;
    const key = entry.hex.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...entry, hex: key });
  };

  // 1. CSS variables come first — highest confidence
  for (const v of groups.fromVariables) {
    push({ hex: v.hex, source: 'css-variable', variableName: v.name });
  }

  // 2. Frequency-ranked next
  for (const f of groups.byFrequency) {
    push({
      hex: f.hex,
      source: 'frequency',
      frequency: f.count,
      contexts: f.contexts,
    });
  }

  // 3. Fill remaining slots with other detected colors
  for (const hex of groups.other) {
    push({ hex, source: 'other' });
  }

  return out;
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
  // Accept both :root and non-:root variables — many sites define colors in
  // .dark, [data-theme], component scopes, or media queries.
  // Prioritize :root first, then other contexts.
  const fromVariables: Array<{ name: string; hex: string }> = [];
  const rootVars = cssVariables.filter((v) => v.context === 'root');
  const otherVars = cssVariables.filter((v) => v.context !== 'root');
  for (const v of [...rootVars, ...otherVars]) {
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

/** Extract a hex color from a CSS value (hex, rgb, hsl, oklch, lch, lab, color-mix) */
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

  // Modern RGB syntax: rgb(31 209 178) or rgb(31 209 178 / 0.5)
  const rgbModernMatch = value.match(/rgba?\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
  if (rgbModernMatch) {
    const r = parseInt(rgbModernMatch[1]);
    const g = parseInt(rgbModernMatch[2]);
    const b = parseInt(rgbModernMatch[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    }
  }

  // HSL/HSLA (legacy comma syntax)
  const hslMatch = value.match(/hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]);
    const l = parseInt(hslMatch[3]);
    if (h <= 360 && s <= 100 && l <= 100) {
      return hslToHex(h, s, l)?.toUpperCase() ?? null;
    }
  }

  // HSL modern syntax: hsl(166 74% 47%) or hsl(166deg 74% 47%)
  const hslModernMatch = value.match(/hsla?\(\s*([\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%/);
  if (hslModernMatch) {
    const h = Math.round(parseFloat(hslModernMatch[1]));
    const s = Math.round(parseFloat(hslModernMatch[2]));
    const l = Math.round(parseFloat(hslModernMatch[3]));
    if (h <= 360 && s <= 100 && l <= 100) {
      return hslToHex(h, s, l)?.toUpperCase() ?? null;
    }
  }

  // OKLCH: oklch(0.7 0.15 180) or oklch(70% 0.15 180deg)
  const oklchMatch = value.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (oklchMatch) {
    const L = oklchMatch[2] === '%' ? parseFloat(oklchMatch[1]) / 100 : parseFloat(oklchMatch[1]);
    const C = parseFloat(oklchMatch[3]);
    const H = parseFloat(oklchMatch[4]);
    if (L >= 0 && L <= 1 && C >= 0 && C <= 0.5 && H >= 0 && H <= 360) {
      return oklchToHex(L, C, H);
    }
  }

  // LCH: lch(70% 50 180)
  const lchMatch = value.match(/lch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/);
  if (lchMatch) {
    const L = parseFloat(lchMatch[1]);
    const C = parseFloat(lchMatch[2]);
    const H = parseFloat(lchMatch[3]);
    if (L >= 0 && L <= 100 && C >= 0 && H >= 0 && H <= 360) {
      // Approximate LCH→sRGB via oklch conversion (close enough for palette extraction)
      return oklchToHex(L / 100, C / 150, H);
    }
  }

  // color-mix: color-mix(in srgb, #ff0000 50%, #0000ff)
  // Extract the first color as approximation
  const colorMixMatch = value.match(/color-mix\([^,]+,\s*([^,\s)]+)/);
  if (colorMixMatch) {
    return extractHexFromValue(colorMixMatch[1]);
  }

  return null;
}

/** Convert OKLCH to hex (approximate sRGB conversion) */
function oklchToHex(L: number, C: number, H: number): string | null {
  // OKLCH → OKLab
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab → linear sRGB (approximate matrix)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Gamma correction (linear → sRGB)
  const gammaCorrect = (v: number) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  r = Math.round(Math.min(255, Math.max(0, gammaCorrect(r) * 255)));
  g = Math.round(Math.min(255, Math.max(0, gammaCorrect(g) * 255)));
  bl = Math.round(Math.min(255, Math.max(0, gammaCorrect(bl) * 255)));

  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
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

// ─── Color Resolution ─────────────────────────────────

/**
 * Merge AI annotations onto the authoritative palette.
 * - Hex values come from the authoritative palette (never altered).
 * - Name / category / tags / notes come from AI if it returned a matching hex.
 * - If AI skipped a hex we fall back to deterministic defaults so the color
 *   still appears in the styleguide with its exact original hex.
 */
function resolveColors(
  authoritative: AuthoritativeColor[],
  aiColors: AnalyzedColor[] | undefined | null,
): ResolvedColor[] {
  // Index AI responses by normalized hex
  const aiByHex = new Map<string, AnalyzedColor>();
  for (const ai of aiColors ?? []) {
    const hex = normalizeHex(ai.hex?.trim());
    if (hex) aiByHex.set(hex, ai);
  }

  const resolved: ResolvedColor[] = [];
  authoritative.forEach((entry, index) => {
    const hex = normalizeHex(entry.hex);
    if (!hex) return;

    const ai = aiByHex.get(hex);
    resolved.push({
      hex,
      name: ai?.name?.trim() || defaultColorName(entry, index),
      category: ai ? validateCategory(ai.category) : defaultCategory(entry, index),
      tags: ai?.tags ?? [],
      notes: ai?.notes?.trim() || defaultColorNotes(entry),
    });
  });

  return resolved;
}

function defaultColorName(entry: AuthoritativeColor, index: number): string {
  if (entry.variableName) {
    // Turn --primary-500 into "Primary 500"
    return entry.variableName
      .replace(/^--/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return `Color ${index + 1}`;
}

function defaultCategory(entry: AuthoritativeColor, index: number): ResolvedColor['category'] {
  // If the variable name hints at the role, use that
  const name = entry.variableName?.toLowerCase() ?? '';
  if (/primary|brand/.test(name)) return 'PRIMARY';
  if (/secondary/.test(name)) return 'SECONDARY';
  if (/accent|highlight|cta/.test(name)) return 'ACCENT';
  if (/success|warning|error|danger|info/.test(name)) return 'SEMANTIC';
  if (/neutral|gray|grey|text|bg|background|surface|muted/.test(name)) return 'NEUTRAL';
  // Fallback: first entry is primary, next two secondary/accent, rest neutral
  if (index === 0) return 'PRIMARY';
  if (index === 1) return 'SECONDARY';
  if (index === 2) return 'ACCENT';
  return 'NEUTRAL';
}

function defaultColorNotes(entry: AuthoritativeColor): string | null {
  const bits: string[] = [];
  if (entry.variableName) bits.push(`CSS variable ${entry.variableName}`);
  if (typeof entry.frequency === 'number' && entry.frequency > 0) {
    bits.push(`used ${entry.frequency}×`);
  }
  if (entry.contexts && entry.contexts.length > 0) {
    bits.push(`in ${entry.contexts.slice(0, 3).join(', ')}`);
  }
  return bits.length > 0 ? bits.join(', ') : null;
}

// ─── DB Write ─────────────────────────────────────────

/**
 * Write AI analysis results to the database.
 * Deletes existing colors first to prevent accumulation on re-analysis.
 */
async function writeResultToDb(
  styleguideId: string,
  result: CombinedResult,
  resolvedColors: ResolvedColor[],
  detectedFonts: string[],
  logoUrls?: string[],
): Promise<void> {
  // Delete existing colors before creating new ones
  await prisma.styleguideColor.deleteMany({ where: { styleguideId } });

  // ── Typography: force the primary font to the first scraped font verbatim.
  // If the scraper did not find any fonts, fall back to the AI's suggestion.
  const [firstFont, ...restFonts] = detectedFonts;
  const primaryFontName = firstFont ?? result.primaryFontName ?? null;
  const additionalFonts = restFonts.slice(0, 5);

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

      // Typography — primaryFontName pinned to scraped value
      primaryFontName,
      primaryFontUrl: result.primaryFontUrl || null,
      additionalFonts,
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

      // Brand images now live in the Media Library — clear the legacy field.
      brandImages: Prisma.JsonNull,

      // Design Language
      graphicElements: isNonEmptyObject(result.graphicElements)
        ? (result.graphicElements as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      graphicElementsDonts: result.graphicElementsDonts || [],
      patternsTextures: isNonEmptyObject(result.patternsTextures)
        ? (result.patternsTextures as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      iconographyStyle: isNonEmptyObject(result.iconographyStyle)
        ? (result.iconographyStyle as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      iconographyDonts: result.iconographyDonts || [],
      gradientsEffects: Array.isArray(result.gradientsEffects) && result.gradientsEffects.length > 0
        ? (result.gradientsEffects as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      layoutPrinciples: isNonEmptyObject(result.layoutPrinciples)
        ? (result.layoutPrinciples as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  // Create color records with computed values (RGB, HSL, CMYK, contrast)
  // Uses the RESOLVED palette — exact hexes from scraping with AI names merged in.
  for (let i = 0; i < resolvedColors.length; i++) {
    const color = resolvedColors[i];
    await prisma.styleguideColor.create({
      data: {
        name: color.name,
        hex: color.hex,
        rgb: hexToRgbString(color.hex) || null,
        hsl: hexToHslString(color.hex) || null,
        cmyk: hexToCmykString(color.hex) || null,
        category: color.category,
        tags: color.tags,
        notes: color.notes,
        contrastWhite: contrastWithWhite(color.hex),
        contrastBlack: contrastWithBlack(color.hex),
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

// ─── Gemini URL Fallback ─────────────────────────────

/**
 * Fallback scraper for when direct HTTP fetch fails (timeout, 403, Cloudflare, etc.).
 * Uses Gemini with Google Search grounding to extract brand-relevant data.
 * Returns a minimal ScrapedData object — no CSS heuristics, but colors/fonts/text.
 */
async function scrapeUrlViaGeminiFallback(url: string): Promise<ScrapedData> {
  const { GoogleGenAI } = await import('@google/genai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set — cannot use Gemini fallback');

  const client = new GoogleGenAI({ apiKey });
  const hostname = new URL(url).hostname;

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user' as const,
      parts: [{
        text: `Analyze the website at ${url} (${hostname}).

Extract and return a JSON object with:
- "title": page title
- "description": meta description or first paragraph
- "bodyText": main text content (headings + paragraphs, max 3000 chars)
- "colors": array of hex color strings used on the site (brand colors, not grays). Max 12.
- "fonts": array of font family names used (e.g. "Inter", "Poppins"). Max 5.
- "logoUrl": URL of the company logo if found, else null

Return ONLY valid JSON. No markdown.`,
      }],
    }],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.1,
    },
  });

  const raw = response.text ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini fallback returned no parseable JSON');

  let parsed: {
    title?: string;
    description?: string;
    bodyText?: string;
    colors?: string[];
    fonts?: string[];
    logoUrl?: string | null;
  };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Gemini fallback returned invalid JSON');
  }

  return {
    url,
    title: parsed.title ?? null,
    description: parsed.description ?? null,
    bodyText: parsed.bodyText ?? '',
    cssColors: (parsed.colors ?? []).filter((c) => /^#[0-9A-Fa-f]{3,8}$/.test(c)),
    cssFonts: parsed.fonts ?? [],
    logoUrls: parsed.logoUrl ? [parsed.logoUrl] : [],
    ogImage: null,
    favicon: null,
    inlineCss: '',
    linkedCssContent: '',
    cssVariables: [],
    colorFrequency: [],
    fontSizes: [],
    linkedStylesheetCount: 0,
    brandImages: [],
  };
}
