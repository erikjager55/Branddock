// =============================================================
// POST /api/social-connect/[platform]/profiles
//
// Lists available profiles/pages for the authenticated user
// after OAuth. Uses the temporary session ID from the callback.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { consumePendingTokens } from '../callback/route';
import { listLinkedInProfiles } from '@/lib/integrations/linkedin/linkedin-client';

interface RouteParams {
  params: Promise<{ platform: string }>;
}

const bodySchema = z.object({
  sessionId: z.string().min(1),
});

export interface SocialProfile {
  profileId: string;
  profileName: string;
  profileType: 'personal' | 'page' | 'business';
  avatarUrl?: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform } = await params;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const pending = consumePendingTokens(parsed.data.sessionId);
    if (!pending) {
      return NextResponse.json({ error: 'Session expired. Please reconnect.' }, { status: 410 });
    }

    // Verify workspace matches
    if (pending.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 });
    }

    let profiles: SocialProfile[] = [];

    switch (platform) {
      case 'linkedin': {
        if (!pending.userId) {
          return NextResponse.json({ error: 'No user ID from LinkedIn' }, { status: 400 });
        }
        const linkedInProfiles = await listLinkedInProfiles(pending.accessToken, pending.userId);
        profiles = linkedInProfiles.map((p) => ({
          profileId: p.profileId,
          profileName: p.profileName,
          profileType: p.profileType,
          avatarUrl: p.avatarUrl,
        }));
        break;
      }

      case 'facebook': {
        profiles = await listFacebookPages(pending.accessToken);
        break;
      }

      case 'instagram': {
        profiles = await listInstagramAccounts(pending.accessToken);
        break;
      }

      case 'tiktok': {
        // TikTok doesn't have page-level separation, just return the user
        profiles = [{
          profileId: pending.userId ?? 'me',
          profileName: pending.userName ?? 'TikTok Account',
          profileType: 'personal',
        }];
        break;
      }

      default:
        return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }

    return NextResponse.json({ profiles, sessionId: parsed.data.sessionId });
  } catch (error) {
    console.error('[social-connect/profiles]', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

// ─── Facebook Pages ──────────────────────────────────────────

async function listFacebookPages(accessToken: string): Promise<SocialProfile[]> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture{url},access_token&access_token=${accessToken}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data ?? []).map((page: Record<string, unknown>) => ({
    profileId: String(page.id),
    profileName: String(page.name ?? 'Facebook Page'),
    profileType: 'page' as const,
    avatarUrl: (page.picture as Record<string, unknown>)?.url as string | undefined,
  }));
}

// ─── Instagram Business Accounts ─────────────────────────────

async function listInstagramAccounts(accessToken: string): Promise<SocialProfile[]> {
  // Instagram Business accounts are connected via Facebook Pages
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,name,profile_picture_url}&access_token=${accessToken}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return [];

  const data = await res.json();
  const profiles: SocialProfile[] = [];

  for (const page of data.data ?? []) {
    const igAccount = page.instagram_business_account as Record<string, unknown> | undefined;
    if (igAccount) {
      profiles.push({
        profileId: String(igAccount.id),
        profileName: String(igAccount.name ?? page.name ?? 'Instagram Account'),
        profileType: 'business',
        avatarUrl: igAccount.profile_picture_url as string | undefined,
      });
    }
  }

  return profiles;
}
