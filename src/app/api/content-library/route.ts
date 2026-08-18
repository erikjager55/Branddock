import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import {
  deriveReadinessBucket,
  readinessHintTokens,
  resolveLibraryContentSignal,
} from "@/lib/content/library-readiness";
import { TEXT_COMPONENT_WHERE } from "@/lib/content/resolve-deliverable-content";

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

/** Parse a comma-separated query param → trimmed non-empty string array */
function csv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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
        // Existentie-probe voor keten A, bewust GEEN `generatedContent`: die
        // body maal elke component maal elke deliverable is precies de payload
        // die een bibliotheek-lijst niet mag ophalen. `take: 1` volstaat —
        // `resolveDeliverableContentSignal` heeft alleen de telling nodig.
        // image/video dragen hun PROMPT in `generatedContent`, geen tekst.
        components: {
          where: TEXT_COMPONENT_WHERE,
          select: { id: true },
          take: 1,
        },
      },
    });

    const rawItems = deliverables.map((d) => {
      // Alle drie de content-ketens via één deur (tasks/content-chain-accessor.md
      // #2). Voorheen keek deze regel alleen naar `generatedText` — dood veld voor
      // de 11 keten-B-types — waardoor een volle, gepubliceerde pillar-page rood
      // met "No content generated" in de bibliotheek stond.
      const signal = resolveLibraryContentSignal(d, d.components.length);
      // SCHEDULED + PUBLISHED both count as approved — the user has signed
      // off either way. APPROVED-without-publish-intent is the "Ready" state
      // (Mark as Ready button); SCHEDULED has a future publish date queued.
      const isApproved =
        d.approvalStatus === "APPROVED" ||
        d.approvalStatus === "SCHEDULED" ||
        d.approvalStatus === "PUBLISHED";
      const isScheduledStatus = d.approvalStatus === "SCHEDULED";
      const isScheduled = d.scheduledPublishDate != null || isScheduledStatus;
      const isPipelineComplete = d.pipelineStatus === "COMPLETE";
      // Publish-ready = approved / scheduled / published. Scheduling alone
      // (date set on a draft via calendar drag) is NOT readiness — only when
      // the user actually flipped the status to APPROVED+ does the pill go
      // green. The status check above covers both cases.
      const isPublishReady = isApproved;

      // Build a human-readable hint about what's missing
      const hints: string[] = [];
      if (signal.contentHint) hints.push(signal.contentHint);
      if (!isPipelineComplete && signal.hasContent) hints.push("Pipeline incomplete");
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
        // Alleen wanneer de telling gratis is (keten B/C); voor de componentketen
        // `null`, zoals voorheen — de bodies daarvoor ophalen kost de hele lijst.
        wordCount: signal.wordCount,
        updatedAt: d.updatedAt.toISOString(),
        // Calendar view date fields
        scheduledPublishDate: d.scheduledPublishDate?.toISOString() ?? null,
        suggestedPublishDate: d.suggestedPublishDate?.toISOString() ?? null,
        publishedAt: d.publishedAt?.toISOString() ?? null,
        // Publish readiness
        isPublishReady,
        hasContent: signal.hasContent,
        /** `awaiting-choice` = gegenereerd, nog geen variant gekozen. Voortgang
         *  voor het stoplicht, maar géén publiceerbare payload. */
        contentState: signal.contentState,
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
        const bucket = deriveReadinessBucket({
          isPublishReady: it.isPublishReady,
          status: it.status,
          hasContent: it.hasContent,
          isAwaitingChoice: it.contentState === "awaiting-choice",
          isScheduled: (it as { _isScheduled: boolean })._isScheduled,
          isPublished: (it as { _isPublished: boolean })._isPublished,
        });
        if (!readinessList.includes(bucket)) return false;
      }
      if (readinessHintsList.length > 0) {
        const tokens = readinessHintTokens(it.readinessHint);
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
