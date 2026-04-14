// =============================================================
// GET /api/social-connect/[platform]/callback
//
// Handles the OAuth callback after the user authorizes on the
// platform. Exchanges the authorization code for tokens, then
// redirects to the frontend with a temporary session ID for
// profile/page selection.
// =============================================================

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getOAuthConfig, getClientId, getClientSecret } from '@/lib/integrations/social-oauth/oauth-config';
import { consumeOAuthState } from '@/lib/integrations/social-oauth/oauth-state';

interface RouteParams {
  params: Promise<{ platform: string }>;
}

// Temporary store for OAuth tokens pending profile selection (10 min TTL)
interface PendingTokens {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry: string;
  userId?: string;
  userName?: string;
  workspaceId: string;
  platform: string;
  createdAt: number;
}

const PENDING_TTL_MS = 10 * 60 * 1000;

function getPendingStore(): Map<string, PendingTokens> {
  const g = globalThis as unknown as { __socialOAuthPending?: Map<string, PendingTokens> };
  if (!g.__socialOAuthPending) {
    g.__socialOAuthPending = new Map();
  }
  return g.__socialOAuthPending;
}

export function storePendingTokens(tokens: PendingTokens): string {
  const store = getPendingStore();
  const sessionId = crypto.randomBytes(24).toString('hex');

  // Cleanup expired entries
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > PENDING_TTL_MS) store.delete(key);
  }

  store.set(sessionId, tokens);
  return sessionId;
}

export function consumePendingTokens(sessionId: string): PendingTokens | null {
  const store = getPendingStore();
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > PENDING_TTL_MS) {
    store.delete(sessionId);
    return null;
  }
  // Don't delete yet — profiles endpoint may be called multiple times
  return entry;
}

export function deletePendingTokens(sessionId: string): void {
  getPendingStore().delete(sessionId);
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { platform } = await params;
    const url = new URL(request.url);

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

    if (error) {
      const desc = errorDescription ?? error;
      return NextResponse.redirect(`${baseUrl}/?social_connect_error=${encodeURIComponent(desc)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/?social_connect_error=${encodeURIComponent('Missing code or state')}`);
    }

    // Validate CSRF state
    const stateData = consumeOAuthState(state);
    if (!stateData) {
      return NextResponse.redirect(`${baseUrl}/?social_connect_error=${encodeURIComponent('Invalid or expired state')}`);
    }

    const config = getOAuthConfig(platform);
    if (!config) {
      return NextResponse.redirect(`${baseUrl}/?social_connect_error=${encodeURIComponent('OAuth not configured')}`);
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/social-connect/${platform}/callback`;
    const tokenData = await exchangeCodeForTokens(platform, config, code, redirectUri);

    // Fetch basic profile info
    const profile = await fetchBasicProfile(platform, tokenData.accessToken);

    const expiresIn = tokenData.expiresIn ?? config.accessTokenExpiryDays * 24 * 60 * 60;

    // Store tokens temporarily for profile selection
    const sessionId = storePendingTokens({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      userId: profile.userId,
      userName: profile.userName,
      workspaceId: stateData.workspaceId,
      platform,
      createdAt: Date.now(),
    });

    // Redirect to frontend with session ID for profile selection
    return NextResponse.redirect(
      `${baseUrl}/?social_connect_session=${sessionId}&social_connect_platform=${platform}`,
    );
  } catch (err) {
    console.error('[social-connect/callback]', err);
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return NextResponse.redirect(`${baseUrl}/?social_connect_error=${encodeURIComponent(msg)}`);
  }
}

// ─── Token Exchange ───────────────────────────────────────────

async function exchangeCodeForTokens(
  platform: string,
  config: { tokenUrl: string },
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const oauthConfig = getOAuthConfig(platform)!;

  if (platform === 'tiktok') {
    // TikTok uses JSON body, not form-urlencoded
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_key: getClientId(oauthConfig),
        client_secret: getClientSecret(oauthConfig),
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`TikTok token exchange failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  // Standard OAuth2 flow (LinkedIn, Meta)
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: getClientId(oauthConfig),
    client_secret: getClientSecret(oauthConfig),
  });

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Token exchange failed for ${platform} (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ─── Basic Profile Fetch ──────────────────────────────────────

async function fetchBasicProfile(
  platform: string,
  accessToken: string,
): Promise<{ userId?: string; userName?: string }> {
  try {
    switch (platform) {
      case 'linkedin': {
        const res = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return {};
        const data = await res.json();
        return {
          userId: data.sub,
          userName: data.name ?? `${data.given_name ?? ''} ${data.family_name ?? ''}`.trim(),
        };
      }
      case 'facebook':
      case 'instagram': {
        const res = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return {};
        const data = await res.json();
        return { userId: data.id, userName: data.name };
      }
      case 'tiktok': {
        const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return {};
        const data = await res.json();
        return {
          userId: data.data?.user?.open_id,
          userName: data.data?.user?.display_name,
        };
      }
      default:
        return {};
    }
  } catch {
    return {};
  }
}
