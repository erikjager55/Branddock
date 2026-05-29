import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

const createSchema = z.object({
  page: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  impact: z.enum(['nice-to-have', 'useful', 'important', 'critical']),
  // Optional reference link. Rendered as an <a href> in the triage view, so
  // restrict to http(s) — rejects javascript:/data: and other unsafe schemes.
  screenshot: z
    .string()
    .max(2000)
    .refine((v) => /^https?:\/\//i.test(v), 'Reference link must be an http(s) URL')
    .optional(),
});

/** GET /api/feature-reports — list feature requests (workspace-scoped, or all for developers with ?all=true) */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allParam = req.nextUrl.searchParams.get('all');

  // Developer: cross-workspace access
  if (allParam === 'true') {
    const dev = await requireDeveloper();
    if (!dev) return Response.json({ error: 'Developer access required' }, { status: 403 });

    const features = await prisma.featureReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        resolvedBy: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
      },
    });
    return Response.json({ features });
  }

  // Regular: workspace-scoped
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return Response.json({ error: 'No workspace' }, { status: 400 });

  const features = await prisma.featureReport.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return Response.json({ features });
}

/** POST /api/feature-reports — create a new feature request */
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

  const feature = await prisma.featureReport.create({
    data: {
      ...parsed.data,
      workspaceId,
      userId: session.user.id,
    },
  });

  return Response.json({ feature }, { status: 201 });
}
