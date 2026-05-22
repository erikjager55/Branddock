// =============================================================
// Meta OAuth helpers — token-exchange, long-lived conversion,
// refresh. Used door /api/ad-accounts/meta/* routes.
//
// Source: https://developers.facebook.com/docs/marketing-api/access
// =============================================================

import { createHmac } from 'crypto';

import { getMetaConfig, META_OAUTH_SCOPES } from './config';
import {
  MetaApiError,
  type MetaErrorBody,
  type MetaLongLivedTokenResponse,
  type MetaShortLivedTokenResponse,
} from './types';

/**
 * Build the OAuth dialog URL the user is redirected to.
 * `state` is a CSRF-protection token that the callback verifies.
 */
export function buildAuthorizeUrl(state: string): string {
  const cfg = getMetaConfig();
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    state,
    scope: META_OAUTH_SCOPES.join(','),
    response_type: 'code',
  });
  return `https://www.facebook.com/${cfg.apiVersion}/dialog/oauth?${params.toString()}`;
}

/** Exchange the `?code=…` from the callback for a short-lived access token. */
export async function exchangeCodeForShortLivedToken(
  code: string,
): Promise<MetaShortLivedTokenResponse> {
  const cfg = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${cfg.apiVersion}/oauth/access_token`);
  url.searchParams.set('client_id', cfg.appId);
  url.searchParams.set('client_secret', cfg.appSecret);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) await throwApiError(res);
  return (await res.json()) as MetaShortLivedTokenResponse;
}

/** Convert a short-lived token (1h) into a long-lived one (~60d). */
export async function convertToLongLivedToken(
  shortLivedToken: string,
): Promise<MetaLongLivedTokenResponse> {
  const cfg = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${cfg.apiVersion}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', cfg.appId);
  url.searchParams.set('client_secret', cfg.appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) await throwApiError(res);
  return (await res.json()) as MetaLongLivedTokenResponse;
}

/**
 * Refresh a long-lived token. Meta's flow is: take the existing
 * long-lived token, hand it to the same fb_exchange_token endpoint —
 * it gives you a new 60-day token. Used by both scheduled cron + inline
 * pre-publish refresh.
 */
export async function refreshLongLivedToken(
  currentToken: string,
): Promise<MetaLongLivedTokenResponse> {
  return convertToLongLivedToken(currentToken);
}

/**
 * Compute the `appsecret_proof` HMAC for Meta Graph API calls.
 * Required when calling Graph endpoints with a user/long-lived token to
 * defend against token-leakage replay attacks.
 */
export function appSecretProof(accessToken: string): string {
  const cfg = getMetaConfig();
  return createHmac('sha256', cfg.appSecret).update(accessToken).digest('hex');
}

async function throwApiError(res: Response): Promise<never> {
  let body: MetaErrorBody | undefined;
  try {
    body = (await res.json()) as MetaErrorBody;
  } catch {
    // non-JSON body — fall back to status-text
  }
  if (body?.error) throw new MetaApiError(res.status, body);
  throw new MetaApiError(res.status, {
    error: {
      message: `Non-JSON error response from Meta: ${res.statusText}`,
      type: 'UnknownError',
      code: -1,
    },
  });
}
