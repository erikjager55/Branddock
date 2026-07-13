// =============================================================
// SEO Generation Job driver (serverless-safe, resumable)
//
// Draait de `runSeoPipeline`-generator vanuit de SEO_GENERATE-job (in de
// cron-worker i.p.v. inline in de SSE-route). RESUMABLE: na élke stap
// checkpoint't 'ie de pipeline-state naar het record; nadert de invocation de
// worker-time-budget, dan enqueue't 'ie een continuation-job die vanaf de
// checkpoint verdergaat (de generator slaat voltooide stappen over). Zo
// overleeft een pipeline die langer duurt dan de worker-ceiling. De client polt
// het record; de generator persist zelf de DeliverableComponents na stap 8.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { CREDIT_COSTS } from '@/lib/billing/credits/credit-costs';
import type { CanvasContextStack } from './canvas-context';
import type {
  SeoInput,
  OptimizationGoal,
  SeoStepEvent,
  SeoPipelineState,
} from './seo-pipeline.types';

// Veilig onder de 800s worker-ceiling (vercel.json run-jobs): re-enqueue rond 10
// min zodat zelfs een trage stap ná de check nog binnen de ceiling afrondt.
const BUDGET_MS = 600_000;

export async function runSeoGenerationJob(jobId: string): Promise<void> {
  const job = await prisma.seoGenerationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`SeoGenerationJob ${jobId} not found`);
  if (job.status === 'COMPLETED') return; // idempotent

  await prisma.seoGenerationJob.update({ where: { id: jobId }, data: { status: 'RUNNING' } });

  const seoInput = job.seoInput as unknown as SeoInput;
  const optimizationGoals = job.optimizationGoals as OptimizationGoal[];
  const stack = job.contextStack as unknown as CanvasContextStack;
  const initialState = (job.state as unknown as SeoPipelineState | null) ?? undefined;

  const startedAt = Date.now();
  const { runSeoPipeline } = await import('./seo-pipeline');

  // Overhead-instrumentatie (job-queue-latency, Fase 3b uit de #387-meting):
  // de stap-timings dekken alleen de 8 wave-stappen; dit meet de rest van de
  // invocation. step:0 = handler-start → eerste stap-event (imports +
  // context-opbouw). step:9 = laatste checkpoint → COMPLETED — sinds Fase 4a
  // (stap 8 ∥ staart) is het laatste checkpoint het stap-8-einde en meet
  // step:9 dus het staart-RESTANT ná stap 8 + persist + charge; de échte
  // staart-duur komt als step:10 uit het complete-event (tailMs). Bij een
  // continuation-run meet step:0 de resume-setup van de laatste invocation
  // (de budget-return hieronder slaat het schrijfblok over —
  // single-invocation is het normale pad).
  let firstStepAt: number | null = null;
  let lastCheckpointAt: number | null = null;
  let tailMs: number | null = null;

  try {
    for await (const event of runSeoPipeline(
      job.deliverableId,
      job.workspaceId,
      seoInput,
      stack,
      job.voiceDirective,
      job.contentType,
      optimizationGoals,
      initialState,
    )) {
      if (event.event === 'seo_step') {
        const d = event.data as SeoStepEvent;
        if (firstStepAt === null) firstStepAt = Date.now();
        await prisma.seoGenerationJob.update({
          where: { id: jobId },
          data: { currentStep: d.step, stepLabel: d.label },
        });
      } else if (event.event === 'seo_checkpoint') {
        const { state } = event.data as { state: SeoPipelineState };
        lastCheckpointAt = Date.now();
        await prisma.seoGenerationJob.update({
          where: { id: jobId },
          data: { state: state as unknown as Prisma.InputJsonValue },
        });
        // Budget bijna op → continuation-job enqueuen + deze invocation netjes
        // afsluiten (return stopt de for-await → generator gesuspendeerd; de
        // continuation resumet vanaf de gecheckpointe state).
        if (Date.now() - startedAt > BUDGET_MS) {
          const { dispatchJob } = await import('@/lib/agents/jobs/dispatch');
          await dispatchJob({
            type: 'SEO_GENERATE',
            payload: { jobId },
            workspaceId: job.workspaceId,
            maxAttempts: 3,
            idempotencyKey: `seo-generate:${jobId}:resume:${state.outputs.length}`,
            triggeredBy: 'system',
          });
          return;
        }
      } else if (event.event === 'error') {
        const message = (event.data as { message?: string })?.message ?? 'SEO pipeline error';
        await prisma.seoGenerationJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', stepLabel: 'Failed', errors: { push: message } },
        });
        return; // domein-fout: geen throw (dure pipeline niet nodeloos retry-en)
      } else if (event.event === 'complete') {
        const d = event.data as { tailMs?: number };
        if (typeof d.tailMs === 'number') tailMs = d.tailMs;
      }
      // 'text_complete': de generator persist de DeliverableComponents.
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.seoGenerationJob
      .update({
        where: { id: jobId },
        data: { status: 'FAILED', stepLabel: 'Failed', errors: { push: message } },
      })
      .catch(() => {});
    throw err;
  }

  // Credit-afboeking (Fase 2, ADR 2026-07-07): vaste long-form-kost, idempotent per
  // job (de generator surfaced geen output-tokens hier; token-accurate afboeking is
  // een latere refinement). VÓÓR de COMPLETED-status zodat een crash tussendoor de
  // charge niet permanent overslaat (de COMPLETED-guard bovenaan zou 'm dan skippen);
  // de idempotencyKey dekt de re-dispatch. Post-hoc — nooit blokkeren.
  await chargeAfter(
    {
      workspaceId: job.workspaceId,
      action: 'long-form',
      feature: 'seo-generate',
      idempotencyKey: `seo-charge:${jobId}`,
    },
    { actualCredits: CREDIT_COSTS['long-form'] },
  );

  // Niet-stap-timings bijschrijven in de gepersisteerde state (append-only,
  // los van de generator-timings; de aggregatie-query groept op step).
  const extraTimings: { step: number; ms: number }[] = [];
  if (firstStepAt !== null) extraTimings.push({ step: 0, ms: firstStepAt - startedAt });
  if (lastCheckpointAt !== null) extraTimings.push({ step: 9, ms: Date.now() - lastCheckpointAt });
  if (tailMs !== null) extraTimings.push({ step: 10, ms: tailMs });
  if (extraTimings.length > 0) {
    const fresh = await prisma.seoGenerationJob.findUnique({
      where: { id: jobId },
      select: { state: true },
    });
    const st = (fresh?.state as unknown as SeoPipelineState | null) ?? null;
    if (st) {
      st.timings = [...(st.timings ?? []), ...extraTimings];
      await prisma.seoGenerationJob.update({
        where: { id: jobId },
        data: { state: st as unknown as Prisma.InputJsonValue },
      });
    }
  }

  await prisma.seoGenerationJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETED', stepLabel: 'Complete', currentStep: 8, completedAt: new Date() },
  });
}
