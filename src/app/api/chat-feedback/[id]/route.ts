import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

const STATUSES = ['new', 'reviewed', 'actioned', 'dismissed'] as const;

const updateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    notes: z.string().trim().max(5000).optional().nullable(),
  })
  .refine((d) => d.status !== undefined || d.notes !== undefined, {
    message: 'Provide at least status or notes',
  });

/** PATCH /api/chat-feedback/:id — developer triage update */
export async function PATCH(
  req: NextRequest,
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
  const existing = await prisma.chatFeedback.findFirst({ where: { id } });
  if (!existing) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    // First transition out of 'new' records who did it + when
    if (parsed.data.status !== 'new' && existing.status === 'new') {
      data.reviewedById = session.user.id;
      data.reviewedAt = new Date();
    }
  }
  if (parsed.data.notes !== undefined) {
    data.notes = parsed.data.notes;
  }

  const feedback = await prisma.chatFeedback.update({ where: { id }, data });
  return Response.json({ feedback });
}
