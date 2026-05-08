/**
 * Smoke-test for studio component generation pipeline.
 * Runs the same flow as the 3 routes directly (bypassing auth/HTTP) against
 * real data + real AI. Drop-in replacement for manual canvas-clicking when
 * a browser session is unavailable.
 *
 * Usage: `set -a && source .env.local && set +a && npm run smoke:studio`
 *
 * Picks the test fixture in DELIVERABLE_ID below. Mutates that deliverable's
 * components (resets to PENDING, regenerates content). Safe to re-run.
 */

import { prisma } from '@/lib/prisma';
import {
  buildGenerationContext,
  buildCascadingComponentContext,
  compileComponentFeedback,
} from '@/lib/studio/context-builder';
import { buildComponentPrompt } from '@/lib/studio/component-prompt-builder';
import { extractPersonaIdsFromSettings } from '@/lib/studio/extract-persona-ids';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { dispatchTextCompletion } from '@/lib/ai/dispatch-completion';
import type { TypeSettings } from '@/types/studio';

// Test fixture — Blog Post with 14 components, has strategy
const DELIVERABLE_ID = 'cmojr89ns00572vc9ezi9w8zv';

interface MasterMessage {
  coreClaim: string;
  proofPoint: string;
  emotionalHook: string;
  primaryCta: string;
}

async function loadDeliverable() {
  const d = await prisma.deliverable.findFirst({
    where: { id: DELIVERABLE_ID },
    include: {
      campaign: {
        select: { id: true, title: true, campaignGoalType: true, strategy: true, masterMessage: true, workspaceId: true },
      },
    },
  });
  if (!d) throw new Error(`Deliverable ${DELIVERABLE_ID} not found`);
  return d;
}

async function loadAllComponents(deliverableId: string) {
  return prisma.deliverableComponent.findMany({
    where: { deliverableId },
    select: { id: true, componentType: true, status: true, generatedContent: true, imageUrl: true },
    orderBy: { order: 'asc' },
  });
}

function preview(s: string | null, n = 200): string {
  if (!s) return '<null>';
  const head = s.slice(0, n).replace(/\n/g, ' ');
  return s.length > n ? `${head}…` : head;
}

async function testGenerate() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('TEST 1: generate route — single component, real AI');
  console.log('══════════════════════════════════════════════════════════');

  const d = await loadDeliverable();
  const wsId = d.campaign.workspaceId;
  const allComponents = await loadAllComponents(DELIVERABLE_ID);
  const target = allComponents[0];
  console.log(`Workspace ${wsId}, Deliverable "${d.title}" (${d.contentType})`);
  console.log(`Target component: ${target.componentType} (${target.id})`);

  await prisma.deliverableComponent.update({
    where: { id: target.id },
    data: { status: 'PENDING', generatedContent: null, promptUsed: null, aiProvider: null, generationDuration: null },
  });

  const resolvedModel = await resolveFeatureModel(wsId, 'content-generate');
  console.log(`Resolved model: ${resolvedModel.provider}/${resolvedModel.model}`);

  const masterMessage = d.campaign.masterMessage as MasterMessage | null;
  const cascadingContext = buildCascadingComponentContext(target.id, allComponents, masterMessage);

  const personaIds = extractPersonaIdsFromSettings(d.settings);
  const generationContext = await buildGenerationContext(
    wsId,
    personaIds,
    {
      campaignTitle: d.campaign.title,
      campaignGoalType: d.campaign.campaignGoalType,
      strategy: d.campaign.strategy as Record<string, unknown> | null,
    },
    d.title,
  );

  const { systemPrompt, userPrompt } = buildComponentPrompt({
    componentType: target.componentType,
    deliverableContentType: d.contentType,
    deliverableTitle: d.title,
    generationContext,
    cascadingContext,
    additionalInstructions: '',
    settings: d.settings as TypeSettings | null,
  });

  console.log(`\nsystemPrompt length: ${systemPrompt.length} chars`);
  console.log(`userPrompt length: ${userPrompt.length} chars`);
  console.log(`Brief block present: ${userPrompt.includes('=== DELIVERABLE BRIEF ===')}`);
  console.log(`Cascading block present: ${userPrompt.includes('--- CASCADING CONTEXT')}`);

  console.log('\nDispatching AI call…');
  const result = await dispatchTextCompletion({ resolvedModel, systemPrompt, userPrompt });

  await prisma.deliverableComponent.update({
    where: { id: target.id },
    data: {
      status: 'GENERATED',
      generatedContent: result.content,
      cascadingContext: cascadingContext || null,
      promptUsed: userPrompt,
      aiModel: result.model,
      aiProvider: result.provider,
      generationDuration: result.durationMs,
      generatedAt: new Date(),
      version: { increment: 1 },
    },
  });

  console.log(`\n[OK] Provider: ${result.provider}, Model: ${result.model}`);
  console.log(`[OK] Duration: ${result.durationMs}ms`);
  console.log(`[OK] Tokens: in=${result.inputTokens}, out=${result.outputTokens}`);
  console.log(`[OK] Output (${result.content.length} chars): "${preview(result.content, 300)}"`);

  const stubMarker = result.content.includes('[AI Generated') || result.content.startsWith('[Regenerated');
  if (stubMarker) console.error('\n[FAIL] FAIL: output looks like a stub string');
  else console.log('\n[OK] Output is real AI content (no stub marker)');
}

