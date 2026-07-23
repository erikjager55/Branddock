// =============================================================
// Headless beeld-generatie — de kern van POST /api/media/ai-images/generate
// als server-side service ("merken zijn taal"-batch, vervolg op ADR
// 2026-07-17-public-brand-api).
//
// Eén implementatie bedient de MCP-tool generate_image en REST
// POST /api/v1/image-generate: provider-routing (fal.ai / Imagen / DALL-E,
// incl. legacy-aliassen), brand-guidelines default áán (server-side resolved
// via buildPromptWithContext), storage-upload, GeneratedImage-persist (zelfde
// mapGeneratedImage-shape als de Media Library) en post-hoc 'image'-charge
// (2 credits). Bewuste beperkingen t.o.v. de sessie-route:
//  - TRAINED_MODEL (LoRA) is uitgesloten — die flow leunt op workspace-
//    getrainde modellen + UI-selectie en blijft sessie-only.
//  - Geen per-request AI-rate-limit (withAiRateLimit is sessie-route-infra);
//    het publieke oppervlak is al key-/token-gebonden en credit-gemeterd.
// GeneratedImage.createdById is verplicht: OAuth-callers zijn zelf de
// creator; key-callers (machine) persisteren onder de oudste actieve
// owner — of anders het oudste actieve lid — van de org (gedocumenteerde
// v1-keuze, zichtbaar in de Media Library als "aangemaakt door").
// =============================================================

import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { generateImage } from '@/lib/ai/gemini-client';
import { generateDalleImage } from '@/lib/ai/openai-client';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { getFalProviderById } from '@/lib/integrations/fal/fal-providers';
import { buildPromptWithContext } from '@/lib/ai/prompt-context-builder';
import { resolveWorkspaceBrandContext } from '@/lib/consistent-models/workspace-context-resolver';
import { mapGeneratedImage } from '@/features/media-library/utils/media-utils';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

/** Zelfde default als de Media-Library-modal (GenerateImageModal). */
export const DEFAULT_IMAGE_PROVIDER = 'fal-ai/flux-2-pro';

/** Legacy provider-aliassen — oude enum-waarden naar fal.ai-ids (route-pariteit). */
const LEGACY_PROVIDER_ALIASES: Record<string, string> = {
  FLUX_PRO: 'fal-ai/flux-2-pro',
  RECRAFT: 'fal-ai/recraft-v3',
  IDEOGRAM: 'fal-ai/ideogram-v3',
};

/**
 * Stijl-intentie voor Recraft V3 uit de gebruikersprompt. Recraft levert
 * zónder structured `style`-param altijd photoreal — óók bij "illustratie"-
 * prompts (F42d; pilot-incident 2026-07-16). Andere modellen negeren dit veld.
 * Gedeeld met de sessie-route (media/ai-images/generate).
 */
export function detectRecraftStyle(
  userPrompt: string,
): 'digital_illustration' | 'vector_illustration' | 'icon' | undefined {
  const p = userPrompt.toLowerCase();
  if (/\bicoon\b|\bicon\b/.test(p)) return 'icon';
  if (/vector/.test(p)) return 'vector_illustration';
  if (/illustrat|tekening|getekend|cartoon|schets|sketch|drawing|drawn/.test(p)) {
    return 'digital_illustration';
  }
  return undefined;
}

/** Aspect-ratio-string naar fal.ai image_size-preset (route-pariteit). */
export function toFalImageSize(ar: string): string {
  const map: Record<string, string> = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '3:4': 'portrait_4_3',
    '4:3': 'landscape_4_3',
  };
  return map[ar] ?? 'square_hd';
}

export interface GenerateBrandImageInput {
  workspaceId: string;
  prompt: string;
  /** Naam in de Media Library; default: afgeleid van de prompt. */
  name?: string;
  /** 'fal-ai/…' | 'IMAGEN' | 'DALLE' | legacy-alias; default flux-2-pro. */
  provider?: string;
  /** fal.ai / Imagen: '1:1' | '16:9' | '9:16' | '3:4' | '4:3' (default 1:1). */
  aspectRatio?: string;
  /** DALL-E: expliciete size (default 1024x1024). */
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  /** Merk-richtlijnen (fotografie/design/persoonlijkheid) in de prompt; default true. */
  applyBrandGuidelines?: boolean;
  /** OAuth-pad: de token-user; zonder → oudste owner/lid van de org (key-pad). */
  createdByUserId?: string;
}

