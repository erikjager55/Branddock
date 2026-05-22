// =============================================================
// Cron job — pre-emptively refresh ConnectedAdAccount tokens.
//
// Selects rows met status='active' en tokenExpiresAt < now + 7d.
// Per row: refresh → re-encrypt → update. Bij failure:
// status='expired' + email queue (out-of-scope deze sprint).
//
// Runs 1x/24u (per spec §7.5). LinkedIn variant later — LinkedIn
// tokens zijn 60d zonder long-lived-conversion stap.
// =============================================================

import { prisma } from '@/lib/prisma';
import { decryptToken, encryptToken } from '@/lib/ad-tokens/encryption';
import { refreshLongLivedToken } from '@/lib/ad-providers/meta/oauth';
import { MetaApiError } from '@/lib/ad-providers/meta/types';

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface RefreshResult {
  accountsExamined: number;
  refreshed: number;
  failed: number;
  errors: Array<{ accountId: string; reason: string }>;
}

export async function refreshAdTokens(): Promise<RefreshResult> {
  const cutoff = new Date(Date.now() + REFRESH_WINDOW_MS);

  const accounts = await prisma.connectedAdAccount.findMany({
    where: {
      status: 'active',
      platform: 'meta',
      tokenExpiresAt: { lt: cutoff },
    },
  });

  const result: RefreshResult = {
    accountsExamined: accounts.length,
    refreshed: 0,
    failed: 0,
    errors: [],
  };

  for (const account of accounts) {
    let current: string;
    try {
      current = decryptToken(account.accessTokenEncrypted);
    } catch (err) {
      result.failed += 1;
      result.errors.push({ accountId: account.id, reason: `decrypt: ${(err as Error).message}` });
      await prisma.connectedAdAccount.update({
        where: { id: account.id },
        data: { status: 'error', lastErrorMessage: 'Stored token unreadable' },
      });
      continue;
    }

    try {
      const refreshed = await refreshLongLivedToken(current);
      await prisma.connectedAdAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptToken(refreshed.access_token),
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          lastRefreshedAt: new Date(),
          lastErrorMessage: null,
        },
      });
      result.refreshed += 1;
    } catch (err) {
      const detail = err instanceof MetaApiError ? err.message : (err as Error).message;
      result.failed += 1;
      result.errors.push({ accountId: account.id, reason: detail });
      await prisma.connectedAdAccount.update({
        where: { id: account.id },
        data: { status: 'expired', lastErrorMessage: detail },
      });
    }
  }

  return result;
}
