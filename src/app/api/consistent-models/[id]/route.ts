import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const updateModelSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  stylePrompt: z.string().trim().max(2000).nullable().optional(),
  negativePrompt: z.string().trim().max(2000).nullable().optional(),
  isDefault: z.boolean().optional(),
});

/** GET /api/consistent-models/:id — Model detail */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const { id } = await context.params;

    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      include: {
        referenceImages: { orderBy: { sortOrder: 'asc' } },
        generations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        createdBy: { select: { id: true, name: true, image: true } },
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error('GET /api/consistent-models/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/consistent-models/:id — Update model */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateModelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existing = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults of same type
    if (parsed.data.isDefault === true) {
      await prisma.consistentModel.updateMany({
        where: { workspaceId, type: existing.type, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.consistentModel.update({
      where: { id },
      data: parsed.data,
      include: {
        referenceImages: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/consistent-models/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/consistent-models/:id — Delete model */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const { id } = await context.params;

    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
    });
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Cascade deletes reference images and generations via Prisma onDelete: Cascade
    await prisma.consistentModel.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/consistent-models/:id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
