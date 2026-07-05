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

// Tier 2 — pure background-enrichment, geen client-progress-polling. Enqueue-only.
registerHandler('DAM_AUTO_TAG', async (job) => {
  const { assetId } = (job.payload ?? {}) as { assetId?: string };
  if (!assetId) throw new Error('DAM_AUTO_TAG: assetId vereist');
  const { tagMediaAssetIfPossible } = await import('@/lib/ai/dam-auto-tagger');
  await tagMediaAssetIfPossible(assetId);
  return { assetId };
});

registerHandler('BUG_REPORT_ANALYZE', async (job) => {
  const { bugId, workspaceId } = (job.payload ?? {}) as { bugId?: string; workspaceId?: string };
  if (!bugId || !workspaceId) throw new Error('BUG_REPORT_ANALYZE: bugId + workspaceId vereist');
  const { analyzeBugReport } = await import('@/lib/bug-analysis/analyze-bug');
  await analyzeBugReport(bugId, workspaceId);
  return { bugId };
});

registerHandler('CHAT_FEEDBACK_ANALYZE', async (job) => {
  const { feedbackId } = (job.payload ?? {}) as { feedbackId?: string };
  if (!feedbackId) throw new Error('CHAT_FEEDBACK_ANALYZE: feedbackId vereist');
  const { analyzeFeedback } = await import('@/lib/feedback-analysis/analyze-feedback');
  await analyzeFeedback(feedbackId);
  return { feedbackId };
});

// Tier 1-rest — DB-backed status (engine zet zelf COMPLETED/FAILED); alleen executie naar de queue.
registerHandler('ALIGNMENT_SCAN', async (job) => {
  const { scanId, workspaceId } = (job.payload ?? {}) as { scanId?: string; workspaceId?: string };
  if (!scanId || !workspaceId) throw new Error('ALIGNMENT_SCAN: scanId + workspaceId vereist');
  const { runScan } = await import('@/lib/alignment/scanner');
  await runScan(scanId, workspaceId);
  return { scanId };
});

registerHandler('TREND_RESEARCH', async (job) => {
  const { jobId, workspaceId, query, useBrandContext } = (job.payload ?? {}) as {
    jobId?: string;
    workspaceId?: string;
    query?: string;
    useBrandContext?: boolean;
  };
  if (!jobId || !workspaceId || !query) throw new Error('TREND_RESEARCH: jobId + workspaceId + query vereist');
  const { runTrendResearch } = await import('@/lib/trend-radar/researcher');
  await runTrendResearch(jobId, workspaceId, query, useBrandContext ?? false);
  return { jobId };
});
