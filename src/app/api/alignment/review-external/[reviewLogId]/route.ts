// ============================================================
// GET /api/alignment/review-external/[reviewLogId] — Δ-1 Surface C
//
// Returnt findings + summary voor een specifiek ContentReviewLog na
// een POST-run. Gescheiden route zodat POST-response klein blijft en
// findings (potentieel ~100KB JSON) alleen on-demand worden geladen.
// Workspace-isolation via reviewLog.workspaceId match met sessie.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewLogId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { reviewLogId } = await params;

    // Workspace-isolation: alleen logs binnen huidige workspace zichtbaar.
    // Aparte select-clause om sourceContent (potentieel 50KB) niet mee te
    // sturen in deze findings-fetch.
    const reviewLog = await prisma.contentReviewLog.findFirst({
      where: { id: reviewLogId, workspaceId },
      select: {
        id: true,
        sourceType: true,
        sourceUrl: true,
        compositeScore: true,
        scorerVersion: true,
        createdAt: true,
        durationMs: true,
      },
    });

    if (!reviewLog) {
      return NextResponse.json({ error: 'Review log not found' }, { status: 404 });
    }

    const findings = await prisma.brandReviewFinding.findMany({
      where: { contentReviewLogId: reviewLogId, workspaceId },
      orderBy: [
        // High-severity eerst, dan op category voor leesbaarheid in UI.
        { severity: 'asc' },
        { category: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        location: true,
        severity: true,
        category: true,
        description: true,
        suggestion: true,
        beforeText: true,
        afterText: true,
      },
    });

    return NextResponse.json({
      reviewLogId: reviewLog.id,
      sourceType: reviewLog.sourceType,
      sourceUrl: reviewLog.sourceUrl,
      compositeScore: reviewLog.compositeScore,
      scorerVersion: reviewLog.scorerVersion,
      durationMs: reviewLog.durationMs,
      findingsCount: findings.length,
      findings,
    });
  } catch (error) {
    console.error('[GET /api/alignment/review-external/:id]', error);
    return NextResponse.json(
      { error: 'Failed to fetch review findings' },
      { status: 500 },
    );
  }
}
