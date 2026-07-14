// =============================================================
// Cron job — dagelijkse ad-insights-sync (ads-watchdog Fase 1,
// ADR 2026-07-14-ads-watchdog-datamodel).
//
// Per actieve meta-ConnectedAdAccount:
//   1. Decrypt token (patroon sync-ad-campaign-status).
//   2. Discovery: actieve ads → upsert AdCampaign-rijen. Bestaande
//      rijen (matched op connectedAccountId + externalAdId) blijven
//      van hun eigen origin; nieuwe rijen krijgen origin 'external'
//      met deliverableId null (grain: 1 rij per actieve externe ad).
//   3. Externe rijen die niet meer in de actieve set zitten → status
//      'paused' (anders vuurt Fase 2 straks refresh-voorstellen op
//      ads die al weken uit staan — de alert-moeheid-counter-metric).
//   4. Insights (ad-niveau, per dag, 14d) → AdMetricSnapshot-upsert
//      op de bestaande unique [campaignId, windowStart, windowEnd]
//      (idempotent bij dubbele cron-tick). `frequency` leeft in `raw`
//      (geen kolom; afleidbaar als impressions/reach). Snapshots landen
//      óók op bestaande rijen buiten de actieve set (staart-data van
//      net-gepauzeerde ads + Meta-restatements).
//      NB: windowStart is de date_start-dag als UTC-middernacht — Meta
//      bucket't per ad-account-timezone; de key is stabiel (idempotent),
//      het label kan uren offsetten. `last_14d` sluit vandaag uit;
//      capturedAt is het her-meet-anker per run.
//
// Failure-modes (fail-soft per account, patroon status-sync):
//   - Meta 401 → ConnectedAdAccount.status='expired', volgende account
//   - andere fout → log + volgende account (retry volgende dag)
//   - AdMetricSnapshot schrijft NOOIT naar Meta — zie insights.ts.
// =============================================================

import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/ad-tokens/encryption';
import { fetchActiveAds, fetchAdInsightsDaily } from '@/lib/ad-providers/meta/insights';
import { MetaApiError } from '@/lib/ad-providers/meta/types';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Origin-discriminator (ADR 2026-07-14) — één bron i.p.v. magic strings;
 * een typo in een origin-filter faalt anders stil met een lege set. */
export const AD_CAMPAIGN_ORIGIN = { branddock: 'branddock', external: 'external' } as const;

export interface InsightsSyncResult {
  accountsExamined: number;
  adsDiscovered: number;
  campaignsCreated: number;
  campaignsPaused: number;
  snapshotsUpserted: number;
  authErrors: number;
  otherErrors: number;
  errors: Array<{ accountId: string; reason: string }>;
}

