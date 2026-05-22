// =============================================================
// POST /api/ad-accounts/meta/select
//
// User has reviewed the available ad-accounts (from callback's
// pending-session) and picked one. Body:
//   { sessionId: string, externalAccountId: string }
//
// We encrypt the token, upsert ConnectedAdAccount (so reconnect
// of a previously-revoked account re-activates the row instead
// of creating a duplicate), and return the new row id.
// =============================================================

import { NextResponse } from 'next/server';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { consumePendingAdAccountSession, peekPendingAdAccountSession } from '@/lib/ad-tokens/pending-tokens';
import { encryptToken } from '@/lib/ad-tokens/encryption';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

/** GET ?sessionId=<id> — returns available accounts WITHOUT consuming the session. */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace resolved' }, { status: 401 });

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId query param required' }, { status: 400 });

    const pending = peekPendingAdAccountSession(sessionId);
    if (!pending) {
      return NextResponse.json({ error: 'Pending session not found or expired' }, { status: 404 });
    }
    if (pending.workspaceId !== workspaceId || pending.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session/workspace mismatch' }, { status: 403 });
    }

    return NextResponse.json({
      platform: pending.platform,
      tokenExpiresAt: new Date(pending.tokenExpiresAt).toISOString(),
      availableAccounts: pending.availableAccounts.map((a) => ({
        id: a.id,
        accountId: a.account_id,
        name: a.name,
        currency: a.currency,
        timezone: a.timezone_name,
        accountStatus: a.account_status,
        business: a.business ?? null,
      })),
    });
  } catch (err) {
    console.error('[ad-accounts/meta/select GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface SelectBody {
  sessionId?: string;
  externalAccountId?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace resolved' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as SelectBody | null;
    if (!body?.sessionId || !body?.externalAccountId) {
      return NextResponse.json({ error: 'sessionId and externalAccountId required' }, { status: 400 });
    }

    const pending = consumePendingAdAccountSession(body.sessionId);
    if (!pending) {
      return NextResponse.json({ error: 'Pending session not found or expired' }, { status: 404 });
    }
    if (pending.workspaceId !== workspaceId || pending.userId !== session.user.id) {
      return NextResponse.json({ error: 'Session/workspace mismatch' }, { status: 403 });
    }

    const chosen = pending.availableAccounts.find((a) => a.id === body.externalAccountId);
    if (!chosen) {
      return NextResponse.json({ error: 'externalAccountId not in available accounts' }, { status: 400 });
    }

    const accessTokenEncrypted = encryptToken(pending.accessToken);
    const tokenExpiresAt = new Date(pending.tokenExpiresAt);

    const upserted = await prisma.connectedAdAccount.upsert({
      where: {
        workspaceId_platform_externalAccountId: {
          workspaceId,
          platform: 'meta',
          externalAccountId: chosen.id,
        },
      },
      create: {
        workspaceId,
        platform: 'meta',
        externalAccountId: chosen.id,
        accountName: chosen.name,
        currency: chosen.currency,
        timezone: chosen.timezone_name,
        accessTokenEncrypted,
        tokenExpiresAt,
        scopes: pending.scopes,
        status: 'active',
        lastRefreshedAt: new Date(),
        connectedById: session.user.id,
      },
      update: {
        accountName: chosen.name,
        currency: chosen.currency,
        timezone: chosen.timezone_name,
        accessTokenEncrypted,
        tokenExpiresAt,
        scopes: pending.scopes,
        status: 'active',
        lastErrorMessage: null,
        lastRefreshedAt: new Date(),
        connectedById: session.user.id,
      },
      select: {
        id: true,
        platform: true,
        externalAccountId: true,
        accountName: true,
        status: true,
      },
    });

    invalidateCache(cacheKeys.prefixes.adAccounts(workspaceId));

    return NextResponse.json({ account: upserted });
  } catch (err) {
    console.error('[ad-accounts/meta/select]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
