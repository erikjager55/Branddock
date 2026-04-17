import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';
import { analyzeBugReport } from '@/lib/bug-analysis/analyze-bug';

/** POST /api/bug-reports/:id/reanalyze — re-trigger AI analysis (developer only) */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const dev = await requireDeveloper();
  if (!dev) return Response.json({ error: 'Developer access required' }, { status: 403 });

  const { id } = await params;
  const bug = await prisma.bugReport.findFirst({ where: { id } });
  if (!bug) return Response.json({ error: 'Not found' }, { status: 404 });

  // Fire-and-forget
  analyzeBugReport(bug.id, bug.workspaceId).catch((err) => {
    console.error('[bug-analysis] Reanalyze failed:', err);
  });

  return Response.json({ status: 'analyzing' });
}
