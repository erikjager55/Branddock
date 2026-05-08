import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { withAiRateLimit } from "@/lib/ai/middleware";
import { scrapeProductUrl } from "@/lib/products/url-scraper";
import { scrapeUrlViaGemini } from "@/lib/products/gemini-url-fallback";
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
import { computeDiff } from "@/lib/competitors/diff-engine";
import type {
  CanonicalExtracted,
  ManualEventContext,
} from "@/lib/competitors/types";
import type { Prisma } from "@prisma/client";

// POST /api/competitors/[id]/refresh — Re-scrape and re-analyze.
//
// Dual-write pattern (PR-3 van Competitive Intelligence Loop Fase 1):
//   1. Scrape + AI extraction → fresh CanonicalExtracted
//   2. computeContentHash op fresh state
//   3. Lees latest snapshot (door capturedAt DESC) en vergelijk hash
//   4a. hash-match → alleen lastScrapedAt updaten, return early
//       (geen nieuwe snapshot, geen activities, lichte refresh)
//   4b. hash-miss → transactie:
//       - schrijf nieuwe CompetitorSnapshot
//       - run diff-engine tegen vorige extractedJson
//       - createMany op CompetitorActivity
//       - update Competitor pointer-velden + snapshotCount + unack-count
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

    // 1. Scrape (direct fetch, fallback to Gemini if blocked)
    let scraped;
    try {
      scraped = await scrapeProductUrl(existing.websiteUrl);
    } catch {
      scraped = await scrapeUrlViaGemini(existing.websiteUrl);
    }
    if (!scraped.bodyText || scraped.bodyText.length < 50) {
      return NextResponse.json(
        { error: "Not enough content found on the website to analyze" },
        { status: 422 },
      );
    }

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

    // 4. Merge AI result with existing state — same fallback rules as the
    //    pre-PR-3 update(): if AI returns null/empty, keep existing value.
    //    This is the "fresh" extracted state that goes into the snapshot.
    const merged = {
      tagline: result.tagline ?? existing.tagline,
      valueProposition: result.valueProposition ?? existing.valueProposition,
      targetAudience: result.targetAudience ?? existing.targetAudience,
      differentiators: result.differentiators?.length ? result.differentiators : existing.differentiators,
      mainOfferings: result.mainOfferings?.length ? result.mainOfferings : existing.mainOfferings,
      pricingModel: result.pricingModel ?? existing.pricingModel,
      pricingDetails: result.pricingDetails ?? existing.pricingDetails,
      toneOfVoice: result.toneOfVoice ?? existing.toneOfVoice,
      messagingThemes: result.messagingThemes?.length ? result.messagingThemes : existing.messagingThemes,
      visualStyleNotes: result.visualStyleNotes ?? existing.visualStyleNotes,
      strengths: result.strengths?.length ? result.strengths : existing.strengths,
      weaknesses: result.weaknesses?.length ? result.weaknesses : existing.weaknesses,
      socialLinks: (result.socialLinks ?? existing.socialLinks ?? null) as Record<string, string> | null,
      hasBlog: result.hasBlog ?? existing.hasBlog,
      hasCareersPage: result.hasCareersPage ?? existing.hasCareersPage,
    };

    const nextCanonical: CanonicalExtracted = {
      tagline: merged.tagline,
      valueProposition: merged.valueProposition,
      targetAudience: merged.targetAudience,
      differentiators: merged.differentiators,
      mainOfferings: merged.mainOfferings,
      pricingModel: merged.pricingModel,
      pricingDetails: merged.pricingDetails,
      toneOfVoice: merged.toneOfVoice,
      messagingThemes: merged.messagingThemes,
      visualStyleNotes: merged.visualStyleNotes,
      strengths: merged.strengths,
      weaknesses: merged.weaknesses,
      socialLinks:
        merged.socialLinks &&
        typeof merged.socialLinks === 'object' &&
        !Array.isArray(merged.socialLinks)
          ? (merged.socialLinks as Record<string, string>)
          : null,
      hasBlog: merged.hasBlog,
      hasCareersPage: merged.hasCareersPage,
    };

    const newContentHash = computeContentHash(nextCanonical);
    const newScrapeHash = computeScrapeHash(scraped.bodyText);

    // 5. Read latest snapshot to compare hashes + supply prev for diff.
    const latestSnapshot = await prisma.competitorSnapshot.findFirst({
      where: { competitorId: id },
      orderBy: { capturedAt: 'desc' },
      select: { id: true, contentHash: true, extractedJson: true },
    });

    // 5a. Hash-match → no-op write path. Skip snapshot + activities,
    //     update only lastScrapedAt + status (in case it was DRAFT).
    //     Skip workflow events too — we already had a snapshot, so the
    //     workflow-pre-state is implicit; if the user actually just
    //     transitioned DRAFT→ANALYZED we'd have content changes anyway.
    if (latestSnapshot && latestSnapshot.contentHash === newContentHash) {
      const updated = await prisma.competitor.update({
        where: { id },
        data: {
          lastScrapedAt: new Date(),
          status: existing.status === 'DRAFT' ? 'ANALYZED' : existing.status,
        },
      });

      invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
      invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

      return NextResponse.json({
        ...updated,
        _refreshOutcome: 'no-op-hash-match',
        _activitiesCreated: 0,
      });
    }

    // 5b. Hash-miss → full dual-write path.
    const prevCanonical = latestSnapshot
      ? (latestSnapshot.extractedJson as unknown as CanonicalExtracted)
      : null;

    const workflowCtx: ManualEventContext = {
      workflowBefore: latestSnapshot
        ? { status: existing.status, tier: existing.tier }
        : null,
      workflowAfter: { status: 'ANALYZED', tier: existing.tier },
    };

    const detectedActivities = computeDiff(prevCanonical, nextCanonical, workflowCtx);

    const updated = await prisma.$transaction(async (tx) => {
      const snapshot = await tx.competitorSnapshot.create({
        data: {
          competitorId: id,
          workspaceId,
          contentHash: newContentHash,
          scrapeHash: newScrapeHash,
          extractedJson: nextCanonical as unknown as Prisma.InputJsonValue,
          scrapedJson: {
            title: scraped.title ?? null,
            description: scraped.description ?? null,
            bodyTextLength: scraped.bodyText.length,
          } as Prisma.InputJsonValue,
          triggerSource: 'MANUAL',
          signalSource: 'WEBSCRAPE',
          notes: null,
        },
        select: { id: true },
      });

      if (detectedActivities.length > 0) {
        await tx.competitorActivity.createMany({
          data: detectedActivities.map((a) => ({
            type: a.type,
            severity: a.severity,
            diffPayload: a.diffPayload as unknown as Prisma.InputJsonValue,
            summary: a.summary,
            detectionMethod: a.detectionMethod,
            confidence: a.confidence,
            snapshotId: snapshot.id,
            competitorId: id,
            workspaceId,
          })),
        });
      }

      const competitor = await tx.competitor.update({
        where: { id },
        data: {
          name: result.name || existing.name,
          tagline: result.tagline ?? existing.tagline,
          description: result.description || existing.description,
          foundingYear: result.foundingYear ?? existing.foundingYear,
          headquarters: result.headquarters ?? existing.headquarters,
          employeeRange: result.employeeRange ?? existing.employeeRange,
          valueProposition: nextCanonical.valueProposition,
          targetAudience: nextCanonical.targetAudience,
          differentiators: nextCanonical.differentiators,
          mainOfferings: nextCanonical.mainOfferings,
          pricingModel: nextCanonical.pricingModel,
          pricingDetails: nextCanonical.pricingDetails,
          toneOfVoice: nextCanonical.toneOfVoice,
          messagingThemes: nextCanonical.messagingThemes,
          visualStyleNotes: nextCanonical.visualStyleNotes,
          strengths: nextCanonical.strengths,
          weaknesses: nextCanonical.weaknesses,
          socialLinks: (nextCanonical.socialLinks ?? undefined) as Prisma.InputJsonValue | undefined,
          hasBlog: nextCanonical.hasBlog,
          hasCareersPage: nextCanonical.hasCareersPage,
          competitiveScore: result.competitiveScore ?? existing.competitiveScore,
          status: 'ANALYZED',
          lastScrapedAt: new Date(),
          analysisData: result as unknown as Prisma.InputJsonValue,
          snapshotCount: { increment: 1 },
          unacknowledgedActivityCount: detectedActivities.length > 0
            ? { increment: detectedActivities.length }
            : undefined,
        },
      });

      return competitor;
    });

    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      ...updated,
      _refreshOutcome: 'snapshot-written',
      _activitiesCreated: detectedActivities.length,
    });
  } catch (error) {
    console.error("[POST /api/competitors/:id/refresh]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
