// =============================================================
// Headless campaign-strategy-service — de campaign-strategy-chain als
// async AgentJob (publieke Brand-API Fase D4, ADR 2026-07-17).
//
// De volledige keten (context → concept → strategie → journey) duurt
// minuten en past niet in één serverless request; deze service dispatcht
// daarom een CAMPAIGN_STRATEGY_GENERATE-job en geeft direct campaignId +
// jobId terug. De aanroeper polt via getStrategyStatus. Tweede-deur-
// principe: de job schrijft exact hetzelfde blueprint-JSON in
// Campaign.strategy als de wizard-launch-flow, dus het resultaat is
// direct zichtbaar en bewerkbaar in de UI. Deliverables aanmaken uit het
// asset-plan is opt-in (createDeliverables, default false) — conform het
// "inhoud opslaan is opt-in"-principe uit de ADR.
// =============================================================

import { prisma } from '@/lib/prisma';
import { dispatchJob } from '@/lib/agents/jobs/dispatch';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getGoalType } from '@/features/campaigns/lib/goal-types';
import type { AgentJobStatus } from '@prisma/client';

/** Minimale briefing-lengte — een strategie zonder echte brief is gokwerk. */
const MIN_BRIEFING_CHARS = 30;

/** Diepte van de keten: 'quick' = één Flash-call, 'full' = insights + concepts + debate. */
export type StrategyMode = 'quick' | 'full';

export interface StartStrategyInput {
  workspaceId: string;
  /** Vrije-tekst campagne-brief (minimaal 30 tekens). */
  briefing: string;
  /** Goal-type-id uit de catalogus, bijv. "BRAND_AWARENESS" of "PRODUCT_LAUNCH". */
  campaignGoalType: string;
  campaignTitle?: string;
  /** Workspace-gescoped; zonder personaIds gebruikt de job alle workspace-personas (regen-pariteit). */
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  /** Default 'quick'. */
  mode?: StrategyMode;
  /** true = maak ook Deliverables uit het asset-plan (opt-in!); default false. */
  createDeliverables?: boolean;
  /** Bestaande campagne zonder strategie; zonder wordt een nieuwe STRATEGIC-campagne gemaakt. */
  campaignId?: string;
}

export type StrategyErrorCode =
  | 'BRIEFING_TOO_SHORT'
  | 'GOAL_TYPE_UNKNOWN'
  | 'CONTEXT_IDS_INVALID'
  | 'CAMPAIGN_NOT_FOUND'
  | 'CAMPAIGN_LOCKED'
  | 'CAMPAIGN_HAS_STRATEGY';

export type StartStrategyResult =
  | {
      ok: true;
      campaignId: string;
      jobId: string;
      /** true wanneer een al-lopende job voor deze campagne is hergebruikt. */
      deduped: boolean;
    }
  | { ok: false; code: StrategyErrorCode; error: string };

/** Job-status vertaald naar het publieke contract. */
export type PublicStrategyStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'none';

export type StrategyStatusResult =
  | {
      ok: true;
      campaignId: string;
      status: PublicStrategyStatus;
      error: string | null;
      hasStrategy: boolean;
      deliverablesCreated: number;
    }
  | { ok: false; code: StrategyErrorCode; error: string };

class StrategyError extends Error {
  constructor(
    public readonly code: StrategyErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Valideert de context-ids workspace-gescoped (patroon resolveContextSelection, P3.0a). */
async function validateContextIds(
  workspaceId: string,
  input: Pick<StartStrategyInput, 'personaIds' | 'productIds' | 'competitorIds'>,
): Promise<void> {
  const personaIds = input.personaIds ?? [];
  const productIds = input.productIds ?? [];
  const competitorIds = input.competitorIds ?? [];

  const [personas, products, competitors] = await Promise.all([
    personaIds.length
      ? prisma.persona.findMany({ where: { id: { in: personaIds }, workspaceId }, select: { id: true } })
      : [],
    productIds.length
      ? prisma.product.findMany({ where: { id: { in: productIds }, workspaceId }, select: { id: true } })
      : [],
    competitorIds.length
      ? prisma.competitor.findMany({ where: { id: { in: competitorIds }, workspaceId }, select: { id: true } })
      : [],
  ]);

  const missing = [
    ...personaIds.filter((id) => !personas.some((p) => p.id === id)),
    ...productIds.filter((id) => !products.some((p) => p.id === id)),
    ...competitorIds.filter((id) => !competitors.some((c) => c.id === id)),
  ];
  if (missing.length > 0) {
    throw new StrategyError('CONTEXT_IDS_INVALID', `Unknown context ids for this workspace: ${missing.join(', ')}`);
  }
}

/**
 * Maakt (of valideert) de doel-campagne. Een bestaande campagne mag geen
 * strategie hebben — overschrijven loopt via de UI-regenerate-flow, niet
 * via deze start-API.
 */
async function ensureStrategyCampaign(
  input: StartStrategyInput,
): Promise<{ id: string; title: string }> {
  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: input.campaignId, workspaceId: input.workspaceId, isArchived: false },
      select: { id: true, title: true, isLocked: true, strategy: true },
    });
    if (!campaign) throw new StrategyError('CAMPAIGN_NOT_FOUND', 'Campaign not found in this workspace');
    if (campaign.isLocked) {
      throw new StrategyError('CAMPAIGN_LOCKED', `Campaign "${campaign.title}" is locked. Unlock it first.`);
    }
    if (campaign.strategy !== null) {
      throw new StrategyError(
        'CAMPAIGN_HAS_STRATEGY',
        `Campaign "${campaign.title}" already has a strategy. Use the in-app regenerate flow to replace it.`,
      );
    }
    return { id: campaign.id, title: campaign.title };
  }

  const title = input.campaignTitle?.trim() || `${getGoalType(input.campaignGoalType)?.label ?? 'Campaign'} strategy`;
  // Zelfde slug-vorm als de wizard-launch-route: slugified titel + timestamp.
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + `-${Date.now()}`;

  return prisma.campaign.create({
    data: {
      title,
      slug,
      type: 'STRATEGIC',
      status: 'ACTIVE',
      workspaceId: input.workspaceId,
      campaignGoalType: input.campaignGoalType,
      // De brief als beschrijving — zo zijn de job-parameters ook in de UI
      // terug te lezen; Campaign.strategy blijft leeg tot de job klaar is.
      description: input.briefing.trim(),
    },
    select: { id: true, title: true },
  });
}

