// =============================================================
// Social OAuth Config Registry
//
// Platform-specific OAuth configurations for direct social media
// connections. Each platform entry contains authorization URLs,
// token endpoints, scopes, and env var references.
// =============================================================

export interface SocialOAuthConfig {
  platform: string;
  provider: string; // value stored in PublishChannel.provider
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
  /** How many days until access tokens expire (approximate) */
  accessTokenExpiryDays: number;
  supportsRefreshToken: boolean;
  /** Additional params to append to the authorization URL */
  extraAuthParams?: Record<string, string>;
}

const CONFIGS: SocialOAuthConfig[] = [
  {
    platform: 'linkedin',
    provider: 'linkedin-direct',
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email', 'w_member_social', 'w_organization_social'],
    clientIdEnvVar: 'LINKEDIN_CLIENT_ID',
    clientSecretEnvVar: 'LINKEDIN_CLIENT_SECRET',
    accessTokenExpiryDays: 60,
    supportsRefreshToken: true,
    extraAuthParams: { response_type: 'code' },
  },
  {
    platform: 'facebook',
    provider: 'facebook-direct',
    authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'public_profile'],
    clientIdEnvVar: 'META_APP_ID',
    clientSecretEnvVar: 'META_APP_SECRET',
    accessTokenExpiryDays: 60,
    supportsRefreshToken: false, // Meta uses long-lived token exchange instead
  },
  {
    platform: 'instagram',
    provider: 'instagram-direct',
    authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
      'public_profile',
    ],
    clientIdEnvVar: 'META_APP_ID',
    clientSecretEnvVar: 'META_APP_SECRET',
    accessTokenExpiryDays: 60,
    supportsRefreshToken: false,
  },
  {
    platform: 'tiktok',
    provider: 'tiktok-direct',
    authorizationUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    clientIdEnvVar: 'TIKTOK_CLIENT_KEY',
    clientSecretEnvVar: 'TIKTOK_CLIENT_SECRET',
    accessTokenExpiryDays: 1, // TikTok access tokens expire in 24 hours
    supportsRefreshToken: true,
    extraAuthParams: { response_type: 'code' },
  },
];

/**
 * Get the OAuth config for a given platform.
 * Returns null if the required env vars are not set.
 */
export function getOAuthConfig(platform: string): SocialOAuthConfig | null {
  const config = CONFIGS.find((c) => c.platform === platform);
  if (!config) return null;

  const clientId = process.env[config.clientIdEnvVar];
  const clientSecret = process.env[config.clientSecretEnvVar];
  if (!clientId || !clientSecret) return null;

  return config;
}

/** Get client ID from env var for a config */
export function getClientId(config: SocialOAuthConfig): string {
  const val = process.env[config.clientIdEnvVar];
  if (!val) throw new Error(`Missing env var: ${config.clientIdEnvVar}`);
  return val;
}

/** Get client secret from env var for a config */
export function getClientSecret(config: SocialOAuthConfig): string {
  const val = process.env[config.clientSecretEnvVar];
  if (!val) throw new Error(`Missing env var: ${config.clientSecretEnvVar}`);
  return val;
}

/** List all platforms that have OAuth credentials configured */
export function getConfiguredPlatforms(): string[] {
  return CONFIGS.filter((c) => {
    const clientId = process.env[c.clientIdEnvVar];
    const clientSecret = process.env[c.clientSecretEnvVar];
    return clientId && clientSecret;
  }).map((c) => c.platform);
}

/** All supported direct-connect platforms (regardless of env var config) */
export const SUPPORTED_PLATFORMS = CONFIGS.map((c) => c.platform);

/** Map from provider string to platform */
export const PROVIDER_TO_PLATFORM: Record<string, string> = Object.fromEntries(
  CONFIGS.map((c) => [c.provider, c.platform]),
);
