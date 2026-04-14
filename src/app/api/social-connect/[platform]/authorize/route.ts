// =============================================================
// GET /api/social-connect/[platform]/authorize
//
// Initiates the OAuth flow for a social platform. Redirects the
// user to the platform's authorization page. The state parameter
// encodes the workspace so the callback can route correctly.
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getOAuthConfig, getClientId } from '@/lib/integrations/social-oauth/oauth-config';
import { createOAuthState } from '@/lib/integrations/social-oauth/oauth-state';

interface RouteParams {
  params: Promise<{ platform: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = await params;
    const config = getOAuthConfig(platform);
    if (!config) {
      return NextResponse.json(
        { error: `OAuth not configured for ${platform}. Check environment variables.` },
        { status: 400 },
      );
    }

    const state = createOAuthState(workspaceId, platform);
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/social-connect/${platform}/callback`;

    const authUrl = new URL(config.authorizationUrl);
    authUrl.searchParams.set('client_id', getClientId(config));
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', config.scopes.join(' '));
    authUrl.searchParams.set('state', state);

    // Platform-specific params
    if (config.extraAuthParams) {
      for (const [key, value] of Object.entries(config.extraAuthParams)) {
        authUrl.searchParams.set(key, value);
      }
    }

    // TikTok uses 'client_key' instead of 'client_id'
    if (platform === 'tiktok') {
      authUrl.searchParams.delete('client_id');
      authUrl.searchParams.set('client_key', getClientId(config));
    }

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('[social-connect/authorize]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
