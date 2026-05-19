import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { runScraperChain } from "@/lib/scraping/scraper-chain";
import { createStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import {
  getCompetitorAnalysisSystemPrompt,
  parseOutputLanguage,
  buildCompetitorUrlAnalysisPrompt,
  type CompetitorAnalysisResult,
} from "@/lib/ai/prompts/competitor-analysis";
import { resolveFeatureModel } from "@/lib/ai/feature-models.server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import {
  computeContentHash,
  computeScrapeHash,
} from "@/lib/competitors/snapshot-hash";
import {
  applyCompetitorRefreshDualWrite,
  safeSocialLinks,
} from "@/lib/competitors/refresh-write";
import { computeDiffWithClassifier } from "@/lib/competitors/diff-engine";
import { classifyPatternEvents } from "@/lib/competitors/ai-classifier";
import type { CanonicalExtracted, ClassifierFn } from "@/lib/competitors/types";
import type { Prisma } from "@prisma/client";

/**
 * Defensive shape check op een snapshot's extractedJson voordat we hem
 * als prev-canonical aan de diff-engine geven. Een rij geschreven onder
 * een andere shape (bijv. na een toekomstige schema-evolutie) zou anders
 * spurious diff-events of crashes veroorzaken. Bij twijfel: prev = null.
 */
function isCanonicalShape(value: unknown): value is CanonicalExtracted {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.differentiators) &&
    Array.isArray(obj.mainOfferings) &&
    Array.isArray(obj.messagingThemes) &&
    Array.isArray(obj.strengths) &&
    Array.isArray(obj.weaknesses)
  );
}

