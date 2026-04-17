import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';
import { analyzeBugReport } from '@/lib/bug-analysis/analyze-bug';

const createSchema = z.object({
  page: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  screenshot: z.string().max(2000).optional(),
});

/** GET /api/bug-reports — list bugs (workspace-scoped, or all for developers with ?all=true) */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allParam = req.nextUrl.searchParams.get('all');

  // Developer: cross-workspace access
  if (allParam === 'true') {
    const dev = await requireDeveloper();
    if (!dev) return Response.json({ error: 'Developer access required' }, { status: 403 });

    const bugs = await prisma.bugReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        resolvedBy: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
      },
    });
    return Response.json({ bugs });
  }

  // Regular: workspace-scoped
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return Response.json({ error: 'No workspace' }, { status: 400 });

  const bugs = await prisma.bugReport.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return Response.json({ bugs });
}

/** POST /api/bug-reports — create a new bug report + trigger AI analysis */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return Response.json({ error: 'No workspace' }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const bug = await prisma.bugReport.create({
    data: {
      ...parsed.data,
      workspaceId,
      userId: session.user.id,
    },
  });

  // Fire-and-forget: AI analysis
  analyzeBugReport(bug.id, workspaceId).catch((err) => {
    console.error('[bug-analysis] Failed to start:', err);
  });

  return Response.json({ bug }, { status: 201 });
}