export type GenerateBrandImageResult =
  | { ok: true; image: ReturnType<typeof mapGeneratedImage> }
  | {
      ok: false;
      code: 'PROVIDER_NOT_CONFIGURED' | 'UNKNOWN_PROVIDER' | 'NO_CREATOR' | 'GENERATION_FAILED';
      error: string;
    };

/** Creator voor de GeneratedImage-rij: expliciet > oudste owner > oudste lid. */
async function resolveCreatorId(workspaceId: string, explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });
  if (!workspace) return null;
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: workspace.organizationId, isActive: true, role: 'owner' },
    orderBy: { joinedAt: 'asc' },
    select: { userId: true },
  });
  if (owner) return owner.userId;
  const anyMember = await prisma.organizationMember.findFirst({
    where: { organizationId: workspace.organizationId, isActive: true },
    orderBy: { joinedAt: 'asc' },
    select: { userId: true },
  });
  return anyMember?.userId ?? null;
}

interface ProviderOutput {
  imageBytes: Buffer;
  mimeType: string;
  modelName: string;
  revisedPrompt?: string;
  width?: number;
  height?: number;
  resolvedAspectRatio?: string;
}

type ProviderRun =
  | { ok: true; output: ProviderOutput }
  | { ok: false; code: 'PROVIDER_NOT_CONFIGURED' | 'UNKNOWN_PROVIDER' | 'GENERATION_FAILED'; error: string };

async function runFalProvider(
  provider: string,
  finalPrompt: string,
  userPrompt: string,
  aspectRatio: string,
): Promise<ProviderRun> {
  if (!process.env.FAL_KEY) {
    return { ok: false, code: 'PROVIDER_NOT_CONFIGURED', error: 'FAL_KEY is not configured' };
  }
  const falProvider = getFalProviderById(provider);
  if (!falProvider) {
    return { ok: false, code: 'UNKNOWN_PROVIDER', error: `Unknown fal.ai provider: ${provider}` };
  }
  // Provider-ID doorgeven (niet het endpoint) — generateFalImage resolvet het
  // endpoint zelf én heeft het ID nodig voor model-specifieke logica (F42/F42d).
  const result = await generateFalImage(falProvider.id, finalPrompt, {
    imageSize: toFalImageSize(aspectRatio),
    numImages: 1,
    // Stijl-intentie uit de gebruikersprompt (niet finalPrompt — de
    // brand-context kan fotografie-richtlijnen bevatten).
    recraftStyle: detectRecraftStyle(userPrompt),
  });
  if (!result.images?.[0]?.url) {
    return { ok: false, code: 'GENERATION_FAILED', error: 'No image generated' };
  }
  const imageBytes = await fetchWithSizeLimit(result.images[0].url, AI_IMAGE_SIZE_CAP);
  return {
    ok: true,
    output: {
      imageBytes,
      mimeType: 'image/png',
      modelName: falProvider.id,
      width: result.images[0].width,
      height: result.images[0].height,
      resolvedAspectRatio: aspectRatio,
    },
  };
}

async function runBuiltinProvider(
  provider: 'IMAGEN' | 'DALLE',
  finalPrompt: string,
  input: GenerateBrandImageInput,
  aspectRatio: string,
): Promise<ProviderRun> {
  if (provider === 'IMAGEN') {
    if (!process.env.GEMINI_API_KEY) {
      return { ok: false, code: 'PROVIDER_NOT_CONFIGURED', error: 'GEMINI_API_KEY is not configured' };
    }
    const result = await generateImage(finalPrompt, { aspectRatio });
    return {
      ok: true,
      output: {
        imageBytes: result.imageBytes,
        mimeType: result.mimeType,
        modelName: 'imagen-4.0-generate-001',
        resolvedAspectRatio: aspectRatio,
      },
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, code: 'PROVIDER_NOT_CONFIGURED', error: 'OPENAI_API_KEY is not configured' };
  }
  const dalleSize = input.size ?? '1024x1024';
  const result = await generateDalleImage(finalPrompt, {
    size: dalleSize,
    quality: input.quality ?? 'standard',
    style: input.style ?? 'vivid',
  });
  const [width, height] = dalleSize.split('x').map(Number);
  const ratioBySize: Record<string, string> = {
    '1024x1024': '1:1',
    '1792x1024': '16:9',
    '1024x1792': '9:16',
  };
  return {
    ok: true,
    output: {
      imageBytes: result.imageBytes,
      mimeType: result.mimeType,
      modelName: 'dall-e-3',
      revisedPrompt: result.revisedPrompt,
      width,
      height,
      resolvedAspectRatio: ratioBySize[dalleSize],
    },
  };
}

