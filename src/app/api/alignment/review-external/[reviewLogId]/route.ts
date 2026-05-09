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
import { DEFAULT_COMPOSITE_THRESHOLD } from '@/lib/brand-fidelity/composition-engine';

// `ContentReviewLog` persist compositeScore maar niet de threshold die
// de runner gebruikte — dus derive het bij de GET. Importeer de constant
// uit composition-engine zodat een runner-default-shift hier mee
// beweegt zonder magic-number-drift.
//
// Future-proofing: als we ooit per-locale of STRICT-mode thresholds
// gaan introduceren via runner.compositeThreshold-input, moet
// ContentReviewLog die per-run waarde persisten en hier dáár leiden.
// Tot dan: GET reflecteert de default, POST reflecteert de daadwerkelijk
// gebruikte threshold uit de runner-output. Niet-actueel in MVP want geen
// caller passeert custom threshold.

// Prisma's enum-sort is alfabetisch (HIGH < LOW < MEDIUM), niet
// priority-based. Voor "high-priority-eerst" sorteren we daarom
// client-side op een expliciete severity-rank na de fetch.
// Top-level const zodat hij niet per-request opnieuw wordt aangelegd.
const SEVERITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

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
        durationMs: true,
      },
    });

    if (!reviewLog) {
      return NextResponse.json({ error: 'Review log not found' }, { status: 404 });
    }

    const rawFindings = await prisma.brandReviewFinding.findMany({
      where: { contentReviewLogId: reviewLogId, workspaceId },
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
      reviewLogId: reviewLog.id,
      sourceType: reviewLog.sourceType,
      sourceUrl: reviewLog.sourceUrl,
      compositeScore: reviewLog.compositeScore,
      thresholdMet: reviewLog.compositeScore >= DEFAULT_COMPOSITE_THRESHOLD,
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
