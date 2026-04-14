// =============================================================
// POST /api/social-connect/[platform]/select-profiles
//
// Creates PublishChannel records for each selected profile/page.
// Called after the user picks which profiles to connect from the
// SocialProfileSelector UI.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { consumePendingTokens, deletePendingTokens } from '../callback/route';
import { getOAuthConfig } from '@/lib/integrations/social-oauth/oauth-config';

interface RouteParams {
  params: Promise<{ platform: string }>;
}

const bodySchema = z.object({
  sessionId: z.string().min(1),
  profiles: z.array(z.object({
    profileId: z.string(),
    profileName: z.string(),
    profileType: z.enum(['personal', 'page', 'business']),
    /** For Facebook/Instagram pages, the page-specific access token */
    pageAccessToken: z.string().optional(),
  })).min(1),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform } = await params;
    const config = getOAuthConfig(platform);
    if (!config) {
      return NextResponse.json({ error: `OAuth not configured for ${platform}` }, { status: 400 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const pending = consumePendingTokens(parsed.data.sessionId);
    if (!pending) {
      return NextResponse.json({ error: 'Session expired. Please reconnect.' }, { status: 410 });
    }

    if (pending.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 });
    }

    const channels = [];

    for (const profile of parsed.data.profiles) {
      const isPage = profile.profileType === 'page' || profile.profileType === 'business';
      const labelSuffix = isPage ? 'Page' : 'Profile';

      const credentials: Record<string, unknown> = {
        accessToken: profile.pageAccessToken ?? pending.accessToken,
        refreshToken: pending.refreshToken ?? null,
        tokenExpiry: pending.tokenExpiry,
        userId: pending.userId,
        profileType: profile.profileType,
      };

      if (isPage) {
        credentials.pageId = profile.profileId;
        credentials.pageName = profile.profileName;
        if (profile.pageAccessToken) {
          credentials.pageAccessToken = profile.pageAccessToken;
        }
      }

      const channel = await prisma.publishChannel.create({
        data: {
          workspaceId,
          platform,
          provider: config.provider,
          label: `${capitalize(platform)} — ${profile.profileName}`,
          accountName: profile.profileName,
          credentials: credentials as unknown as Prisma.InputJsonValue,
          settings: {} as Prisma.InputJsonValue,
          isActive: true,
        },
        select: {
          id: true,
          platform: true,
          provider: true,
          label: true,
          accountName: true,
          isActive: true,
          createdAt: true,
        },
      });

      channels.push(channel);
    }

    // Clean up pending tokens
    deletePendingTokens(parsed.data.sessionId);

    return NextResponse.json({ channels }, { status: 201 });
  } catch (error) {
    console.error('[social-connect/select-profiles]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
