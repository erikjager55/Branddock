// =============================================================
// POST /api/deliverables/[id]/ad-quality?variantIndex=N
//
// Triggers ad-quality validation for a single variant of a
// deliverable. Per spec sectie 7.3:
//   - Idempotency via contentHash — existing row for same input is
//     returned without re-running L1/L2
//   - L2-failure → L1-only score persisted with fallback flag
//   - Workspace ownership verified via resolveWorkspaceId
//
// Response: AdQualityScore row (id, overallScore, ratingLabel,
// l1Results, l2Results, generatedAt, contentHash).
// =============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { runAdQualityValidation, AdQualityError } from '@/lib/ad-validation/runner';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: deliverableId } = await params;
    const url = new URL(request.url);
    const variantIndexParam = url.searchParams.get('variantIndex');
    if (!variantIndexParam) {
      return NextResponse.json(
        { error: 'Missing variantIndex query parameter' },
        { status: 400 },
      );
    }
    const variantIndex = Number.parseInt(variantIndexParam, 10);
    if (Number.isNaN(variantIndex) || variantIndex < 0) {
      return NextResponse.json(
        { error: 'variantIndex must be a non-negative integer' },
        { status: 400 },
      );
    }

    // Workspace ownership check via campaign relation
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const score = await runAdQualityValidation(deliverableId, variantIndex);
    return NextResponse.json(score);
  } catch (err) {
    if (err instanceof AdQualityError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error('[ad-quality] unexpected error', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Internal error' },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Helper endpoint — get latest ad-quality scores for a deliverable
  // (both variants if available). UI uses TanStack Query to hydrate on
  // canvas-step 2 load.
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: deliverableId } = await params;
    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Latest score per variantIndex (most recent generatedAt wins)
    const scores = await prisma.adQualityScore.findMany({
      where: { deliverableId },
      orderBy: { generatedAt: 'desc' },
    });

    // Dedup per variantIndex — take most recent
    const latestPerVariant = new Map<number, (typeof scores)[number]>();
    for (const s of scores) {
      if (!latestPerVariant.has(s.variantIndex)) {
        latestPerVariant.set(s.variantIndex, s);
      }
    }

    return NextResponse.json({
      scores: Array.from(latestPerVariant.values()),
    });
  } catch (err) {
    console.error('[ad-quality GET] unexpected error', err);
    return NextResponse.json(
      { error: (err as Error).message ?? 'Internal error' },
      { status: 500 },
    );
  }
}