async function testGenerateAll() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('TEST 2: generate-all route — sequential cascading');
  console.log('══════════════════════════════════════════════════════════');

  const d = await loadDeliverable();
  const wsId = d.campaign.workspaceId;
  const allComponents = await loadAllComponents(DELIVERABLE_ID);

  // Take first 3 components, reset to PENDING
  const targets = allComponents.slice(0, 3);
  console.log(`Resetting ${targets.length} components to PENDING:`);
  targets.forEach((c) => console.log(`  - ${c.componentType} (${c.id})`));

  await prisma.deliverableComponent.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: { status: 'PENDING', generatedContent: null, promptUsed: null, cascadingContext: null },
  });

  const resolvedModel = await resolveFeatureModel(wsId, 'content-generate');
  const personaIds = extractPersonaIdsFromSettings(d.settings);
  const generationContext = await buildGenerationContext(
    wsId,
    personaIds,
    {
      campaignTitle: d.campaign.title,
      campaignGoalType: d.campaign.campaignGoalType,
      strategy: d.campaign.strategy as Record<string, unknown> | null,
    },
    d.title,
  );
  const masterMessage = d.campaign.masterMessage as MasterMessage | null;
  const settings = d.settings as TypeSettings | null;

  const pending = await prisma.deliverableComponent.findMany({
    where: { deliverableId: DELIVERABLE_ID, status: 'PENDING' },
    orderBy: { order: 'asc' },
  });

  let generated = 0;
  let prevUserPrompt = '';
  for (const component of pending) {
    const all = await prisma.deliverableComponent.findMany({
      where: { deliverableId: DELIVERABLE_ID },
      select: { id: true, componentType: true, status: true, generatedContent: true, imageUrl: true },
    });
    const cascading = buildCascadingComponentContext(component.id, all, masterMessage, {
      includeStatuses: ['APPROVED', 'GENERATED'],
    });

    const { systemPrompt, userPrompt } = buildComponentPrompt({
      componentType: component.componentType,
      deliverableContentType: d.contentType,
      deliverableTitle: d.title,
      generationContext,
      cascadingContext: cascading,
      additionalInstructions: '',
      settings,
    });

    console.log(`\n  -> Generating ${component.componentType} (cascading length: ${cascading.length} chars)…`);
    const result = await dispatchTextCompletion({ resolvedModel, systemPrompt, userPrompt });
    await prisma.deliverableComponent.update({
      where: { id: component.id },
      data: {
        status: 'GENERATED',
        generatedContent: result.content,
        cascadingContext: cascading || null,
        promptUsed: userPrompt,
        aiModel: result.model,
        aiProvider: result.provider,
        generationDuration: result.durationMs,
        generatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    console.log(`    [OK] ${result.durationMs}ms, ${result.content.length} chars: "${preview(result.content, 100)}"`);
    prevUserPrompt = userPrompt;
    generated += 1;
  }

  // Verify last component's prompt referenced earlier-generated siblings
  const lastHasCascading = prevUserPrompt.includes('--- CASCADING CONTEXT');
  console.log(`\n[OK] Generated ${generated} of ${pending.length} components`);
  console.log(`[OK] Last component's prompt includes cascading-context block: ${lastHasCascading}`);
}

async function testRegenerate() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('TEST 3: regenerate route — feedback in prompt');
  console.log('══════════════════════════════════════════════════════════');

  const d = await loadDeliverable();
  const wsId = d.campaign.workspaceId;
  const all = await loadAllComponents(DELIVERABLE_ID);
  const target = all.find((c) => c.status === 'GENERATED');
  if (!target) {
    console.error('No GENERATED component to regenerate against. Skipping.');
    return;
  }

  const feedback = 'Make it 50% shorter, more direct, no fluff.';

  const fullComponent = await prisma.deliverableComponent.findUnique({
    where: { id: target.id },
    include: { deliverable: true },
  });
  if (!fullComponent) throw new Error('Component vanished');

  const v1Length = fullComponent.generatedContent?.length ?? 0;
  console.log(`Target: ${fullComponent.componentType} (v${fullComponent.version}, ${v1Length} chars)`);
  console.log(`Feedback: "${feedback}"`);

  const resolvedModel = await resolveFeatureModel(wsId, 'content-generate');
  const allComponents = await loadAllComponents(DELIVERABLE_ID);
  const masterMessage = d.campaign.masterMessage as MasterMessage | null;

  const feedbackContext = compileComponentFeedback(
    {
      ...fullComponent,
      feedbackText: feedback,
      personaReactions: fullComponent.personaReactions as string | null,
    },
    allComponents,
    masterMessage,
  );

  const personaIds = extractPersonaIdsFromSettings(d.settings);
  const generationContext = await buildGenerationContext(
    wsId,
    personaIds,
    {
      campaignTitle: d.campaign.title,
      campaignGoalType: d.campaign.campaignGoalType,
      strategy: d.campaign.strategy as Record<string, unknown> | null,
    },
    d.title,
  );

  const { systemPrompt, userPrompt } = buildComponentPrompt({
    componentType: fullComponent.componentType,
    deliverableContentType: d.contentType,
    deliverableTitle: d.title,
    generationContext,
    cascadingContext: '',
    additionalInstructions: '',
    feedbackContext,
    settings: d.settings as TypeSettings | null,
  });

  console.log(`\nuserPrompt contains "REVISION FEEDBACK": ${userPrompt.includes('REVISION FEEDBACK')}`);
  console.log(`userPrompt contains feedback text: ${userPrompt.includes(feedback)}`);

  console.log('\nDispatching regenerate AI call…');
  const result = await dispatchTextCompletion({ resolvedModel, systemPrompt, userPrompt });
  const v2Length = result.content.length;
  const ratio = v1Length > 0 ? (v2Length / v1Length).toFixed(2) : 'n/a';

  console.log(`\n[OK] v1: ${v1Length} chars → v2: ${v2Length} chars (ratio ${ratio})`);
  console.log(`[OK] Output: "${preview(result.content, 300)}"`);
  console.log(`[OK] ${v2Length < v1Length ? 'Output is shorter — feedback honored.' : 'Output NOT shorter — feedback ignored?'}`);
}

async function testContentVersioning() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('TEST 4: createContentVersion + list + restore');
  console.log('══════════════════════════════════════════════════════════');

  const { createContentVersion, restoreContentVersion } = await import('@/lib/learning-loop/content-version');

  const d = await loadDeliverable();
  const wsId = d.campaign.workspaceId;

  console.log(`Creating ContentVersion (createdBy=AI) for deliverable ${d.id}…`);
  const v1 = await createContentVersion({
    deliverableId: d.id,
    workspaceId: wsId,
    createdBy: 'AI',
  });
  console.log(`[OK] Created v${v1.versionNumber} (id=${v1.id}), createdBy=${v1.createdBy}`);

  console.log(`Creating second version (createdBy=USER) for diff-tracking…`);
  // Mutate one component to trigger a non-empty diff, then snapshot
  const firstComponent = (await loadAllComponents(d.id))[0];
  await prisma.deliverableComponent.update({
    where: { id: firstComponent.id },
    data: { generatedContent: `[smoke-mutated ${Date.now()}] ${firstComponent.generatedContent ?? ''}` },
  });
  const v2 = await createContentVersion({
    deliverableId: d.id,
    workspaceId: wsId,
    createdBy: 'USER',
    editorUserId: 'smoke-test-user',
  });
  console.log(`[OK] Created v${v2.versionNumber} (id=${v2.id}), editType=${v2.editType ?? 'null'}, hasDiff=${v2.diffFromPrevious !== null}`);

  console.log(`Listing recent versions…`);
  const versions = await prisma.contentVersion.findMany({
    where: { deliverableId: d.id },
    orderBy: { versionNumber: 'desc' },
    take: 5,
    select: { versionNumber: true, createdBy: true, editType: true, createdAt: true },
  });
  versions.forEach((v) => {
    console.log(`  - v${v.versionNumber} ${v.createdBy} ${v.editType ?? '-'} ${v.createdAt.toISOString()}`);
  });

  console.log(`Restoring to v${v1.versionNumber}…`);
  const v3 = await restoreContentVersion(v1.id, wsId, 'smoke-test-user');
  console.log(`[OK] Restore created v${v3.versionNumber} (id=${v3.id})`);

  // Verify the deliverable's first component is back to the v1 content
  const componentAfterRestore = await prisma.deliverableComponent.findUnique({
    where: { id: firstComponent.id },
    select: { generatedContent: true },
  });
  const restoredCorrectly = !componentAfterRestore?.generatedContent?.startsWith('[smoke-mutated');
  console.log(`[${restoredCorrectly ? 'OK' : 'FAIL'}] Component content reverted: ${restoredCorrectly}`);
}

