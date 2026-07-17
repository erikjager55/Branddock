import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { buildStaticSecurityHeaders } from "./src/lib/security/security-headers";

// next/image staat alleen expliciete hostnames toe. De storage-code serveert
// R2-objecten vanaf R2_PUBLIC_URL (volledige CDN-base-URL, r2-storage.ts) — pak
// daar de hostname uit i.p.v. een los R2_PUBLIC_DOMAIN dat de code niet leest.
const r2PublicDomain = (() => {
  const raw = process.env.R2_PUBLIC_URL;
  if (!raw) return 'assets.branddock.com';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
  } catch {
    return raw;
  }
})();
const isProd = process.env.NODE_ENV === 'production';

// ─── Security headers (applied to every route) ─────────────
// Waarden komen uit de gedeelde bron (src/lib/security/security-headers.ts).
// Sinds de nonce-stap (audit-rest 2026-07-17) zendt deze statische laag
// bewust GEEN CSP meer: de CSP komt per-request uit de edge-middleware
// (src/proxy.ts), anders zou een tweede statische policy de nonce ondermijnen
// (de browser enforce't de intersectie). De overige headers blijven hier als
// vangnet dubbel gezet.
const securityHeaders = Object.entries(buildStaticSecurityHeaders(isProd)).map(([key, value]) => ({
  key,
  value,
}));

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      // DiceBear avatars (persona fallback)
      { protocol: 'https', hostname: '*.dicebear.com' },
      // R2 object storage (production uploads)
      { protocol: 'https', hostname: r2PublicDomain },
      // Local development uploads
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry — withSentryConfig adds source-map upload + tunnel + auto
// instrumentation. Skipped (no-op) when SENTRY_DSN env-var is missing so dev
// builds don't try to upload source-maps. Production source-map upload
// requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT env-vars.
const sentryDsnConfigured = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryDsnConfigured
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      // Skip source-map upload when no auth token (dev-without-DSN safety net)
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
      },
      // Tunnel /monitoring → /api/sentry to bypass ad-blockers (optional)
      tunnelRoute: '/monitoring',
    })
  : nextConfig;
