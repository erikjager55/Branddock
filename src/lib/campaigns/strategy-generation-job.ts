// =============================================================
// Campaign-strategy generation job driver (publieke Brand-API Fase D4).
//
// Draait de campaign-strategy-chain server-side vanuit de
// CAMPAIGN_STRATEGY_GENERATE-job: context → concept ('quick' = één
// Flash-call; 'full' = insights → concepts → debate) → concept-driven
// strategy → journey (channel- + asset-plan) → blueprint-JSON in
// Campaign.strategy — exact dezelfde shape als de wizard-launch-flow
// (ConceptStep handleApprove + CampaignBlueprint), zodat de UI het
// resultaat direct kan tonen/regenereren. Deliverables aanmaken is
// opt-in (payload.createDeliverables). Credit-metering: idempotente
// 'long-form'-afboeking per job bij succes — deze chain had nog géén
// metering (bewust nieuw, zie tasks/public-brand-api.md).
// =============================================================

import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { CREDIT_COSTS } from '@/lib/billing/credits/credit-costs';
import { PIPELINE_PRESETS } from '@/features/campaigns/lib/pipeline-config';
import {
  buildCreativePipelineContext,
  generateQuickConcept,
  generateInsights,
  generateCreativeConcepts,
  runCreativeDebate,
  buildConceptDrivenStrategy,
  elaborateJourney,
  createDeliverablesFromBlueprint,
} from '@/lib/campaigns/strategy-chain';
import type {
  CampaignBlueprint,
  CampaignBriefing,
  CreativeConcept,
  HumanInsight,
} from '@/lib/campaigns/strategy-blueprint.types';
import type { AgentJob } from '@/lib/agents/jobs/types';

/** Payload-shape van de CAMPAIGN_STRATEGY_GENERATE-job (gezet door headless-strategy.ts). */
interface StrategyJobPayload {
  campaignId?: string;
  briefing?: string;
  campaignGoalType?: string;
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  mode?: 'quick' | 'full';
  createDeliverables?: boolean;
}

type PipelineContext = Awaited<ReturnType<typeof buildCreativePipelineContext>>;

