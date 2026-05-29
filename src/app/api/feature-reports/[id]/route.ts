import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

const FEATURE_STATUSES = ['open', 'planned', 'in_progress', 'shipped', 'declined'] as const;
// Terminal statuses stamp resolvedAt/resolvedById so triage shows who closed it.
const TERMINAL_STATUSES = ['shipped', 'declined'] as const;

const updateSchema = z
  .object({
    status: z.enum(FEATURE_STATUSES).optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine((d) => d.status !== undefined || d.notes !== undefined, {
    message: 'No status or notes provided',
  });

/** PATCH /api/feature-reports/:id — update feature request status and/or triage notes (developer-only) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const dev = await requireDeveloper();
  if (!dev) return Response.json({ error: 'Developer access required' }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.featureReport.findFirst({ where: { id } });
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const { status, notes } = parsed.data;

  const data: {
    status?: string;
    notes?: string | null;
    resolvedAt?: Date | null;
    resolvedById?: string | null;
  } = {};

  if (notes !== undefined) data.notes = notes;

  if (status !== undefined) {
    data.status = status;
    if ((TERMINAL_STATUSES as readonly string[]).includes(status)) {
      data.resolvedAt = new Date();
      data.resolvedById = session.user.id;
    } else {
      // Re-opening / moving back to an active status clears the resolution stamp.
      data.resolvedAt = null;
      data.resolvedById = null;
    }
  }

  const feature = await prisma.featureReport.update({ where: { id }, data });
  return Response.json({ feature });
}