// POST /api/competitors/[id]/refresh — Re-scrape and re-analyze.
//
// Dual-write pattern (PR-3 van Competitive Intelligence Loop Fase 1):
//   1. Scrape + AI extraction → fresh CanonicalExtracted
//   2. computeContentHash op fresh state
//   3. Lees latest snapshot voor diff-baseline (orderBy capturedAt DESC,
//      id DESC voor tie-break op identieke timestamps)
//   4. Roep applyCompetitorRefreshDualWrite() helper aan binnen één
//      transactie. Helper handelt no-op vs snapshot-write af, P2002
//      race-protection, en alle counter/pointer updates.
//   5. invalidateCache (prefix `competitors:${workspaceId}` raakt
//      list, detail, activity, snapshots in één call)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { id } = await params;

    const existing = await prisma.competitor.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }
    if (existing.isLocked) {
      return NextResponse.json({ error: "Competitor is locked" }, { status: 423 });
    }
    if (!existing.websiteUrl) {
      return NextResponse.json({ error: "No website URL to refresh from" }, { status: 400 });
    }

    // 1. Scrape via 3-step fallback chain (current → Apify → Gemini).
    //    Zie `src/lib/scraping/scraper-chain.ts` voor volgorde-rationale.
    const { scraped, scraperUsed } = await runScraperChain(existing.websiteUrl);
    if (!scraped.bodyText || scraped.bodyText.length < 50) {
      return NextResponse.json(
        { error: "Not enough content found on the website to analyze" },
        { status: 422 },
      );
    }

    console.info(
      `[competitors/refresh] scrape OK via ${scraperUsed} for ${existing.websiteUrl} (${scraped.bodyText.length} chars)`,
    );

    // 2. Brand context (optional)
    let brandContextStr: string | undefined;
    try {
      const brandContext = await getBrandContext(workspaceId);
      const formatted = formatBrandContext(brandContext);
      if (formatted.length > 20) {
        brandContextStr = formatted;
      }
    } catch {
      // Optional — continue without
    }

    // 3. AI analysis
    const outputLanguage = parseOutputLanguage(request.headers.get("accept-language"));
    const systemPrompt = getCompetitorAnalysisSystemPrompt(outputLanguage);
    const userPrompt = buildCompetitorUrlAnalysisPrompt({
      url: existing.websiteUrl,
      title: scraped.title,
      description: scraped.description,
      bodyText: scraped.bodyText,
      brandContext: brandContextStr,
    });

    const resolved = await resolveFeatureModel(workspaceId, 'competitor-analysis');

    const result = await createStructuredCompletion<CompetitorAnalysisResult>(
      resolved.provider,
      resolved.model,
      systemPrompt,
      userPrompt,
      { temperature: 0.3 },
      {
        workspaceId,
        parentEntityType: 'Competitor',
        parentEntityId: id,
        sourceIdentifier: 'src/app/api/competitors/[id]/refresh/route.ts:POST',
      },
    );

    // 4. Build canonical state from merged AI-result + existing fallbacks.
    //    Same merge-rules as pre-PR-3: AI null/empty → keep existing.
    const nextCanonical: CanonicalExtracted = {
      tagline: result.tagline ?? existing.tagline,
      valueProposition: result.valueProposition ?? existing.valueProposition,
      targetAudience: result.targetAudience ?? existing.targetAudience,
      differentiators: result.differentiators?.length
        ? result.differentiators
        : existing.differentiators,
      mainOfferings: result.mainOfferings?.length
        ? result.mainOfferings
        : existing.mainOfferings,
      pricingModel: result.pricingModel ?? existing.pricingModel,
      pricingDetails: result.pricingDetails ?? existing.pricingDetails,
      toneOfVoice: result.toneOfVoice ?? existing.toneOfVoice,
      messagingThemes: result.messagingThemes?.length
        ? result.messagingThemes
        : existing.messagingThemes,
      visualStyleNotes: result.visualStyleNotes ?? existing.visualStyleNotes,
      strengths: result.strengths?.length ? result.strengths : existing.strengths,
      weaknesses: result.weaknesses?.length ? result.weaknesses : existing.weaknesses,
      socialLinks: safeSocialLinks(result.socialLinks ?? existing.socialLinks),
      hasBlog: result.hasBlog ?? existing.hasBlog,
      hasCareersPage: result.hasCareersPage ?? existing.hasCareersPage,
    };

    const newContentHash = computeContentHash(nextCanonical);
    const newScrapeHash = computeScrapeHash(scraped.bodyText);

    // 5. Read latest snapshot for diff baseline. Tie-break on id DESC
    //    handles identical capturedAt timestamps deterministically.
    //    Defensive shape-validation: historical snapshots from before
    //    a future schema-change might have a different shape; fall
    //    back to null prev (no content events) rather than crashing.
    const latestSnapshot = await prisma.competitorSnapshot.findFirst({
      where: { competitorId: id },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
      select: { extractedJson: true },
    });
    const prevCanonical = isCanonicalShape(latestSnapshot?.extractedJson)
      ? (latestSnapshot.extractedJson as unknown as CanonicalExtracted)
      : null;

    // 6. Metadata that is NOT part of the canonical hash but should
    //    refresh on every successful AI extraction (regardless of
    //    snapshot-write outcome) — name, description, founding-year,
    //    HQ, employee-range, competitive score, raw analysisData.
    const metadataUpdate: Prisma.CompetitorUpdateInput = {
      name: result.name || existing.name,
      description: result.description || existing.description,
      foundingYear: result.foundingYear ?? existing.foundingYear,
      headquarters: result.headquarters ?? existing.headquarters,
      employeeRange: result.employeeRange ?? existing.employeeRange,
      competitiveScore: result.competitiveScore ?? existing.competitiveScore,
      analysisData: result as unknown as Prisma.InputJsonValue,
    };

    // 7. Workflow transition: alleen DRAFT → ANALYZED triggeren een
    //    automatische status-promotie. ARCHIVED competitors blijven
    //    archived bij refresh (ze zouden anders silent un-archive'd worden).
    const nextStatus = existing.status === 'DRAFT' ? 'ANALYZED' : existing.status;

    // Single source-of-truth voor workflow-context — gebruikt door zowel de
    // pre-TX classifier-call (stap 8) als de dual-write (stap 9). Houden ze
    // identiek anders zou een mismatch silent missing STATUS_CHANGED /
    // TIER_CHANGED events produceren (caller-contract op precomputedDetected).
    const workflowBefore = { status: existing.status, tier: existing.tier };
    const workflowAfter = { status: nextStatus, tier: existing.tier };

    // 8. Compute events BUITEN de transactie — wrapper runt deterministische
    //    diff-rules + (opt-in) AI pattern-classifier. AI-call mag NOOIT
    //    binnen prisma.$transaction omdat een 1-2s netwerk-IO de TX-locks
    //    onnodig vasthoudt. Classifier-error is graceful: alleen
    //    deterministic events worden geretourneerd.
    const classifier: ClassifierFn = (prev, next) =>
      classifyPatternEvents(prev, next, { workspaceId, competitorId: id });
    const precomputedDetected = await computeDiffWithClassifier(
      prevCanonical,
      nextCanonical,
      { workflowBefore, workflowAfter },
      { classifier, competitorId: id },
    );

    // 9. Dual-write transaction — helper handles snapshot, activities,
    //    pointer update + collision-detection. Cast naar TransactionClient:
    //    extension `withTokenEncryption` produceert een DynamicClientExtension
    //    type-shape die structureel compatible is voor onze 3 modellen, maar
    //    nominaal niet matcht. Geïsoleerde cast op deze ene call-site.
    const writeResult = await prisma.$transaction((tx) =>
      applyCompetitorRefreshDualWrite(tx as unknown as Prisma.TransactionClient, {
        competitorId: id,
        workspaceId,
        workflowBefore,
        workflowAfter,
        prevCanonical,
        nextCanonical,
        newContentHash,
        newScrapeHash,
        metadataUpdate,
        triggerSource: 'MANUAL',
        signalSource: 'WEBSCRAPE',
        triggeredById: null,
        scrapedJsonInfo: {
          title: scraped.title ?? null,
          description: scraped.description ?? null,
          bodyTextLength: scraped.bodyText.length,
        },
        precomputedDetected,
      }),
    );

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      ...writeResult.competitor,
      _refreshOutcome: writeResult.outcome,
      _activitiesCreated: writeResult.activitiesCreated,
    });
  } catch (error) {
    console.error("[POST /api/competitors/:id/refresh]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
