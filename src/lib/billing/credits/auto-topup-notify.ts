// =============================================================
// Auto-topup-notificatie (Fase 5a) — in-app melding per automatische
// bijkoop, zodat een org nooit "stil" geld uitgeeft. Zelfde recept als
// trial-notify (createMany + cache-invalidatie, fail-soft).
// =============================================================

import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getWorkspaceUsers } from '@/lib/workspace/workspace-users';

export async function notifyAutoTopup(params: {
  organizationId: string;
  credits: number;
  priceEur: number;
}): Promise<void> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { workspaces: { select: { id: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    const workspaceId = org?.workspaces[0]?.id;
    if (!workspaceId) return;

    const users = await getWorkspaceUsers(workspaceId);
    if (users.length === 0) return;

    await prisma.notification.createMany({
      data: users.map((u) => ({
        type: 'AUTO_TOPUP' as const,
        category: 'SYSTEM' as const,
        title: 'Credits automatisch bijgekocht',
        description: `Je saldo was op — er zijn automatisch ${params.credits} credits bijgekocht (€${params.priceEur.toFixed(2)}, via SEPA-incasso). Beheer dit onder Settings → Billing.`,
        actionUrl: 'settings',
        workspaceId,
        userId: u.id,
      })),
    });
    invalidateCache(cacheKeys.prefixes.notifications(workspaceId));
  } catch (error) {
    console.warn('[notifyAutoTopup] failed (swallowed)', {
      organizationId: params.organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
