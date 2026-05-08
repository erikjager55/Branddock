// Sentry browser instrumentation hook (Next.js 15+ pattern).
// No-op when NEXT_PUBLIC_SENTRY_DSN missing — graceful failsafe, mirror van
// PostHog browser pattern in src/lib/analytics/posthog-browser.ts.

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
    // Performance + replay sampling — production-tight, dev-loose.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Session-replay disabled by default (privacy + bundle size). Opt-in
    // post-launch via dashboard sampling rules if useful.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [
      // Browser-tracing measures route-changes via the History API. Useful
      // for the hybride SPA (switch in src/App.tsx) since pageviews don't
      // fire via Next.js App-Router.
      Sentry.browserTracingIntegration(),
    ],
    // Filter out PII/noisy errors on the client.
    beforeSend(event, hint) {
      // ResizeObserver loop noise is a Chrome-internal warning — drop it.
      const error = hint.originalException;
      if (
        error instanceof Error &&
        /ResizeObserver loop/.test(error.message)
      ) {
        return null;
      }
      return event;
    },
  });
}

// Required for navigation tracing in Next.js App Router (Next.js 15+).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
