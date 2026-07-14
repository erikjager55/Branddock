// =============================================================
// DELETE /api/ad-accounts/meta/disconnect?accountId=<id>
//
// Soft-delete: zet status='revoked' + NUL de encrypted tokens.
// Row blijft bestaan voor historische AdCampaign-referenties
// (FK is onDelete: Restrict — een hard-delete zou falen zodra
// een campagne bestaat).
//
// Reconnect via dezelfde /connect flow re-activeert dezelfde row
// via de @@unique([workspaceId, platform, externalAccountId]).
// =============================================================

import { NextResponse } from 'next/server';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace resolved' }, { status: 401 });

    const url = new URL(request.url);
    const accountId = url.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'accountId query param required' }, { status: 400 });
    }

    const account = await prisma.connectedAdAccount.findFirst({
      where: { id: accountId, workspaceId, platform: 'meta' },
      select: {
        id: true,
        status: true,
        // origin-filter: de disconnect-waarschuwing gaat over via-Branddock
        // gepubliceerde campagnes; discovered external ads horen er niet in.
        _count: { select: { campaigns: { where: { origin: 'branddock', status: { in: ['publishing', 'active', 'paused'] } } } } },
      },
    });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (account.status === 'revoked') {
      return NextResponse.json({ alreadyRevoked: true, activeCampaigns: account._count.campaigns });
    }

    const updated = await prisma.connectedAdAccount.update({
      where: { id: account.id },
      data: {
        status: 'revoked',
        accessTokenEncrypted: '',
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        lastErrorMessage: 'Disconnected by user',
      },
      select: { id: true, status: true },
    });

    invalidateCache(cacheKeys.prefixes.adAccounts(workspaceId));

    return NextResponse.json({
      account: updated,
      activeCampaignsRemaining: account._count.campaigns,
    });
  } catch (err) {
    console.error('[ad-accounts/meta/disconnect]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
