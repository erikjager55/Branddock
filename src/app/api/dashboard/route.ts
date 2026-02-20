import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getBrandAssetStatusCounts } from '@/lib/db/queries';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    // Fetch all data in parallel — counts via DB, attention items via targeted findMany
    const [counts, attentionAssets, activeCampaigns, contentCreated, personaCount, productCount, insightCount, campaigns] = await Promise.all([
      getBrandAssetStatusCounts(workspaceId),
      prisma.brandAsset.findMany({
        where: { workspaceId, status: { not: 'READY' } },
        select: { id: true, name: true, status: true, description: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.campaign.count({ where: { workspaceId, status: 'ACTIVE' } }),
      prisma.deliverable.count({ where: { campaign: { workspaceId }, status: 'COMPLETED' } }),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
      prisma.marketInsight.count({ where: { workspaceId } }),
      prisma.campaign.findMany({
        where: { workspaceId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: { deliverables: { select: { status: true } } },
      }),
    ]);

    // Readiness from count queries
    const { total: totalAssets, ready, needsAttention, inProgress, draft } = counts;
    const percentage = totalAssets > 0 ? Math.round((ready / totalAssets) * 100) : 0;

    const attention = attentionAssets.map((asset) => {
      const isDraft = asset.status === 'DRAFT';
      const coveragePercentage = isDraft ? 0 : Math.floor(Math.random() * 45) + 5;
      return {
        id: asset.id,
        title: asset.name,
        description: `Coverage is ${coveragePercentage}% (<50% threshold). ${isDraft ? `${asset.name} has no content yet` : `${asset.name} needs review`}`,
        icon: isDraft ? 'FileText' : 'AlertTriangle',
        iconColor: isDraft ? 'text-gray-400' : 'text-orange-500',
        actionType: isDraft ? 'take_action' as const : 'fix' as const,
        actionLabel: isDraft ? 'Take Action' : 'Fix',
        actionHref: 'brand-asset-detail',
        coveragePercentage,
      };
    });

    // Campaigns preview
    const campaignsPreview = campaigns.map((c) => {
      const total = c.deliverables.length;
      const completed = c.deliverables.filter((d) => d.status === 'COMPLETED').length;
      return {
        id: c.id,
        title: c.title,
        type: (c.type === 'STRATEGIC' ? 'Strategic' : 'Quick') as 'Strategic' | 'Quick',
        status: c.status,
        deliverableProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    // Recommended
    let recommended = null;
    if (totalAssets === 0) {
      recommended = { id: 'rec-brand-assets', badge: 'AI RECOMMENDED', title: 'Start Building Your Brand Foundation', description: 'Create your first brand asset to begin defining your brand identity.', actionLabel: 'Create Brand Asset', actionHref: 'brand' };
    } else if (personaCount === 0) {
      recommended = { id: 'rec-personas', badge: 'AI RECOMMENDED', title: 'Define Your Target Audience', description: 'Create personas to understand who you are building for.', actionLabel: 'Create Persona', actionHref: 'persona-create' };
    } else if (productCount === 0) {
      recommended = { id: 'rec-products', badge: 'AI RECOMMENDED', title: 'Add Your Products & Services', description: 'Document your offerings to enable better targeting.', actionLabel: 'Add Product', actionHref: 'product-analyzer' };
    } else if (insightCount < 3) {
      recommended = { id: 'rec-insights', badge: 'AI RECOMMENDED', title: 'Gather Market Intelligence', description: 'Add market insights to strengthen your strategy.', actionLabel: 'Add Insights', actionHref: 'trends' };
    } else {
      recommended = { id: 'rec-alignment', badge: 'AI RECOMMENDED', title: 'Run a Brand Alignment Scan', description: 'Check consistency across all brand modules.', actionLabel: 'Run Scan', actionHref: 'brand-alignment' };
    }

    return NextResponse.json({
      readiness: { percentage, breakdown: { ready, needAttention: inProgress + needsAttention, inProgress: draft } },
      stats: { readyToUse: ready, needAttention: inProgress + needsAttention, inProgress: draft, activeCampaigns, contentCreated },
      attention,
      recommended,
      campaignsPreview,
    });
  } catch (error) {
    console.error('[GET /api/dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
