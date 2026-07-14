// =============================================================
// Cron job — sync AdCampaign.status against Meta.
//
// Selects all rows die binnen 5min een poll nodig hebben en
// status in ('publishing','active'). Voor elke row:
//   1. Decrypt connected account token
//   2. Fetch Meta effective_status
//   3. Map → internal status
//   4. Update row + lastStatusSyncAt (altijd, ook bij no-change)
//
// Failure-modes:
//   - Meta 401 → set ConnectedAdAccount.status='expired'
//   - Meta other error → log + leave campaign-row untouched, retry
//     volgende cycle
//   - Decrypt error → set status='failed' (permanent state)
//
// LinkedIn-platform support: add een tweede branch wanneer
// LinkedIn provider klaar staat (zie spec §7.6).
// =============================================================

import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/ad-tokens/encryption';
import { fetchAdStatus, mapMetaStatusToInternal } from '@/lib/ad-providers/meta/publish';
import { MetaApiError } from '@/lib/ad-providers/meta/types';

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export interface SyncResult {
  campaignsExamined: number;
  statusChanges: number;
  authErrors: number;
  otherErrors: number;
  errors: Array<{ campaignId: string; reason: string }>;
}

export async function syncAdCampaignStatus(): Promise<SyncResult> {
  const stale = new Date(Date.now() - STALE_THRESHOLD_MS);

  const campaigns = await prisma.adCampaign.findMany({
    where: {
      // origin-guard (ADR 2026-07-14): discovered externe ads horen niet
      // in de 5-min-status-polling — hun status leeft bij Meta zelf.
      origin: 'branddock',
      status: { in: ['publishing', 'active'] },
      externalAdId: { not: null },
      OR: [{ lastStatusSyncAt: null }, { lastStatusSyncAt: { lt: stale } }],
    },
    include: { connectedAccount: true },
  });

  const result: SyncResult = {
    campaignsExamined: campaigns.length,
    statusChanges: 0,
    authErrors: 0,
    otherErrors: 0,
    errors: [],
  };

  for (const campaign of campaigns) {
    const account = campaign.connectedAccount;

    if (account.platform !== 'meta') {
      // LinkedIn / Google branches komen later. Bump timestamp so we
      // don't re-pick this row every cycle.
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: { lastStatusSyncAt: new Date() },
      });
      continue;
    }

    if (account.status !== 'active') {
      // Token revoked/expired — can't sync. Bump timestamp + skip.
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: { lastStatusSyncAt: new Date() },
      });
      continue;
    }

    let token: string;
    try {
      token = decryptToken(account.accessTokenEncrypted);
    } catch (err) {
      result.otherErrors += 1;
      result.errors.push({
        campaignId: campaign.id,
        reason: `decrypt: ${(err as Error).message}`,
      });
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'failed',
          statusMessage: 'Token unreadable during status-sync',
          lastStatusSyncAt: new Date(),
        },
      });
      continue;
    }

    try {
      const metaStatus = await fetchAdStatus(token, campaign.externalAdId!);
      const mapped = mapMetaStatusToInternal(metaStatus.status);
      const issuesMessage =
        metaStatus.issuesInfo && metaStatus.issuesInfo.length > 0
          ? metaStatus.issuesInfo.map((i) => i.error_summary).join('; ')
          : null;
      const newMessage = mapped.message ?? issuesMessage;

      const changed = campaign.status !== mapped.status;
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: {
          status: mapped.status,
          statusMessage: newMessage,
          lastStatusSyncAt: new Date(),
        },
      });
      if (changed) result.statusChanges += 1;
    } catch (err) {
      if (err instanceof MetaApiError && err.isAuthError()) {
        result.authErrors += 1;
        result.errors.push({ campaignId: campaign.id, reason: `auth: ${err.message}` });
        await prisma.connectedAdAccount.update({
          where: { id: account.id },
          data: { status: 'expired', lastErrorMessage: err.message },
        });
        await prisma.adCampaign.update({
          where: { id: campaign.id },
          data: { lastStatusSyncAt: new Date() },
        });
        continue;
      }
      result.otherErrors += 1;
      result.errors.push({
        campaignId: campaign.id,
        reason: err instanceof Error ? err.message : 'unknown',
      });
      // Don't bump lastStatusSyncAt on transient failure — retry next cycle.
    }
  }

  return result;
}
