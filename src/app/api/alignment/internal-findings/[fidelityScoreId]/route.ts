// ============================================================
// GET /api/alignment/internal-findings/[fidelityScoreId] — Δ-1 Surface E
//
// Returnt findings + summary voor een specifiek ContentFidelityScore na
// een interne F-VAL run (auto-trigger na canvas content-version-create).
// Mirror van Surface C's external-findings endpoint, maar via XOR-pad
// `fidelityScoreId` ipv `contentReviewLogId`.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

// Prisma's enum-sort is alfabetisch (HIGH < LOW < MEDIUM), niet
// priority-based. Voor "high-priority-eerst" sorteren we daarom
// client-side op een expliciete severity-rank na de fetch.
const SEVERITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fidelityScoreId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { fidelityScoreId } = await params;

    // Workspace-isolation via fidelity-score.workspaceId match. ContentVersion
    // + Deliverable info erbij voor context-rendering in PublishGate
    // (deliverable-name in header, content-type voor threshold-display).
    const fidelityScore = await prisma.contentFidelityScore.findFirst({
      where: { id: fidelityScoreId, workspaceId },
      select: {
        id: true,
        compositeScore: true,
        thresholdMet: true,
        scorerVersion: true,
        contentVersion: {
          select: {
            id: true,
            deliverableId: true,
            deliverable: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!fidelityScore) {
      return NextResponse.json(
        { error: 'Fidelity score not found' },
        { status: 404 },
      );
    }

    const rawFindings = await prisma.brandReviewFinding.findMany({
      where: { fidelityScoreId, workspaceId },
      orderBy: [{ category: 'asc' }, { id: 'asc' }],
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

    const findings = [...rawFindings].sort(
      (a, b) =>
        (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99),
    );

    return NextResponse.json({
      fidelityScoreId: fidelityScore.id,
      compositeScore: fidelityScore.compositeScore,
      thresholdMet: fidelityScore.thresholdMet,
      scorerVersion: fidelityScore.scorerVersion,
      contentVersionId: fidelityScore.contentVersion.id,
      deliverableId: fidelityScore.contentVersion.deliverableId,
      deliverableTitle: fidelityScore.contentVersion.deliverable.title,
      findingsCount: findings.length,
      findings,
    });
  } catch (error) {
    console.error('[GET /api/alignment/internal-findings/:id]', error);
    return NextResponse.json(
      { error: 'Failed to fetch internal findings' },
      { status: 500 },
    );
  }
}
