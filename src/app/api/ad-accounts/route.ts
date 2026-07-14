// =============================================================
// GET /api/ad-accounts
//
// Lijst van alle ConnectedAdAccount rows van de huidige workspace,
// zonder encrypted tokens (UI-safe). Sorteert active boven revoked.
// =============================================================

import { NextResponse } from 'next/server';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace resolved' }, { status: 401 });

    const accounts = await prisma.connectedAdAccount.findMany({
      where: { workspaceId },
      select: {
        id: true,
        platform: true,
        externalAccountId: true,
        accountName: true,
        currency: true,
        timezone: true,
        scopes: true,
        status: true,
        tokenExpiresAt: true,
        lastRefreshedAt: true,
        lastErrorMessage: true,
        connectedBy: { select: { id: true, name: true, email: true } },
        // Alleen via-Branddock-gepubliceerde campagnes tellen — discovered
        // external rijen (ads-watchdog-sync) zouden de teller vervuilen.
        _count: { select: { campaigns: { where: { origin: 'branddock' } } } },
        createdAt: true,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ accounts });
  } catch (err) {
    console.error('[ad-accounts/list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
