import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Loads a draft Campaign and verifies both workspace and ownership.
 * Returns null + NextResponse on any failure, else the draft.
 */
async function loadDraftOrError(id: string): Promise<
  | { draft: { id: string; title: string; wizardState: unknown; wizardStep: number | null; wizardLastSavedAt: Date | null; wizardOwnerId: string | null; workspaceId: string; status: string; isArchived: boolean }; error: null }
  | { draft: null; error: NextResponse }
> {
  const session = await getServerSession();
  if (!session) {
    return { draft: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const userId = session.user.id;

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return { draft: null, error: NextResponse.json({ error: "No workspace found" }, { status: 403 }) };
  }

  const draft = await prisma.campaign.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      wizardState: true,
      wizardStep: true,
      wizardLastSavedAt: true,
      wizardOwnerId: true,
      workspaceId: true,
      status: true,
      isArchived: true,
    },
  });

  if (!draft) {
    return { draft: null, error: NextResponse.json({ error: "Draft not found" }, { status: 404 }) };
  }

  // All four conditions must hold: workspace match, ownership match, DRAFT status,
  // and not yet archived. Archived drafts must only be reachable via the archived
  // campaigns view — any access/mutation via these endpoints returns 404.
  if (
    draft.workspaceId !== workspaceId ||
    draft.wizardOwnerId !== userId ||
    draft.status !== "DRAFT" ||
    draft.isArchived
  ) {
    return { draft: null, error: NextResponse.json({ error: "Draft not found" }, { status: 404 }) };
  }

  return { draft, error: null };
}

// ---------------------------------------------------------------------------
// GET /api/campaigns/wizard/drafts/[id] — Load a draft's full state
// ---------------------------------------------------------------------------
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await loadDraftOrError(id);
    if (result.error) return result.error;

    const { draft } = result;
    return NextResponse.json({
      campaignId: draft.id,
      name: draft.title,
      wizardState: draft.wizardState,
      wizardStep: draft.wizardStep ?? 1,
      wizardLastSavedAt: draft.wizardLastSavedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[GET /api/campaigns/wizard/drafts/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/campaigns/wizard/drafts/[id] — Save draft state (auto-save)
// ---------------------------------------------------------------------------
const updateDraftSchema = z.object({
  name: z.string().optional(),
  wizardState: z.record(z.string(), z.unknown()).optional(),
  wizardStep: z.number().int().min(1).max(6).optional(),
  /**
   * Allow re-tagging the draft's type on save. Used to migrate legacy
   * content drafts that were incorrectly stored as STRATEGIC before the
   * wizardMode→type split was in place.
   */
  type: z.enum(["STRATEGIC", "CONTENT"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await loadDraftOrError(id);
    if (result.error) return result.error;

    const body = await request.json();
    const parsed = updateDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, wizardState, wizardStep, type } = parsed.data;

    const now = new Date();
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { title: name.trim() || "Untitled draft" }),
        ...(wizardState !== undefined && { wizardState: wizardState as object }),
        ...(wizardStep !== undefined && { wizardStep }),
        ...(type !== undefined && { type }),
        wizardLastSavedAt: now,
      },
      select: { workspaceId: true },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(updated.workspaceId));

    return NextResponse.json({
      ok: true,
      wizardLastSavedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/campaigns/wizard/drafts/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/campaigns/wizard/drafts/[id] — Soft delete (archive) a draft
// ---------------------------------------------------------------------------
// Hard delete is available via the existing DELETE /api/campaigns/[id] reachable
// from the Archived view (?isArchived=true).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await loadDraftOrError(id);
    if (result.error) return result.error;

    const now = new Date();
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        isArchived: true,
        updatedAt: now,
      },
      select: { workspaceId: true },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(updated.workspaceId));

    return NextResponse.json({ ok: true, archivedAt: now.toISOString() });
  } catch (error) {
    console.error("[DELETE /api/campaigns/wizard/drafts/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
