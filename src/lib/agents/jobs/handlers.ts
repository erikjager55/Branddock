// =============================================================
// Agent Job handler registry (4.4)
//
// Each job type maps to a handler function. Handlers are
// registered at module load so the runner can look them up by
// type without a giant switch. Built-ins live at the bottom;
// feature code (e.g. Brandclaw agent tasks) can call
// registerHandler() to plug its own in.
// =============================================================

import type { AgentJobType } from '@prisma/client';
import type { JobHandler } from './types';
import { decayOldMemories } from '@/lib/agents/memory';

const registry: Partial<Record<AgentJobType, JobHandler>> = {};

export function registerHandler(type: AgentJobType, handler: JobHandler) {
  registry[type] = handler;
}

export function getHandler(type: AgentJobType): JobHandler | null {
  return registry[type] ?? null;
}

export function listRegisteredTypes(): AgentJobType[] {
  return Object.keys(registry) as AgentJobType[];
}

// ─── Built-in handlers ─────────────────────────────────────

registerHandler('MEMORY_DECAY', async (job) => {
  const rows = await decayOldMemories({
    workspaceId: job.workspaceId ?? undefined,
  });
  return { decayedRows: rows };
});

registerHandler('HEARTBEAT', async (job) => {
  // No-op job used to verify the queue is flowing end-to-end.
  return { pingedAt: new Date().toISOString(), workspaceId: job.workspaceId };
});

registerHandler('AGENT_TASK', async (job) => {
  // Generic catch-all for Brandclaw agent tasks. Until Fase 6 ships
  // the actual agent loop, this handler simply logs the payload and
  // resolves — gives us an end-to-end path to validate dispatch /
  // retry / webhook plumbing without a real agent in place yet.
  console.info(`[agent-job ${job.id}] AGENT_TASK payload:`, job.payload);
  return { acknowledged: true };
});

registerHandler('BRANDSTYLE_SNAPSHOT_CLEANUP', async (job) => {
  const { cleanupSnapshots } = await import('@/lib/brandstyle/snapshots/snapshot-cleanup');
  const payload = (job.payload ?? {}) as {
    keepCount?: number;
    gracePeriodDays?: number;
    brandstyleId?: string;
  };
  const result = await cleanupSnapshots({
    keepCount: payload.keepCount,
    gracePeriodDays: payload.gracePeriodDays,
    brandstyleId: payload.brandstyleId,
  });
  return result as unknown as Record<string, unknown>;
});

// ─── Serverless-hardening: onboarding-pipelines op de queue (A1) ──────────
// Deze pipelines waren fire-and-forget in de route → op Vercel gekild na de
// response. De engine schrijft progress zelf naar de DB (brandStyleguide.
// analysisStatus), dus het client-polling-contract blijft ongewijzigd.

registerHandler('BRANDSTYLE_ANALYZE_URL', async (job) => {
  const { styleguideId, url } = (job.payload ?? {}) as { styleguideId?: string; url?: string };
  if (!styleguideId || !url) throw new Error('BRANDSTYLE_ANALYZE_URL: styleguideId + url vereist');
  const { analyzeUrl } = await import('@/lib/brandstyle/analysis-engine');
  await analyzeUrl(styleguideId, url);
  return { styleguideId };
});

registerHandler('BRANDSTYLE_ANALYZE_PDF', async (job) => {
  const { styleguideId, fileUrl, fileName } = (job.payload ?? {}) as {
    styleguideId?: string;
    fileUrl?: string;
    fileName?: string;
  };
  if (!styleguideId || !fileUrl || !fileName) {
    throw new Error('BRANDSTYLE_ANALYZE_PDF: styleguideId + fileUrl + fileName vereist');
  }
  const { fetchMediaAsBuffer } = await import('@/lib/storage/fetch-media-buffer');
  const { analyzePdf } = await import('@/lib/brandstyle/analysis-engine');
  const buffer = await fetchMediaAsBuffer(fileUrl, 'brandstyle-pdf');
  await analyzePdf(styleguideId, buffer, fileName);
  return { styleguideId };
});
