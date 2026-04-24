import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { z } from "zod";

// ---------------------------------------------------------------------------
// PATCH /api/campaigns/[id]/deliverables/[did] — Update deliverable
// ---------------------------------------------------------------------------
const patchDeliverableSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  assignedTo: z.string().nullable().optional(),
  contentTypeInputs: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])).optional(),
  /** ISO datetime to schedule a publish; null clears the scheduled date */
  scheduledPublishDate: z.string().datetime().nullable().optional(),
  /** Journey phase name (matches blueprint phase names). Used by Timeline
   *  drag-drop to move a deliverable between phase swimlanes. */
  journeyPhase: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, did } = await params;

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify deliverable belongs to campaign
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: did, campaignId: id },
    });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchDeliverableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, status, progress, assignedTo, contentTypeInputs, scheduledPublishDate, journeyPhase } = parsed.data;

    // Merge contentTypeInputs + phase into existing settings Json field.
    // settings.phase is the canonical JSON-side source used by the content
    // library API; Deliverable.journeyPhase is the column-side source.
    // Writing both keeps them in sync so readers never see divergent values.
    let settingsUpdate: Record<string, unknown> | undefined;
    const currentSettings = (deliverable.settings as Record<string, unknown>) ?? {};
    if (contentTypeInputs !== undefined || journeyPhase !== undefined) {
      settingsUpdate = { ...currentSettings };
      if (contentTypeInputs !== undefined) {
        settingsUpdate.contentTypeInputs = contentTypeInputs;
      }
      if (journeyPhase !== undefined) {
        if (journeyPhase === null) {
          delete settingsUpdate.phase;
        } else {
          settingsUpdate.phase = journeyPhase;
        }
      }
    }

    const updated = await prisma.deliverable.update({
      where: { id: did },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(journeyPhase !== undefined && { journeyPhase }),
        ...(settingsUpdate !== undefined && { settings: settingsUpdate as Prisma.InputJsonValue }),
        ...(scheduledPublishDate !== undefined && {
          scheduledPublishDate: scheduledPublishDate ? new Date(scheduledPublishDate) : null,
        }),
      },
    });

    // Invalidate caches affected by this change (campaign list/detail + dashboard)
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      contentType: updated.contentType,
      status: updated.status,
      progress: updated.progress,
      qualityScore: updated.qualityScore,
      assignedTo: updated.assignedTo,
      isFavorite: updated.isFavorite,
      scheduledPublishDate: updated.scheduledPublishDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/campaigns/:id/deliverables/:did]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/campaigns/[id]/deliverables/[did] — Remove deliverable
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id, did } = await params;

    // Verify campaign belongs to workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify deliverable belongs to campaign
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: did, campaignId: id },
    });
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    await prisma.deliverable.delete({ where: { id: did } });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/campaigns/:id/deliverables/:did]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
