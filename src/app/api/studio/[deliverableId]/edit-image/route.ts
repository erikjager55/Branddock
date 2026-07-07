// =============================================================================
// POST /api/studio/[deliverableId]/edit-image  — F39 (audit 2026-05-13)
//
// Targeted image-edit via natural language instruction. Powered by Nano
// Banana Pro (Gemini 2.5/3 Flash Image) which has unique support for
// instruction-based local edits ("blur background", "remove the cup",
// "make lighting warmer") — other models (FLUX 2, Imagen 4, Recraft)
// can only do full regeneration.
//
// Body: { imageUrl: string, instruction: string, componentId?: string }
// Response: { editedImageUrl: string }
//
// Het bewerkte beeld wordt eerst naar onze storage geüpload — fal levert een
// gesigneerde, verlopende URL en die mag NOOIT rechtstreeks gepersisteerd
// worden (anders dode link na ~30-60 min). De stored-URL wordt geretourneerd
// en als MediaAsset in de Media Library geregistreerd (#325-patroon) zodat de
// bewerking herbruikbaar is. De caller beslist of de edit de variant vervangt
// of er als nieuwe variant naast komt.
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireDeliverableAccess } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import { editFalImageWithInstruction } from '@/lib/integrations/fal/fal-client';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';
import { importGeneratedImageToLibrary } from '@/lib/media/import-generated-image';
import { mediaCategoryForDeliverableType } from '@/lib/media/ingest-uploads-to-library';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';

const editImageSchema = z
  .object({
    imageUrl: z.string().url().max(2048),
    instruction: z.string().min(3).max(500),
    componentId: z.string().max(100).optional(),
  })
  .strict();

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    // requireDeliverableAccess verifieert ownership én levert de userId voor
    // de library-import.
    const { deliverableId } = await params;
    const access = await requireDeliverableAccess(deliverableId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const workspaceId = access.workspaceId;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      select: { contentType: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const body = editImageSchema.parse(await request.json());

    // Call Nano Banana edit
    const result = await editFalImageWithInstruction(body.imageUrl, body.instruction, {
      aspectRatio: '1:1',
    });
    const first = result.images[0];
    if (!first?.url) {
      return NextResponse.json(
        { error: 'Edit completed but no image returned' },
        { status: 502 },
      );
    }

    // De fal-URL is gesigneerd en verloopt — download + upload naar onze
    // storage zodat de geretourneerde URL duurzaam is (root-cause dode-link).
    // editFalImageWithInstruction forceert output_format png, dus het resultaat
    // is png.
    const contentType = 'image/png';
    const ext = 'png';
    const bytes = await fetchWithSizeLimit(first.url, AI_IMAGE_SIZE_CAP);
    const storage = getStorageProvider();
    const upload = await storage.upload(bytes, {
      workspaceId,
      fileName: `canvas-edited-${deliverableId}-${Date.now()}.${ext}`,
      contentType,
    });

    // Library-groei (#325-patroon): bewerkte beelden herbruikbaar maken.
    // Fire-and-forget — faalt nooit de edit-respons. Categorie via id-keyed
    // lookup: contentType is de deliverable-type-id (bv. "blog-post").
    const mediaCategory = mediaCategoryForDeliverableType(deliverable.contentType);
    // Géén replace-per-slot zoals refine: een edit is een losse, bewuste
    // transformatie (en kan als nieuwe variant naast de bron landen i.p.v. die
    // te vervangen), dus elke edit groeit als eigen library-asset.
    void importGeneratedImageToLibrary({
      workspaceId,
      fileUrl: upload.url,
      fileSize: bytes.length,
      name: body.instruction.slice(0, 120),
      uploadedById: access.userId,
      category: mediaCategory,
      contentType,
    });

    // Credit-afboeking (Fase 2): een AI-edit (Nano Banana) = een nieuw beeld.
    await chargeAfter({ workspaceId, action: 'image', feature: 'edit-image' }, { count: 1 }).catch(() => {});

    return NextResponse.json({ editedImageUrl: upload.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.issues }, { status: 400 });
    }
    console.error('[POST /api/studio/edit-image]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Edit failed' },
      { status: 500 },
    );
  }
}
