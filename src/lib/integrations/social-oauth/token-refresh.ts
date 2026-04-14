// =============================================================
// Token Refresh — on-demand refresh before each publish attempt
//
// Each platform has different refresh mechanics:
// - LinkedIn: standard refresh_token grant
// - Meta (Facebook/Instagram): long-lived token exchange
// - TikTok: standard refresh_token grant
// =============================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getOAuthConfig, getClientId, getClientSecret, PROVIDER_TO_PLATFORM } from './oauth-config';

export interface StoredCredentials {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry: string; // ISO 8601
  userId: string;
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  profileType?: 'personal' | 'page';
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * Check if a channel's token needs refreshing, and refresh if so.
 * Returns the (possibly updated) credentials, or throws if refresh fails.
 */
export async function refreshTokenIfNeeded(
  channelId: string,
  provider: string,
  credentials: StoredCredentials,
): Promise<StoredCredentials> {
  const expiry = new Date(credentials.tokenExpiry).getTime();
  const now = Date.now();

  // Token still valid
  if (now + REFRESH_BUFFER_MS < expiry) {
    return credentials;
  }

  // For page access tokens (Meta), these don't expire — use pageAccessToken directly
  if (credentials.pageAccessToken && (provider === 'facebook-direct' || provider === 'instagram-direct')) {
    return credentials;
  }

  const platform = PROVIDER_TO_PLATFORM[provider];
  if (!platform) throw new Error(`Unknown provider: ${provider}`);

  const config = getOAuthConfig(platform);
  if (!config) throw new Error(`OAuth not configured for ${platform}`);

  if (!credentials.refreshToken) {
    throw new Error(`Token expired and no refresh token available for ${platform}. Please reconnect.`);
  }

  const refreshed = await refreshToken(config, credentials);

  // Persist updated tokens
  await prisma.publishChannel.update({
    where: { id: channelId },
    data: { credentials: refreshed as unknown as Prisma.InputJsonValue },
  });

  return refreshed;
}

async function refreshToken(
  config: { platform: string; tokenUrl: string },
  credentials: StoredCredentials,
): Promise<StoredCredentials> {
  switch (config.platform) {
    case 'linkedin':
      return refreshLinkedIn(config.tokenUrl, credentials);
    case 'facebook':
    case 'instagram':
      return refreshMeta(credentials);
    case 'tiktok':
      return refreshTikTok(config.tokenUrl, credentials);
    default:
      throw new Error(`Token refresh not implemented for ${config.platform}`);
  }
}

async function refreshLinkedIn(tokenUrl: string, creds: StoredCredentials): Promise<StoredCredentials> {
  const config = getOAuthConfig('linkedin')!;
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: creds.refreshToken!,
    client_id: getClientId(config),
    client_secret: getClientSecret(config),
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LinkedIn token refresh failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const expiresIn = data.expires_in ?? 60 * 60 * 24 * 60; // default 60 days

  return {
    ...creds,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? creds.refreshToken,
    tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

async function refreshMeta(creds: StoredCredentials): Promise<StoredCredentials> {
  // Exchange short-lived token for long-lived token
  const config = getOAuthConfig('facebook')!;
  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', getClientId(config));
  url.searchParams.set('client_secret', getClientSecret(config));
  url.searchParams.set('fb_exchange_token', creds.accessToken);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Meta token exchange failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const expiresIn = data.expires_in ?? 60 * 60 * 24 * 60;

  return {
    ...creds,
    accessToken: data.access_token,
    tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

async function refreshTikTok(tokenUrl: string, creds: StoredCredentials): Promise<StoredCredentials> {
  const config = getOAuthConfig('tiktok')!;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: creds.refreshToken!,
      client_key: getClientId(config),
      client_secret: getClientSecret(config),
    }).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TikTok token refresh failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const expiresIn = data.expires_in ?? 60 * 60 * 24;

  return {
    ...creds,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? creds.refreshToken,
    tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/** Check if a token is expired or about to expire */
export function isTokenExpired(tokenExpiry: string): boolean {
  return new Date(tokenExpiry).getTime() - REFRESH_BUFFER_MS < Date.now();
}

/** Get token health status for UI display */
export function getTokenHealth(tokenExpiry: string): 'valid' | 'expiring' | 'expired' {
  const expiryMs = new Date(tokenExpiry).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (expiryMs < now) return 'expired';
  if (expiryMs - now < sevenDays) return 'expiring';
  return 'valid';
}
