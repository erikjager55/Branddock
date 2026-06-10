// POST /api/studio/[deliverableId]/generate-feature-visuals
//
// P2 (verbeterplan) — AI-feature-beelden. Genereert per meegestuurde prompt één
// beeld (materiaal-/in-context-shot) voor de feature-cards van een landing-page,
// en returnt stabiele storage-URLs. Apart van generate-visual (die de hero-
// picker/visual-group "replaced") zodat de hero-foto + picker onaangeroerd
// blijven. Lean: hergebruikt fal-gen + brand-style-anchors + storage-upload;
// géén fidelity-scoring/logo-overlay/picker-persist.
//
// Budget: max 4 prompts per pagina (de client capt al; hier hard begrensd).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth-server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { selectModelForStyle } from '@/lib/ai/visual-brief-prompts';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { buildNegativePrompt } from '@/lib/ai/image-quality/negative-prompts';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';

export const FEATURE_IMAGE_BUDGET = 4;

const requestSchema = z
  .object({
    prompts: z.array(z.string().min(1).max(1500)).min(1).max(FEATURE_IMAGE_BUDGET),
  })
  .strict();

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId } = await params;
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body: z.infer<typeof requestSchema>;
    try {
      body = requestSchema.parse(JSON.parse(await request.text()));
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const prompts = body.prompts.slice(0, FEATURE_IMAGE_BUDGET);

    const stack = await assembleCanvasContext(deliverableId, workspaceId);
    const generateConfig = stack.visualBrief?.generate as { model?: string } | undefined;
    const modelId = generateConfig?.model
      ?? selectModelForStyle(stack.visualBrief?.styleDirection ?? null, {
        contentTypeId: stack.deliverableTypeId ?? null,
        hasTrainedLora: false,
      });

    // Brand-style anchors zodat de feature-beelden matchen met de merk-look.
    const { fetchBrandStyleAnchors, maxAnchorsForModel } = await import('@/lib/ai/brand-style-anchors');
    const anchors = await fetchBrandStyleAnchors(workspaceId);
    const referenceImageUrls = anchors.slice(0, maxAnchorsForModel(modelId)).map((a) => a.fileUrl);

    const storage = getStorageProvider();
    // Defaults bevatten nu anti-collage/triptiek (één volledige afbeelding-eis).
    const negativePrompt = buildNegativePrompt();
    // Per-index resultaat (behoudt volgorde = feature-index); null bij falen.
    const urls = await Promise.all(
      prompts.map(async (prompt, idx): Promise<string | null> => {
        try {
          const result = await generateFalImage(modelId, prompt, {
            imageSize: 'landscape_4_3',
            numImages: 1,
            referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
            negativePrompt,
          });
          const hostedUrl = result.images?.[0]?.url;
          if (!hostedUrl) return null;
          const bytes = await fetchWithSizeLimit(hostedUrl, AI_IMAGE_SIZE_CAP);
          const upload = await storage.upload(bytes, {
            workspaceId,
            fileName: `feature-visual-${deliverableId}-${Date.now()}-${idx}.png`,
            contentType: 'image/png',
          });
          return upload.url;
        } catch (err) {
          console.error(`[generate-feature-visuals] ${modelId} idx=${idx} failed:`, err instanceof Error ? err.message : err);
          return null;
        }
      }),
    );

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('[generate-feature-visuals] error:', err);
    return NextResponse.json({ error: 'Failed to generate feature visuals' }, { status: 500 });
  }
}