/** Labelt keten-fouten met de faal-stap zodat de job-error direct leesbaar is. */
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[${label}] ${msg}`);
  }
}

/** Zonder expliciete selectie: alle workspace-personas (regen-flow-pariteit). */
async function resolvePersonaIds(workspaceId: string, personaIds?: string[]): Promise<string[]> {
  if (personaIds && personaIds.length > 0) return personaIds;
  const personas = await prisma.persona.findMany({ where: { workspaceId }, select: { id: true } });
  return personas.map((p) => p.id);
}

/**
 * Concept-fase per mode. 'full' kiest na de parallelle concept-ronde het
 * concept met de hoogste stickiness-score (headless equivalent van de
 * gebruikerskeuze in de wizard) en verbetert dat via de creative debate.
 */
async function runConceptPhase(
  ctx: PipelineContext,
  mode: 'quick' | 'full',
): Promise<{ insight: HumanInsight; concept: CreativeConcept; debateContext?: string }> {
  if (mode !== 'full') {
    const quick = await step('Quick Concept', () => generateQuickConcept(ctx));
    return { insight: quick.insight, concept: quick.concept };
  }

  const mining = await step('Insight Mining', () => generateInsights(ctx));
  const insight = mining.insights[mining.selectedInsightIndex ?? 0] ?? mining.insights[0];

  const leap = await step('Creative Leap', () => generateCreativeConcepts(ctx, insight));
  const bestConcept = leap.concepts.reduce((best, candidate) =>
    (candidate.stickinessScore?.total ?? 0) > (best.stickinessScore?.total ?? 0) ? candidate : best,
  );

  const debate = await step('Creative Debate', () => runCreativeDebate(ctx, bestConcept, insight));
  return {
    insight,
    concept: debate.improvedConcept,
    debateContext: `Creative debate: ${debate.rounds.length} round(s), final creative score ${debate.finalScore}/100.`,
  };
}

/** Blueprint in de wizard-launch-shape (ConceptStep handleApprove + CQP-velden). */
function assembleBlueprint(args: {
  strategy: CampaignBlueprint['strategy'];
  architecture: CampaignBlueprint['architecture'];
  channelPlan: CampaignBlueprint['channelPlan'];
  assetPlan: CampaignBlueprint['assetPlan'];
  insight: HumanInsight;
  concept: CreativeConcept;
  payload: StrategyJobPayload;
  personaIds: string[];
  startedAt: number;
}): CampaignBlueprint {
  const modelsUsed = [
    ...new Set([args.insight.modelUsed, args.concept.modelUsed].filter((m): m is string => Boolean(m))),
  ];
  return {
    strategy: args.strategy,
    architecture: args.architecture,
    channelPlan: args.channelPlan,
    assetPlan: args.assetPlan,
    personaValidation: [],
    confidence: 0,
    confidenceBreakdown: {},
    generatedAt: new Date().toISOString(),
    variantAScore: 0,
    variantBScore: 0,
    variantCScore: 0,
    pipelineDuration: Date.now() - args.startedAt,
    modelsUsed,
    contextSelection: {
      personaIds: args.personaIds,
      productIds: args.payload.productIds ?? [],
      competitorIds: args.payload.competitorIds ?? [],
      trendIds: [],
    },
    selectedInsight: args.insight,
    selectedConcept: args.concept,
  };
}

/**
 * Voert de volledige strategie-keten uit voor één job. Idempotent: heeft de
 * campagne al een strategie (retry na een crash ná de persist), dan skipt de
 * run. Faalt een keten-stap, dan blijft Campaign.strategy leeg en draagt de
 * job-error het stap-label — geen half blueprint in de DB.
 */
export async function runCampaignStrategyGenerationJob(job: AgentJob): Promise<Record<string, unknown>> {
  const payload = (job.payload ?? {}) as StrategyJobPayload;
  const { campaignId, briefing, campaignGoalType } = payload;
  const workspaceId = job.workspaceId;
  if (!campaignId || !briefing || !campaignGoalType || !workspaceId) {
    throw new Error('CAMPAIGN_STRATEGY_GENERATE: campaignId + briefing + campaignGoalType + workspaceId vereist');
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    select: { id: true, title: true, strategy: true, startDate: true, endDate: true },
  });
  if (!campaign) throw new Error(`CAMPAIGN_STRATEGY_GENERATE: campaign ${campaignId} niet gevonden`);
  if (campaign.strategy !== null) {
    return { campaignId, skipped: true, reason: 'strategy already present' };
  }

  const startedAt = Date.now();
  const mode: 'quick' | 'full' = payload.mode === 'full' ? 'full' : 'quick';
  const personaIds = await resolvePersonaIds(workspaceId, payload.personaIds);

  // De vrije-tekst brief gaat als briefing-source mee — buildBriefingSection
  // injecteert die als "Reference Materials" (authoritative) in elke prompt
  // die de briefing consumeert; de gestructureerde briefing-velden blijven leeg.
  const briefingObj: CampaignBriefing = {
    sources: [{ type: 'text', title: 'Campaign briefing', extractedText: briefing }],
  };
  const wizardContext = {
    campaignName: campaign.title,
    campaignDescription: briefing,
    campaignGoalType,
    briefing: briefingObj,
  };

  const ctx = await step('Pipeline Context', () =>
    buildCreativePipelineContext(workspaceId, {
      campaignId,
      personaIds,
      productIds: payload.productIds,
      competitorIds: payload.competitorIds,
      wizardContext,
      pipelineConfig: mode === 'full'
        ? { ...PIPELINE_PRESETS.standard, creativeRange: 'critiqued' }
        : PIPELINE_PRESETS.quick,
    }),
  );

  const { insight, concept, debateContext } = await runConceptPhase(ctx, mode);

  const built = await step('Strategy Build', () =>
    buildConceptDrivenStrategy(ctx, concept, insight, debateContext),
  );

  const journey = await step('Journey Elaboration', () =>
    elaborateJourney(
      {
        synthesisFeedback: '',
        synthesizedStrategy: built.strategy,
        synthesizedArchitecture: built.architecture,
        personaValidation: [],
        wizardContext,
        personaIds,
        productIds: payload.productIds,
        competitorIds: payload.competitorIds,
      },
      workspaceId,
      undefined,
      campaignId,
    ),
  );
  const architecture = journey.architecture ?? built.architecture;

  const blueprint = assembleBlueprint({
    strategy: built.strategy,
    architecture,
    channelPlan: journey.channelPlan,
    assetPlan: journey.assetPlan,
    insight,
    concept,
    payload,
    personaIds,
    startedAt,
  });

  // JSON-roundtrip strip't undefined-velden — zelfde persist-vorm als de
  // wizard-launch-route (strategy ? JSON.parse(JSON.stringify(strategy)) : …).
  await step('Persist Blueprint', () =>
    prisma.campaign.update({
      where: { id: campaignId },
      data: { strategy: JSON.parse(JSON.stringify(blueprint)) },
    }),
  );

  let deliverablesCreated = 0;
  if (payload.createDeliverables === true && journey.assetPlan.deliverables.length > 0) {
    deliverablesCreated = await step('Create Deliverables', () =>
      createDeliverablesFromBlueprint(campaignId, journey.assetPlan.deliverables, {
        campaignStart: campaign.startDate,
        campaignEnd: campaign.endDate,
        phases: architecture.journeyPhases,
      }),
    );
  }

  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

  // Idempotente afboeking per job (retry boekt niet dubbel); post-hoc — de
  // strategie staat al, een charge-fout mag de job niet meer laten falen.
  await chargeAfter(
    {
      workspaceId,
      action: 'long-form',
      feature: 'campaign-strategy-generate',
      idempotencyKey: `strategy-charge:${job.id}`,
    },
    { actualCredits: CREDIT_COSTS['long-form'] },
  );

  // Metadata-only resultaat (geen strategie-inhoud in de job-rij).
  return {
    campaignId,
    mode,
    deliverablesCreated,
    durationMs: Date.now() - startedAt,
    modelsUsed: blueprint.modelsUsed,
  };
}
