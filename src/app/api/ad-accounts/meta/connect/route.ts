// =============================================================
// GET /api/ad-accounts/meta/connect
//
// Initiates the Meta Marketing-API OAuth flow. Generates a CSRF
// state-token (bound to workspace+user), then 302s the user to
// Meta's authorize dialog. The /callback route validates the
// state and continues the exchange.
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { buildAuthorizeUrl } from '@/lib/ad-providers/meta/oauth';
import { MetaConfigError } from '@/lib/ad-providers/meta/config';
import { createAdOAuthState } from '@/lib/ad-tokens/oauth-state';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace resolved' }, { status: 401 });
    }

    const state = createAdOAuthState(workspaceId, 'meta', session.user.id);
    const authorizeUrl = buildAuthorizeUrl(state);

    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    if (err instanceof MetaConfigError) {
      return NextResponse.json(
        { error: 'Meta integration not configured', detail: err.message },
        { status: 503 },
      );
    }
    console.error('[ad-accounts/meta/connect]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
