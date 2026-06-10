import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
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
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
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

    // Pick target component: explicit ID or auto-pick longest first-variant.
    // Scope-fix 2026-05-17: variantIndex: 0 + skip image/video/voiceover-rows,
    // anders kan strict-rewrite variant B/C/D clobberen of een non-text row
    // raken bij longest-pick (mirror van canvas-orchestrator silent-iter fix).
    // Bewuste asymmetrie met silent-iter: GEEN shrink/maxWords guard —
    // strict-rewrite is een expliciete user-actie, niet autonoom.
    let targetComponentId = body.componentId;
    if (!targetComponentId) {
      const components = await prisma.deliverableComponent.findMany({
        where: {
          deliverableId,
          groupIndex: 0,
          variantIndex: 0,
          componentType: { notIn: ['image', 'video', 'voiceover'] },
          generatedContent: { not: null },
        },
        select: { id: true, generatedContent: true, componentType: true },
      });
      if (components.length === 0) {
        console.warn('[strict-rewrite/apply] no target component', {
          deliverableId,
          reason: 'no variant-0 text-component with content found',
        });
        return NextResponse.json(
          { error: 'No first-variant text components found on this deliverable' },
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
