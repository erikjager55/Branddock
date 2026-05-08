import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN || 'assets.branddock.com';
const isProd = process.env.NODE_ENV === 'production';

// ─── Content-Security-Policy ────────────────────────────────
// Production-only: dev ships without CSP so Next.js HMR + eval keep working.
// 'unsafe-inline' / 'unsafe-eval' are required by Next.js runtime; tightening
// to nonce-based CSP is a post-launch hardening step.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Permissive img-src: user-supplied URLs + AI provider previews land in <img>
  "img-src 'self' data: blob: https:",
  // External AI calls go server-side; browser only talks to own API + Stripe
  "connect-src 'self' https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

// ─── Security headers (applied to every route) ─────────────
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'Content-Security-Policy', value: csp },
      ]
    : []),
];

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
      // Tree-shake Sentry SDK in non-production for smaller dev bundles
      disableLogger: true,
    })
  : nextConfig;
