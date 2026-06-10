import { NextResponse } from 'next/server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import type { ComponentStatus } from '@prisma/client';
import {
  compileComponentFeedback,
  buildCascadingComponentContext,
  buildGenerationContext,
} from '@/lib/studio/context-builder';
import { buildComponentPrompt, getMaxTokensForComponent, sanitizeUserInput } from '@/lib/studio/component-prompt-builder';
import { extractPersonaIdsFromSettings } from '@/lib/studio/extract-persona-ids';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { AVAILABLE_MODELS, type ResolvedModel, type AiProvider } from '@/lib/ai/feature-models';
import { dispatchTextCompletion } from '@/lib/ai/dispatch-completion';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { createContentVersion } from '@/lib/learning-loop/content-version';
import { scoreContentFidelity } from '@/lib/learning-loop/fidelity-scorer';
import type { TypeSettings } from '@/types/studio';

const KNOWN_PROVIDERS: ReadonlySet<AiProvider> = new Set<AiProvider>(['anthropic', 'openai', 'google']);

function resolveBodyAiModel(modelId: string | null): ResolvedModel | null {
  if (!modelId) return null;
  const found = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (!found) return null;
  if (!KNOWN_PROVIDERS.has(found.provider as AiProvider)) return null;
  return { provider: found.provider as AiProvider, model: found.id };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deliverableId: string; componentId: string }> },
) {
  const { deliverableId, componentId } = await params;
  let previousStatus: ComponentStatus | null = null;

  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const component = await prisma.deliverableComponent.findFirst({
      where: { id: componentId, deliverableId, deliverable: { campaign: { workspaceId } } },
      include: {
        deliverable: {
          include: {
            campaign: {
              select: { id: true, title: true, campaignGoalType: true, strategy: true, masterMessage: true },
            },
          },
        },
      },
    });
    if (!component) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    previousStatus = component.status;
    if (previousStatus === 'GENERATING') {
      return NextResponse.json({ error: 'Already generating' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const feedback = typeof body.feedback === 'string' ? sanitizeUserInput(body.feedback, 2000) : '';
    const requestedAiModel = (body.aiModel as string | undefined) ?? null;

    const resolvedModel: ResolvedModel =
      resolveBodyAiModel(requestedAiModel) ??
      (await resolveFeatureModel(workspaceId, 'content-generate'));

    // Concurrency guard — only flip if status hasn't changed since we read it.
    // feedbackText is persisted here (user intent matters even if AI fails).
    // aiModel/aiProvider are written only on success path so a failed regen
    // doesn't leave misleading attribution on the row.
    const guardResult = await prisma.deliverableComponent.updateMany({
      where: { id: componentId, status: previousStatus },
      data: {
        status: 'GENERATING',
        feedbackText: feedback,
      },
    });
    if (guardResult.count === 0) {
      return NextResponse.json({ error: 'Already generating' }, { status: 409 });
    }

    const allComponents = await prisma.deliverableComponent.findMany({
      where: { deliverableId },
      select: { id: true, componentType: true, status: true, generatedContent: true, imageUrl: true },
    });

    const masterMessage = component.deliverable.campaign.masterMessage as
      | { coreClaim: string; proofPoint: string; emotionalHook: string; primaryCta: string }
      | null;

    const feedbackContext = compileComponentFeedback(
      {
        ...component,
        feedbackText: feedback,
        personaReactions: component.personaReactions as string | null,
      },
      allComponents,
      masterMessage,
    );

    const personaIds = extractPersonaIdsFromSettings(component.deliverable.settings);
    const generationContext = await buildGenerationContext(
      workspaceId,
      personaIds,
      {
        campaignTitle: component.deliverable.campaign.title,
        campaignGoalType: component.deliverable.campaign.campaignGoalType,
        strategy: component.deliverable.campaign.strategy as Record<string, unknown> | null,
      },
      component.deliverable.title,
    );

    const { systemPrompt, userPrompt } = buildComponentPrompt({
      componentType: component.componentType,
      deliverableContentType: component.deliverable.contentType,
      deliverableTitle: component.deliverable.title,
      generationContext,
      cascadingContext: '',
      additionalInstructions: '',
      feedbackContext,
      settings: component.deliverable.settings as TypeSettings | null,
    });

    const result = await dispatchTextCompletion({
      resolvedModel,
      systemPrompt,
      userPrompt,
      maxTokens: getMaxTokensForComponent(component.componentType),
    });

    const cascadingForStorage = buildCascadingComponentContext(componentId, allComponents, masterMessage);

    const updated = await prisma.deliverableComponent.update({
      where: { id: componentId },
      data: {
        status: 'GENERATED',
        generatedContent: result.content,
        cascadingContext: cascadingForStorage || null,
        promptUsed: userPrompt,
        aiModel: result.model,
        aiProvider: result.provider,
        generationDuration: result.durationMs,
        generatedAt: new Date(),
        version: { increment: 1 },
      },
    });

    invalidateCache(cacheKeys.prefixes.studio(workspaceId));
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

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
      console.error('[ContentVersion create failed after regenerate]', versionErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Component Regenerate]', error);

    // Revert to actual pre-run status (don't collapse PENDING/GENERATED into
    // NEEDS_REVISION). Guarded on GENERATING so we don't clobber another
    // caller's win.
    const revertTo: ComponentStatus = previousStatus ?? 'NEEDS_REVISION';
    await prisma.deliverableComponent
      .updateMany({
        where: { id: componentId, status: 'GENERATING' },
        data: { status: revertTo },
      })
      .catch(() => {});

    return NextResponse.json({ error: 'AI regeneration failed' }, { status: 500 });
  }
}
