// =============================================================
// Headless SEO/GEO long-form (P3.2 Fase D1, ADR 2026-07-17-public-brand-api).
//
// De 8-staps SEO-pipeline is al volledig async (SeoGenerationJob +
// SEO_GENERATE-job-lane + resumable checkpoints + 80-credit-charge in de
// job-driver). Deze service is de dunne headless start: (optioneel) een
// deliverable aanmaken, de gate expliciet valideren (de orchestrator
// weigert stil — een API-caller verdient een duidelijke fout), en de
// bestaande orchestrator draaien tot het `seo_queued`-event de jobId
// oplevert. Status-polling leest de SeoGenerationJob-rij (workspace-
// gescoped — de rij draagt zelf workspaceId).
// =============================================================

import { prisma } from '@/lib/prisma';
import { orchestrateContentGeneration } from '@/lib/ai/canvas-orchestrator';
import { shouldRunSeoPipeline } from '@/lib/ai/seo-pipeline-utils';
import type { SeoInput } from '@/lib/ai/seo-pipeline.types';
import { SEO_STEP_DEFINITIONS } from '@/lib/ai/seo-pipeline.types';
import {
  createAndGenerateDeliverable,
  type ContextSelection,
  type ContentTypeInputs,
  type HeadlessBrief,
} from '@/lib/content/headless-create';

export interface StartSeoInput {
  workspaceId: string;
  /** Bestaande deliverable (website/long-form-type); zonder wordt er een aangemaakt. */
  deliverableId?: string;
  /** Vereist wanneer er geen deliverableId is. */
  contentType?: string;
  title?: string;
  brief?: HeadlessBrief;
  campaignId?: string;
  contextSelection?: ContextSelection;
  seoInput: SeoInput;
}

export type StartSeoResult =
  | { ok: true; deliverableId: string; jobId: string }
  | {
      ok: false;
      code:
        | 'KEYWORD_REQUIRED'
        | 'DELIVERABLE_NOT_FOUND'
        | 'SEO_NOT_APPLICABLE'
        | 'ENQUEUE_FAILED'
        | 'CREATE_FAILED';
      error: string;
    };

interface DeliverableTarget {
  id: string;
  contentType: string;
  contentTypeInputs: ContentTypeInputs;
}

async function resolveExistingDeliverable(
  workspaceId: string,
  deliverableId: string,
): Promise<DeliverableTarget | null> {
  const row = await prisma.deliverable.findFirst({
    where: { id: deliverableId, campaign: { workspaceId } },
    select: { id: true, contentType: true, settings: true },
  });
  if (!row) return null;
  const settings = (row.settings ?? {}) as Record<string, unknown>;
  const inputs = (settings.contentTypeInputs ?? {}) as ContentTypeInputs;
  return { id: row.id, contentType: row.contentType, contentTypeInputs: inputs };
}

/**
 * Start de SEO-pipeline headless. Maakt zonder `deliverableId` eerst een
 * deliverable aan (create-only, met `optimizationGoals: ['seo']`), valideert
 * de pipeline-gate expliciet en drained de orchestrator tot `seo_queued`.
 * De 80-credit-afboeking gebeurt idempotent in de bestaande job-driver.
 */
export async function startSeoGeneration(input: StartSeoInput): Promise<StartSeoResult> {
  if (!input.seoInput.primaryKeyword?.trim()) {
    return { ok: false, code: 'KEYWORD_REQUIRED', error: 'seoInput.primaryKeyword is required' };
  }

  let target: DeliverableTarget | null = null;
  if (input.deliverableId) {
    target = await resolveExistingDeliverable(input.workspaceId, input.deliverableId);
    if (!target) {
      return { ok: false, code: 'DELIVERABLE_NOT_FOUND', error: 'Deliverable not found in this workspace' };
    }
  } else {
    if (!input.contentType) {
      return { ok: false, code: 'CREATE_FAILED', error: 'contentType is required when no deliverableId is given' };
    }
    const contentTypeInputs: ContentTypeInputs = { optimizationGoals: ['seo'] };
    const created = await createAndGenerateDeliverable({
      workspaceId: input.workspaceId,
      campaignId: input.campaignId,
      contentType: input.contentType,
      title: input.title ?? `${input.seoInput.primaryKeyword} — long-form`,
      brief: input.brief ?? {},
      contentTypeInputs,
      contextSelection: input.contextSelection,
      generate: false,
    });
    if (!created.ok) {
      return { ok: false, code: 'CREATE_FAILED', error: `${created.code}: ${created.error}` };
    }
    target = { id: created.deliverableId, contentType: input.contentType, contentTypeInputs };
  }

  if (!shouldRunSeoPipeline(target.contentType, target.contentTypeInputs, true)) {
    return {
      ok: false,
      code: 'SEO_NOT_APPLICABLE',
      error:
        `Content type "${target.contentType}" komt niet in aanmerking voor de SEO-pipeline ` +
        '(vereist een website-type, of een long-form-type met optimizationGoals die "seo" bevat)',
    };
  }

  // De orchestrator maakt de SeoGenerationJob aan, dispatcht de job-lane en
  // yield't seo_queued — daarna returnt de generator direct (geen inline run).
  try {
    const generator = orchestrateContentGeneration(target.id, input.workspaceId, {
      seoInput: input.seoInput,
      contentTypeInputs: target.contentTypeInputs,
    });
    for await (const event of generator) {
      if (event.event === 'seo_queued') {
        const data = (event.data ?? {}) as Record<string, unknown>;
        if (typeof data.jobId === 'string') {
          return { ok: true, deliverableId: target.id, jobId: data.jobId };
        }
      } else if (event.event === 'error') {
        const data = (event.data ?? {}) as Record<string, unknown>;
        console.error('[headless-seo] orchestrator error', data.message);
        return { ok: false, code: 'ENQUEUE_FAILED', error: 'SEO generation failed' };
      }
    }
    return { ok: false, code: 'ENQUEUE_FAILED', error: 'Orchestrator finished without queueing a SEO job' };
  } catch (err) {
    console.error('[headless-seo]', err instanceof Error ? err.message : err);
    return { ok: false, code: 'ENQUEUE_FAILED', error: 'SEO enqueue failed' };
  }
}

export interface SeoStatus {
  jobId: string;
  deliverableId: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  stepLabel: string | null;
  errors: string[];
  completedAt: string | null;
}

/** Leest de status van een SEO-job, workspace-gescoped. Null bij onbekend/cross-workspace. */
export async function getSeoStatus(workspaceId: string, jobId: string): Promise<SeoStatus | null> {
  const job = await prisma.seoGenerationJob.findFirst({
    where: { id: jobId, workspaceId },
    select: {
      id: true,
      deliverableId: true,
      status: true,
      currentStep: true,
      totalSteps: true,
      errors: true,
      completedAt: true,
    },
  });
  if (!job) return null;
  const step = SEO_STEP_DEFINITIONS[job.currentStep - 1];
  return {
    jobId: job.id,
    deliverableId: job.deliverableId,
    status: job.status,
    currentStep: job.currentStep,
    totalSteps: job.totalSteps,
    stepLabel: step ? step.label : null,
    errors: job.errors,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
  };
}
