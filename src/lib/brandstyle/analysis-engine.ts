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
import { inferLayoutStyleFromSiteData } from './infer-layout-style';
import { isFrameworkDefaultPrimary } from './framework-defaults';
import {
  buildVisualIdentityPrompt,
  buildVoiceImageryPrompt,
  buildDesignLanguagePrompt,
  buildPdfAnalysisPrompt,
  VISUAL_IDENTITY_SYSTEM,
  VOICE_IMAGERY_SYSTEM,
  DESIGN_LANGUAGE_SYSTEM,
  PDF_ANALYSIS_SYSTEM_PROMPT,
  VISUAL_REFERENCE_ADDENDUM,
  type ProcessedData,
  type ProcessedColorGroup,
  type AuthoritativeColor,
} from './analysis-prompts';
import { runFrameworkDetectors, type DetectedToken } from './framework-detectors';
import {
  hexToRgb,
  hexToRgbString,
  hexToHsl,
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
 * Confidence + detectorSource come straight from the scraper pipeline so
 * the UI can show how trustworthy the color is.
 */
interface ResolvedColor {
  hex: string;
  name: string;
  category: 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'NEUTRAL' | 'SEMANTIC';
  tags: string[];
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
  detectorSource: string | null;
}

interface VoiceImageryResult {
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: Array<{ text: string; type: 'do' | 'dont' }>;
  /** DTS-plan C1 — brand-eigen vocabulaire (woorden + zinnetjes). */
  vocabularyDo?: string[];
  /** DTS-plan C1 — woorden/frasen die het merk vermijdt. */
  vocabularyDont?: string[];
  /** DTS-plan C2 — 1 representatieve paragraaf in brand-eigen voice. */
  voiceSample?: string;
  /** DTS-plan C7 — fixture-samples voor Puck defaultProps. */
  fixtureSamples?: {
    headlines?: string[];
    ctaLabels?: string[];
    featureTitles?: string[];
    testimonialQuotes?: string[];
  };
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
  /** Verbeterplan #4: one-sentence design-philosophy voor brand-emergent
   *  content-generation. Beschrijft wat dit merk visueel anders maakt. */
  designPhilosophy?: string | null;
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
    let usedGeminiFallback = false;
    let usedMultiPage = false;
    let subpageUrls: string[] = [];
    try {
      // Sprint 6D: When multi-page crawl is enabled, scrape the homepage
      // plus ~3 prioritised subpages (about, services, contact) and merge.
      // Link-heavy sites ship almost nothing on the homepage — subpages
      // carry the real CTA buttons, form inputs, and service cards.
      const { isMultiPageEnabled, scrapeUrlMultiPage } = await import('./multi-page-scraper');
      if (isMultiPageEnabled()) {
        const multi = await scrapeUrlMultiPage(url);
        scraped = multi.merged;
        subpageUrls = multi.subpageUrls;
        usedMultiPage = true;
      } else {
        scraped = await scrapeUrl(url);
      }
    } catch (scrapeErr) {
      console.warn(`[brandstyle-analysis] Direct scrape failed for ${url}: ${scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr)}`);
      // Fallback: use Gemini with Google Search grounding to extract basic brand data
      try {
        scraped = await scrapeUrlViaGeminiFallback(url);
        usedGeminiFallback = true;
        console.log(`[brandstyle-analysis] Gemini fallback succeeded for ${url}`);
      } catch {
        // Both methods failed — report the original scrape error (more useful to the user)
        await markError(styleguideId, `Failed to fetch URL: ${scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr)}`);
        return;
      }
    }

    let processed = preprocessScrapeData(scraped);

    // Refuse-mode trigger: no high-confidence brand colors AND too few total.
    // Before falling all the way through to refuse-mode, try the headless
    // browser fallback (if enabled) — many CSS-in-JS / SPA sites only reveal
    // their brand tokens via getComputedStyle after the JS has run.
    const isWeakPalette = (data: ProcessedData): boolean =>
      !data.authoritativeColors.some((c) => c.confidence === 'high') &&
      data.authoritativeColors.length < 3;

    let usedHeadlessRender = false;
    if (isWeakPalette(processed)) {
      const { isHeadlessFallbackEnabled, scrapeUrlViaHeadless } = await import('./playwright-fallback');
      if (isHeadlessFallbackEnabled()) {
        try {
          console.log(`[brandstyle-analysis] Static palette weak, trying headless fallback for ${url}`);
          const headlessScraped = await scrapeUrlViaHeadless(url);
          // Replace CSS sources with the post-render serialized output so
          // the full downstream pipeline (variables, visual heuristics,
          // components, frequency analysis) sees the actual rendered
          // stylesheets — including CSS-in-JS that the static scrape missed.
          scraped = {
            ...scraped,
            cssColors: headlessScraped.cssColors,
            cssFonts: headlessScraped.cssFonts,
            bodyFont: headlessScraped.bodyFont ?? scraped.bodyFont,
            headingFont: headlessScraped.headingFont ?? scraped.headingFont,
            colorFrequency: headlessScraped.colorFrequency,
            title: scraped.title ?? headlessScraped.title,
            inlineCss: headlessScraped.inlineCss || scraped.inlineCss,
            cssVariables: headlessScraped.cssVariables.length > 0
              ? headlessScraped.cssVariables
              : scraped.cssVariables,
          };
          processed = preprocessScrapeData(scraped);
          usedHeadlessRender = true;
          console.log(
            `[brandstyle-analysis] Headless extracted ${processed.authoritativeColors.length} colors, ${scraped.inlineCss.length} bytes CSS`,
          );
        } catch (headlessErr) {
          console.warn(
            `[brandstyle-analysis] Headless fallback failed: ${headlessErr instanceof Error ? headlessErr.message : String(headlessErr)}`,
          );
        }
      }
    }

    // Final refuse-mode check — after potential headless fallback
    if (isWeakPalette(processed)) {
      await markError(
        styleguideId,
        'Could not extract enough brand colors from this site. ' +
        'It may use CSS-in-JS, block automated scraping, or hide its design tokens behind authentication. ' +
        'Try uploading a brand-guide PDF, or analysing a marketing landing page instead of the homepage.',
      );
      return;
    }

    // Optional: take page screenshots via Playwright BEFORE running AI calls
    // so the model sees the actual visual alongside extracted CSS data.
    // Hero + full-page shots ground color/font/imagery classifications in
    // what users actually see on the site instead of raw token counts.
    let pageScreenshots: { buffer: Buffer; mediaType: 'image/png' }[] = [];
    let heroBuffer: Buffer | null = null;
    let usedVisualAi = false;
    let heroPattern: import('./hero-pattern-detector').HeroPatternResult | null = null;
    try {
      const { isVisualAiEnabled, capturePageScreenshots } = await import('./page-screenshotter');
      if (isVisualAiEnabled()) {
        const shots = await capturePageScreenshots(url);
        pageScreenshots = shots.map((s) => ({ buffer: s.buffer, mediaType: s.mediaType }));
        // Keep the hero buffer around for logo detection — it's the
        // screenshot most likely to contain a crisp above-the-fold logo.
        const hero = shots.find((s) => s.label === 'hero');
        if (hero) heroBuffer = hero.buffer;
        if (pageScreenshots.length > 0) {
          usedVisualAi = true;
          console.log(`[brandstyle-analysis] Captured ${pageScreenshots.length} page screenshots for AI vision`);
        }

        // Fase C — hero-pattern detection. Vision-call die classifeert in 6
        // layout-archetypes. Renderer gebruikt dit later om de LP-hero
        // layout van de bron te kopiëren i.p.v. archetype-default.
        if (heroBuffer) {
          try {
            const { isHeroPatternEnabled, detectHeroPattern } = await import('./hero-pattern-detector');
            if (isHeroPatternEnabled()) {
              heroPattern = await detectHeroPattern(heroBuffer);
              if (heroPattern) {
                console.log(`[brandstyle-analysis] Hero pattern: ${heroPattern.pattern} (confidence: ${heroPattern.confidence})`);
              }
            }
          } catch (hpErr) {
            console.warn(`[brandstyle-analysis] Hero pattern detect failed (non-critical): ${hpErr instanceof Error ? hpErr.message : String(hpErr)}`);
          }
        }
      }
    } catch (shotErr) {
      console.warn(
        `[brandstyle-analysis] Page screenshots failed (non-critical): ${shotErr instanceof Error ? shotErr.message : String(shotErr)}`,
      );
    }

    // Sprint 6A: Detect the real brand logo via Claude Vision on the hero
    // screenshot. HTML regex-based logo scraping often picks unrelated small
    // icons (favicons, social glyphs); Vision pinpoints the actual wordmark.
    let visionLogo: Awaited<
      ReturnType<typeof import('./logo-vision-detector').detectAndCropLogo>
    > = null;
    let usedLogoVision = false;
    if (heroBuffer && styleguideMeta.workspaceId) {
      try {
        const { detectAndCropLogo } = await import('./logo-vision-detector');
        visionLogo = await detectAndCropLogo(heroBuffer, styleguideMeta.workspaceId);
        if (visionLogo) {
          usedLogoVision = true;
          console.log(`[brandstyle-analysis] Logo detected via Vision: ${visionLogo.description}`);
        }
      } catch (logoErr) {
        console.warn(
          `[brandstyle-analysis] Logo vision failed (non-critical): ${logoErr instanceof Error ? logoErr.message : String(logoErr)}`,
        );
      }
    }
    const visualPromptSuffix = pageScreenshots.length > 0 ? `\n\n${VISUAL_REFERENCE_ADDENDUM}` : '';

    // Screenshot-based usage evidence: for every authoritative palette
    // entry, verify whether it actually appears on the captured page.
    // This filters out plugin-chrome colours that live in CSS but never
    // render, and fixes misleading variable names (e.g. Vercel's
    // --geist-success holding the primary blue). See color-usage-verifier.
    if (pageScreenshots.length > 0 && processed.authoritativeColors.length > 0) {
      try {
        const { verifyColorUsage } = await import('./color-usage-verifier');
        const visionScreenshots = pageScreenshots.map((s, i) => ({
          label: (i === 0 ? 'hero' : 'full-page') as 'hero' | 'full-page',
          buffer: s.buffer,
          mediaType: s.mediaType,
        }));
        const evidenceMap = await verifyColorUsage(
          processed.authoritativeColors,
          visionScreenshots,
          { log: (msg) => console.log(msg) },
          {
            workspaceId: styleguideMeta.workspaceId,
            parentEntityType: 'BrandStyleguide',
            parentEntityId: styleguideId,
            sourceIdentifier: 'src/lib/brandstyle/analysis-engine.ts:verifyColorUsage',
          },
        );
        for (const color of processed.authoritativeColors) {
          const rec = evidenceMap.get(color.hex);
          if (!rec) continue;
          color.usageEvidence = rec.finalEvidence;
          color.visionRole = rec.visionRole;
        }
        const strong = processed.authoritativeColors.filter((c) => c.usageEvidence === 'strong').length;
        const none = processed.authoritativeColors.filter((c) => c.usageEvidence === 'none').length;
        console.log(
          `[brandstyle-analysis] Usage evidence: ${strong} strong / ${processed.authoritativeColors.length - strong - none} weak / ${none} none`,
        );
      } catch (verifyErr) {
        console.warn(
          `[brandstyle-analysis] Usage verification failed (non-critical): ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`,
        );
      }
    }

    // Step 2: AI Call 1 — Visual Identity
    await updateStatus(styleguideId, 'EXTRACTING_COLORS');
    let visualResult: VisualIdentityResult;
    try {
      const prompt = buildVisualIdentityPrompt(processed) + visualPromptSuffix;
      visualResult = await createClaudeStructuredCompletion<VisualIdentityResult>(
        VISUAL_IDENTITY_SYSTEM,
        prompt,
        { temperature: 0.2, maxTokens: 4096, images: pageScreenshots, timeoutMs: 180_000 },
        {
          workspaceId: styleguideMeta.workspaceId,
          parentEntityType: 'BrandStyleguide',
          parentEntityId: styleguideId,
          callOrder: 0,
          sourceIdentifier: 'src/lib/brandstyle/analysis-engine.ts:analyzeUrl:visualIdentity',
        },
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
      const prompt = buildVoiceImageryPrompt(processed) + visualPromptSuffix;
      voiceResult = await createClaudeStructuredCompletion<VoiceImageryResult>(
        VOICE_IMAGERY_SYSTEM,
        prompt,
        { temperature: 0.3, maxTokens: 4096, images: pageScreenshots, timeoutMs: 180_000 },
        {
          workspaceId: styleguideMeta.workspaceId,
          parentEntityType: 'BrandStyleguide',
          parentEntityId: styleguideId,
          callOrder: 1,
          sourceIdentifier: 'src/lib/brandstyle/analysis-engine.ts:analyzeUrl:voiceImagery',
        },
      );
    } catch (err) {
      await markError(styleguideId, `Voice & imagery analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    // Step 5: AI Call 3 — Design Language
    let designResult: DesignLanguageResult | null = null;
    try {
      const dlPrompt = buildDesignLanguagePrompt(processed) + visualPromptSuffix;
      designResult = await createClaudeStructuredCompletion<DesignLanguageResult>(
        DESIGN_LANGUAGE_SYSTEM,
        dlPrompt,
        { temperature: 0.3, maxTokens: 4096, images: pageScreenshots, timeoutMs: 180_000 },
        {
          workspaceId: styleguideMeta.workspaceId,
          parentEntityType: 'BrandStyleguide',
          parentEntityId: styleguideId,
          callOrder: 2,
          sourceIdentifier: 'src/lib/brandstyle/analysis-engine.ts:analyzeUrl:designLanguage',
        },
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
          {
            workspaceId: styleguideMeta.workspaceId,
            parentEntityType: 'BrandStyleguide',
            parentEntityId: styleguideId,
            sourceIdentifier: 'src/lib/brandstyle/analysis-engine.ts:analyzeVisualLanguage',
          },
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
    let resolvedColors = resolveColors(processed.authoritativeColors, visualResult.colors);

    // Sprint 6B: cross-source confidence promotion.
    // When Claude has seen the actual page screenshots AND classifies a color
    // as PRIMARY or ACCENT (branded CTA / accent colors — the ones that matter
    // most for downstream AI generation), promote its confidence from medium
    // to high. Claude saw the pixels and the CSS together; if it agrees those
    // colors are the brand signal, we should trust that over the bare
    // frequency-derived medium default.
    if (usedVisualAi) {
      resolvedColors = resolvedColors.map((c) => {
        if (c.confidence !== 'medium') return c;
        if (c.category === 'PRIMARY' || c.category === 'ACCENT') {
          return { ...c, confidence: 'high' as const };
        }
        return c;
      });
    }

    // Optionally take real element screenshots + computed-style extraction
    // via Playwright. Much higher accuracy than the static DOM extractor
    // (catches Tailwind / CSS-in-JS / runtime styles). Replaces the static
    // detectedComponents when enabled; falls back to static on failure.
    // Optionally also sends each screenshot through Claude Vision to derive
    // better labels (e.g. "Primary emerald CTA button" instead of "Button").
    let finalComponents = scraped.components;
    let usedComponentScreenshots = false;
    let usedComponentVision = false;
    try {
      const { isComponentScreenshotsEnabled, extractComponentsFromPages } =
        await import('./component-screenshotter');
      if (isComponentScreenshotsEnabled()) {
        // Sprint 6D: when multi-page is enabled, screenshot components
        // from homepage + up to 4 subpages (5 pages total). Pages beyond
        // the top 4 already contributed via static CSS/component merge;
        // running Playwright on them doubles wall-clock for little extra
        // visual variety.
        const componentUrls = usedMultiPage
          ? [url, ...subpageUrls.slice(0, 4)]
          : [url];
        console.log(`[brandstyle-analysis] Taking component screenshots for ${componentUrls.length} page(s)`);
        const shotResult = await extractComponentsFromPages(componentUrls, styleguideMeta.workspaceId);
        const shot = shotResult.components;

        // Augment static CSS heuristics met runtime computed-style frequencies.
        // Catches Tailwind/CSS-in-JS resolved values die de cheerio-pass mist.
        // Non-mutating: we vervangen scraped.visualHeuristics indien augmented.
        if (shotResult.bulkStyles && scraped.visualHeuristics) {
          try {
            const { augmentHeuristicsWithRuntime } = await import('./bulk-computed-styles');
            scraped.visualHeuristics = augmentHeuristicsWithRuntime(
              scraped.visualHeuristics,
              shotResult.bulkStyles,
            );
            console.log(
              `[brandstyle-analysis] Heuristics augmented with runtime data: ${scraped.visualHeuristics.borderRadius.values.length} radii, ${scraped.visualHeuristics.spacing.values.length} spacing samples, ${scraped.visualHeuristics.boxShadow.samples.length} shadow samples`,
            );
          } catch (augErr) {
            console.warn(
              `[brandstyle-analysis] Heuristics augmentation failed (non-critical): ${augErr instanceof Error ? augErr.message : String(augErr)}`,
            );
          }
        }

        if (shot.length > 0) {
          let enriched = shot;
          try {
            const { isComponentVisionEnabled, enrichComponentsWithVision } = await import(
              './component-vision-enricher'
            );
            if (isComponentVisionEnabled()) {
              console.log(`[brandstyle-analysis] Enriching ${shot.length} components with Claude Vision`);
              enriched = await enrichComponentsWithVision(shot);
              usedComponentVision = true;
            }
          } catch (visionErr) {
            console.warn(
              `[brandstyle-analysis] Vision enrichment failed (non-critical): ${visionErr instanceof Error ? visionErr.message : String(visionErr)}`,
            );
          }
          // Strip the in-memory Buffer before handing off to the persistence
          // layer — DetectedComponent is the public shape.
          finalComponents = enriched.map((c) => ({
            type: c.type,
            label: c.label,
            selector: c.selector,
            classes: c.classes,
            extractedStyles: c.extractedStyles,
            previewHtml: c.previewHtml,
            confidence: c.confidence,
            screenshotUrl: c.screenshotUrl ?? null,
          }));
          usedComponentScreenshots = true;
          console.log(`[brandstyle-analysis] Captured ${finalComponents.length} component screenshots`);
        }
      }
    } catch (shotErr) {
      console.warn(
        `[brandstyle-analysis] Component screenshots failed (non-critical): ${shotErr instanceof Error ? shotErr.message : String(shotErr)}`,
      );
    }
    // Tag provenance so the UI can surface what path was used:
    //   - gemini-fallback  → LLM-reconstructed data (reduced accuracy)
    //   - headless-render  → browser-rendered CSS (higher fidelity than static)
    const provenanceMarkers: string[] = [];
    if (usedGeminiFallback) provenanceMarkers.push("gemini-fallback");
    if (usedHeadlessRender) provenanceMarkers.push("headless-render");
    if (usedComponentScreenshots) provenanceMarkers.push("component-screenshots");
    if (usedComponentVision) provenanceMarkers.push("component-vision");
    if (usedVisualAi) provenanceMarkers.push("visual-ai-analysis");
    if (usedLogoVision) provenanceMarkers.push("logo-vision");
    if (usedMultiPage) provenanceMarkers.push("multi-page");
    const frameworksWithProvenance =
      provenanceMarkers.length > 0
        ? [...processed.frameworks, ...provenanceMarkers]
        : processed.frameworks;

    await writeResultToDb(
      styleguideId,
      combined,
      resolvedColors,
      processed.fonts,
      processed.logoUrls,
      frameworksWithProvenance,
      scraped.visualHeuristics,
      finalComponents,
      scraped.bodyFont,
      scraped.headingFont,
      visionLogo,
      scraped.adobeFonts ?? null,
      `${scraped.inlineCss ?? ''}\n${scraped.linkedCssContent ?? ''}`,
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

    // Fase D — persist bron-hero-screenshot URL voor lp-fidelity-judge.
    // Anders moet de judge bij elke check de bron live re-fetchen +
    // re-screenshotten (~20s extra). Met persisted URL doet hij gewoon
    // een GET op de storage en is judge-call <10s totaal.
    let heroScreenshotUrl: string | null = null;
    if (heroBuffer && styleguideMeta.workspaceId) {
      try {
        const { getStorageProvider } = await import('@/lib/storage');
        const storage = getStorageProvider();
        const result = await storage.upload(heroBuffer, {
          workspaceId: styleguideMeta.workspaceId,
          fileName: `brandstyle-hero-${styleguideId}.png`,
          contentType: 'image/png',
          generateThumbnail: false,
        });
        heroScreenshotUrl = result.url;
        console.log(`[brandstyle-analysis] Hero screenshot persisted: ${heroScreenshotUrl}`);
      } catch (uploadErr) {
        console.warn(`[brandstyle-analysis] Hero-screenshot upload failed (non-critical): ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`);
      }
    }

    // Write visual language separately (Json field, not part of CombinedResult)
    // Fase C — heroPattern + Fase D — heroScreenshotUrl gepiggybackt zonder
    // schema-migratie. Renderer leest via styleguide.visualLanguage.*.
    if (visualLanguageResult || heroPattern || heroScreenshotUrl) {
      const visualLanguagePayload = {
        ...((visualLanguageResult as Record<string, unknown> | null) ?? {}),
        ...(heroPattern ? { heroPattern } : {}),
        ...(heroScreenshotUrl ? { heroScreenshotUrl } : {}),
      };
      await prisma.brandStyleguide.update({
        where: { id: styleguideId },
        data: {
          visualLanguage: JSON.parse(JSON.stringify(visualLanguagePayload)),
        },
      });
    }

    // Phase 5: Semantic Role Resolver — leidt DESIGN.md-compatible rollen
    // af uit bestaande analyzer-output (colors + components + typeScale +
    // cornerRadii + spacingScale + shadowSystem). Non-critical: als
    // resolver faalt gaat de analyse door zonder semanticTokens.
    let resolvedSemanticTokens: unknown = null;
    try {
      const { resolveSemanticTokens } = await import('./semantic-role-resolver');
      const tokens = await resolveSemanticTokens(styleguideId);
      resolvedSemanticTokens = tokens;
      await prisma.brandStyleguide.update({
        where: { id: styleguideId },
        data: { semanticTokens: JSON.parse(JSON.stringify(tokens)) },
      });
    } catch (err) {
      console.warn(
        `[brandstyle-analysis] Semantic role resolver failed (non-critical): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Phase 6: Snapshot — append-only history voor visuele evolutie
    // tracking. Hash-based dedupe voorkomt spurious entries bij no-op
    // re-scans. Non-critical: als snapshot faalt gaat de analyse door.
    try {
      const { createBrandstyleSnapshot } = await import('./snapshots/create-snapshot');
      const result = await createBrandstyleSnapshot({
        brandstyleId: styleguideId,
        workspaceId: styleguideMeta.workspaceId,
        triggerSource: 'analyze-url',
        // Best-effort: createdById is wie de styleguide oorspronkelijk
        // creëerde — niet noodzakelijkerwijs wie deze re-analyze
        // triggerde. Voor V1 voldoende; volgnam-tracking kan later via
        // request session.
        triggeredById: styleguideMeta.createdById ?? null,
        scrapedJson: {
          colors: processed.authoritativeColors,
          fonts: processed.fonts,
          fontSizes: processed.fontSizes,
          logoUrls: processed.logoUrls,
          frameworks: processed.frameworks,
        },
        semanticTokens: resolvedSemanticTokens,
      });
      console.log(
        `[brandstyle-analysis] Snapshot ${result.created ? 'created' : 'deduplicated'} (id=${result.snapshotId}, hash=${result.tokensHash.slice(0, 8)})`,
      );
    } catch (err) {
      console.warn(
        `[brandstyle-analysis] Snapshot write failed (non-critical): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Fase B verbeterplan — persist scraper-rendering-profiles (button,
    // typography per rol, spacing+elevation+radius, motion). Renderers
    // lezen deze velden voor brand-specifieke styling i.p.v. archetype-
    // defaults. Non-critical: bij persist-error fall back op archetype-
    // defaults via BrandTokens Tier-2 fallback chain.
    //
    // Verbeterplan #5 — per-veld override-respect: alleen overschrijven
    // wanneer *Override flag false is. User-set values (via toekomstige
    // brand-onboarding UI) blijven behouden bij re-scrape.
    try {
      const existing = await prisma.brandStyleguide.findUnique({
        where: { id: styleguideId },
        select: {
          buttonProfileOverride: true,
          spacingProfileOverride: true,
          elevationProfileOverride: true,
          radiusProfileOverride: true,
          motionProfileOverride: true,
          typographyProfileOverride: true,
        },
      });
      const overrides = existing ?? {
        buttonProfileOverride: false,
        spacingProfileOverride: false,
        elevationProfileOverride: false,
        radiusProfileOverride: false,
        motionProfileOverride: false,
        typographyProfileOverride: false,
      };
      const updateData: Prisma.BrandStyleguideUpdateInput = {};
      if (!overrides.buttonProfileOverride) {
        updateData.buttonProfile = scraped.buttonStyles
          ? (JSON.parse(JSON.stringify(scraped.buttonStyles)) as Prisma.InputJsonValue)
          : Prisma.JsonNull;
      }
      if (!overrides.typographyProfileOverride) {
        updateData.typographyProfile = scraped.typographyByRole
          ? (JSON.parse(JSON.stringify(scraped.typographyByRole)) as Prisma.InputJsonValue)
          : Prisma.JsonNull;
      }
      if (!overrides.spacingProfileOverride) {
        updateData.spacingProfile = scraped.spacingProfile
          ? (JSON.parse(JSON.stringify(scraped.spacingProfile)) as Prisma.InputJsonValue)
          : Prisma.JsonNull;
      }
      if (!overrides.elevationProfileOverride) {
        updateData.elevationProfile = scraped.elevationProfile
          ? (JSON.parse(JSON.stringify(scraped.elevationProfile)) as Prisma.InputJsonValue)
          : Prisma.JsonNull;
      }
      if (!overrides.radiusProfileOverride) {
        updateData.radiusProfile = scraped.radiusProfile
          ? (JSON.parse(JSON.stringify(scraped.radiusProfile)) as Prisma.InputJsonValue)
          : Prisma.JsonNull;
      }
      if (!overrides.motionProfileOverride) {
        updateData.motionProfile = scraped.motionProfile
          ? (JSON.parse(JSON.stringify(scraped.motionProfile)) as Prisma.InputJsonValue)
          : Prisma.JsonNull;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.brandStyleguide.update({
          where: { id: styleguideId },
          data: updateData,
        });
      }
    } catch (err) {
      console.warn(
        `[brandstyle-analysis] Rendering-profiles persist failed (non-critical): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Verbeterplan #4 — persist designPhilosophy wanneer AI Phase 3 die
    // heeft gegenereerd. Non-critical: bij missing designPhilosophy blijft
    // het veld null.
    if (designResult?.designPhilosophy) {
      try {
        await prisma.brandStyleguide.update({
          where: { id: styleguideId },
          data: { designPhilosophy: designResult.designPhilosophy.trim() },
        });
      } catch (err) {
        console.warn(
          `[brandstyle-analysis] designPhilosophy persist failed (non-critical): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // DTS-plan C7 — persist fixtureSamples wanneer Voice-prompt die opleverde
    if (voiceResult?.fixtureSamples) {
      try {
        const samples = voiceResult.fixtureSamples;
        const hasContent =
          (Array.isArray(samples.headlines) && samples.headlines.length > 0) ||
          (Array.isArray(samples.ctaLabels) && samples.ctaLabels.length > 0) ||
          (Array.isArray(samples.featureTitles) && samples.featureTitles.length > 0) ||
          (Array.isArray(samples.testimonialQuotes) && samples.testimonialQuotes.length > 0);
        if (hasContent) {
          await prisma.brandStyleguide.update({
            where: { id: styleguideId },
            data: { fixtureSamples: JSON.parse(JSON.stringify(samples)) as Prisma.InputJsonValue },
          });
        }
      } catch (err) {
        console.warn(
          `[brandstyle-analysis] fixtureSamples persist failed (non-critical): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // V2-2b — infereer layoutStyle uit site-DNA signals voor de styleguide
    // COMPLETE wordt gemarkeerd. Pure heuristic op photographyMood-keywords
    // + brand-color signals. Persist met layoutStyleInferred=true zodat
    // ensureLayoutStyle (V2-2) deze niet later overschrijft.
    try {
      const styleguideForInfer = await prisma.brandStyleguide.findUnique({
        where: { id: styleguideId },
        select: {
          photographyStyle: true,
          layoutStyleInferred: true,
          colors: {
            where: { category: 'PRIMARY' },
            orderBy: { sortOrder: 'asc' },
            select: { hex: true },
            take: 1,
          },
        },
      });
      if (styleguideForInfer && !styleguideForInfer.layoutStyleInferred) {
        const photographyMood =
          styleguideForInfer.photographyStyle &&
          typeof styleguideForInfer.photographyStyle === 'object' &&
          !Array.isArray(styleguideForInfer.photographyStyle) &&
          'mood' in styleguideForInfer.photographyStyle
            ? String((styleguideForInfer.photographyStyle as { mood?: unknown }).mood ?? '')
            : null;
        const brandHex = styleguideForInfer.colors[0]?.hex ?? null;
        const inferred = inferLayoutStyleFromSiteData({
          photographyMood,
          brandHex,
        });
        if (inferred && inferred.confidence !== 'low') {
          await prisma.brandStyleguide.update({
            where: { id: styleguideId },
            data: {
              layoutStyle: inferred.layoutStyle,
              layoutStyleInferred: true,
            },
          });
        }
      }
    } catch (inferErr) {
      // Niet-blocking — layoutStyle blijft op schema-default, lazy flow
      // pakt het later in landing-page generation.
      console.warn(
        `[analysis-engine] layoutStyle-inference failed (non-critical): ${inferErr instanceof Error ? inferErr.message : String(inferErr)}`,
      );
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
    // Look up workspaceId for learning-loop tracking
    const styleguideMeta = await prisma.brandStyleguide.findUnique({
      where: { id: styleguideId },
      select: { workspaceId: true },
    });
    if (!styleguideMeta) {
      console.error(`[brandstyle-analysis] Styleguide ${styleguideId} not found`);
      return;
    }

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
        {
          workspaceId: styleguideMeta.workspaceId,
          parentEntityType: 'BrandStyleguide',
          parentEntityId: styleguideId,
          sourceIdentifier: 'src/lib/brandstyle/analysis-engine.ts:analyzePdf',
        },
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
          // PDFs have no scraper provenance — treat AI extraction as medium confidence
          confidence: 'medium',
          detectorSource: 'pdf-extraction',
        };
      })
      .filter((c): c is ResolvedColor => c !== null);
    await writeResultToDb(styleguideId, result, pdfResolvedColors, [], []);

    // V2-2b — infereer layoutStyle uit site-DNA signals voor de styleguide
    // COMPLETE wordt gemarkeerd. Pure heuristic op photographyMood-keywords
    // + brand-color signals. Persist met layoutStyleInferred=true zodat
    // ensureLayoutStyle (V2-2) deze niet later overschrijft.
    try {
      const styleguideForInfer = await prisma.brandStyleguide.findUnique({
        where: { id: styleguideId },
        select: {
          photographyStyle: true,
          layoutStyleInferred: true,
          colors: {
            where: { category: 'PRIMARY' },
            orderBy: { sortOrder: 'asc' },
            select: { hex: true },
            take: 1,
          },
        },
      });
      if (styleguideForInfer && !styleguideForInfer.layoutStyleInferred) {
        const photographyMood =
          styleguideForInfer.photographyStyle &&
          typeof styleguideForInfer.photographyStyle === 'object' &&
          !Array.isArray(styleguideForInfer.photographyStyle) &&
          'mood' in styleguideForInfer.photographyStyle
            ? String((styleguideForInfer.photographyStyle as { mood?: unknown }).mood ?? '')
            : null;
        const brandHex = styleguideForInfer.colors[0]?.hex ?? null;
        const inferred = inferLayoutStyleFromSiteData({
          photographyMood,
          brandHex,
        });
        if (inferred && inferred.confidence !== 'low') {
          await prisma.brandStyleguide.update({
            where: { id: styleguideId },
            data: {
              layoutStyle: inferred.layoutStyle,
              layoutStyleInferred: true,
            },
          });
        }
      }
    } catch (inferErr) {
      // Niet-blocking — layoutStyle blijft op schema-default, lazy flow
      // pakt het later in landing-page generation.
      console.warn(
        `[analysis-engine] layoutStyle-inference failed (non-critical): ${inferErr instanceof Error ? inferErr.message : String(inferErr)}`,
      );
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

// ─── Preprocessing ────────────────────────────────────

/**
 * Preprocess scraped data for AI analysis.
 * - Deduplicates colors using perceptual distance (Delta E approximation)
 * - Groups colors by source: CSS variables > frequency > other
 * - Consolidates fonts
 */
export function preprocessScrapeData(scraped: ScrapedData): ProcessedData {
  // Run framework detectors FIRST — their output is the highest-confidence
  // signal we have for what counts as a real brand color on this site.
  const combinedCss = `${scraped.inlineCss ?? ''}\n${scraped.linkedCssContent ?? ''}`;
  const { frameworks, tokens: detectedTokens } = runFrameworkDetectors(combinedCss, '');

  // Logo colours: high-confidence FALLBACK signal. Only merged when the
  // framework pass didn't find a recognised `primary` token — otherwise a
  // site with an ACSS `--primary-hex` already has a canonical brand colour
  // and the logo extractor would just add noise (multiple "primary"s
  // confuse Claude's classifier). When promoted, the most dominant logo
  // colour becomes `primary` and the next one (if any) becomes `secondary`.
  const frameworkHasPrimary = detectedTokens.some((t) => t.role === 'primary');
  if (!frameworkHasPrimary && scraped.logoColors && scraped.logoColors.length > 0) {
    const knownHexes = new Set(detectedTokens.map((t) => t.hex));
    const roleOrder: Array<'primary' | 'secondary'> = ['primary', 'secondary'];
    const logoTokens = scraped.logoColors
      .filter((lc) => !knownHexes.has(lc.hex))
      .slice(0, roleOrder.length)
      .map((lc, i) => ({
        hex: lc.hex,
        role: roleOrder[i],
        source: `logo-extraction:${lc.source}`,
        confidence: 'high' as const,
      }));
    // Prepend so logo colours take priority in the palette pushlist.
    detectedTokens.unshift(...logoTokens);
    if (logoTokens.length > 0) frameworks.unshift('logo-extraction');
  }

  // Defensive defaults for scraper fields that might be empty
  const colorGroups = buildColorGroups(
    scraped.cssVariables ?? [],
    scraped.colorFrequency ?? [],
    scraped.cssColors ?? [],
  );

  // Build the authoritative palette — this is what we will write to the DB,
  // regardless of what the AI returns. AI is only allowed to annotate.
  const authoritativeColors = buildAuthoritativePalette(colorGroups, detectedTokens);

  // Deduplicate and sort fonts by likely importance
  const fonts = deduplicateFonts(scraped.cssFonts ?? []);

  return {
    url: scraped.url,
    title: scraped.title,
    description: scraped.description,
    bodyText: scraped.bodyText ?? '',
    colorGroups,
    authoritativeColors,
    frameworks,
    fonts,
    fontSizes: scraped.fontSizes ?? [],
    logoUrls: scraped.logoUrls ?? [],
    cssVariables: scraped.cssVariables ?? [],
    brandImages: scraped.brandImages ?? [],
    visualHeuristics: scraped.visualHeuristics,
  };
}

/**
 * Pick the authoritative brand palette from grouped scraper data + detector tokens.
 * Priority: framework detectors → CSS variables → frequency → other. Max 12.
 *
 * Confidence scoring:
 *   - detector  → 'high' (recognised by ACSS / Tailwind / shadcn / etc.)
 *   - css-var   → 'medium' (could be brand or framework default)
 *   - frequency → 'medium' if count ≥3 or used in ≥2 properties, else 'low'
 *   - other     → 'low'
 */
function buildAuthoritativePalette(
  groups: ProcessedColorGroup,
  detectedTokens: DetectedToken[],
): AuthoritativeColor[] {
  const MAX = 12;
  const out: AuthoritativeColor[] = [];
  const seen = new Set<string>();

  const push = (entry: AuthoritativeColor): void => {
    if (out.length >= MAX) return;
    const key = entry.hex.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...entry, hex: key });
  };

  // 1. Framework-detector tokens first — these are by-convention brand tokens.
  // Fase 2 (brand-fidelity): een ONGEWIJZIGDE framework-default PRIMARY
  // (Bootstrap `--bs-primary` #0D6EFD, WP-admin-blauw) is GÉÉN merk-kleur —
  // downgrade naar 'low' (→ AI classificeert als NEUTRAL) i.p.v. 'high', anders
  // wint Bootstrap-blauw de PRIMARY-slot van de echte merk-kleur.
  for (const token of detectedTokens) {
    const [detectorName] = token.source.split(':');
    const isDefaultPrimary = isFrameworkDefaultPrimary(token.hex);
    push({
      hex: token.hex,
      source: 'detector',
      confidence: isDefaultPrimary ? 'low' : 'high',
      detectorName,
      detectorRole: isDefaultPrimary ? undefined : token.role,
    });
  }

  // 2. CSS variables — medium confidence (could be brand or builder default)
  for (const v of groups.fromVariables) {
    push({
      hex: v.hex,
      source: 'css-variable',
      confidence: 'medium',
      variableName: v.name,
    });
  }

  // 3. Frequency-ranked — confidence depends on usage strength
  for (const f of groups.byFrequency) {
    const isStrong = f.count >= 3 || f.contexts.length >= 2;
    push({
      hex: f.hex,
      source: 'frequency',
      confidence: isStrong ? 'medium' : 'low',
      frequency: f.count,
      contexts: f.contexts,
    });
  }

  // 4. Fill remaining slots with other detected colors
  for (const hex of groups.other) {
    push({ hex, source: 'other', confidence: 'low' });
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
  // Priority order:
  //   a. ACSS canonical brand tokens (--primary-hex / --secondary-hex / --base-hex /
  //      --neutral-hex / --accent-hex) — explicit by-convention brand declarations
  //      that must outrank generic page-builder defaults like --bricks-color-primary.
  //   b. :root variables — typical brand token location
  //   c. Non-:root variables (.dark, [data-theme], compound selectors like
  //      `:root,.color-scheme--main{}` which our regex puts in 'usage' context).
  const isAcssToken = (name: string): boolean =>
    /^--(primary|secondary|base|neutral|accent)-hex$/i.test(name);
  const sortedVars = [...cssVariables].sort((a, b) => {
    const aAcss = isAcssToken(a.name);
    const bAcss = isAcssToken(b.name);
    if (aAcss !== bAcss) return aAcss ? -1 : 1;
    const aRoot = a.context === 'root';
    const bRoot = b.context === 'root';
    if (aRoot !== bRoot) return aRoot ? -1 : 1;
    return 0; // stable sort preserves original order
  });

  const fromVariables: Array<{ name: string; hex: string }> = [];
  for (const v of sortedVars) {
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
    const baseCategory = ai ? validateCategory(ai.category) : defaultCategory(entry, index);
    // Pastel-tint upgrade: wanneer hex een hoge-lichtheid + middelmatige-
    // saturation tint is (klassieke success/error/warning/info pastel),
    // upgrade NEUTRAL → SEMANTIC. Voorkomt dat soft pinks/blues/greens
    // in de "Neutral" bucket belanden terwijl ze duidelijk status-tints
    // zijn. PRIMARY/SECONDARY/ACCENT worden NIET aangeraakt — die zijn
    // expliciet brand-rollen.
    const category = upgradePastelToSemantic(baseCategory, hex);
    resolved.push({
      hex,
      name: ai?.name?.trim() || defaultColorName(entry, index),
      category,
      tags: ai?.tags ?? [],
      notes: ai?.notes?.trim() || defaultColorNotes(entry),
      confidence: entry.confidence,
      detectorSource: entry.detectorName ?? entry.source,
    });
  });

  return resolved;
}

/**
 * Detecteert pastel-tints die qua HSL-eigenschappen status-kleuren zijn
 * (soft error-pink, soft info-blue, soft success-green, soft warning-yellow)
 * en geforceerd in de NEUTRAL-bucket beland zijn door zwakke heuristieken.
 *
 * Heuristic:
 *   - L >= 85 (pastel-bereik, geen verzadigde brand-tint)
 *   - S >= 20 (echt getint, geen pure grijs)
 *   - Hue valt in één van de 4 semantic-buckets
 *
 * Brand-colors (PRIMARY/SECONDARY/ACCENT) worden NIET geüpgraded —
 * sommige merken hebben legitiem een pastel-secondary (denk: LINFI's
 * Soft Cream). Alleen wanneer iets als NEUTRAL geclaimd werd én de
 * pastel-test slaagt, classificeren we het als SEMANTIC.
 */
export function upgradePastelToSemantic(
  category: ResolvedColor['category'],
  hex: string,
): ResolvedColor['category'] {
  if (category !== 'NEUTRAL') return category;
  const hsl = hexToHsl(hex);
  if (!hsl) return category;
  if (hsl.l < 85) return category;
  if (hsl.s < 20) return category;
  // Hue moet in semantic-range zitten (red/pink, yellow/orange, green, blue/cyan)
  const h = hsl.h;
  const inSemanticRange =
    h <= 30 || h >= 330 ||       // red/pink → error
    (h >= 35 && h <= 65) ||       // yellow/orange → warning
    (h >= 80 && h <= 160) ||      // green → success
    (h >= 170 && h <= 260);       // blue/cyan → info
  return inSemanticRange ? 'SEMANTIC' : category;
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
  detectedFrameworks: string[] = [],
  visualHeuristics?: import('./visual-language.types').CssVisualHeuristics,
  detectedComponents?: import('./component-extractor').DetectedComponent[],
  /** Font used on body/html selector. Maps to UI role. */
  bodyFont?: string | null,
  /** Font used on h1-h3. Maps to DISPLAY role. */
  headingFont?: string | null,
  /** Vision-detected primary logo — takes priority over scraped URLs. */
  visionLogo?: {
    fileUrl: string;
    fileName: string;
    width: number;
    height: number;
    description: string;
  } | null,
  /** Adobe Fonts / Typekit detection: when `detected` is true, fonts not
   *  on Google Fonts are labelled ADOBE_FONTS instead of COMMERCIAL. The
   *  scraped kitId (if any) is stored on each new row so the UI can
   *  render a live preview using the publisher's Typekit kit. */
  adobeFonts?: { detected: boolean; kitId: string | null } | null,
  /** Combined CSS (inlineCss + linkedCssContent) — passed door zodat we
   *  computed-style font-role classification kunnen draaien (selector-
   *  context wins van naam-heuristic voor custom/codename fonts). */
  combinedCss?: string,
): Promise<void> {
  // Delete existing colors before creating new ones
  await prisma.styleguideColor.deleteMany({ where: { styleguideId } });

  // ── Typography: force the primary font to the first scraped font verbatim.
  // If the scraper did not find any fonts, fall back to the AI's suggestion.
  const [firstFont, ...restFonts] = detectedFonts;
  const primaryFontName = firstFont ?? result.primaryFontName ?? null;
  const additionalFonts = restFonts.slice(0, 5);

  // Replace all existing detected logos, then create new ones from scraped URLs.
  // User-uploaded logos are managed via dedicated upload endpoints (Fase 1).
  const sgForWorkspace = await prisma.brandStyleguide.findUnique({
    where: { id: styleguideId },
    select: { workspaceId: true },
  });
  const sgWorkspaceId = sgForWorkspace?.workspaceId;
  if (sgWorkspaceId) {
    await prisma.styleguideLogo.deleteMany({ where: { styleguideId } });

    // Vision-detected logo (Sprint 6A) — takes the PRIMARY slot because it
    // comes from Claude identifying the actual brand logo in the hero
    // screenshot, which is far more accurate than HTML `<img>` regex.
    const logoRows: Array<{
      fileUrl: string;
      fileName: string;
      fileType: string;
      variant: 'PRIMARY' | 'LOCKUP';
      description?: string | null;
      width?: number | null;
      height?: number | null;
      sortOrder: number;
      styleguideId: string;
      workspaceId: string;
    }> = [];
    if (visionLogo) {
      logoRows.push({
        fileUrl: visionLogo.fileUrl,
        fileName: visionLogo.fileName,
        fileType: 'png',
        variant: 'PRIMARY',
        description: visionLogo.description,
        width: visionLogo.width,
        height: visionLogo.height,
        sortOrder: 0,
        styleguideId,
        workspaceId: sgWorkspaceId,
      });
    }

    // Scraped HTML logo URLs — keep as additional LOCKUP variants. If the
    // vision detector didn't run / found nothing, the first scraped URL
    // gets promoted to PRIMARY so we still have a primary record.
    if (logoUrls && logoUrls.length > 0) {
      // Filter out obvious non-logo assets: favicons, apple-touch-icons,
      // and URLs with explicit tiny-size suffixes (e.g. `-16x16.png`,
      // `_32x32.jpg`). These are almost always tab icons that slipped
      // through the HTML regex and shouldn't be promoted to PRIMARY.
      const FAVICON_PATTERNS = /(favicon|apple-touch-icon|fav\.ico|mstile)/i;
      const SMALL_SIZE_SUFFIX = /[-_](\d+)x\1(?:@\dx)?\.(png|jpe?g|webp|svg|ico)(\?|$)/i;
      const isFaviconLike = (url: string): boolean => {
        if (FAVICON_PATTERNS.test(url)) return true;
        const sizeMatch = url.match(SMALL_SIZE_SUFFIX);
        if (sizeMatch && Number(sizeMatch[1]) <= 64) return true;
        return false;
      };
      const cleaned = logoUrls.filter(
        (u) => !u.startsWith('[') && !isFaviconLike(u),
      );
      cleaned.forEach((url, i) => {
        const ext = url.split('.').pop()?.toLowerCase() ?? 'png';
        const fileType = ext === 'svg' ? 'svg' : ext === 'png' ? 'png' : ext === 'jpg' || ext === 'jpeg' ? 'jpg' : 'png';
        const isPromotedPrimary = !visionLogo && i === 0;
        logoRows.push({
          fileUrl: url,
          fileName: `logo-${logoRows.length + 1}.${fileType}`,
          fileType,
          variant: isPromotedPrimary ? 'PRIMARY' : 'LOCKUP',
          sortOrder: logoRows.length,
          styleguideId,
          workspaceId: sgWorkspaceId,
        });
      });
    }

    if (logoRows.length > 0) {
      await prisma.styleguideLogo.createMany({ data: logoRows });
    }

    // Replace detected fonts (UPLOADED fonts are preserved). Upgrade a matching
    // UPLOADED font's "detected source" if present — otherwise create DETECTED rows.
    await prisma.styleguideFont.deleteMany({
      where: { styleguideId, source: 'DETECTED' },
    });
    const fontNames = [primaryFontName, ...additionalFonts].filter(
      (n): n is string => typeof n === 'string' && n.trim().length > 0,
    );
    if (fontNames.length > 0) {
      const existingUploaded = await prisma.styleguideFont.findMany({
        where: { styleguideId, source: 'UPLOADED' },
        select: { name: true },
      });
      const uploadedSet = new Set(existingUploaded.map((f) => f.name.toLowerCase()));
      // Role assignment based on scraped CSS selectors (when available):
      //   - headingFont (from h1-h3) → DISPLAY
      //   - bodyFont (from html/body) → UI
      //   - Anything else detected → UI (fallback)
      // When we have no semantic signal, fall back to the old heuristic
      // (first font DISPLAY, rest UI) so sites without clear selector-based
      // body/heading rules still get a reasonable split.
      const headingFontLower = headingFont?.toLowerCase() ?? null;
      const bodyFontLower = bodyFont?.toLowerCase() ?? null;
      const hasSemanticSignal = !!(headingFontLower || bodyFontLower);

      // Computed-style classifier — sterker signaal dan naam-heuristic.
      // Scant ALLE CSS-rules met font-family en aggregeert hits per font
      // op selector-context (heading vs body vs other). Werkt voor custom/
      // codename-fonts waar naam-keyword detection faalt.
      const { classifyFontsByCssContext } = await import('./font-role-classifier');
      const cssContextVerdicts = combinedCss
        ? classifyFontsByCssContext(combinedCss, fontNames)
        : new Map<string, 'DISPLAY' | 'UI' | 'UNKNOWN'>();

      // Tertiair signaal: naam-heuristic — alleen wanneer computed-style
      // UNKNOWN teruggeeft (geen CSS context-signaal voor deze font, typisch
      // bij @import-only Adobe Fonts waar de site geen direct h1{font-family}
      // rule plaatst maar via een class doet die we wel zien maar niet matchen).
      const SERIF_DISPLAY_NAME_HINT = /\bserif\b|mrs[- ]?eaves|playfair|oranienbaum|cormorant|garamond|sentinel|freight|tiempos|caslon|baskerville|bodoni|didot|minion|chronicle|recoleta|fraunces|abril|prata|crimson|merriweather|lora|dm[- ]?serif|libre[- ]?baskerville|noto[- ]?serif/i;

      const assignRole = (name: string, fallbackIndex: number): 'DISPLAY' | 'UI' => {
        const lower = name.toLowerCase();
        // 1. Direct semantic CSS-var / direct selector match uit scraper
        if (headingFontLower && lower === headingFontLower) return 'DISPLAY';
        if (bodyFontLower && lower === bodyFontLower) return 'UI';
        // 2. Computed-style aggregate verdict (sterker dan naam — werkt
        //    voor custom/codename fonts)
        const cssVerdict = cssContextVerdicts.get(lower);
        if (cssVerdict === 'DISPLAY' || cssVerdict === 'UI') return cssVerdict;
        // 3. Naam-keyword heuristic — laatste contextueel signaal
        if (SERIF_DISPLAY_NAME_HINT.test(name)) return 'DISPLAY';
        // 4. UI als er WEL semantic-signal was voor andere fonts (=
        //    deze font deed niet mee aan heading/body, dus is supplementaire UI)
        if (hasSemanticSignal) return 'UI';
        // 5. Bare fallback op detectievolgorde (eerste = display heuristic)
        return fallbackIndex === 0 ? 'DISPLAY' : 'UI';
      };
      const filteredNames = fontNames.filter((n) => !uploadedSet.has(n.toLowerCase()));
      // Classify each detected font against the public Google Fonts catalog
      // so the UI can distinguish "auto-loadable from CDN" (Inter, Poppins)
      // from "commercial — upload required" (Effra, Sohne, Circular).
      const { classifyFontsAgainstGoogleFonts } = await import('./google-fonts-catalog');
      let gfLookup: Map<string, boolean> = new Map();
      try {
        gfLookup = await classifyFontsAgainstGoogleFonts(filteredNames);
      } catch (err) {
        console.warn(
          `[brandstyle-analysis] Google Fonts classify failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const usesAdobeFonts = adobeFonts?.detected === true;
      const resolveAvailability = (
        name: string,
      ): 'GOOGLE_FONTS' | 'ADOBE_FONTS' | 'COMMERCIAL' | 'UNKNOWN' => {
        const lower = name.toLowerCase();
        if (gfLookup.get(lower)) return 'GOOGLE_FONTS';
        // If the site serves fonts via Typekit and the font is NOT on
        // Google Fonts, it's almost certainly the Adobe-hosted one.
        // Adobe-subscribing users can preview without uploading.
        if (usesAdobeFonts) return 'ADOBE_FONTS';
        if (!gfLookup.has(lower)) return 'UNKNOWN';
        return 'COMMERCIAL';
      };
      const newDetected = filteredNames.map((name, i) => ({
        styleguideId,
        workspaceId: sgWorkspaceId,
        name,
        role: assignRole(name, i),
        source: 'DETECTED' as const,
        availability: resolveAvailability(name),
        adobeFontsKitId: usesAdobeFonts ? adobeFonts?.kitId ?? null : null,
        sortOrder: i,
      }));
      if (newDetected.length > 0) {
        await prisma.styleguideFont.createMany({ data: newDetected });
      }
    }
  }

  // Persist detected components (Fase 5) — replace all existing records
  // belonging to this styleguide with the fresh scan results. Scope the
  // workspaceId via the styleguide's workspace association.
  const sgMeta = await prisma.brandStyleguide.findUnique({
    where: { id: styleguideId },
    select: { workspaceId: true },
  });
  if (sgMeta?.workspaceId) {
    await prisma.styleguideComponent.deleteMany({ where: { styleguideId } });
    if (detectedComponents && detectedComponents.length > 0) {
      const rows = detectedComponents.map((c, i) => ({
        styleguideId,
        workspaceId: sgMeta.workspaceId,
        type: c.type,
        label: c.label,
        sourceUrl: null,
        screenshotUrl: c.screenshotUrl ?? null,
        extractedStyles: c.extractedStyles as unknown as Prisma.InputJsonValue,
        previewHtml: c.previewHtml,
        confidence: c.confidence,
        sortOrder: i,
      }));
      await prisma.styleguideComponent.createMany({ data: rows });
    }
  }

  // Derive spacing tokens (Fase 4) from CSS heuristics.
  let spacingTokenFields: {
    spacingScale?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    cornerRadii?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    shadowSystem?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  } = {};
  if (visualHeuristics) {
    const { buildSpacingTokens } = await import('./css-visual-heuristics');
    const tokens = buildSpacingTokens(visualHeuristics);
    spacingTokenFields = {
      spacingScale: tokens.spacingScale.tokens.length > 0
        ? (tokens.spacingScale as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      cornerRadii: tokens.cornerRadii.tokens.length > 0
        ? (tokens.cornerRadii as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      shadowSystem: tokens.shadowSystem.tokens.length > 0
        ? (tokens.shadowSystem as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
  }

  // Update styleguide fields
  await prisma.brandStyleguide.update({
    where: { id: styleguideId },
    data: {
      // Logo
      logoGuidelines: result.logoGuidelines || [],
      logoDonts: result.logoDonts || [],

      // Provenance — which CSS frameworks the scraper recognised
      detectedFrameworks,

      // Typography — primaryFontName pinned to scraped value
      primaryFontName,
      primaryFontUrl: result.primaryFontUrl || null,
      additionalFonts,
      typeScale: result.typeScale || null,

      // Tone of Voice velden verhuisd naar BrandVoiceguide (ADR 2026-05-15) —
      // upsert hieronder na de styleguide update.

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

      // Spacing tokens (Fase 4) — derived from CSS heuristics
      ...(spacingTokenFields),
    },
  });

  // Tone of voice content schrijven naar BrandVoiceguide (verhuisd uit
  // BrandStyleguide, ADR 2026-05-15). Partial update: schrijft alleen velden
  // die de analyzer non-empty retourneert — bestaande user-edits in andere
  // velden blijven intact bij re-runs.
  if (sgMeta?.workspaceId) {
    const tovUpdate: {
      contentGuidelines?: string[];
      writingGuidelines?: string[];
      examplePhrases?: Prisma.InputJsonValue;
      vocabularyDo?: string[];
      vocabularyDont?: string[];
      voiceSample?: string;
    } = {};
    if (result.contentGuidelines && result.contentGuidelines.length > 0) {
      tovUpdate.contentGuidelines = result.contentGuidelines;
    }
    if (result.writingGuidelines && result.writingGuidelines.length > 0) {
      tovUpdate.writingGuidelines = result.writingGuidelines;
    }
    // Examples: alleen overschrijven bij non-empty array. Vermijdt wegspoelen
    // van bestaande user-curated examples wanneer analyzer leeg [] retourneert.
    if (Array.isArray(result.examplePhrases) && result.examplePhrases.length > 0) {
      tovUpdate.examplePhrases = result.examplePhrases as Prisma.InputJsonValue;
    }
    // DTS-plan C1+C2 — vocabulary + voice-sample
    if (Array.isArray(result.vocabularyDo) && result.vocabularyDo.length > 0) {
      tovUpdate.vocabularyDo = result.vocabularyDo;
    }
    if (Array.isArray(result.vocabularyDont) && result.vocabularyDont.length > 0) {
      tovUpdate.vocabularyDont = result.vocabularyDont;
    }
    if (typeof result.voiceSample === 'string' && result.voiceSample.trim().length > 0) {
      tovUpdate.voiceSample = result.voiceSample.trim();
    }

    if (Object.keys(tovUpdate).length > 0) {
      await prisma.brandVoiceguide.upsert({
        where: { workspaceId: sgMeta.workspaceId },
        create: {
          workspaceId: sgMeta.workspaceId,
          source: 'analyzer',
          ...tovUpdate,
        },
        update: tovUpdate,
      });
    }
  }

  // Fase A — Color usage capture: scan de bron-CSS en log per hex welke
  // contexten de site gebruikt (hero-bg / button-bg / heading-text / etc.).
  // Tags worden mee opgeslagen op StyleguideColor.tags zodat de LP-renderer
  // én UI ze later kunnen consumeren om brand-consistente keuzes te maken
  // (bv. hero-bg alleen kleuren die ook op de bron als hero-bg fungeren).
  let colorUsage: Map<string, Set<import('./color-usage-extractor').ColorUsageTag>> = new Map();
  if (combinedCss) {
    const { extractColorUsage } = await import('./color-usage-extractor');
    colorUsage = extractColorUsage(combinedCss);
  }

  // Create color records with computed values (RGB, HSL, CMYK, contrast)
  // Uses the RESOLVED palette — exact hexes from scraping with AI names merged in.
  for (let i = 0; i < resolvedColors.length; i++) {
    const color = resolvedColors[i];
    // Merge AI/heuristic-tags met scraped usage-tags. Usage-tags krijgen
    // 'usage:' prefix om collision met andere tag-conventies te vermijden
    // en zodat consumers ze gericht kunnen filteren.
    const hexKey = color.hex.replace(/^#/, '').toLowerCase();
    const usageTags = Array.from(colorUsage.get(hexKey) ?? []).map((t) => `usage:${t}`);
    const allTags = [...(color.tags ?? []), ...usageTags];

    await prisma.styleguideColor.create({
      data: {
        name: color.name,
        hex: color.hex,
        rgb: hexToRgbString(color.hex) || null,
        hsl: hexToHslString(color.hex) || null,
        cmyk: hexToCmykString(color.hex) || null,
        category: color.category,
        tags: allTags,
        notes: color.notes,
        contrastWhite: contrastWithWhite(color.hex),
        contrastBlack: contrastWithBlack(color.hex),
        confidence: color.confidence,
        detectorSource: color.detectorSource,
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
