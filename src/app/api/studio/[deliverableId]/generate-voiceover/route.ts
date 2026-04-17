import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { getStorageProvider } from '@/lib/storage';
import { generateSpeech } from '@/lib/integrations/elevenlabs/elevenlabs-client';

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  voiceId: z.string().min(1).max(100),
  sceneId: z.enum(['hook', 'body', 'cta']),
});

/** POST /api/studio/[deliverableId]/generate-voiceover — Generate TTS audio for a scene */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deliverableId } = await params;

    // Verify ownership
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true } } },
    });

    if (!deliverable || deliverable.campaign?.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { text, voiceId, sceneId } = parsed.data;

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 400 });
    }

    // Generate speech
    const audioBuffer = await generateSpeech(voiceId, text);

    // Upload to storage
    const fileName = `voiceover-${sceneId}-${Date.now()}.mp3`;
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(audioBuffer, {
      workspaceId,
      fileName,
      contentType: 'audio/mpeg',
    });

    // Save as DeliverableComponent
    const variantGroup = `voiceover-${sceneId}`;
    await prisma.deliverableComponent.deleteMany({
      where: { deliverableId, variantGroup },
    });

    await prisma.deliverableComponent.create({
      data: {
        deliverableId,
        componentType: 'voiceover',
        groupType: 'single',
        order: 910,
        status: 'APPROVED',
        variantGroup,
        variantIndex: 0,
        isSelected: true,
        generatedContent: text,
        videoUrl: uploadResult.url, // audio stored in videoUrl field
        aiProvider: 'elevenlabs',
        aiModel: voiceId,
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({ audioUrl: uploadResult.url }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[generate-voiceover] Error:', message, error);
    return NextResponse.json({ error: `Voiceover generation failed: ${message}` }, { status: 500 });
  }
}
