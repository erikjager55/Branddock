// =============================================================
// Publieke Brand-API — metadata-only gebruikslogging (ADR 2026-07-17).
//
// Principe: "inhoud opslaan is opt-in, gedrag meten is metadata" — we loggen
// wélke tool, wanneer, hoe lang en hoeveel credits; nooit prompt- of
// content-inhoud. Dubbel spoor: ApiCallLog (roadmap-analyse, queryable per
// workspace/tool/week) + PostHog (bestaande product-analytics). Fail-soft:
// logging mag een geslaagde aanroep nooit laten falen.
// =============================================================

import { prisma } from '@/lib/prisma';

export interface ApiCallMeta {
  workspaceId: string;
  tool: string;
  authVia: 'api_key' | 'oauth';
  success: boolean;
  latencyMs: number;
  credits?: number;
}

export async function logApiCall(meta: ApiCallMeta): Promise<void> {
  try {
    await prisma.apiCallLog.create({
      data: {
        workspaceId: meta.workspaceId,
        tool: meta.tool,
        authVia: meta.authVia,
        success: meta.success,
        latencyMs: meta.latencyMs,
        credits: meta.credits ?? 0,
      },
    });
    const { trackEvent } = await import('@/lib/analytics/posthog');
    await trackEvent({
      event: 'public_api_call',
      workspaceId: meta.workspaceId,
      properties: {
        tool: meta.tool,
        auth_via: meta.authVia,
        success: meta.success,
        latency_ms: meta.latencyMs,
        credits: meta.credits ?? 0,
      },
    });
  } catch (err) {
    console.warn('[public-api] usage-log faalde', {
      tool: meta.tool,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
