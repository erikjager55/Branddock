// =============================================================
// SEO Generation Job driver (serverless-safe)
//
// Draait de bestaande `runSeoPipeline`-generator ONGEWIJZIGD vanuit de
// SEO_GENERATE-job (in de cron-worker i.p.v. inline in de SSE-route, die
// Vercel na de time-limit kilt) en schrijft de 8-stap-voortgang naar het
// SeoGenerationJob-record dat de client polt. De generator persist zelf de
// DeliverableComponents; hier markeren we enkel de job-status.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { CanvasContextStack } from './canvas-context';
import type { SeoInput, OptimizationGoal, SeoStepEvent } from './seo-pipeline.types';

export async function runSeoGenerationJob(jobId: string): Promise<void> {
  const job = await prisma.seoGenerationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`SeoGenerationJob ${jobId} not found`);
  if (job.status === 'COMPLETED') return; // idempotent — geen dubbele run

  await prisma.seoGenerationJob.update({ where: { id: jobId }, data: { status: 'RUNNING' } });

  const seoInput = job.seoInput as unknown as SeoInput;
  const optimizationGoals = job.optimizationGoals as OptimizationGoal[];
  const stack = job.contextStack as unknown as CanvasContextStack;

  const { runSeoPipeline } = await import('./seo-pipeline');

  try {
    for await (const event of runSeoPipeline(
      job.deliverableId,
      job.workspaceId,
      seoInput,
      stack,
      job.voiceDirective,
      job.contentType,
      optimizationGoals,
    )) {
      if (event.event === 'seo_step') {
        const d = event.data as SeoStepEvent;
        await prisma.seoGenerationJob.update({
          where: { id: jobId },
          data: { currentStep: d.step, stepLabel: d.label },
        });
      } else if (event.event === 'error') {
        const message = (event.data as { message?: string })?.message ?? 'SEO pipeline error';
        await prisma.seoGenerationJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', stepLabel: 'Failed', errors: { push: message } },
        });
        return; // domein-fout: geen throw (dure pipeline niet nodeloos retry-en)
      }
      // 'text_complete' + 'complete': de generator heeft de DeliverableComponents
      // al gepersisteerd; hier niets te doen.
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.seoGenerationJob
      .update({
        where: { id: jobId },
        data: { status: 'FAILED', stepLabel: 'Failed', errors: { push: message } },
      })
      .catch(() => {});
    throw err; // onverwachte fout → laat de queue 'm (beperkt) retry-en
  }

  await prisma.seoGenerationJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETED', stepLabel: 'Complete', currentStep: 8, completedAt: new Date() },
  });
}
