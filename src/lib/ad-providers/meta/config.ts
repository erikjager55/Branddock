// =============================================================
// Meta provider config — env-driven, throws clear errors if
// unset so routes can return 503 "Meta integration not configured".
// =============================================================

import type { MetaProviderConfig } from './types';

const DEFAULT_API_VERSION = 'v20.0';
const SCOPES_OAUTH = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
] as const;

export const META_OAUTH_SCOPES = SCOPES_OAUTH;

let cached: MetaProviderConfig | null = null;

export class MetaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaConfigError';
  }
}

export function getMetaConfig(): MetaProviderConfig {
  if (cached) return cached;

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const apiVersion = process.env.META_API_VERSION ?? DEFAULT_API_VERSION;
  const explicitRedirect = process.env.META_REDIRECT_URI;
  const baseUrl = process.env.BETTER_AUTH_URL;

  if (!appId) {
    throw new MetaConfigError(
      'META_APP_ID env var is not set. Configure in Meta App Dashboard and add to .env.',
    );
  }
  if (!appSecret) {
    throw new MetaConfigError(
      'META_APP_SECRET env var is not set. Configure in Meta App Dashboard and add to .env.',
    );
  }

  const redirectUri =
    explicitRedirect ?? (baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/ad-accounts/meta/callback` : '');
  if (!redirectUri) {
    throw new MetaConfigError(
      'Cannot derive META_REDIRECT_URI: either set META_REDIRECT_URI or ensure BETTER_AUTH_URL is configured.',
    );
  }

  cached = { appId, appSecret, apiVersion, redirectUri };
  return cached;
}

/** Test-only: clear cache between cases that mutate process.env. */
export function _resetMetaConfigCacheForTesting(): void {
  cached = null;
}

/** Whether Meta integration is configured. Use to short-circuit UI affordances. */
export function isMetaConfigured(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}
