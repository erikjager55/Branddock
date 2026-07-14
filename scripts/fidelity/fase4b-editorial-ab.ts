// =============================================================
// Fase-4b F-VAL-A/B — gepaard experiment rond stap 7 (editorial review).
// Uitkomst 2026-07-14: NO-GO, stap 7 blijft (zie tasks/seo-pipeline-speedup.md
// §Fase 4b). Herdraaibaar met meer briefs voor een later herbezoek.
//
// Generatie op prod: dit script (DATABASE_URL = Neon) maakt een gelabelde
// wegwerp-campaign+deliverable in de BB-prod-workspace, bouwt stack +
// voiceDirective lokaal (pure DB-reads) en insert een SeoGenerationJob +
// AgentJob — de prod-cron draait de pipeline met de prod-AI-keys. Daarna
// leest 'run' de stap-6/7-outputs uit de checkpointed state (gepaard: één
// run levert beide armen) en scoort ze LOKAAL (judge = OpenAI gpt-5,
// cross-family; skipPersist).
//
// Fasen: start <idx> | collect <idx> | cleanup
// Env: DATABASE_URL=<neon> + OPENAI_API_KEY (scoring). BB-org is unlimited
// (geen credit-impact); AI-kosten gesanctioneerd door de taak.
// =============================================================

import fs from 'node:fs';
import { prisma } from '@/lib/prisma';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { buildBrandVoiceDirectiveFromContext } from '@/lib/studio/brand-voice-directive';
import { buildHumanVoiceDirective } from '@/lib/studio/human-voice-directive';
import { runFidelityScoring } from '@/lib/brand-fidelity/fidelity-runner';
import type { SeoPipelineState, EditorialReview } from '@/lib/ai/seo-pipeline.types';
import type { Prisma } from '@prisma/client';

const WORKSPACE_ID = process.env.AB_WORKSPACE_ID ?? 'cmr4znouo000204ic257g3gcn'; // default: BB-prod (voiceguide 20, org unlimited)
const OUT_DIR = process.env.AB_OUT_DIR ?? '/tmp';

const BRIEFS = [
  { primaryKeyword: 'duurzame merkstrategie voor mkb', funnelStage: 'awareness' },
  { primaryKeyword: 'employer branding voor scale-ups', funnelStage: 'consideration' },
  { primaryKeyword: 'rebranding zonder klantverlies', funnelStage: 'decision' },
  { primaryKeyword: 'merkarchetypen in b2b marketing', funnelStage: 'awareness' },
] as const;

const stripFences = (s: string): string =>
  s.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

