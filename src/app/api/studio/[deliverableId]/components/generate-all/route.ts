import { NextResponse } from 'next/server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import {
  buildGenerationContext,
  buildCascadingComponentContext,
  compileComponentFeedback,
} from '@/lib/studio/context-builder';
import { buildComponentPrompt, getMaxTokensForComponent } from '@/lib/studio/component-prompt-builder';
import { extractPersonaIdsFromSettings } from '@/lib/studio/extract-persona-ids';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { dispatchTextCompletion } from '@/lib/ai/dispatch-completion';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { createContentVersion } from '@/lib/learning-loop/content-version';
import { scoreContentFidelity } from '@/lib/learning-loop/fidelity-scorer';
import type { TypeSettings } from '@/types/studio';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  const { deliverableId } = await params;

  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      include: {
        campaign: {
          select: { id: true, title: true, campaignGoalType: true, strategy: true, masterMessage: true },
        },
      },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Note: status filter excludes GENERATING — protects against another route
    // (single-component generate/regenerate) running concurrently on the same component.
    const pendingComponents = await prisma.deliverableComponent.findMany({
      where: { deliverableId, status: { in: ['PENDING', 'NEEDS_REVISION'] } },
      orderBy: [{ order: 'asc' }, { variantIndex: 'asc' }, { id: 'asc' }],
    });

    if (pendingComponents.length === 0) {
      return NextResponse.json({ message: 'No pending components', generated: 0, failed: 0, total: 0 });
    }

    const resolvedModel = await resolveFeatureModel(workspaceId, 'content-generate');

    const personaIds = extractPersonaIdsFromSettings(deliverable.settings);
    const generationContext = await buildGenerationContext(
      workspaceId,
      personaIds,
      {
        campaignTitle: deliverable.campaign.title,
        campaignGoalType: deliverable.campaign.campaignGoalType,
        strategy: deliverable.campaign.strategy as Record<string, unknown> | null,
      },
      deliverable.title,
    );

    const masterMessage = deliverable.campaign.masterMessage as
      | { coreClaim: string; proofPoint: string; emotionalHook: string; primaryCta: string }
      | null;
    const settings = deliverable.settings as TypeSettings | null;

    // Concurrency guard — only flip rows still in PENDING/NEEDS_REVISION.
    // If another caller raced in between findMany and now, those rows are
    // skipped (count < pendingComponents.length). Status flip only — model
    // attribution is written per-component on success.
    await prisma.deliverableComponent.updateMany({
      where: {
        id: { in: pendingComponents.map((c) => c.id) },
        status: { in: ['PENDING', 'NEEDS_REVISION'] },
      },
      data: { status: 'GENERATING' },
    });

    // Re-query for components we actually flipped, so the loop below doesn't
    // burn AI calls on rows another caller raced in front of us.
    const flippedIds = new Set(
      (
        await prisma.deliverableComponent.findMany({
          where: {
            id: { in: pendingComponents.map((c) => c.id) },
            status: 'GENERATING',
          },
          select: { id: true },
        })
      ).map((c) => c.id),
    );
    const componentsToProcess = pendingComponents.filter((c) => flippedIds.has(c.id));

    let generated = 0;
    let failed = 0;
    const skippedRaced = pendingComponents.length - componentsToProcess.length;

    for (const component of componentsToProcess) {
      // Track per-component pre-run status for accurate revert on failure
      // (don't smush a previously-PENDING row into NEEDS_REVISION).
      const componentPreviousStatus = component.status;

      try {
        // Re-fetch siblings each iteration so cascading can include components
        // already generated in this run (GENERATED status from prior loop ticks).
        const allComponents = await prisma.deliverableComponent.findMany({
          where: { deliverableId },
          select: { id: true, componentType: true, status: true, generatedContent: true, imageUrl: true },
        });

        const cascadingContext = buildCascadingComponentContext(
          component.id,
          allComponents,
          masterMessage,
          { includeStatuses: ['APPROVED', 'GENERATED'] },
        );

        // For NEEDS_REVISION components with stored feedback, honor that
        // feedback in the regen instead of generating blind. This matches
        // single-component regenerate behavior.
        const feedbackContext =
          componentPreviousStatus === 'NEEDS_REVISION' && component.feedbackText
            ? compileComponentFeedback(
                {
                  ...component,
                  personaReactions: component.personaReactions as string | null,
                },
                allComponents,
                masterMessage,
              )
            : undefined;

        const { systemPrompt, userPrompt } = buildComponentPrompt({
          componentType: component.componentType,
          deliverableContentType: deliverable.contentType,
          deliverableTitle: deliverable.title,
          generationContext,
          // When feedbackContext is set, it already includes cascading-context
          // (compileComponentFeedback wraps it). Avoid duplicate inclusion.
          cascadingContext: feedbackContext ? '' : cascadingContext,
          additionalInstructions: '',
          feedbackContext,
          settings,
        });

        const result = await dispatchTextCompletion({
          resolvedModel,
          systemPrompt,
          userPrompt,
          maxTokens: getMaxTokensForComponent(component.componentType),
        });

        // Final-write guard: only commit if this row is still GENERATING.
        // If a parallel caller already finished it, skip without overwriting.
        const writeResult = await prisma.deliverableComponent.updateMany({
          where: { id: component.id, status: 'GENERATING' },
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
        if (writeResult.count === 0) {
          console.warn(`[Generate-all] component ${component.id} no longer GENERATING at write — skipped (mid-run race).`);
          failed += 1;
        } else {
          generated += 1;
        }
      } catch (componentError) {
        console.error(`[Generate-all] component ${component.id} failed:`, componentError);
        failed += 1;
        await prisma.deliverableComponent
          .updateMany({
            where: { id: component.id, status: 'GENERATING' },
            data: { status: componentPreviousStatus },
          })
          .catch(() => {});
      }
    }

    if (generated > 0) {
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: { pipelineStatus: 'IN_PROGRESS' },
      });
    }

    invalidateCache(cacheKeys.prefixes.studio(workspaceId));
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    // Snapshot the deliverable as a single ContentVersion after the batch.
    // One version per generate-all call, not per component — restore reverts
    // the whole batch at once. Fire-and-forget fidelity scoring.
    if (generated > 0) {
      try {
        const newVersion = await createContentVersion({
          deliverableId,
          workspaceId,
          createdBy: 'AI',
        });
        invalidateCache(cacheKeys.prefixes.contentVersions(deliverableId));
        void scoreContentFidelity({ contentVersionId: newVersion.id, workspaceId }).catch((err) => {
          console.error(`[fidelity-scoring async fail] version=${newVersion.id}`, err);
        });
      } catch (versionErr) {
        console.error('[ContentVersion create failed after generate-all]', versionErr);
      }
    }

    return NextResponse.json({
      message: `Generated ${generated} of ${pendingComponents.length} components`,
      generated,
      failed,
      skippedRaced,
      total: pendingComponents.length,
    });
  } catch (error) {
    console.error('[Generate-all]', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
