import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  type: z.enum(['all', 'brand_assets', 'personas', 'products', 'insights', 'campaigns']).optional().default('all'),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const parsed = searchSchema.safeParse({
      query: searchParams.get('query') || '',
      type: searchParams.get('type') || 'all',
      limit: searchParams.get('limit') || '20',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid search params', details: parsed.error.issues }, { status: 400 });
    }

    const { query, type, limit } = parsed.data;
    const results: Array<{ id: string; title: string; type: string; description: string | null; href: string; icon: string; isLocked?: boolean }> = [];

    // Search brand assets
    if (type === 'all' || type === 'brand_assets') {
      const assets = await prisma.brandAsset.findMany({
        where: { workspaceId, name: { contains: query, mode: 'insensitive' } },
        take: limit,
        select: { id: true, name: true, description: true, category: true, isLocked: true },
      });
      results.push(...assets.map((a) => ({
        id: a.id,
        title: a.name,
        type: 'Brand Asset',
        description: a.description,
        href: 'brand-asset-detail',
        icon: 'Layers',
        isLocked: a.isLocked,
      })));
    }

    // Search personas
    if (type === 'all' || type === 'personas') {
      const personas = await prisma.persona.findMany({
        where: { workspaceId, name: { contains: query, mode: 'insensitive' } },
        take: limit,
        select: { id: true, name: true, occupation: true, isLocked: true },
      });
      results.push(...personas.map((p) => ({
        id: p.id,
        title: p.name,
        type: 'Persona',
        description: p.occupation,
        href: 'persona-detail',
        icon: 'Users',
        isLocked: p.isLocked,
      })));
    }

    // Search products
    if (type === 'all' || type === 'products') {
      const products = await prisma.product.findMany({
        where: { workspaceId, name: { contains: query, mode: 'insensitive' } },
        take: limit,
        select: { id: true, name: true, description: true, isLocked: true },
      });
      results.push(...products.map((p) => ({
        id: p.id,
        title: p.name,
        type: 'Product',
        description: p.description,
        href: 'product-detail',
        icon: 'Package',
        isLocked: p.isLocked,
      })));
    }

    // Search market insights
    if (type === 'all' || type === 'insights') {
      const insights = await prisma.marketInsight.findMany({
        where: { workspaceId, title: { contains: query, mode: 'insensitive' } },
        take: limit,
        select: { id: true, title: true, description: true },
      });
      results.push(...insights.map((i) => ({
        id: i.id,
        title: i.title,
        type: 'Market Insight',
        description: i.description,
        href: 'insight-detail',
        icon: 'TrendingUp',
      })));
    }

    // Search campaigns
    if (type === 'all' || type === 'campaigns') {
      const campaigns = await prisma.campaign.findMany({
        where: { workspaceId, title: { contains: query, mode: 'insensitive' } },
        take: limit,
        select: { id: true, title: true, type: true, isLocked: true },
      });
      results.push(...campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        type: 'Campaign',
        description: c.type === 'STRATEGIC' ? 'Strategic Campaign' : 'Quick Content',
        href: 'campaign-detail',
        icon: 'Megaphone',
        isLocked: c.isLocked,
      })));
    }

    // Sort: title starts with query first, then contains
    const lowerQuery = query.toLowerCase();
    results.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(lowerQuery) ? 0 : 1;
      return aStarts - bStarts;
    });

    return NextResponse.json({ results: results.slice(0, limit) });
  } catch (error) {
    console.error('[GET /api/search]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
