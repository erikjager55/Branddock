import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// Content type → category mapping
const TYPE_CATEGORY_MAP: Record<string, string> = {
  "Blog Post": "Written",
  Article: "Written",
  Whitepaper: "Written",
  "Case Study": "Written",
  "LinkedIn Post": "Social Media",
  "Twitter Thread": "Social Media",
  "Instagram Post": "Social Media",
  "Facebook Post": "Social Media",
  Infographic: "Visual Assets",
  Banner: "Visual Assets",
  Presentation: "Visual Assets",
  "Brand Guidelines": "Visual Assets",
  Newsletter: "Email",
  "Welcome Email": "Email",
  "Promotional Email": "Email",
  "Drip Campaign": "Email",
};

function getTypeCategory(contentType: string): string {
  return TYPE_CATEGORY_MAP[contentType] ?? "Written";
}

function computeWordCount(text: string | null): number | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/** Parse a comma-separated query param → trimmed non-empty string array */
function csv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Derive the traffic-light bucket used by both server filter and UI.
 *  Matches user mental model of progress rather than DB status enum alone:
 *    - GREEN  : approved or published
 *    - RED    : genuinely untouched — no content, not scheduled, status
 *               NOT_STARTED
 *    - AMBER  : anything else — content exists, item is scheduled, or
 *               status advanced to IN_PROGRESS / COMPLETED
 *  Overdue is a label modifier (see deriveTrafficLight) and never changes
 *  the bucket. */
function deriveReadiness(
  isPublishReady: boolean,
  status: string | null,
  hasContent: boolean,
  isScheduled: boolean,
  isPublished: boolean,
): "red" | "amber" | "green" {
  if (isPublishReady || isPublished) return "green";
  const hasAnyProgress =
    hasContent ||
    isScheduled ||
    status === "IN_PROGRESS" ||
    status === "COMPLETED";
  if (!hasAnyProgress) return "red";
  return "amber";
}

/** Classify readiness hints into filter tokens. */
function hintTokens(hint: string | null): string[] {
  if (!hint) return [];
  const tokens: string[] = [];
  const lower = hint.toLowerCase();
  if (lower.includes("no content")) tokens.push("no-content");
  if (lower.includes("not reviewed")) tokens.push("not-reviewed");
  if (lower.includes("pipeline incomplete")) tokens.push("pipeline-incomplete");
  return tokens;
}

