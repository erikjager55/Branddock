import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.recommended(workspaceId));
    if (hit) return hit;

    const [assetCount, personaCount, productCount, insightCount] = await Promise.all([
      prisma.brandAsset.count({ where: { workspaceId } }),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
      prisma.marketInsight.count({ where: { workspaceId } }),
    ]);

    // Find the most incomplete module
    let data;
    if (assetCount === 0) {
      data = { id: 'rec-brand-assets', badge: 'AI RECOMMENDED', title: 'Start Building Your Brand Foundation', description: 'Create your first brand asset to begin defining your brand identity. The AI will help you build a comprehensive brand strategy.', actionLabel: 'Create Brand Asset', actionHref: 'brand' };
    } else if (personaCount === 0) {
      data = { id: 'rec-personas', badge: 'AI RECOMMENDED', title: 'Define Your Target Audience', description: 'Create personas to understand who you are building for. This will improve your brand alignment and campaign effectiveness.', actionLabel: 'Create Persona', actionHref: 'persona-create' };
    } else if (productCount === 0) {
      data = { id: 'rec-products', badge: 'AI RECOMMENDED', title: 'Add Your Products & Services', description: 'Document your offerings to enable product-persona alignment and better campaign targeting.', actionLabel: 'Add Product', actionHref: 'product-analyzer' };
    } else if (insightCount < 3) {
      data = { id: 'rec-insights', badge: 'AI RECOMMENDED', title: 'Gather Market Intelligence', description: 'Add market insights to strengthen your brand strategy with data-driven decisions.', actionLabel: 'Add Insights', actionHref: 'trends' };
    } else {
      data = { id: 'rec-alignment', badge: 'AI RECOMMENDED', title: 'Run a Brand Alignment Scan', description: 'Check consistency across all your brand modules and identify misalignments before they become problems.', actionLabel: 'Run Scan', actionHref: 'brand-alignment' };
    }

    setCache(cacheKeys.dashboard.recommended(workspaceId), data, CACHE_TTL.DASHBOARD);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/dashboard/recommended]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
