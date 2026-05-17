// =============================================================
// POST /api/studio/[deliverableId]/auto-iterate/apply
// Replace generatedContent van de longest first-variant component
// met de auto-iterate finalText uit Deliverable.settings.autoIterate.
// Mirror van strict-rewrite/apply pattern. User-driven (UI knop).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

interface AutoIterateSnapshot {
  finalText?: string;
  finalScore?: number;
  attemptsExecuted?: number;
  thresholdMet?: boolean;
  iteratedAt?: string;
}

const applyBodySchema = z.object({
  componentId: z.string().min(1).max(100).optional(),
});

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
    const snapshot = settings.autoIterate as AutoIterateSnapshot | undefined;
    const finalText = snapshot?.finalText?.trim();
    if (!finalText) {
      return NextResponse.json(
        { error: 'No auto-iterate version available — run generation met FEATURE_AUTO_ITERATE=true first' },
        { status: 400 },
      );
    }

    // Body parse — empty body is OK
    let body: z.infer<typeof applyBodySchema> = {};
    try {
      const raw = await request.json();
      body = applyBodySchema.parse(raw);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid request body', details: err.issues }, { status: 400 });
      }
    }

    let targetComponentId = body.componentId;
    if (!targetComponentId) {
      // Scope-fix 2026-05-17: variantIndex: 0 + skip image/video/voiceover-
      // rows, anders kan auto-iterate variant B/C/D clobberen of een non-text
      // row raken bij longest-pick (mirror van canvas-orchestrator silent-iter fix).
      // Bewuste asymmetrie met silent-iter: hier GEEN shrink/maxWords guard —
      // apply is een expliciete user-actie (klik "Apply Improved Version"),
      // user heeft de score-uplift al gezien en akkoord. Silent-iter is
      // autonoom en moet defensiever zijn.
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
        console.warn('[auto-iterate/apply] no target component', {
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
      select: {
        generatedContent: true,
        deliverableId: true,
        componentType: true,
        groupIndex: true,
        iterationCount: true,
      },
    });
    if (!before || before.deliverableId !== deliverableId) {
      return NextResponse.json({ error: 'Target component not found on this deliverable' }, { status: 404 });
    }

    await prisma.deliverableComponent.update({
      where: { id: targetComponentId },
      data: {
        generatedContent: finalText,
        iterationCount: before.iterationCount + (snapshot?.attemptsExecuted ?? 1),
        version: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      componentId: targetComponentId,
      componentType: before.componentType,
      groupIndex: before.groupIndex,
      oldLength: before.generatedContent?.length ?? 0,
      newLength: finalText.length,
      finalScore: snapshot?.finalScore,
      attemptsApplied: snapshot?.attemptsExecuted ?? 1,
    });
  } catch (error) {
    console.error('[POST /api/studio/auto-iterate/apply]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
