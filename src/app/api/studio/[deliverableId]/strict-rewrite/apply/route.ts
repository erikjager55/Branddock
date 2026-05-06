import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

interface StrictRewriteSnapshot {
  text?: string;
  rewrittenAt?: string;
}

const applyBodySchema = z.object({
  /** Optionele override — anders pakken we longest variant component */
  componentId: z.string().min(1).max(100).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/studio/[deliverableId]/strict-rewrite/apply
//
// Replace de generatedContent van de langste eerste-variant component met
// de STRICT-verbeterde tekst uit Deliverable.settings.strictRewrite.text.
// User-driven actie — geen automatische trigger. UI knop "Apply STRICT
// version" roept dit aan.
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: { campaign: { select: { workspaceId: true } } },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }
    if (!deliverable.campaign || deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const settings = (deliverable.settings as Record<string, unknown> | null) ?? {};
    const strict = settings.strictRewrite as StrictRewriteSnapshot | undefined;
    const rewriteText = strict?.text?.trim();

    if (!rewriteText) {
      return NextResponse.json(
        {
          error:
            'No STRICT rewrite available — generate content with humanVoiceMode = STRICT first',
        },
        { status: 400 },
      );
    }

    // Body validation (componentId optional override)
    let body: z.infer<typeof applyBodySchema> = {};
    try {
      const raw = await request.json();
      body = applyBodySchema.parse(raw);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid request body', details: err.issues }, { status: 400 });
      }
      // No body → defaults
    }

    // Pick target component: explicit ID or auto-pick longest first-variant
    let targetComponentId = body.componentId;
    if (!targetComponentId) {
      const components = await prisma.deliverableComponent.findMany({
        where: { deliverableId, groupIndex: 0 },
        select: { id: true, generatedContent: true, componentType: true },
      });
      if (components.length === 0) {
        return NextResponse.json(
          { error: 'No first-variant components found on this deliverable' },
          { status: 400 },
        );
      }
      const longest = components.reduce((acc, c) =>
        (c.generatedContent?.length ?? 0) > (acc.generatedContent?.length ?? 0) ? c : acc,
      );
      targetComponentId = longest.id;
    }

    const before = await prisma.deliverableComponent.findUnique({
      where: { id: targetComponentId },
      select: { generatedContent: true, deliverableId: true, componentType: true, groupIndex: true },
    });
    if (!before || before.deliverableId !== deliverableId) {
      return NextResponse.json({ error: 'Target component not found on this deliverable' }, { status: 404 });
    }

    await prisma.deliverableComponent.update({
      where: { id: targetComponentId },
      data: {
        generatedContent: rewriteText,
        version: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      componentId: targetComponentId,
      componentType: before.componentType,
      groupIndex: before.groupIndex,
      oldLength: before.generatedContent?.length ?? 0,
      newLength: rewriteText.length,
    });
  } catch (error) {
    console.error('[POST /api/studio/strict-rewrite/apply]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