export async function syncAdInsights(): Promise<InsightsSyncResult> {
  const accounts = await prisma.connectedAdAccount.findMany({
    where: { platform: 'meta', status: 'active' },
  });

  const result: InsightsSyncResult = {
    accountsExamined: accounts.length,
    adsDiscovered: 0,
    campaignsCreated: 0,
    campaignsPaused: 0,
    snapshotsUpserted: 0,
    authErrors: 0,
    otherErrors: 0,
    errors: [],
  };

  for (const account of accounts) {
    let token: string;
    try {
      token = decryptToken(account.accessTokenEncrypted);
    } catch (err) {
      result.otherErrors += 1;
      result.errors.push({ accountId: account.id, reason: `decrypt: ${(err as Error).message}` });
      continue;
    }

    try {
      // ── 2. Discovery ──────────────────────────────────────────
      const ads = await fetchActiveAds(token, account.externalAccountId);
      result.adsDiscovered += ads.length;

      // Bestaande rijen op dit account, gekeyed op externalAdId — één
      // findMany i.p.v. N upsert-roundtrips (geen fetch-loop-conventie).
      // Alle bekende rijen op dit account in één query (geen fetch-loop):
      // dekt de actieve set, de snapshot-staart van net-gepauzeerde ads
      // én de pauzeer-diff hieronder.
      const existing = await prisma.adCampaign.findMany({
        where: { connectedAccountId: account.id, externalAdId: { not: null } },
        select: { id: true, externalAdId: true, origin: true, status: true },
      });
      const byExternalAdId = new Map(existing.map((row) => [row.externalAdId, row]));

      for (const ad of ads) {
        const row = byExternalAdId.get(ad.id);
        if (row) {
          // Branddock-published rijen niet hijacken: alleen de
          // discovery-metadata verversen die van Meta zelf komt.
          await prisma.adCampaign.update({
            where: { id: row.id },
            data: {
              externalName: ad.name,
              creativeCreatedAt: ad.created_time ? new Date(ad.created_time) : undefined,
            },
          });
          continue;
        }
        // Atomair t.o.v. een overlappende tick via de nieuwe unique
        // [connectedAccountId, externalAdId] — upsert i.p.v. check-then-create.
        const created = await prisma.adCampaign.upsert({
          where: {
            connectedAccountId_externalAdId: { connectedAccountId: account.id, externalAdId: ad.id },
          },
          create: {
            origin: AD_CAMPAIGN_ORIGIN.external,
            deliverableId: null,
            connectedAccountId: account.id,
            externalAdId: ad.id,
            externalCampaignId: ad.campaign?.id ?? null,
            externalAdSetId: ad.adset?.id ?? null,
            externalCreativeId: ad.creative?.id ?? null,
            externalName: ad.name,
            creativeCreatedAt: ad.created_time ? new Date(ad.created_time) : null,
            status: 'active',
          },
          update: {
            externalName: ad.name,
            creativeCreatedAt: ad.created_time ? new Date(ad.created_time) : undefined,
          },
        });
        byExternalAdId.set(ad.id, {
          id: created.id, externalAdId: ad.id,
          origin: AD_CAMPAIGN_ORIGIN.external, status: created.status,
        });
        result.campaignsCreated += 1;
      }

      // ── 3. Verdwenen external rijen pauzeren (set-verschil) ───
      const activeIds = new Set(ads.map((a) => a.id));
      const vanished = existing.filter(
        (row) => row.origin === AD_CAMPAIGN_ORIGIN.external &&
          row.status === 'active' && row.externalAdId && !activeIds.has(row.externalAdId),
      );
      if (vanished.length > 0) {
        await prisma.adCampaign.updateMany({
          where: { id: { in: vanished.map((v) => v.id) } },
          data: { status: 'paused', statusMessage: 'Not in active discovery set (insights-sync)' },
        });
        result.campaignsPaused += vanished.length;
      }

      // ── 4. Snapshots ──────────────────────────────────────────
      const insightRows = await fetchAdInsightsDaily(token, account.externalAccountId, 14);
      const capturedAt = new Date();
      for (const row of insightRows) {
        const campaignRow = byExternalAdId.get(row.ad_id);
        // Alleen skippen als er GEEN rij bestaat (bewust geen rijen
        // aanmaken voor onbekende/verwijderde ads); bestaande rijen van
        // net-gepauzeerde ads krijgen hun staart-data wél (review W5).
        if (!campaignRow) continue;
        const windowStart = new Date(`${row.date_start}T00:00:00.000Z`);
        const windowEnd = new Date(windowStart.getTime() + DAY_MS);
        await prisma.adMetricSnapshot.upsert({
          where: {
            campaignId_windowStart_windowEnd: {
              campaignId: campaignRow.id,
              windowStart,
              windowEnd,
            },
          },
          create: {
            campaignId: campaignRow.id,
            capturedAt,
            windowStart,
            windowEnd,
            impressions: row.impressions ? parseInt(row.impressions, 10) : null,
            reach: row.reach ? parseInt(row.reach, 10) : null,
            clicks: row.clicks ? parseInt(row.clicks, 10) : null,
            ctr: row.ctr ? parseFloat(row.ctr) : null,
            cpm: row.cpm ? parseFloat(row.cpm) : null,
            cpc: row.cpc ? parseFloat(row.cpc) : null,
            spend: row.spend ? parseFloat(row.spend) : null,
            raw: JSON.parse(JSON.stringify(row)),
          },
          update: {
            capturedAt,
            impressions: row.impressions ? parseInt(row.impressions, 10) : null,
            reach: row.reach ? parseInt(row.reach, 10) : null,
            clicks: row.clicks ? parseInt(row.clicks, 10) : null,
            ctr: row.ctr ? parseFloat(row.ctr) : null,
            cpm: row.cpm ? parseFloat(row.cpm) : null,
            cpc: row.cpc ? parseFloat(row.cpc) : null,
            spend: row.spend ? parseFloat(row.spend) : null,
            raw: JSON.parse(JSON.stringify(row)),
          },
        });
        result.snapshotsUpserted += 1;
      }

      invalidateCache(cacheKeys.prefixes.adAccounts(account.workspaceId));
      invalidateCache(cacheKeys.prefixes.adCampaigns(account.workspaceId));
    } catch (err) {
      if (err instanceof MetaApiError && err.isAuthError()) {
        result.authErrors += 1;
        result.errors.push({ accountId: account.id, reason: `auth: ${err.message}` });
        await prisma.connectedAdAccount.update({
          where: { id: account.id },
          data: { status: 'expired', lastErrorMessage: err.message },
        });
        continue;
      }
      result.otherErrors += 1;
      result.errors.push({
        accountId: account.id,
        reason: err instanceof Error ? err.message : 'unknown',
      });
      // Fail-soft: volgende account; deze wordt morgen opnieuw geprobeerd.
    }
  }

  return result;
}
