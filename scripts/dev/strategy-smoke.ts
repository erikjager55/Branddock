// Smoke-harnas voor de headless campaign-strategy-service (Fase D4,
// ADR 2026-07-17-public-brand-api).
//
// Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//        scripts/dev/strategy-smoke.ts
// Env: SMOKE_WORKSPACE (name-contains, default "Better brands")
//
// Valideert ZONDER AI-calls: de validatie-gates, een echte dispatch via de
// service (Campaign aangemaakt + AgentJob-rij PENDING met juiste
// type/payload), de status-functie ('queued'), dedupe van een tweede start
// en de herstart-na-CANCELLED-flow. Ruimt daarna alles op — achtergebleven
// PENDING-jobs maskeren scheduled runs (gotcha 2026-07-14).

// GEEN AI-calls: zonder CRON_SECRET is de kickWorker in dispatchJob een
// no-op, dus een lokaal draaiende dev-server pakt de job niet meteen op.
delete process.env.CRON_SECRET;

import { prisma } from '../../src/lib/prisma';
import {
  startCampaignStrategyGeneration,
  getStrategyStatus,
} from '../../src/lib/campaigns/headless-strategy';

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  PASS — ${label}`);
  } else {
    console.error(`  FAIL — ${label}`);
    process.exitCode = 1;
  }
}

const BRIEFING =
  'Smoke-briefing: lanceer een najaarscampagne rond duurzame merkgroei voor MKB-marketeers, met focus op geloofwaardige bewijsvoering.';

async function cleanup(campaignId: string): Promise<void> {
  // Jobs éérst (queue-vervuiling maskeert scheduled runs), dan de campagne.
  const jobs = await prisma.agentJob.deleteMany({
    where: {
      type: 'CAMPAIGN_STRATEGY_GENERATE',
      payload: { path: ['campaignId'], equals: campaignId },
    },
  });
  await prisma.campaign.deleteMany({ where: { id: campaignId } });
  console.log(`\nOpgeruimd: ${jobs.count} job(s) + campagne ${campaignId}`);
}

async function main(): Promise<void> {
  const nameContains = process.env.SMOKE_WORKSPACE ?? 'Better brands';
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: nameContains, mode: 'insensitive' } },
    select: { id: true, name: true },
  });
  if (!workspace) throw new Error(`Geen workspace met naam ~"${nameContains}"`);
  console.log(`Workspace: "${workspace.name}" (${workspace.id})\n`);

  console.log('1. Validatie-gates');
  const tooShort = await startCampaignStrategyGeneration({
    workspaceId: workspace.id,
    briefing: 'te kort',
    campaignGoalType: 'BRAND_AWARENESS',
  });
  assert(!tooShort.ok && tooShort.code === 'BRIEFING_TOO_SHORT', 'korte briefing → BRIEFING_TOO_SHORT');

  const badGoal = await startCampaignStrategyGeneration({
    workspaceId: workspace.id,
    briefing: BRIEFING,
    campaignGoalType: 'BESTAAT_NIET',
  });
  assert(!badGoal.ok && badGoal.code === 'GOAL_TYPE_UNKNOWN', 'onbekend goal-type → GOAL_TYPE_UNKNOWN');

  const badIds = await startCampaignStrategyGeneration({
    workspaceId: workspace.id,
    briefing: BRIEFING,
    campaignGoalType: 'BRAND_AWARENESS',
    personaIds: ['nep-persona-id'],
  });
  assert(!badIds.ok && badIds.code === 'CONTEXT_IDS_INVALID', 'onbekend persona-id → CONTEXT_IDS_INVALID');

  const badCampaign = await startCampaignStrategyGeneration({
    workspaceId: workspace.id,
    briefing: BRIEFING,
    campaignGoalType: 'BRAND_AWARENESS',
    campaignId: 'nep-campaign-id',
  });
  assert(!badCampaign.ok && badCampaign.code === 'CAMPAIGN_NOT_FOUND', 'onbekende campaignId → CAMPAIGN_NOT_FOUND');

  const badStatus = await getStrategyStatus(workspace.id, 'nep-campaign-id');
  assert(!badStatus.ok && badStatus.code === 'CAMPAIGN_NOT_FOUND', 'status van onbekende campagne → CAMPAIGN_NOT_FOUND');

  console.log('\n2. Start (echte dispatch, geen AI)');
  const started = await startCampaignStrategyGeneration({
    workspaceId: workspace.id,
    briefing: BRIEFING,
    campaignGoalType: 'BRAND_AWARENESS',
    campaignTitle: 'Strategy smoke (tijdelijk)',
    mode: 'quick',
  });
  if (!started.ok) throw new Error(`start faalde: ${started.error}`);
  console.log(`  campaignId=${started.campaignId} jobId=${started.jobId}`);
  assert(started.deduped === false, 'eerste start is geen dedupe');

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: started.campaignId },
      select: { title: true, type: true, status: true, campaignGoalType: true, strategy: true, workspaceId: true },
    });
    assert(campaign?.workspaceId === workspace.id, 'campagne in juiste workspace');
    assert(campaign?.type === 'STRATEGIC' && campaign.status === 'ACTIVE', 'campagne STRATEGIC/ACTIVE');
    assert(campaign?.campaignGoalType === 'BRAND_AWARENESS', 'goal-type opgeslagen');
    assert(campaign?.strategy === null, 'Campaign.strategy nog leeg (job niet gedraaid)');

    const job = await prisma.agentJob.findUnique({
      where: { id: started.jobId },
      select: { type: true, status: true, workspaceId: true, payload: true, idempotencyKey: true, maxAttempts: true },
    });
    const payload = (job?.payload ?? {}) as Record<string, unknown>;
    assert(job?.type === 'CAMPAIGN_STRATEGY_GENERATE', 'job-type CAMPAIGN_STRATEGY_GENERATE');
    assert(job?.status === 'PENDING', `job status PENDING (${job?.status})`);
    assert(job?.workspaceId === workspace.id, 'job workspace-gescoped');
    assert(payload.campaignId === started.campaignId, 'payload.campaignId correct');
    assert(payload.briefing === BRIEFING, 'payload.briefing correct');
    assert(payload.mode === 'quick' && payload.createDeliverables === false, 'payload mode=quick, createDeliverables=false (opt-in default)');
    assert(job?.idempotencyKey === `campaign-strategy:${started.campaignId}:0`, 'idempotencyKey volgnummer 0');

    console.log('\n3. Status-functie');
    const status = await getStrategyStatus(workspace.id, started.campaignId);
    assert(status.ok && status.status === 'queued', `status 'queued' (${status.ok ? status.status : status.code})`);
    assert(status.ok && status.hasStrategy === false, 'hasStrategy false');
    assert(status.ok && status.deliverablesCreated === 0, 'deliverablesCreated 0');

    console.log('\n4. Dedupe + herstart-na-CANCELLED');
    const second = await startCampaignStrategyGeneration({
      workspaceId: workspace.id,
      briefing: BRIEFING,
      campaignGoalType: 'BRAND_AWARENESS',
      campaignId: started.campaignId,
    });
    assert(second.ok && second.jobId === started.jobId && second.deduped, 'tweede start joint de levende job');

    await prisma.agentJob.update({
      where: { id: started.jobId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    const restarted = await startCampaignStrategyGeneration({
      workspaceId: workspace.id,
      briefing: BRIEFING,
      campaignGoalType: 'BRAND_AWARENESS',
      campaignId: started.campaignId,
    });
    assert(
      restarted.ok && restarted.jobId !== started.jobId,
      'herstart na CANCELLED maakt een nieuwe job (verse volgnummer-sleutel)',
    );
    const cancelledStatus = await getStrategyStatus(workspace.id, started.campaignId);
    assert(cancelledStatus.ok && cancelledStatus.status === 'queued', 'status volgt de recentste job');
  } finally {
    await cleanup(started.campaignId);
  }

  console.log('\nKlaar.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
