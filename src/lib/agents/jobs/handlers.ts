// ─── Credit-keuze per job-type (Fase 2d, ADR 2026-07-07) ────────────────
// Achtergrond-jobs zijn grotendeels FLOOR-GEDEKT (€15 platform-floor) of
// setup/analyse (ZERO_COST_ACTIONS) en boeken dus GEEN credits:
//   ALIGNMENT_SCAN, TREND_RESEARCH, WEBSITE_SCAN, BRANDVOICE_ANALYZE_URL,
//   BRANDSTYLE_ANALYZE_URL/PDF ('setup'/'brand-analysis'), DAM_AUTO_TAG,
//   BUG_REPORT_ANALYZE, CHAT_FEEDBACK_ANALYZE (intern), RESERVATION_REAP.
// Credit-kostende output loopt via de eigen lib van de job:
//   SEO_GENERATE → chargeAfter in src/lib/ai/seo-generation-job.ts ('long-form').
//   AGENT_TASK → chargeAfter in src/lib/agents/registry/run-agent.ts (billable
//   agents, op COMPLETED — zie het blok onderaan dit bestand).
//   CAMPAIGN_STRATEGY_GENERATE → chargeAfter in
//   src/lib/campaigns/strategy-generation-job.ts ('long-form', publieke Brand-API D4).
// Nieuwe job-types: bepaal expliciet floor-gedekt vs output-kostend en leg de
// keuze hiér vast (audit-grep Fase 2d, gecompleteerd 2026-07-12).
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
  // Fase-2-brug (agents-scheduling): queue → registry → runAgent met
  // triggerType 'scheduled'. Payload-validatie + logica leven in
  // ./agent-task; lazy import houdt de cron-cold-start licht.
  const { runAgentTaskJob } = await import('./agent-task');
  return runAgentTaskJob(job);
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

// Tier 3 — waren fire-and-forget + in-memory progress-Map (kapot op serverless).
registerHandler('WEBSITE_SCAN', async (job) => {
  const { scanId, url, workspaceId, userId } = (job.payload ?? {}) as {
    scanId?: string;
    url?: string;
    workspaceId?: string;
    userId?: string;
  };
  if (!scanId || !url || !workspaceId || !userId) {
    throw new Error('WEBSITE_SCAN: scanId + url + workspaceId + userId vereist');
  }
  const { startScanPipeline } = await import('@/lib/website-scanner/scanner-pipeline');
  await startScanPipeline(scanId, url, workspaceId, userId);
  return { scanId };
});

registerHandler('BRANDVOICE_ANALYZE_URL', async (job) => {
  const { jobId, workspaceId, brandName, url, pastedSamples } = (job.payload ?? {}) as {
    jobId?: string;
    workspaceId?: string;
    brandName?: string | null;
    url?: string;
    pastedSamples?: string[];
  };
  if (!jobId || !workspaceId) throw new Error('BRANDVOICE_ANALYZE_URL: jobId + workspaceId vereist');
  const { startVoiceAnalysisPipeline } = await import('@/lib/brandvoice/voice-analyzer-engine');
  await startVoiceAnalysisPipeline({ jobId, workspaceId, brandName, url, pastedSamples });
  return { jobId };
});

// A3-deel-2 — SEO 8-staps-pipeline draait als queued job (was inline in de SSE-route
// die op Vercel na de time-limit gekild wordt). De job draait de generator ongewijzigd.
registerHandler('SEO_GENERATE', async (job) => {
  const { jobId } = (job.payload ?? {}) as { jobId?: string };
  if (!jobId) throw new Error('SEO_GENERATE: jobId vereist');
  const { runSeoGenerationJob } = await import('@/lib/ai/seo-generation-job');
  await runSeoGenerationJob(jobId);
  return { jobId };
});

// Publieke Brand-API Fase D4 — campaign-strategy-chain headless als async job
// (ADR 2026-07-17-public-brand-api). Payload-validatie + ketenlogica in de
// eigen module; lazy import houdt de cron-cold-start licht.
registerHandler('CAMPAIGN_STRATEGY_GENERATE', async (job) => {
  const { runCampaignStrategyGenerationJob } = await import('@/lib/campaigns/strategy-generation-job');
  return runCampaignStrategyGenerationJob(job);
});

// ─── Credit-billing (ADR 2026-07-07) — floor-vs-credit per job-type ──────────
// Beslissing (ADR: recurring achtergrond-AI + merk-DNA-setup = floor-gedekt = 0 cr;
// alleen user-facing content-output kost credits):
//   • CREDIT-KOSTEND: SEO_GENERATE (long-form-content) — de afboek-haak zit in
//     `runSeoGenerationJob` zelf (op COMPLETED, idempotent per job). AGENT_TASK
//     (Fase 2: draait catalogus-agents via run-agent) — de afboek-haak zit in
//     run-agent's chargeAfter (alleen def.billable-agents, op COMPLETED,
//     idempotent per run; proposals charged pas bij de confirm-route). Geen
//     haak in de handler zelf. CAMPAIGN_STRATEGY_GENERATE (Fase D4, publieke
//     Brand-API) — vlakke 'long-form'-afboeking in
//     `runCampaignStrategyGenerationJob` zelf (op succes, idempotent per job).
//   • FLOOR-GEDEKT (0 cr, GÉÉN haak): ALIGNMENT_SCAN, TREND_RESEARCH, DAM_AUTO_TAG,
//     BUG_REPORT_ANALYZE, CHAT_FEEDBACK_ANALYZE (recurring achtergrond-analyse) +
//     WEBSITE_SCAN, BRANDVOICE_ANALYZE_URL, BRANDSTYLE_ANALYZE_URL/PDF (merk-DNA-
//     setup, credit-vrij per ADR) + MEMORY_DECAY/HEARTBEAT/*_CLEANUP
//     (geen AI). Bewuste keuze — herzie alleen met expliciete ADR-aanvulling.

// Reaper: geef reserveringen vrij die tussen reserve en reconcile bleven hangen
// (gecrashte run). Draai periodiek via cron (Vercel Cron / dispatchJob).
registerHandler('RESERVATION_REAP', async (job) => {
  const { olderThanMinutes } = (job.payload ?? {}) as { olderThanMinutes?: number };
  const { reapStaleReservations } = await import('@/lib/billing/credits/reservation');
  const released = await reapStaleReservations(olderThanMinutes ?? 30);
  return { released };
});
