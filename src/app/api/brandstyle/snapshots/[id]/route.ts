import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import type { SnapshotDetail } from '@/lib/brandstyle/snapshots/types';

const patchSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }
    const { id } = await ctx.params;

    const snapshot = await prisma.brandstyleSnapshot.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        capturedAt: true,
        tokensHash: true,
        scrapeHash: true,
        triggerSource: true,
        notes: true,
        triggeredBy: { select: { id: true, name: true } },
        screenshotUrl: true,
        tokensJson: true,
        scrapedJson: true,
        semanticTokens: true,
      },
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const detail: SnapshotDetail = {
      id: snapshot.id,
      capturedAt: snapshot.capturedAt.toISOString(),
      tokensHash: snapshot.tokensHash,
      scrapeHash: snapshot.scrapeHash,
      triggerSource: snapshot.triggerSource as SnapshotDetail['triggerSource'],
      triggeredBy: snapshot.triggeredBy ? { id: snapshot.triggeredBy.id, name: snapshot.triggeredBy.name } : null,
      notes: snapshot.notes,
      changeSummary: null,
      changeCount: 0,
      screenshotUrl: snapshot.screenshotUrl,
      tokensJson: snapshot.tokensJson,
      scrapedJson: snapshot.scrapedJson,
      semanticTokens: snapshot.semanticTokens,
    };

    return NextResponse.json({ snapshot: detail });
  } catch (err) {
    console.error('[GET /api/brandstyle/snapshots/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.brandstyleSnapshot.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const updated = await prisma.brandstyleSnapshot.update({
      where: { id },
      data: { notes: parsed.data.notes ?? null },
      select: { id: true, notes: true },
    });

    return NextResponse.json({ snapshot: updated });
  } catch (err) {
    console.error('[PATCH /api/brandstyle/snapshots/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
