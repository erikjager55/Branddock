// =============================================================
// Meta insights-client — read-side voor de ads-watchdog (Fase 1,
// ADR 2026-07-14-ads-watchdog-datamodel).
//
// PRODUCT-INVARIANT: dit bestand bevat uitsluitend GET-calls
// (via graphGet) — de waakhond schrijft nooit iets naar Meta.
// Statisch verifieerbaar: geen POST/DELETE in deze module.
//
// Veldmapping bewezen in Fase 0 (handmatige pull op het BB-account):
//   signaal 1 frequency  → insights.frequency (ad-niveau, per dag)
//   signaal 2 CTR-trend  → insights.ctr (ad-niveau, per dag)
//   signaal 3 leeftijd   → ad.created_time
// =============================================================

import { graphGet } from './client';
import type {
  MetaActiveAd,
  MetaActiveAdListResponse,
  MetaAdInsightListResponse,
  MetaAdInsightRow,
} from './types';

const ACTIVE_AD_FIELDS = [
  'id',
  'name',
  'effective_status',
  'created_time',
  'creative{id,name}',
  'campaign{id,name,objective,created_time}',
  'adset{id,name}',
].join(',');

const INSIGHT_FIELDS = [
  'ad_id',
  'ad_name',
  'impressions',
  'reach',
  'frequency',
  'ctr',
  'clicks',
  'spend',
  'cpm',
  'cpc',
].join(',');

/** Cap per account per sync — ruim boven MKB-volumes, begrenst rate-druk. */
const MAX_ADS_PER_ACCOUNT = 200;

/**
 * Discovery: alle actieve ads op het account (óók niet-via-Branddock
 * gepubliceerde — de doelgroep leeft daar). Eén call; Graph pagineert,
 * wij volgen `paging.next` tot de cap.
 */
export async function fetchActiveAds(
  accessToken: string,
  externalAccountId: string,
): Promise<MetaActiveAd[]> {
  // Cursor-paginatie via graphGet (niet paging.next raw volgen): zo dragen
  // vervolgpagina's gegarandeerd appsecret_proof en gelden MetaApiError/
  // auth-semantiek op élke pagina (review 2026-07-14, W3).
  const ads: MetaActiveAd[] = [];
  const params: Record<string, string> = {
    effective_status: JSON.stringify(['ACTIVE']),
    limit: '100',
  };
  let response = await graphGet<MetaActiveAdListResponse>(
    `${externalAccountId}/ads`,
    accessToken,
    ACTIVE_AD_FIELDS,
    params,
  );
  ads.push(...response.data);
  while (response.paging?.next && response.paging.cursors?.after && ads.length < MAX_ADS_PER_ACCOUNT) {
    response = await graphGet<MetaActiveAdListResponse>(
      `${externalAccountId}/ads`,
      accessToken,
      ACTIVE_AD_FIELDS,
      { ...params, after: response.paging.cursors.after },
    );
    ads.push(...response.data);
  }
  return ads.slice(0, MAX_ADS_PER_ACCOUNT);
}

/**
 * Insights op ad-niveau, per dag (time_increment=1) over de laatste
 * `days` dagen. Eén call per account — Graph aggregeert over alle ads.
 */
export async function fetchAdInsightsDaily(
  accessToken: string,
  externalAccountId: string,
  days = 14,
): Promise<MetaAdInsightRow[]> {
  const rows: MetaAdInsightRow[] = [];
  const params: Record<string, string> = {
    level: 'ad',
    date_preset: days <= 7 ? 'last_7d' : days <= 14 ? 'last_14d' : 'last_30d',
    time_increment: '1',
    limit: '500',
  };
  let response = await graphGet<MetaAdInsightListResponse>(
    `${externalAccountId}/insights`,
    accessToken,
    INSIGHT_FIELDS,
    params,
  );
  rows.push(...response.data);
  while (response.paging?.next && response.paging.cursors?.after) {
    response = await graphGet<MetaAdInsightListResponse>(
      `${externalAccountId}/insights`,
      accessToken,
      INSIGHT_FIELDS,
      { ...params, after: response.paging.cursors.after },
    );
    rows.push(...response.data);
  }
  return rows;
}
