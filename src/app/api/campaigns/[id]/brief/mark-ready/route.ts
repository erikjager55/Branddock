import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { trackEvent } from '@/lib/analytics/posthog';

/**
 * POST /api/campaigns/[id]/brief/mark-ready
 *
 * Telemetrie-trigger wanneer een gebruiker een gegenereerde campagne-brief
 * markeert als "klaar voor klant". Logt event `campaign_brief_marked_ready`
 * voor primary-metric tracking. Geen DB-mutatie, dus geen cache-invalidation.
 */
const PayloadSchema = z.object({
  sectionsRenderedCount: z.number().int().min(0),
  missingDataFlags: z.array(z.string()).default([]),
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

    const { id } = await params;

    // Workspace-isolatie: bevestig campaign hoort bij deze workspace
    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const eventPayload = {
      event: 'campaign_brief_marked_ready',
      workspaceId,
      properties: {
        campaignId: id,
        sectionsRenderedCount: parsed.data.sectionsRenderedCount,
        missingDataFlags: parsed.data.missingDataFlags,
      },
    };
    await trackEvent(eventPayload);

    // Dev-mode observability: trackEvent is een no-op zonder POSTHOG_API_KEY,
    // maar voor primary-metric debugging willen we wel kunnen zien dat het
    // event is geprobeerd. Productie heeft PostHog dashboard als source-of-truth.
    if (!process.env.POSTHOG_API_KEY) {
      console.info('[brief/mark-ready] event (dev-mode no-op):', eventPayload);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[brief/mark-ready] failed:', error instanceof Error ? error.stack ?? error.message : error);
    return NextResponse.json({ error: 'Failed to mark brief ready' }, { status: 500 });
  }
}
