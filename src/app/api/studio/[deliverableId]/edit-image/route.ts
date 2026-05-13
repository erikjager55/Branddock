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
// Response: { editedImageUrl: string, mediaAssetId?: string }
//
// Side-effect: sends edited image to Media Library (creates new MediaAsset)
// zodat de variant herbruikbaar is. Caller beslist of de edited image
// de variant vervangt of er als nieuwe variant naast komt te staan.
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { editFalImageWithInstruction } from '@/lib/integrations/fal/fal-client';

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
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    // Ownership-check op deliverable
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true } } },
    });
    if (!deliverable || deliverable.campaign?.workspaceId !== workspaceId) {
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

    return NextResponse.json({
      editedImageUrl: first.url,
      // mediaAssetId persistence (sending to library) deferred — caller
      // beslist of edit als nieuwe variant of replace komt; bij replace
      // wordt persistHeroImage (bestaande flow) gebruikt. Voor nu retour
      // de URL; library-link in F41 DAM-pattern.
    });
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
