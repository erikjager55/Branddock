import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';
import { dispatchJob } from '@/lib/agents/jobs/dispatch';

/** POST /api/chat-feedback/:id/reanalyze — re-run AI suggestion (developer only) */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dev = await requireDeveloper();
  if (!dev) {
    return Response.json({ error: 'Developer access required' }, { status: 403 });
  }

  const { id } = await params;
  const row = await prisma.chatFeedback.findFirst({ where: { id }, select: { id: true } });
  if (!row) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Serverless-safe: op de queue i.p.v. fire-and-forget.
  await dispatchJob({ type: 'CHAT_FEEDBACK_ANALYZE', payload: { feedbackId: row.id }, triggeredBy: 'user' });

  return Response.json({ status: 'analyzing' });
}
