// =============================================================
// PostHog server-side analytics (4.5 — Feedback Engine)
//
// Singleton PostHog client that captures product + agent events.
// Graceful no-op when POSTHOG_API_KEY is not set, so local dev and
// CI do not emit telemetry. Events are enriched with workspace-level
// properties (plan tier, brand-foundation coverage) so we can slice
// agent behaviour by workspace segment later.
//
// Use `trackEvent({ event, workspaceId, userId, properties })` from
// anywhere in server code. Do NOT call from client bundles — browser
// tracking can land in a follow-up if we need it.
// =============================================================

import { PostHog } from 'posthog-node';
import { prisma } from '@/lib/prisma';

// ─── Client singleton ──────────────────────────────────────

const globalForPostHog = globalThis as unknown as {
  posthog: PostHog | null | undefined;
};

function createClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;
  const host = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com';
  return new PostHog(apiKey, {
    host,
    flushAt: 20,
    flushInterval: 10_000,
  });
}

/** Null in dev / unconfigured environments. */
export const posthog: PostHog | null =
  globalForPostHog.posthog ??= createClient();

export function isAnalyticsConfigured(): boolean {
  return posthog !== null;
}

// ─── Enrichment ────────────────────────────────────────────

const DEFAULT_CONTEXT = {
  app: 'branddock',
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
};

/** Cache workspace enrichment for 60s so we do not re-hit DB per event. */
const enrichmentCache = new Map<string, { props: Record<string, unknown>; expiresAt: number }>();
const ENRICHMENT_TTL_MS = 60_000;

async function enrichForWorkspace(workspaceId: string): Promise<Record<string, unknown>> {
  const cached = enrichmentCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached.props;

  try {
    const [workspace, brandAssetCount, brandAssetReadyCount] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, planTier: true, organizationId: true, createdAt: true },
      }),
      prisma.brandAsset.count({ where: { workspaceId } }),
      // READY status is the canonical "content is filled + validated" signal.
      prisma.brandAsset.count({ where: { workspaceId, status: 'READY' } }),
    ]);

    const coverage = brandAssetCount > 0
      ? Math.round((brandAssetReadyCount / brandAssetCount) * 100)
      : 0;

    const props: Record<string, unknown> = {
      workspace_id: workspaceId,
      workspace_name: workspace?.name ?? null,
      workspace_plan: workspace?.planTier ?? 'FREE',
      workspace_created_at: workspace?.createdAt?.toISOString() ?? null,
      organization_id: workspace?.organizationId ?? null,
      brand_foundation_coverage: coverage,
      brand_asset_count: brandAssetCount,
    };

    enrichmentCache.set(workspaceId, { props, expiresAt: Date.now() + ENRICHMENT_TTL_MS });
    return props;
  } catch (err) {
    console.warn('[analytics] enrichForWorkspace failed:', err instanceof Error ? err.message : err);
    return { workspace_id: workspaceId };
  }
}

// ─── Public API ────────────────────────────────────────────

export interface TrackEventInput {
  event: string;
  /** Preferred distinct id. When omitted, falls back to workspaceId or "system". */
  userId?: string | null;
  workspaceId?: string | null;
  properties?: Record<string, unknown>;
  /** Skip workspace enrichment. Useful for hot paths. */
  skipEnrichment?: boolean;
  /** Groups allow PostHog group analytics across workspaces / orgs. */
  groups?: Record<string, string>;
}

/**
 * Fire a server-side event. Always async but never throws — analytics
 * failures must not break the calling request path.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  if (!posthog) return;

  try {
    const distinctId = input.userId ?? input.workspaceId ?? 'system';

    const workspaceProps = input.workspaceId && !input.skipEnrichment
      ? await enrichForWorkspace(input.workspaceId)
      : input.workspaceId
        ? { workspace_id: input.workspaceId }
        : {};

    const groups: Record<string, string> = { ...(input.groups ?? {}) };
    if (input.workspaceId) groups.workspace = input.workspaceId;

    posthog.capture({
      distinctId,
      event: input.event,
      properties: {
        ...DEFAULT_CONTEXT,
        ...workspaceProps,
        ...(input.properties ?? {}),
      },
      groups: Object.keys(groups).length > 0 ? groups : undefined,
    });
  } catch (err) {
    console.warn('[analytics] trackEvent failed:', err instanceof Error ? err.message : err);
  }
}

/** Flush pending events. Call during graceful shutdown. */
export async function flushAnalytics(): Promise<void> {
  if (!posthog) return;
  try {
    await posthog.flush();
  } catch (err) {
    console.warn('[analytics] flushAnalytics failed:', err instanceof Error ? err.message : err);
  }
}