async function testReadinessGate() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('TEST 5: getContentReadiness QA-gate');
  console.log('══════════════════════════════════════════════════════════');

  const { getContentReadiness } = await import('@/lib/learning-loop/content-readiness');
  const { createContentVersion } = await import('@/lib/learning-loop/content-version');

  const d = await loadDeliverable();
  const wsId = d.campaign.workspaceId;

  // Baseline — most recent score on most recent version determines state.
  const baseline = await getContentReadiness(d.id, wsId);
  console.log(`Baseline readiness: canPublish=${baseline.canPublish}, reason=${baseline.reason}`);
  if (baseline.latestScore) {
    console.log(
      `  composite=${Math.round(baseline.latestScore.compositeScore)}, threshold=${baseline.latestScore.threshold}, met=${baseline.latestScore.thresholdMet}`,
    );
  }

  // Force a below-threshold scenario by creating a fresh version + manual low score.
  const v = await createContentVersion({
    deliverableId: d.id,
    workspaceId: wsId,
    createdBy: 'AI',
  });
  console.log(`Created test ContentVersion v${v.versionNumber}`);

  await prisma.contentFidelityScore.create({
    data: {
      workspaceId: wsId,
      contentVersionId: v.id,
      judgeIdentifier: 'smoke-test-judge',
      compositeScore: 42,
      pillarScores: { strategic: { score: 40, weight: 0.4 }, audience: { score: 45, weight: 0.3 }, execution: { score: 41, weight: 0.3 } },
      subCriteriaScores: {},
      ruleViolations: [],
      thresholdMet: false,
      scoredAt: new Date(),
    },
  });
  console.log('Inserted ContentFidelityScore (composite=42, thresholdMet=false)');

  const blocked = await getContentReadiness(d.id, wsId);
  console.log(`After low score: canPublish=${blocked.canPublish}, reason=${blocked.reason}`);
  console.log(
    `  [${!blocked.canPublish && blocked.reason === 'below-threshold' ? 'OK' : 'FAIL'}] gate blocks below-threshold`,
  );

  // Insert a passing score on the same version — most recent should now be passing.
  await prisma.contentFidelityScore.create({
    data: {
      workspaceId: wsId,
      contentVersionId: v.id,
      judgeIdentifier: 'smoke-test-judge-passing',
      compositeScore: 78,
      pillarScores: { strategic: { score: 80, weight: 0.4 }, audience: { score: 75, weight: 0.3 }, execution: { score: 78, weight: 0.3 } },
      subCriteriaScores: {},
      ruleViolations: [],
      thresholdMet: true,
      scoredAt: new Date(),
    },
  });
  const ready = await getContentReadiness(d.id, wsId);
  console.log(`After passing score: canPublish=${ready.canPublish}, reason=${ready.reason}`);
  console.log(
    `  [${ready.canPublish && ready.reason === 'ready' ? 'OK' : 'FAIL'}] gate allows passing score`,
  );
}

async function main() {
  console.log('Studio Content Generation — Smoke Test');
  console.log('======================================\n');
  await testGenerate();
  await testGenerateAll();
  await testRegenerate();
  await testContentVersioning();
  await testReadinessGate();
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('Smoke test complete.');
  console.log('══════════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('\n[FAIL] Smoke test FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