/**
 * Genereert een on-brand beeld en persisteert het in de Media Library
 * (GeneratedImage + storage-upload). Post-hoc 'image'-charge (2 credits)
 * alleen bij succes; pre-flight saldo-checks zijn route-verantwoordelijkheid
 * (enforceCreditsForAction), zoals bij alle headless services.
 */
export async function generateBrandImage(
  input: GenerateBrandImageInput,
): Promise<GenerateBrandImageResult> {
  const provider = LEGACY_PROVIDER_ALIASES[input.provider ?? ''] ?? input.provider ?? DEFAULT_IMAGE_PROVIDER;
  if (provider === 'TRAINED_MODEL') {
    return {
      ok: false,
      code: 'UNKNOWN_PROVIDER',
      error: 'Trained (LoRA) models are not available via the public API — use the Media Library in Branddock.',
    };
  }
  const isFal = provider.startsWith('fal-ai/');
  if (!isFal && provider !== 'IMAGEN' && provider !== 'DALLE') {
    return { ok: false, code: 'UNKNOWN_PROVIDER', error: `Unknown provider: ${provider}` };
  }

  const creatorId = await resolveCreatorId(input.workspaceId, input.createdByUserId);
  if (!creatorId) {
    return { ok: false, code: 'NO_CREATOR', error: 'No active member found to attribute this image to' };
  }

  const aspectRatio = input.aspectRatio ?? '1:1';
  try {
    // Brand-guidelines default áán: server-side resolved, nooit client-inhoud.
    let brandSummary: string | undefined;
    let brandName: string | undefined;
    let logoContext: string | undefined;
    if (input.applyBrandGuidelines !== false) {
      const ctx = await resolveWorkspaceBrandContext(input.workspaceId);
      brandSummary = ctx?.contextSummary || undefined;
      brandName = ctx?.brandName || undefined;
      logoContext = ctx?.logoContext || undefined;
    }
    const finalPrompt = buildPromptWithContext({
      prompt: input.prompt,
      brandSummary,
      brandName,
      logoContext,
    });

    let run: ProviderRun;
    if (isFal) {
      run = await runFalProvider(provider, finalPrompt, input.prompt, aspectRatio);
    } else if (provider === 'IMAGEN' || provider === 'DALLE') {
      run = await runBuiltinProvider(provider, finalPrompt, input, aspectRatio);
    } else {
      // Onbereikbaar na de gate hierboven — expliciet voor de narrowing.
      return { ok: false, code: 'UNKNOWN_PROVIDER', error: `Unknown provider: ${provider}` };
    }
    if (!run.ok) return run;
    const output = run.output;

    const name = (input.name ?? input.prompt.slice(0, 80)).trim() || 'AI image';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = output.mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = `${slug || 'ai-image'}-${Date.now()}.${ext}`;
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(output.imageBytes, {
      workspaceId: input.workspaceId,
      fileName,
      contentType: output.mimeType,
    });

    // DB-write ná de upload — bij een DB-fout ruimen we het storage-object op.
    let image;
    try {
      image = await prisma.generatedImage.create({
        data: {
          name,
          prompt: input.prompt,
          revisedPrompt: output.revisedPrompt ?? null,
          provider,
          model: output.modelName,
          fileUrl: uploadResult.url,
          fileName,
          fileSize: uploadResult.fileSize,
          fileType: output.mimeType,
          width: output.width ?? null,
          height: output.height ?? null,
          aspectRatio: output.resolvedAspectRatio ?? null,
          style: input.style ?? null,
          quality: input.quality ?? null,
          workspaceId: input.workspaceId,
          createdById: creatorId,
        },
      });
    } catch (dbError) {
      try {
        await storageProvider.delete(uploadResult.url);
      } catch {
        // best-effort cleanup
      }
      throw dbError;
    }

    invalidateCache(cacheKeys.media.aiImages(input.workspaceId));
    invalidateCache(cacheKeys.prefixes.media(input.workspaceId));

    await chargeAfter(
      { workspaceId: input.workspaceId, action: 'image', feature: 'api-image-generate' },
      { count: 1 },
    ).catch(() => {});

    return { ok: true, image: mapGeneratedImage(image as unknown as Record<string, unknown>) };
  } catch (err) {
    console.error('[headless-image]', err instanceof Error ? err.message : err);
    return { ok: false, code: 'GENERATION_FAILED', error: 'Image generation failed' };
  }
}
