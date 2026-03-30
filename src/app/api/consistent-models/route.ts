import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { z } from 'zod';

const createModelSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(['PERSON', 'PRODUCT', 'STYLE', 'OBJECT']),
  description: z.string().trim().max(2000).optional(),
  stylePrompt: z.string().trim().max(2000).optional(),
  negativePrompt: z.string().trim().max(2000).optional(),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** GET /api/consistent-models — List models + stats */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { workspaceId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [models, stats] = await Promise.all([
      prisma.consistentModel.findMany({
        where,
        include: {
          _count: { select: { referenceImages: true, generations: true } },
          createdBy: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.consistentModel.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
      }),
    ]);

    const totalGenerations = await prisma.consistentModelGeneration.count({
      where: { workspaceId },
    });

    const statsMap = Object.fromEntries(
      stats.map((s) => [s.status, s._count])
    );

    return NextResponse.json({
      models: models.map((m) => ({
        ...m,
        referenceImageCount: m._count.referenceImages,
        generationCount: m._count.generations,
        _count: undefined,
      })),
      stats: {
        total: models.length,
        ready: statsMap['READY'] ?? 0,
        training: statsMap['TRAINING'] ?? 0,
        draft: statsMap['DRAFT'] ?? 0,
        totalGenerations,
      },
    });
  } catch (error) {
    console.error('GET /api/consistent-models error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/consistent-models — Create a new model */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createModelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { name, type, description, stylePrompt, negativePrompt } = parsed.data;

    // Generate unique slug
    let slug = generateSlug(name);
    const existing = await prisma.consistentModel.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const model = await prisma.consistentModel.create({
      data: {
        workspaceId,
        createdById: session.user.id,
        name,
        slug,
        type,
        description: description ?? null,
        stylePrompt: stylePrompt ?? null,
        negativePrompt: negativePrompt ?? null,
      },
      include: {
        _count: { select: { referenceImages: true, generations: true } },
        createdBy: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({
      ...model,
      referenceImageCount: model._count.referenceImages,
      generationCount: model._count.generations,
      _count: undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/consistent-models error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
