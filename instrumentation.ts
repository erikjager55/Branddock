// Sentry server + edge instrumentation hook (Next.js 15+ pattern).
// No-op when SENTRY_DSN missing — dev/CI without DSN configured runs clean.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      // Capture but don't replay session in server runtime
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    });
  }
}

// Capture nested-router errors (Next.js 15+ requires explicit export).
export const onRequestError = Sentry.captureRequestError;
