import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';

/**
 * GET /api/claw/context-entities
 * Returns available entities per module for the context selector.
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

  const [brandAssets, personas, products, competitors, strategies, campaigns] = await Promise.all([
    prisma.brandAsset.findMany({
      where: { workspaceId },
      select: { id: true, name: true, frameworkType: true },
      orderBy: { name: 'asc' },
    }),
    prisma.persona.findMany({
      where: { workspaceId },
      select: { id: true, name: true, occupation: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { workspaceId },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' },
    }),
    prisma.competitor.findMany({
      where: { workspaceId },
      select: { id: true, name: true, tier: true },
      orderBy: { name: 'asc' },
    }),
    prisma.businessStrategy.findMany({
      where: { workspaceId },
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    }),
    prisma.campaign.findMany({
      where: { workspaceId, type: { not: 'CONTENT' } },
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  return Response.json({
    brand_assets: brandAssets.map((a) => ({ id: a.id, label: a.name, meta: a.frameworkType })),
    personas: personas.map((p) => ({ id: p.id, label: p.name, meta: p.occupation })),
    products: products.map((p) => ({ id: p.id, label: p.name, meta: p.category })),
    competitors: competitors.map((c) => ({ id: c.id, label: c.name, meta: c.tier })),
    strategies: strategies.map((s) => ({ id: s.id, label: s.name, meta: s.status })),
    campaigns: campaigns.map((c) => ({ id: c.id, label: c.title, meta: c.status })),
  });
}