/**
 * Start de campaign-strategy-chain als async job. Valideert de input,
 * maakt (of valideert) de Campaign en dispatcht CAMPAIGN_STRATEGY_GENERATE.
 * Idempotent per campagne: een tweede start terwijl er al een job leeft
 * geeft dezelfde jobId terug (deduped=true). Gestructureerde fouten i.p.v.
 * throws — zelfde stijl als CreateAndGenerateResult (P3.0a).
 */
export async function startCampaignStrategyGeneration(
  input: StartStrategyInput,
): Promise<StartStrategyResult> {
  try {
    const briefing = input.briefing?.trim() ?? '';
    if (briefing.length < MIN_BRIEFING_CHARS) {
      throw new StrategyError(
        'BRIEFING_TOO_SHORT',
        `Briefing needs at least ${MIN_BRIEFING_CHARS} characters to produce a meaningful strategy`,
      );
    }
    if (!getGoalType(input.campaignGoalType)) {
      throw new StrategyError('GOAL_TYPE_UNKNOWN', `Unknown campaign goal type "${input.campaignGoalType}"`);
    }

    await validateContextIds(input.workspaceId, input);
    const campaign = await ensureStrategyCampaign({ ...input, briefing });

    // Al een levende job voor deze campagne? Join die i.p.v. dubbel draaien.
    const live = await prisma.agentJob.findFirst({
      where: {
        type: 'CAMPAIGN_STRATEGY_GENERATE',
        workspaceId: input.workspaceId,
        status: { in: ['PENDING', 'RUNNING', 'RETRY'] },
        payload: { path: ['campaignId'], equals: campaign.id },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (live) return { ok: true, campaignId: campaign.id, jobId: live.id, deduped: true };

    // Volgnummer-sleutel: dedupet gelijktijdige starts (zelfde key → dedupe-join
    // in dispatchJob) zonder een unique-violation na een eerdere FAILED/CANCELLED
    // run (die telt mee in seq, dus een herstart krijgt een verse sleutel).
    const seq = await prisma.agentJob.count({
      where: {
        type: 'CAMPAIGN_STRATEGY_GENERATE',
        payload: { path: ['campaignId'], equals: campaign.id },
      },
    });

    const job = await dispatchJob({
      type: 'CAMPAIGN_STRATEGY_GENERATE',
      workspaceId: input.workspaceId,
      payload: {
        campaignId: campaign.id,
        briefing,
        campaignGoalType: input.campaignGoalType,
        personaIds: input.personaIds ?? [],
        productIds: input.productIds ?? [],
        competitorIds: input.competitorIds ?? [],
        mode: input.mode ?? 'quick',
        createDeliverables: input.createDeliverables === true,
      },
      idempotencyKey: `campaign-strategy:${campaign.id}:${seq}`,
      // Eén automatische retry — de keten is duur (minuten AI-werk); de
      // charge is idempotent per job, dus een retry boekt niet dubbel af.
      maxAttempts: 2,
      triggeredBy: 'public-api',
    });

    invalidateCache(cacheKeys.prefixes.campaigns(input.workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(input.workspaceId));

    return { ok: true, campaignId: campaign.id, jobId: job.id, deduped: job.deduped };
  } catch (err) {
    if (err instanceof StrategyError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}

const STATUS_MAP: Record<AgentJobStatus, PublicStrategyStatus> = {
  PENDING: 'queued',
  RETRY: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Status van de recentste strategie-job voor een campagne + of het
 * blueprint al in Campaign.strategy staat. 'none' wanneer er (nog) geen
 * job bestaat — bijv. een campagne waarvan de strategie uit de wizard komt.
 */
export async function getStrategyStatus(
  workspaceId: string,
  campaignId: string,
): Promise<StrategyStatusResult> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    select: { id: true, strategy: true },
  });
  if (!campaign) {
    return { ok: false, code: 'CAMPAIGN_NOT_FOUND', error: 'Campaign not found in this workspace' };
  }

  const job = await prisma.agentJob.findFirst({
    where: {
      type: 'CAMPAIGN_STRATEGY_GENERATE',
      workspaceId,
      payload: { path: ['campaignId'], equals: campaignId },
    },
    orderBy: { createdAt: 'desc' },
    select: { status: true, errorMessage: true, result: true },
  });

  const result = (job?.result ?? {}) as { deliverablesCreated?: unknown };
  return {
    ok: true,
    campaignId,
    status: job ? STATUS_MAP[job.status] : 'none',
    error: job?.errorMessage ?? null,
    hasStrategy: campaign.strategy !== null,
    deliverablesCreated: typeof result.deliverablesCreated === 'number' ? result.deliverablesCreated : 0,
  };
}
