import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { dispatchJob } from '@/lib/agents/jobs/dispatch';

/**
 * POST /api/trend-radar/research — Start AI research
 * Body: { query: string, useBrandContext?: boolean }
 */
export async function POST(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const query = body.query as string | undefined;
  const useBrandContext = body.useBrandContext === true;

  if (!query || query.trim().length < 3) {
    return NextResponse.json(
      { error: 'Query is required (minimum 3 characters)' },
      { status: 400 },
    );
  }

  // Create research job
  const job = await prisma.trendResearchJob.create({
    data: {
      status: 'PENDING',
      query: query.trim(),
      useBrandContext,
      workspaceId,
    },
  });

  // Serverless-safe: op de queue i.p.v. fire-and-forget (Vercel kilt post-response).
  // De engine (runTrendResearch) zet zelf COMPLETED/FAILED op de job-record.
  await dispatchJob({
    type: 'TREND_RESEARCH',
    payload: { jobId: job.id, workspaceId, query: query.trim(), useBrandContext },
    workspaceId,
    maxAttempts: 1,
    idempotencyKey: `trend-research:${job.id}`,
    triggeredBy: 'user',
  });

  return NextResponse.json(job, { status: 202 });
}
