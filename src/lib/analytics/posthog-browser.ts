// =============================================================
// PostHog browser-side analytics.
//
// Mirror van src/lib/analytics/posthog.ts (server-side), maar dan voor
// het browser-bundle. Zelfde failsafe: zonder NEXT_PUBLIC_POSTHOG_KEY
// is alles een no-op zodat dev/CI niet hoeven te telemetrieren.
//
// Use via React provider (PostHogProvider.tsx) of direct via
// trackBrowserEvent / identifyUser / resetUser helpers.
// =============================================================

import type { PostHog } from 'posthog-js';

let client: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

function getApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

function getHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
}

/**
 * Lazy-init PostHog browser client. Returns null in environments without
 * NEXT_PUBLIC_POSTHOG_KEY so callers can `?.` chain without conditionals.
 *
 * Auto-pageview + auto-capture are enabled by default — Branddock is a
 * hybride SPA (switch in src/App.tsx) so we rely on PostHog's history-api
 * detection rather than Next.js App-Router pathname tracking.
 */
export async function ensurePostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null;
  if (client) return client;
  if (initPromise) return initPromise;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  initPromise = (async () => {
    const mod = await import('posthog-js');
    const posthog = mod.default;
    posthog.init(apiKey, {
      api_host: getHost(),
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: 'identified_only',
      // Disable session-recording by default; opt-in pre-launch via dashboard
      // setting if/when needed.
      disable_session_recording: true,
    });
    client = posthog;
    return posthog;
  })();

  return initPromise;
}

export function isBrowserAnalyticsConfigured(): boolean {
  return !!getApiKey();
}

export interface IdentifyInput {
  userId: string;
  email?: string;
  name?: string;
  workspaceId?: string;
  workspaceName?: string;
  organizationId?: string;
}

/**
 * Bind subsequent events to this user. Safe to call multiple times — PostHog
 * de-dupes by distinctId. When workspace/org info is provided, also wires
 * group analytics so dashboards can slice by workspace.
 */
export async function identifyUser(input: IdentifyInput): Promise<void> {
  const posthog = await ensurePostHog();
  if (!posthog) return;
  try {
    posthog.identify(input.userId, {
      email: input.email,
      name: input.name,
    });
    if (input.workspaceId) {
      posthog.group('workspace', input.workspaceId, {
        name: input.workspaceName,
      });
    }
    if (input.organizationId) {
      posthog.group('organization', input.organizationId);
    }
  } catch (err) {
    console.warn('[posthog-browser] identifyUser failed:', err);
  }
}

/**
 * Manual event capture. Use the helper hooks (useTrack) in components
 * for ergonomics; this is the underlying primitive.
 */
export async function trackBrowserEvent(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const posthog = await ensurePostHog();
  if (!posthog) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.warn('[posthog-browser] trackBrowserEvent failed:', err);
  }
}

/** Clear identity on logout. Must call before the auth-cookie is wiped. */
export async function resetUser(): Promise<void> {
  const posthog = await ensurePostHog();
  if (!posthog) return;
  try {
    posthog.reset();
  } catch (err) {
    console.warn('[posthog-browser] resetUser failed:', err);
  }
}
