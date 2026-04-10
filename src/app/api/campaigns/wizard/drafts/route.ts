import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { z } from "zod";

const MAX_DRAFTS_PER_USER = 5;

// ---------------------------------------------------------------------------
// POST /api/campaigns/wizard/drafts — Create a new draft campaign
// ---------------------------------------------------------------------------
const createDraftSchema = z.object({
  name: z.string().optional(),
  wizardState: z.record(z.string(), z.unknown()),
  wizardStep: z.number().int().min(1).max(6).optional(),
  /**
   * STRATEGIC = full campaign wizard. CONTENT = single-content wizard.
   * Determines which overview page displays the draft (Campaigns vs Content
   * Library). Defaults to STRATEGIC for backwards compatibility.
   */
  type: z.enum(["STRATEGIC", "CONTENT"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Enforce max drafts per user per workspace (excludes archived drafts)
    const currentCount = await prisma.campaign.count({
      where: {
        workspaceId,
        status: "DRAFT",
        wizardOwnerId: userId,
        isArchived: false,
      },
    });

    if (currentCount >= MAX_DRAFTS_PER_USER) {
      return NextResponse.json(
        {
          error: "DRAFT_LIMIT_REACHED",
          message: `Max ${MAX_DRAFTS_PER_USER} drafts per user. Archive or launch one before creating a new draft.`,
          limit: MAX_DRAFTS_PER_USER,
          current: currentCount,
        },
        { status: 409 },
      );
    }

    const { name, wizardState, wizardStep, type } = parsed.data;

    // Collision-free slug (regenerated on promotion to ACTIVE in wizard/launch)
    const slug = `draft-${randomUUID().slice(0, 8)}-${Date.now()}`;

    const draft = await prisma.campaign.create({
      data: {
        title: name?.trim() || "Untitled draft",
        slug,
        type: type ?? "STRATEGIC",
        status: "DRAFT",
        workspaceId,
        createdBy: userId,
        wizardOwnerId: userId,
        wizardState: wizardState as object,
        wizardStep: wizardStep ?? 1,
        wizardLastSavedAt: new Date(),
      },
      select: { id: true },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    return NextResponse.json(
      {
        campaignId: draft.id,
        limit: MAX_DRAFTS_PER_USER,
        current: currentCount + 1,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/campaigns/wizard/drafts]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/campaigns/wizard/drafts — List drafts for current user in workspace
//
// Optional `?type=STRATEGIC|CONTENT` query param filters to just one kind.
// Without the param, all drafts are returned. Callers (Campaigns page, Content
// Library) pass the param so only their own drafts show up.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const typeParam = request.nextUrl.searchParams.get("type");
    const typeFilter =
      typeParam === "CONTENT" || typeParam === "STRATEGIC" ? typeParam : undefined;

    const drafts = await prisma.campaign.findMany({
      where: {
        workspaceId,
        status: "DRAFT",
        wizardOwnerId: userId,
        isArchived: false,
        ...(typeFilter && { type: typeFilter }),
      },
      orderBy: { wizardLastSavedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        wizardStep: true,
        wizardLastSavedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      drafts: drafts.map((d) => ({
        id: d.id,
        name: d.title,
        type: d.type,
        wizardStep: d.wizardStep ?? 1,
        wizardLastSavedAt: d.wizardLastSavedAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
      limit: MAX_DRAFTS_PER_USER,
      current: drafts.length,
    });
  } catch (error) {
    console.error("[GET /api/campaigns/wizard/drafts]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
