// =============================================================
// OAuth Provider Configuration
//
// Helper to check which OAuth providers are enabled based on
// environment variables. Providers without configured credentials
// are gracefully excluded — no buttons shown, no errors thrown.
// =============================================================

export type OAuthProviderId = 'google' | 'microsoft' | 'apple';

export interface OAuthProviderConfig {
  id: OAuthProviderId;
  name: string;
  enabled: boolean;
}

const PROVIDER_CONFIGS: Record<OAuthProviderId, { name: string; requiredEnvVars: string[] }> = {
  google: {
    name: 'Google',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
  microsoft: {
    name: 'Microsoft',
    requiredEnvVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
  },
  apple: {
    name: 'Apple',
    requiredEnvVars: ['APPLE_CLIENT_ID', 'APPLE_CLIENT_SECRET'],
  },
};

/**
 * Check if a specific OAuth provider is enabled (has required env vars set).
 */
export function isProviderEnabled(provider: OAuthProviderId): boolean {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) return false;
  return config.requiredEnvVars.every((envVar) => !!process.env[envVar]);
}

/**
 * Returns list of all enabled OAuth providers with their display names.
 * Used by UI to conditionally render social login buttons.
 */
export function getEnabledProviders(): OAuthProviderConfig[] {
  return (Object.keys(PROVIDER_CONFIGS) as OAuthProviderId[])
    .map((id) => ({
      id,
      name: PROVIDER_CONFIGS[id].name,
      enabled: isProviderEnabled(id),
    }))
    .filter((p) => p.enabled);
}
