import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

// Twee paden: (1) klassiek targetPlatform + targetFormat strings,
// (2) targetContentTypeId via DELIVERABLE_TYPES registry (iteration-nudge
// flow uit canvas-orchestrator, content-test improvement #7).
const deriveSchema = z
  .object({
    targetContentTypeId: z.string().min(1).max(100).optional(),
    targetPlatform: z.string().min(1).max(100).optional(),
    targetFormat: z.string().min(1).max(100).optional(),
    title: z.string().min(1).max(200).optional(),
  })
  .refine(
    (data) => data.targetContentTypeId || (data.targetPlatform && data.targetFormat),
    {
      message: 'Either targetContentTypeId OR both targetPlatform+targetFormat required',
    },
  );

/** POST /api/studio/[deliverableId]/derive — Create a derivative deliverable for another platform */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    const source = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: { select: { workspaceId: true, id: true, title: true } },
        components: { where: { isSelected: true } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source deliverable not found' }, { status: 404 });
    }
    if (source.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = deriveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { targetContentTypeId, targetPlatform, targetFormat, title } = parsed.data;

    // Resolve target content-type via registry of fallback op platform-format-string
    let resolvedContentType: string;
    let resolvedTitle: string;
    if (targetContentTypeId) {
      const typeDef = getDeliverableTypeById(targetContentTypeId);
      if (!typeDef) {
        return NextResponse.json(
          { error: `Unknown targetContentTypeId "${targetContentTypeId}"` },
          { status: 400 },
        );
      }
      resolvedContentType = typeDef.id;
      resolvedTitle = title ?? `${source.title} — ${typeDef.name}`;
    } else {
      resolvedContentType = `${targetPlatform}_${targetFormat}`;
      resolvedTitle = title ?? `${source.title} (${targetPlatform} ${targetFormat})`;
    }

    // Strip iteration-specific snapshots uit settings — brief + visualBrief
    // moeten meegaan, maar strictRewrite + autoIterate behoren bij het bron-
    // document, niet bij de derived versie.
    const sourceSettings = (source.settings as Record<string, unknown> | null) ?? {};
    const { strictRewrite: _strict, autoIterate: _auto, ...cleanSettings } = sourceSettings;
    void _strict;
    void _auto;

    // Create derived deliverable
    const derived = await prisma.deliverable.create({
      data: {
        title: resolvedTitle,
        contentType: resolvedContentType,
        campaignId: source.campaign.id,
        derivedFromId: deliverableId,
        status: 'NOT_STARTED',
        approvalStatus: 'DRAFT',
        progress: 0,
        // Inherit brief + visualBrief + voiceguide-overrides via settings;
        // strip strictRewrite + autoIterate (bron-specifiek).
        settings: Object.keys(cleanSettings).length > 0 ? cleanSettings : undefined,
        journeyPhase: source.journeyPhase,
      },
    });

    // Cache invalidation
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    return NextResponse.json({
      newDeliverableId: derived.id,
      sourceDeliverableId: deliverableId,
      title: derived.title,
    });
  } catch (error) {
    console.error('[POST /api/studio/:id/derive]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