async function main() {
  const phase = process.argv[2];
  const idx = Number(process.argv[3] ?? 0);

  if (phase === 'start') {
    const brief = BRIEFS[idx];
    const campaign = await prisma.campaign.create({
      data: { workspaceId: WORKSPACE_ID, title: `_fase4b-ab-${idx} (Claude-meting, mag weg)`, slug: `fase4b-ab-${idx}`, type: 'QUICK' },
    });
    const deliverable = await prisma.deliverable.create({
      data: { campaignId: campaign.id, title: `fase4b ${brief.primaryKeyword}`, contentType: 'blog-post', status: 'NOT_STARTED' },
    });
    const stack = await assembleCanvasContext(deliverable.id, WORKSPACE_ID);
    const bvd = buildBrandVoiceDirectiveFromContext(stack.brand, {
      deliverableTypeId: stack.deliverableTypeId ?? undefined,
    });
    const hvd = buildHumanVoiceDirective({ language: stack.brand.contentLanguage ?? 'en' });
    const voiceDirective = hvd ? `${bvd}\n\n${hvd}` : bvd;

    const job = await prisma.seoGenerationJob.create({
      data: {
        deliverableId: deliverable.id,
        workspaceId: WORKSPACE_ID,
        seoInput: brief as unknown as Prisma.InputJsonValue,
        optimizationGoals: ['seo'],
        contentType: 'blog-post',
        contextStack: stack as unknown as Prisma.InputJsonValue,
        voiceDirective,
      },
    });
    await prisma.agentJob.create({
      data: {
        type: 'SEO_GENERATE',
        payload: { jobId: job.id } as unknown as Prisma.InputJsonValue,
        workspaceId: WORKSPACE_ID,
        scheduledAt: new Date(),
        priority: 100,
        maxAttempts: 2,
        triggeredBy: 'fase4b-ab',
      },
    });
    fs.writeFileSync(`${OUT_DIR}/fase4b-prod-${idx}-ids.json`, JSON.stringify({ campaignId: campaign.id, deliverableId: deliverable.id, jobId: job.id }));
    console.log(`START brief ${idx}: job=${job.id} deliverable=${deliverable.id}`);
    return;
  }

  if (phase === 'collect') {
    const ids = JSON.parse(fs.readFileSync(`${OUT_DIR}/fase4b-prod-${idx}-ids.json`, 'utf8'));
    const job = await prisma.seoGenerationJob.findUniqueOrThrow({ where: { id: ids.jobId } });
    if (job.status !== 'COMPLETED') {
      console.log(`nog niet klaar: ${job.status} stap ${job.currentStep}`);
      process.exit(2);
    }
    const state = job.state as unknown as SeoPipelineState;
    const step6 = state.outputs.find((o) => o.step === 6);
    const step7 = state.outputs.find((o) => o.step === 7);
    if (!step6 || !step7) throw new Error('stap 6/7 ontbreekt in state');
    const armB = step6.rawText;
    let armA: string;
    try {
      armA = (JSON.parse(stripFences(step7.rawText)) as EditorialReview).revisedContent;
    } catch {
      armA = step7.rawText;
    }
    const stack = job.contextStack as unknown as Parameters<typeof runFidelityScoring>[0]['stack'];

    const scoreArm = async (label: string, contentText: string) => {
      const outcome = await runFidelityScoring({
        workspaceId: WORKSPACE_ID,
        deliverableId: ids.deliverableId,
        contentTypeId: 'blog-post',
        contentText,
        stack,
        generatorProvider: 'anthropic',
        skipPersist: true,
      });
      const r = outcome?.result;
      console.log(`${label}: composite=${r?.compositeScore} threshold=${r?.compositeThreshold} met=${r?.thresholdMet} pijlers style=${r?.pillars.style.score} judge=${r?.pillars.judge?.score} rules=${r?.pillars.rules.score}`);
      return r;
    };
    const scoreA = await scoreArm('arm A (met stap 7)', armA);
    const scoreB = await scoreArm('arm B (zonder stap 7)', armB);

    const pill = (r: typeof scoreA) => ({
      style: r?.pillars.style.score,
      judge: r?.pillars.judge?.score,
      rules: r?.pillars.rules.score,
    });
    const result = {
      brief: BRIEFS[idx],
      timings: state.timings,
      armA: { chars: armA.length, words: armA.split(/\s+/).length, composite: scoreA?.compositeScore, thresholdMet: scoreA?.thresholdMet, pillars: pill(scoreA) },
      armB: { chars: armB.length, words: armB.split(/\s+/).length, composite: scoreB?.compositeScore, thresholdMet: scoreB?.thresholdMet, pillars: pill(scoreB) },
    };
    fs.writeFileSync(`${OUT_DIR}/fase4b-prod-${idx}.json`, JSON.stringify(result, null, 2));
    fs.writeFileSync(`${OUT_DIR}/fase4b-prod-${idx}-armA.md`, armA);
    fs.writeFileSync(`${OUT_DIR}/fase4b-prod-${idx}-armB.md`, armB);
    console.log(`RESULT brief ${idx}: A=${scoreA?.compositeScore} B=${scoreB?.compositeScore}`);
    return;
  }

  if (phase === 'cleanup') {
    for (let i = 0; i < BRIEFS.length; i++) {
      const p = `${OUT_DIR}/fase4b-prod-${i}-ids.json`;
      if (!fs.existsSync(p)) continue;
      const ids = JSON.parse(fs.readFileSync(p, 'utf8'));
      await prisma.seoGenerationJob.deleteMany({ where: { deliverableId: ids.deliverableId } });
      await prisma.agentJob.deleteMany({ where: { payload: { path: ['jobId'], equals: ids.jobId } } });
      await prisma.deliverable.delete({ where: { id: ids.deliverableId } }).catch(() => {});
      await prisma.campaign.delete({ where: { id: ids.campaignId } }).catch(() => {});
      console.log(`cleanup brief ${i} ok`);
    }
    return;
  }

  throw new Error(`onbekende fase: ${phase}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
