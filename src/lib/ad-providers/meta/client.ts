// =============================================================
// Meta Graph API client wrappers — read-side calls used in OAuth
// callback (ad-account-list, user/me). Publish-side wrappers
// (campaign-create, ad-create) komen in Fase B sectie 7.3.
// =============================================================

import { getMetaConfig } from './config';
import { appSecretProof } from './oauth';
import {
  MetaApiError,
  type MetaAdAccount,
  type MetaAdAccountListResponse,
  type MetaErrorBody,
  type MetaUserMe,
} from './types';

const AD_ACCOUNT_FIELDS = ['id', 'account_id', 'name', 'currency', 'timezone_name', 'account_status', 'business'].join(',');
const USER_FIELDS = ['id', 'name', 'email'].join(',');

/**
 * Generieke Graph-API GET. `extraParams` toegevoegd voor de insights-reads
 * (ads-watchdog Fase 1: level/date_preset/time_increment/effective_status) —
 * uitsluitend GET, de read-only-invariant van de insights-kant is statisch
 * verifieerbaar (ADR 2026-07-14-ads-watchdog-datamodel).
 */
export async function graphGet<T>(
  path: string,
  accessToken: string,
  fields?: string,
  extraParams?: Record<string, string>,
): Promise<T> {
  const cfg = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${cfg.apiVersion}/${path.replace(/^\//, '')}`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('appsecret_proof', appSecretProof(accessToken));
  if (fields) url.searchParams.set('fields', fields);
  for (const [k, v] of Object.entries(extraParams ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    let body: MetaErrorBody | undefined;
    try {
      body = (await res.json()) as MetaErrorBody;
    } catch {
      // non-JSON
    }
    if (body?.error) throw new MetaApiError(res.status, body);
    throw new MetaApiError(res.status, {
      error: { message: res.statusText, type: 'UnknownError', code: -1 },
    });
  }
  return (await res.json()) as T;
}

export async function fetchUserMe(accessToken: string): Promise<MetaUserMe> {
  return graphGet<MetaUserMe>('me', accessToken, USER_FIELDS);
}

export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const response = await graphGet<MetaAdAccountListResponse>(
    'me/adaccounts',
    accessToken,
    AD_ACCOUNT_FIELDS,
  );
  return response.data;
}
