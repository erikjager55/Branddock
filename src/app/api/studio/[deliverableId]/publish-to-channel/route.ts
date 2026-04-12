// =============================================================
// POST /api/studio/[deliverableId]/publish-to-channel
//
// Routes the deliverable's content to the specified publish channel.
// Dispatches to the correct provider (Ayrshare, Resend, WordPress)
// based on the channel's provider field. Creates a PublishLog record.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { publishToAyrshare, type AyrsharePostBody } from '@/lib/integrations/ayrshare/ayrshare-client';
import { sendViaResend, contentToEmailHtml } from '@/lib/integrations/resend/resend-publish';
import { createWordPressPost, uploadWordPressImage, contentToWordPressHtml } from '@/lib/integrations/wordpress/wordpress-client';

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

const publishSchema = z.object({
  channelId: z.string(),
  scheduledFor: z.string().optional(),
  publishNow: z.boolean().optional(),
  /** Email-specific: recipient address(es) */
  emailTo: z.union([z.string().email(), z.array(z.string().email())]).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      include: {
        components: {
          where: { isSelected: true },
          orderBy: { order: 'asc' },
        },
        campaign: { select: { title: true } },
      },
    });
    if (!deliverable) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });

    const body = await request.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { channelId, scheduledFor, publishNow, emailTo } = parsed.data;

    const channel = await prisma.publishChannel.findFirst({
      where: { id: channelId, workspaceId, isActive: true },
    });
    if (!channel) return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 });

    const credentials = (channel.credentials ?? {}) as Record<string, string>;
    const settings = (channel.settings ?? {}) as Record<string, string>;

    // ─── Extract content from deliverable components ─────────
    const textComponents = deliverable.components.filter((c) => c.generatedContent && c.variantGroup !== 'hero-image');
    const heroComponent = deliverable.components.find((c) => c.variantGroup === 'hero-image' && c.imageUrl);

    const contentByGroup: Record<string, string> = {};
    for (const comp of textComponents) {
      if (comp.variantGroup && comp.generatedContent) {
        contentByGroup[comp.variantGroup] = comp.generatedContent;
      }
    }

    const title = contentByGroup.title ?? contentByGroup.headline ?? contentByGroup.subject ?? deliverable.title;
    const bodyText = contentByGroup.body ?? contentByGroup.caption ?? contentByGroup['body-sections'] ?? contentByGroup.introduction ?? '';
    const cta = contentByGroup.cta ?? contentByGroup['call-to-action'] ?? '';
    const hashtags = contentByGroup.hashtags ?? '';
    const metaDescription = contentByGroup['meta-description'] ?? '';
    const heroImageUrl = heroComponent?.imageUrl ?? null;

    // Full text for social posts
    const fullText = [bodyText, hashtags].filter(Boolean).join('\n\n');

    // Create publish log (pending)
    const log = await prisma.publishLog.create({
      data: {
        deliverableId,
        channelId,
        workspaceId,
        status: publishNow ? 'publishing' : 'scheduled',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    });

    let externalId: string | null = null;
    let externalUrl: string | null = null;

    try {
      // ─── Provider dispatch ──────────────────────────────────
      switch (channel.provider) {
        case 'ayrshare': {
          const profileKey = credentials.profileKey;
          if (!profileKey) throw new Error('Ayrshare profile key not configured');

          const postBody: AyrsharePostBody = {
            post: fullText,
            platforms: [channel.platform],
            mediaUrls: heroImageUrl ? [heroImageUrl] : undefined,
            scheduleDate: scheduledFor,
          };

          if (channel.platform === 'linkedin') {
            postBody.linkedInOptions = { title, visibility: 'anyone' };
          }

          const result = await publishToAyrshare(profileKey, postBody);
          const platformResult = result.postIds?.[0];
          externalId = platformResult?.postId ?? result.id;
          externalUrl = platformResult?.postUrl ?? null;
          break;
        }

        case 'resend': {
          const apiKey = credentials.apiKey;
          const fromEmail = settings.fromEmail;
          const fromName = settings.fromName ?? 'Brand';
          if (!apiKey || !fromEmail) throw new Error('Resend API key or from email not configured');

          const recipients = emailTo ?? settings.defaultTo ?? fromEmail;
          const html = contentToEmailHtml(title, bodyText, cta || undefined, undefined);

          const result = await sendViaResend(apiKey, fromEmail, fromName, {
            to: recipients,
            subject: title,
            html,
            text: bodyText,
            scheduledAt: scheduledFor,
          });
          externalId = result.id;
          break;
        }

        case 'wordpress-rest': {
          const siteUrl = credentials.siteUrl;
          const username = credentials.username;
          const appPassword = credentials.appPassword;
          if (!siteUrl || !username || !appPassword) throw new Error('WordPress credentials not configured');

          // Upload hero image if present
          let featuredMediaId: number | undefined;
          if (heroImageUrl) {
            try {
              const media = await uploadWordPressImage(siteUrl, username, appPassword, heroImageUrl, 'hero-image.jpg');
              featuredMediaId = media.id;
            } catch (err) {
              console.error('[publish-to-channel] WordPress image upload failed:', err);
              // Continue without featured image
            }
          }

          const wpContent = contentToWordPressHtml(bodyText);
          const result = await createWordPressPost(siteUrl, username, appPassword, {
            title,
            content: wpContent,
            excerpt: metaDescription || undefined,
            status: scheduledFor ? 'future' : 'publish',
            date: scheduledFor,
            featured_media: featuredMediaId,
          });
          externalId = String(result.id);
          externalUrl = result.link;
          break;
        }

        default:
          throw new Error(`Provider ${channel.provider} not implemented`);
      }

      // ─── Update publish log + deliverable on success ────────
      await prisma.publishLog.update({
        where: { id: log.id },
        data: {
          status: publishNow ? 'published' : 'scheduled',
          publishedAt: publishNow ? new Date() : null,
          externalId,
          externalUrl,
        },
      });

      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          publishChannelId: channelId,
          publishedUrl: externalUrl,
          approvalStatus: publishNow ? 'PUBLISHED' : 'APPROVED',
          publishedAt: publishNow ? new Date() : undefined,
          ...(scheduledFor ? { scheduledPublishDate: new Date(scheduledFor) } : {}),
        },
      });

      await prisma.publishChannel.update({
        where: { id: channelId },
        data: { lastPublishedAt: new Date() },
      });

      return NextResponse.json({
        publishLogId: log.id,
        status: publishNow ? 'published' : 'scheduled',
        channelPlatform: channel.platform,
        externalUrl,
      }, { status: 201 });

    } catch (publishError) {
      // ─── Update log on failure ──────────────────────────────
      const message = publishError instanceof Error ? publishError.message : 'Unknown error';
      console.error(`[publish-to-channel] ${channel.provider}/${channel.platform} failed:`, message);

      await prisma.publishLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          errorMessage: message,
          retryCount: { increment: 1 },
        },
      });

      return NextResponse.json({
        error: `Publishing to ${channel.platform} failed: ${message}`,
        publishLogId: log.id,
      }, { status: 502 });
    }
  } catch (error) {
    console.error('[POST /api/studio/[deliverableId]/publish-to-channel]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
