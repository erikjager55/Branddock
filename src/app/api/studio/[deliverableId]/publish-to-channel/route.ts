// =============================================================================
// POST /api/studio/[deliverableId]/publish-to-channel
//
// Routes the deliverable's content to the specified publish channel
// (Ayrshare for social, Resend for email, WordPress REST for blog).
// Creates a PublishLog record for tracking.
//
// For now this is a "prepared" publish that creates the log with status
// 'pending'. The actual platform-specific publishing logic (API calls
// to Ayrshare, Resend, WordPress) will be added as each integration
// is configured. The Planner UI can already select channels and track
// publish status.
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

const publishSchema = z.object({
  channelId: z.string(),
  scheduledFor: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    // Verify deliverable ownership
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      include: {
        components: {
          where: { isSelected: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!deliverable) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });

    const body = await request.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { channelId, scheduledFor, publishNow } = parsed.data;

    // Verify channel ownership
    const channel = await prisma.publishChannel.findFirst({
      where: { id: channelId, workspaceId, isActive: true },
    });
    if (!channel) return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 });

    // Build the content payload for the platform
    const selectedContent = deliverable.components
      .filter((c) => c.generatedContent)
      .map((c) => ({ group: c.variantGroup, content: c.generatedContent }));

    const heroImageComponent = deliverable.components.find(
      (c) => c.variantGroup === 'hero-image' && c.imageUrl,
    );

    // Create publish log
    const status = publishNow ? 'publishing' : 'scheduled';
    const log = await prisma.publishLog.create({
      data: {
        deliverableId,
        channelId,
        workspaceId,
        status,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    });

    // Update deliverable with channel reference
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        publishChannelId: channelId,
        approvalStatus: status === 'publishing' ? 'PUBLISHED' : 'APPROVED',
        ...(scheduledFor ? { scheduledPublishDate: new Date(scheduledFor) } : {}),
      },
    });

    // TODO: Actual platform publishing logic per provider:
    // - ayrshare:      POST to Ayrshare API with text + image
    // - resend:         emails.send() with HTML body
    // - wordpress-rest: POST /wp-json/wp/v2/posts
    // - youtube-api:    videos.insert()
    //
    // For now, mark as 'pending' — when integrations are connected
    // with real credentials, this becomes fire-and-forget.

    if (publishNow) {
      // Placeholder: mark as published immediately
      // Real implementation would call the provider API here
      await prisma.publishLog.update({
        where: { id: log.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
        },
      });

      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          publishedAt: new Date(),
          approvalStatus: 'PUBLISHED',
        },
      });

      // Update channel's lastPublishedAt
      await prisma.publishChannel.update({
        where: { id: channelId },
        data: { lastPublishedAt: new Date() },
      });
    }

    return NextResponse.json({
      publishLogId: log.id,
      status: publishNow ? 'published' : 'scheduled',
      channelPlatform: channel.platform,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/publish-to-channel]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
