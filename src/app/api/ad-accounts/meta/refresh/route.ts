// =============================================================
// POST /api/ad-accounts/meta/refresh
//
// Body: { accountId: string }
//
// Manual / inline refresh path. The scheduled cron job uses the
// same helper (refreshLongLivedToken) directly against the DB.
// This route exists for two cases:
//   1. UI button "Refresh token now" in /settings/integrations
//   2. Pre-publish inline refresh when tokenExpiresAt is near
//      (see spec §4.1.1 precedence — scheduled vs inline).
// =============================================================

import { NextResponse } from 'next/server';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { refreshLongLivedToken } from '@/lib/ad-providers/meta/oauth';
import { MetaApiError } from '@/lib/ad-providers/meta/types';
import { MetaConfigError } from '@/lib/ad-providers/meta/config';
import { encryptToken, decryptToken } from '@/lib/ad-tokens/encryption';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

interface RefreshBody {
  accountId?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace resolved' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as RefreshBody | null;
    if (!body?.accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    const account = await prisma.connectedAdAccount.findFirst({
      where: { id: body.accountId, workspaceId, platform: 'meta' },
    });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (account.status === 'revoked') {
      return NextResponse.json({ error: 'Account is revoked — reconnect required' }, { status: 409 });
    }

    let currentToken: string;
    try {
      currentToken = decryptToken(account.accessTokenEncrypted);
    } catch {
      return NextResponse.json(
        { error: 'Stored token is unreadable — reconnect required' },
        { status: 409 },
      );
    }

    try {
      const refreshed = await refreshLongLivedToken(currentToken);
      const updated = await prisma.connectedAdAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptToken(refreshed.access_token),
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          status: 'active',
          lastRefreshedAt: new Date(),
          lastErrorMessage: null,
        },
        select: { id: true, tokenExpiresAt: true, status: true },
      });
      invalidateCache(cacheKeys.prefixes.adAccounts(workspaceId));
      return NextResponse.json({ account: updated });
    } catch (err) {
      const message = err instanceof MetaApiError ? err.message : 'refresh_failed';
      await prisma.connectedAdAccount.update({
        where: { id: account.id },
        data: { status: 'expired', lastErrorMessage: message },
      });
      invalidateCache(cacheKeys.prefixes.adAccounts(workspaceId));
      const status = err instanceof MetaApiError && err.isAuthError() ? 401 : 502;
      return NextResponse.json({ error: 'Token refresh failed', detail: message }, { status });
    }
  } catch (err) {
    if (err instanceof MetaConfigError) {
      return NextResponse.json(
        { error: 'Meta integration not configured', detail: err.message },
        { status: 503 },
      );
    }
    console.error('[ad-accounts/meta/refresh]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
