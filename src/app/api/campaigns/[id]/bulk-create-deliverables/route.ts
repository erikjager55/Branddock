import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireUnlocked } from '@/lib/lock-guard';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/bulk-create-deliverables
// Sprint B · Step 2 — creates N NOT_STARTED deliverables in one call, optionally
// inheriting settings from a source deliverable. The follow-up `/bulk-generate`
// SSE call consumes the returned IDs to kick off parallel content generation.
//
// Design notes:
//  - When `sourceDeliverableId` is provided and matches `contentType`, we copy
//    mediumConfig / contentTypeInputs / brief / phase from the source and
//    stamp `settings.inheritedFrom` so the Canvas banner shows provenance and
//    the auto-inherit (Sprint A · Step 1) code path skips (marker present).
//  - When the source differs in contentType, we only carry the brief + persona
//    hints across — mediumConfig is platform-specific and wouldn't apply.
//  - `briefGuidance` appends to `brief.objective` with a separator, so the
//    user's extra direction surfaces in every generated variant.
// ---------------------------------------------------------------------------

const MAX_QUANTITY = 10;

const bodySchema = z.object({
  contentType: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  sourceDeliverableId: z.string().optional(),
  briefGuidance: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { id: campaignId } = await params;

    const lockResponse = await requireUnlocked('campaign', campaignId);
    if (lockResponse) return lockResponse;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { contentType, quantity, sourceDeliverableId, briefGuidance } = parsed.data;

    // Optional source — must belong to the same campaign
    const source = sourceDeliverableId
      ? await prisma.deliverable.findFirst({
          where: { id: sourceDeliverableId, campaignId },
        })
      : null;
    if (sourceDeliverableId && !source) {
      return NextResponse.json({ error: 'Source deliverable not found' }, { status: 404 });
    }

    // Build the settings blob once — every new deliverable gets the same
    // snapshot so the batch behaves as a cohesive group.
    const sourceSettings = (source?.settings as Record<string, unknown> | null) ?? {};
    const sourceBrief = (sourceSettings.brief as Record<string, unknown> | undefined) ?? {};
    const contentTypesMatch = source && source.contentType === contentType;

    // Objective merges: [source.objective] + separator + [user guidance].
    // Either part may be missing — we pick whichever is non-empty.
    const existingObjective = typeof sourceBrief.objective === 'string' ? sourceBrief.objective.trim() : '';
    const guidance = briefGuidance?.trim() ?? '';
    const mergedObjective = [existingObjective, guidance].filter(Boolean).join('\n\n');

    const baseSettings: Record<string, unknown> = {};

    if (source) {
      // Brief + persona + phase always copy (they're platform-agnostic).
      baseSettings.brief = {
        ...sourceBrief,
        ...(mergedObjective ? { objective: mergedObjective } : {}),
      };
      if (sourceSettings.phase) baseSettings.phase = sourceSettings.phase;
      if (sourceSettings.channel) baseSettings.channel = sourceSettings.channel;
      if (sourceSettings.targetPersonas) baseSettings.targetPersonas = sourceSettings.targetPersonas;
      if (sourceSettings.productionPriority) baseSettings.productionPriority = sourceSettings.productionPriority;

      // Medium config only carries across when the contentType matches —
      // otherwise the config is for a different platform and wouldn't apply.
      if (contentTypesMatch) {
        if (sourceSettings.mediumConfig) baseSettings.mediumConfig = sourceSettings.mediumConfig;
        if (sourceSettings.contentTypeInputs) baseSettings.contentTypeInputs = sourceSettings.contentTypeInputs;
      }

      baseSettings.inheritedFrom = {
        id: source.id,
        title: source.title,
        appliedAt: new Date().toISOString(),
        source: 'bulk-generate',
      };
    } else if (guidance) {
      // No source — still surface the user's guidance as a starting objective.
      baseSettings.brief = { objective: guidance };
    }

    // Default title matches "Repeat last" — a clean content-type label that
    // the user can inline-rename from the library card.
    const deliverableTitle = contentType;

    const created = await prisma.$transaction(async (tx) => {
      const records = [];
      for (let i = 0; i < quantity; i++) {
        const record = await tx.deliverable.create({
          data: {
            title: deliverableTitle,
            contentType,
            campaignId,
            status: 'NOT_STARTED',
            progress: 0,
            approvalStatus: 'DRAFT',
            journeyPhase: source?.journeyPhase ?? null,
            weekInCampaign: source?.weekInCampaign ?? null,
            settings: Object.keys(baseSettings).length > 0
              ? (baseSettings as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
          select: { id: true, title: true, contentType: true },
        });
        records.push(record);
      }
      return records;
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(
      { deliverables: created, count: created.length },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/campaigns/:id/bulk-create-deliverables]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
