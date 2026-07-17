// =============================================================
// Headless video-generatie (P3.2 Fase D2, ADR 2026-07-17).
//
// Non-streaming extract van de studio-generate-video-kern: script →
// brand-aware video-prompt → fal.subscribe → size-capped download →
// storage-upload → DeliverableComponent. Zelfde persist-shape en zelfde
// 'video-clip'-charge (20) als de SSE-route. API-verschillen: geen SSE,
// en sourceImageUrl MOET remote zijn (de lokale-/uploads/-resolutie van de
// studio-route is een dev-artefact dat headless/serverless fragiel is).
// =============================================================

import { fal } from '@fal-ai/client';
import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { buildVideoPromptFromScript } from '@/lib/studio/video-prompt-builder';
import { getFalVideoProviderById } from '@/lib/integrations/fal/fal-video-providers';
import { getStorageProvider } from '@/lib/storage';
import { fetchWithSizeLimit, AI_VIDEO_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { createAndGenerateDeliverable } from '@/lib/content/headless-create';

export interface GenerateVideoInput {
  workspaceId: string;
  /** Bestaande deliverable; zonder wordt er een aangemaakt (contentType, default tiktok-script). */
  deliverableId?: string;
  contentType?: string;
  title?: string;
  campaignId?: string;
  scriptText: string;
  /** fal-provider-id (kling-v3-pro, veo-3-1-fast, seedance-2-0, ltx-2-pro, kling-v3-std). */
  provider: string;
  /** Seconden (3-15, provider-afhankelijk). */
  duration: number;
  aspectRatio: string;
  /** Remote URL vereist — lokale /uploads/-paden worden geweigerd. */
  sourceImageUrl?: string;
  motionPrompt?: string;
  sceneId?: 'hook' | 'body' | 'cta' | 'full';
}

export type GenerateVideoResult =
  | { ok: true; deliverableId: string; videoUrl: string; prompt: string; provider: string }
  | {
      ok: false;
      code:
        | 'FAL_NOT_CONFIGURED'
        | 'UNKNOWN_PROVIDER'
        | 'DELIVERABLE_NOT_FOUND'
        | 'CREATE_FAILED'
        | 'LOCAL_IMAGE_URL'
        | 'INVALID_PARAMS'
        | 'GENERATION_FAILED';
      error: string;
    };

async function resolveOrCreateDeliverable(
  input: GenerateVideoInput,
): Promise<{ id: string; contentType: string } | { error: 'DELIVERABLE_NOT_FOUND' | 'CREATE_FAILED'; message: string }> {
  if (input.deliverableId) {
    const row = await prisma.deliverable.findFirst({
      where: { id: input.deliverableId, campaign: { workspaceId: input.workspaceId } },
      select: { id: true, contentType: true },
    });
    if (!row) return { error: 'DELIVERABLE_NOT_FOUND', message: 'Deliverable not found in this workspace' };
    return row;
  }
  const contentType = input.contentType ?? 'tiktok-script';
  const created = await createAndGenerateDeliverable({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    contentType,
    title: input.title ?? `Video — ${input.scriptText.slice(0, 40)}`,
    brief: { objective: input.scriptText.slice(0, 300) },
    generate: false,
  });
  if (!created.ok) return { error: 'CREATE_FAILED', message: `${created.code}: ${created.error}` };
  return { id: created.deliverableId, contentType };
}

/**
 * Genereert een videoclip voor een deliverable en persisteert hem als
 * geselecteerde video-component (zelfde shape als de studio-route). Post-hoc
 * 'video-clip'-charge (20 credits) alleen bij een geslaagde generatie.
 */
export async function generateVideoClip(input: GenerateVideoInput): Promise<GenerateVideoResult> {
  if (!process.env.FAL_KEY) {
    return { ok: false, code: 'FAL_NOT_CONFIGURED', error: 'FAL_KEY not configured' };
  }
  const provider = getFalVideoProviderById(input.provider);
  if (!provider) {
    return { ok: false, code: 'UNKNOWN_PROVIDER', error: `Unknown provider: ${input.provider}` };
  }
  if (input.sourceImageUrl && !/^https?:\/\//i.test(input.sourceImageUrl)) {
    return {
      ok: false,
      code: 'LOCAL_IMAGE_URL',
      error: 'sourceImageUrl must be a public https URL (local upload paths are not supported via the API)',
    };
  }
  // Provider-limieten expliciet valideren — fal geeft anders een lege/cryptische
  // fout terug (gevonden in de D2-smoke: ltx-2-pro duur 5 + 9:16 → kale reject).
  if (provider.allowedDurations && !provider.allowedDurations.includes(input.duration)) {
    return {
      ok: false,
      code: 'INVALID_PARAMS',
      error: `Provider "${provider.label}" accepteert duur ${provider.allowedDurations.join('/')}s (niet ${input.duration}s)`,
    };
  }
  if (provider.aspectRatios && !provider.aspectRatios.includes(input.aspectRatio)) {
    return {
      ok: false,
      code: 'INVALID_PARAMS',
      error: `Provider "${provider.label}" accepteert aspect-ratio ${provider.aspectRatios.join('/')} (niet ${input.aspectRatio})`,
    };
  }

  const target = await resolveOrCreateDeliverable(input);
  if ('error' in target) {
    return { ok: false, code: target.error, error: target.message };
  }
  const sceneId = input.sceneId ?? 'full';

  try {
    fal.config({ credentials: process.env.FAL_KEY });
    const isKling = provider.endpoint.includes('kling');

    const brandContext = await getBrandContext(input.workspaceId);
    const videoPrompt = await buildVideoPromptFromScript(
      input.scriptText,
      brandContext,
      target.contentType,
      input.workspaceId,
      sceneId,
      target.id,
      input.motionPrompt,
    );

    const falInput: Record<string, unknown> = {
      prompt: videoPrompt,
      duration: isKling ? String(input.duration) : input.duration,
      aspect_ratio: input.aspectRatio,
      generate_audio: provider.supportsAudio,
    };
    let endpoint: string;
    if (input.sourceImageUrl) {
      falInput[provider.imageUrlField ?? 'image_url'] = input.sourceImageUrl;
      endpoint = provider.endpoint;
    } else {
      endpoint = provider.textToVideoEndpoint ?? provider.endpoint;
    }

    const result = await fal.subscribe(endpoint, { input: falInput, timeout: 300_000 });
    const video = (result.data as Record<string, unknown> | undefined)?.video as { url?: string } | undefined;
    if (!video?.url) {
      return { ok: false, code: 'GENERATION_FAILED', error: 'No video returned from provider' };
    }

    const videoBytes = await fetchWithSizeLimit(video.url, AI_VIDEO_SIZE_CAP);
    const uploadResult = await getStorageProvider().upload(videoBytes, {
      workspaceId: input.workspaceId,
      fileName: `concept-video-${Date.now()}.mp4`,
      contentType: 'video/mp4',
    });

    const variantGroup = sceneId === 'full' ? 'concept-video' : `scene-video-${sceneId}`;
    await prisma.deliverableComponent.deleteMany({ where: { deliverableId: target.id, variantGroup } });
    await prisma.deliverableComponent.create({
      data: {
        deliverableId: target.id,
        componentType: 'video',
        groupType: 'single',
        order: 900,
        status: 'APPROVED',
        variantGroup,
        variantIndex: 0,
        isSelected: true,
        generatedContent: videoPrompt,
        videoUrl: uploadResult.url,
        imagePromptUsed: videoPrompt,
        aiProvider: input.provider,
        aiModel: provider.label,
        generatedAt: new Date(),
      },
    });
    invalidateCache(cacheKeys.prefixes.campaigns(input.workspaceId));

    await chargeAfter(
      { workspaceId: input.workspaceId, action: 'video-clip', feature: 'api-video-generate' },
      { count: 1 },
    ).catch(() => {});

    return { ok: true, deliverableId: target.id, videoUrl: uploadResult.url, prompt: videoPrompt, provider: provider.label };
  } catch (err) {
    return {
      ok: false,
      code: 'GENERATION_FAILED',
      error: err instanceof Error ? err.message : 'Video generation failed',
    };
  }
}