// GET /api/content-library
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const campaignType = searchParams.get("campaignType");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") ?? "-updatedAt";
    const favorites = searchParams.get("favorites") === "true";
    const search = searchParams.get("search");

    // Advanced (multi-value) filters — comma-separated lists
    const typesList = csv(searchParams.get("types"));
    const campaignsList = csv(searchParams.get("campaigns"));
    const campaignTypesList = csv(searchParams.get("campaignTypes"));
    const phasesList = csv(searchParams.get("phases"));
    const readinessList = csv(searchParams.get("readiness"));
    const readinessHintsList = csv(searchParams.get("readinessHints"));
    const scheduledFrom = searchParams.get("scheduledFrom");
    const scheduledTo = searchParams.get("scheduledTo");
    const qualityMinRaw = searchParams.get("qualityMin");
    const qualityMin = qualityMinRaw != null ? Number(qualityMinRaw) : null;

    // Build deliverable where clause
    const campaignWhere: Record<string, unknown> = {
      workspaceId,
      isArchived: false,
    };
    const deliverableWhere: Record<string, unknown> = {
      campaign: campaignWhere,
    };

    // Content type — single or multi
    if (typesList.length > 0) {
      deliverableWhere.contentType = { in: typesList };
    } else if (type) {
      deliverableWhere.contentType = type;
    }

    if (status) {
      deliverableWhere.status = status;
    }
    if (favorites) {
      deliverableWhere.isFavorite = true;
    }
    if (search) {
      deliverableWhere.title = { contains: search, mode: "insensitive" };
    }

    // Campaign filters
    if (campaignsList.length > 0) {
      campaignWhere.id = { in: campaignsList };
    }
    if (campaignTypesList.length > 0) {
      campaignWhere.type = { in: campaignTypesList };
    } else if (campaignType) {
      campaignWhere.type = campaignType;
    }

    // Journey phase filter — read from Deliverable.journeyPhase or settings.phase
    if (phasesList.length > 0) {
      deliverableWhere.OR = [
        { journeyPhase: { in: phasesList } },
        // JSON-path fallback: settings.phase (Postgres JSONB)
        ...phasesList.map((p) => ({
          settings: { path: ["phase"], equals: p },
        })),
      ];
    }

    // Scheduled date range filter
    if (scheduledFrom || scheduledTo) {
      const gte = scheduledFrom ? new Date(scheduledFrom) : undefined;
      const lte = scheduledTo ? new Date(`${scheduledTo}T23:59:59`) : undefined;
      deliverableWhere.scheduledPublishDate = {
        ...(gte ? { gte } : {}),
        ...(lte ? { lte } : {}),
      };
    }

    // Quality minimum
    if (qualityMin != null && !isNaN(qualityMin)) {
      deliverableWhere.qualityScore = { gte: qualityMin };
    }

    // Sort mapping — supports leading "-" for descending
    const sortKey = sort.startsWith("-") ? sort.slice(1) : sort;
    const sortDir: "asc" | "desc" = sort.startsWith("-") ? "desc" : "asc";
    const sortFieldMap: Record<string, string> = {
      updatedAt: "updatedAt",
      createdAt: "createdAt",
      title: "title",
      qualityScore: "qualityScore",
      scheduledPublishDate: "scheduledPublishDate",
      contentType: "contentType",
    };
    // Nested sort (Prisma relation) — campaignName sorts on campaign.title
    const orderBy: Record<string, unknown> =
      sortKey === "campaignName"
        ? { campaign: { title: sortDir } }
        : { [sortFieldMap[sortKey] ?? "updatedAt"]: sortDir };

    const deliverables = await prisma.deliverable.findMany({
      where: deliverableWhere,
      orderBy,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    const rawItems = deliverables.map((d) => {
      // Determine publish readiness
      const hasContent =
        d.generatedText != null ||
        (Array.isArray(d.generatedImageUrls) && d.generatedImageUrls.length > 0) ||
        d.generatedVideoUrl != null;
      const isApproved =
        d.approvalStatus === "APPROVED" || d.approvalStatus === "PUBLISHED";
      const isScheduled = d.scheduledPublishDate != null;
      const isPipelineComplete = d.pipelineStatus === "COMPLETE";
      // Publish-ready = user-approved (Mark as Ready) OR already published.
      // Scheduling alone is NOT readiness — a user can drag an unfinished
      // item onto the calendar to pick a date, but the content is still
      // work in progress. Status pill should only turn green once approved.
      const isPublishReady = isApproved;

      // Build a human-readable hint about what's missing
      const hints: string[] = [];
      if (!hasContent) hints.push("No content generated");
      if (!isPipelineComplete && hasContent) hints.push("Pipeline incomplete");
      if (!isApproved) hints.push(d.approvalStatus === "DRAFT" ? "Not reviewed" : `Status: ${d.approvalStatus ?? "DRAFT"}`);
      const readinessHint = hints.length > 0 ? hints.join(" · ") : null;

      return {
        id: d.id,
        title: d.title,
        type: d.contentType,
        typeCategory: getTypeCategory(d.contentType),
        status: d.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
        qualityScore: d.qualityScore,
        campaignId: d.campaign.id,
        campaignName: d.campaign.title,
        campaignType: d.campaign.type as "STRATEGIC" | "QUICK",
        isFavorite: d.isFavorite,
        wordCount: computeWordCount(d.generatedText),
        updatedAt: d.updatedAt.toISOString(),
        // Calendar view date fields
        scheduledPublishDate: d.scheduledPublishDate?.toISOString() ?? null,
        suggestedPublishDate: d.suggestedPublishDate?.toISOString() ?? null,
        publishedAt: d.publishedAt?.toISOString() ?? null,
        // Publish readiness
        isPublishReady,
        hasContent,
        readinessHint,
        // Extra bookkeeping used only for post-filtering; stripped below
        _isScheduled: isScheduled,
        _isPublished: d.approvalStatus === "PUBLISHED",
        phase: d.journeyPhase
          ?? (typeof d.settings === "object" && d.settings !== null && !Array.isArray(d.settings)
            ? (d.settings as Record<string, unknown>).phase as string | undefined
            : undefined)
          ?? null,
      };
    });

    // Post-filter on derived readiness + hints (DB doesn't store these directly)
    const filteredItems = rawItems.filter((it) => {
      if (readinessList.length > 0) {
        const bucket = deriveReadiness(
          it.isPublishReady,
          it.status,
          it.hasContent,
          (it as { _isScheduled: boolean })._isScheduled,
          (it as { _isPublished: boolean })._isPublished,
        );
        if (!readinessList.includes(bucket)) return false;
      }
      if (readinessHintsList.length > 0) {
        const tokens = hintTokens(it.readinessHint);
        const matches = readinessHintsList.some((req) => tokens.includes(req));
        if (!matches) return false;
      }
      return true;
    });

    // Strip internal bookkeeping fields before returning
    const items = filteredItems.map((it) => {
      const { _isScheduled: _s, _isPublished: _p, ...rest } = it as typeof it & {
        _isScheduled: boolean;
        _isPublished: boolean;
      };
      void _s;
      void _p;
      return rest;
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[GET /api/content-library]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
