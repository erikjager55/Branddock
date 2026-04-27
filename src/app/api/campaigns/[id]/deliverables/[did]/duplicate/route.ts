import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { requireUnlocked } from '@/lib/lock-guard';

// ---------------------------------------------------------------------------
// POST /api/campaigns/[id]/deliverables/[did]/duplicate
// Deep-copy a deliverable inside the same campaign. Carries briefing +
// medium + content-type inputs across (so the copy starts fresh with the
// same strategic context) but wipes all generated content + approval state
// so the new one is a clean NOT_STARTED draft.
//
// The copied `settings.inheritedFrom` marker doubles as a signal: it
// suppresses the auto-inherit candidate lookup on the next open (we've
// already inherited explicitly), and the Canvas banner reads it to show
// "Duplicated from X · Change settings".
// ---------------------------------------------------------------------------
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; did: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { id, did } = await params;

    const lockResponse = await requireUnlocked('campaign', id);
    if (lockResponse) return lockResponse;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const source = await prisma.deliverable.findFirst({
      where: { id: did, campaignId: id },
    });
    if (!source) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Strip volatile state from the settings blob but keep all the
    // strategic context the duplicate needs (brief, mediumConfig,
    // contentTypeInputs, phase, channel, targetPersonas, etc.).
    // canvasState holds accordion nav position — irrelevant for a fresh copy.
    const sourceSettings = (source.settings as Record<string, unknown>) ?? {};
    const {
      canvasState: _canvasState,
      inheritedFrom: _prevInherited,
      ...carriedSettings
    } = sourceSettings;

    const newSettings: Record<string, unknown> = {
      ...carriedSettings,
      inheritedFrom: {
        id: source.id,
        title: source.title,
        appliedAt: new Date().toISOString(),
        source: 'duplicate',
      },
    };

    const copy = await prisma.deliverable.create({
      data: {
        title: `${source.title} (copy)`,
        contentType: source.contentType,
        campaignId: id,
        status: 'NOT_STARTED',
        progress: 0,
        approvalStatus: 'DRAFT',
        // Preserve strategic context + plan position so the copy lands
        // in the same phase/week of the campaign timeline.
        journeyPhase: source.journeyPhase,
        weekInCampaign: source.weekInCampaign,
        // Preserve generation config so the next generate run uses the
        // same model + prompt scaffolding as the original.
        contentTab: source.contentTab,
        aiModel: source.aiModel,
        prompt: source.prompt,
        settings: newSettings as Prisma.InputJsonValue,
        // Explicit null — Prisma treats the omitted case differently
        // from an explicit null for some Json fields; be explicit.
        generatedContent: Prisma.JsonNull,
        generatedText: null,
        generatedImageUrls: [],
        generatedVideoUrl: null,
        generatedSlides: Prisma.JsonNull,
        qualityScore: null,
        qualityMetrics: Prisma.JsonNull,
        checklistItems: Prisma.JsonNull,
      },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(
      {
        id: copy.id,
        title: copy.title,
        contentType: copy.contentType,
        status: copy.status,
        progress: copy.progress,
        qualityScore: copy.qualityScore,
        assignedTo: copy.assignedTo,
        isFavorite: copy.isFavorite,
        settings: copy.settings,
        approvalStatus: copy.approvalStatus ?? 'DRAFT',
        approvalNote: copy.approvalNote ?? null,
        approvedBy: copy.approvedBy ?? null,
        approvedAt: copy.approvedAt?.toISOString() ?? null,
        publishedAt: copy.publishedAt?.toISOString() ?? null,
        scheduledPublishDate: copy.scheduledPublishDate?.toISOString() ?? null,
        derivedFromId: copy.derivedFromId ?? null,
        createdAt: copy.createdAt.toISOString(),
        updatedAt: copy.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/campaigns/:id/deliverables/:did/duplicate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
