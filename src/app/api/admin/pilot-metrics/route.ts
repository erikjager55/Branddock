// =============================================================
// /api/admin/pilot-metrics — pilot-adoptie-telling per workspace.
//
// GET ?workspaceId=… | ?workspaceName=… [&weeks=4]
//   → per ISO-week (ma 00:00 UTC, oudste eerst, incl. lopende week) de counts
//     voor de pilot-succes-criteria (docs/playbooks/pilot-succes-definitie.md):
//     C1 deliverables aangemaakt · C2 publicaties · C3 F-VAL-runs ·
//     C4 agent-interacties (manual runs + geaccepteerde/afgewezen artifacts —
//     scheduled runs tellen bewust niet: die draaien zonder mens).
//
// Auth: uitsluitend DEVELOPER_EMAILS (requireDeveloper) — platform-meting,
// geen tenant-feature. Read-only; bewust geen cache (verse counts).
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireDeveloper } from '@/lib/developer-access';

const WEEK_MS = 7 * 86_400_000;

const querySchema = z.object({
  workspaceId: z.string().min(1).optional(),
  workspaceName: z.string().min(1).optional(),
  weeks: z.coerce.number().int().min(1).max(12).default(4),
});

interface WeekCounts {
  weekStart: string;
  weekEnd: string;
  generated: number;
  publishedEvents: number;
  publishedDeliverables: number;
  fidelityText: number;
  fidelityVisual: number;
  agentManualRuns: number;
  agentScheduledRuns: number;
  artifactsAccepted: number;
  artifactsDismissed: number;
}

/** Maandag 00:00 UTC van de week waarin `d` valt. */
function mondayOf(d: Date): Date {
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday));
}

async function countWeek(workspaceId: string, gte: Date, lt: Date): Promise<WeekCounts> {
  const range = { gte, lt };
  const [
    generated,
    publishedEvents,
    publishedDeliverables,
    fidelityText,
    fidelityVisual,
    agentManualRuns,
    agentScheduledRuns,
    artifactsAccepted,
    artifactsDismissed,
  ] = await Promise.all([
    prisma.deliverable.count({ where: { campaign: { workspaceId }, createdAt: range } }),
    prisma.learningEvent.count({ where: { workspaceId, eventType: 'content.published', timestamp: range } }),
    prisma.deliverable.count({ where: { campaign: { workspaceId }, publishedAt: range } }),
    prisma.contentFidelityScore.count({ where: { workspaceId, scoredAt: range } }),
    prisma.contentVisualFidelityScore.count({ where: { workspaceId, scoredAt: range } }),
    prisma.agentRun.count({ where: { workspaceId, triggerType: 'manual', createdAt: range } }),
    prisma.agentRun.count({ where: { workspaceId, triggerType: { not: 'manual' }, createdAt: range } }),
    prisma.agentArtifact.count({ where: { workspaceId, acceptedAt: range } }),
    prisma.agentArtifact.count({ where: { workspaceId, dismissedAt: range } }),
  ]);
  return {
    weekStart: gte.toISOString().slice(0, 10),
    weekEnd: new Date(lt.getTime() - 1).toISOString().slice(0, 10),
    generated,
    publishedEvents,
    publishedDeliverables,
    fidelityText,
    fidelityVisual,
    agentManualRuns,
    agentScheduledRuns,
    artifactsAccepted,
    artifactsDismissed,
  };
}

/**
 * GET /api/admin/pilot-metrics — weekly pilot-adoption counts for one workspace.
 * Developer-only. Query: `workspaceId` óf `workspaceName` (contains,
 * case-insensitive), `weeks` 1-12 (default 4, oudste eerst incl. lopende week).
 */
export async function GET(request: Request) {
  const session = await requireDeveloper();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    workspaceId: url.searchParams.get('workspaceId') ?? undefined,
    workspaceName: url.searchParams.get('workspaceName') ?? undefined,
    weeks: url.searchParams.get('weeks') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }
  const { workspaceId, workspaceName, weeks } = parsed.data;

  let where: Prisma.WorkspaceWhereInput;
  if (workspaceId) {
    where = { id: workspaceId };
  } else if (workspaceName) {
    where = { name: { contains: workspaceName, mode: 'insensitive' } };
  } else {
    return NextResponse.json({ error: 'workspaceId of workspaceName is verplicht' }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst({ where, select: { id: true, name: true } });
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const currentMonday = mondayOf(new Date());
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const gte = new Date(currentMonday.getTime() - (weeks - 1 - i) * WEEK_MS);
    return { gte, lt: new Date(gte.getTime() + WEEK_MS) };
  });
  const rows = await Promise.all(buckets.map((b) => countWeek(workspace.id, b.gte, b.lt)));

  return NextResponse.json({
    workspace,
    generatedAt: new Date().toISOString(),
    weeks: rows,
  });
}
