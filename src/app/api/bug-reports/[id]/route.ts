import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

const updateSchema = z.object({
  action: z.enum(['approve', 'reject']).optional(),
  status: z.enum(['open', 'fixed', 'wontfix']).optional(),
});

/** PATCH /api/bug-reports/:id — update bug status or approve/reject */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const dev = await requireDeveloper();
  if (!dev) return Response.json({ error: 'Developer access required' }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.bugReport.findFirst({ where: { id } });
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { action, status } = parsed.data;

  if (action === 'approve') {
    const bug = await prisma.bugReport.update({
      where: { id },
      data: {
        status: 'fixed',
        resolvedAt: new Date(),
        resolvedById: session.user.id,
      },
    });
    return Response.json({ bug });
  }

  if (action === 'reject') {
    const bug = await prisma.bugReport.update({
      where: { id },
      data: {
        status: 'wontfix',
        resolvedAt: new Date(),
        resolvedById: session.user.id,
      },
    });
    return Response.json({ bug });
  }

  if (status) {
    const bug = await prisma.bugReport.update({
      where: { id },
      data: { status },
    });
    return Response.json({ bug });
  }

  return Response.json({ error: 'No action or status provided' }, { status: 400 });
}
