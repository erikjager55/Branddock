import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { id: true, title: true, strategy: true, campaignGoalType: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Extract from blueprint strategy if available
    const strategy = campaign.strategy as Record<string, unknown> | null;
    const blueprint = strategy as {
      strategy?: {
        positioningStatement?: string;
        messagingHierarchy?: {
          brandMessage?: string;
          campaignMessage?: string;
          proofPoints?: string[];
        };
      };
    } | null;

    const strat = blueprint?.strategy;
    const messaging = strat?.messagingHierarchy;

    // Generate master message from strategy data (or stub if no strategy yet)
    const masterMessage = {
      coreClaim: messaging?.campaignMessage || messaging?.brandMessage || `${campaign.title} — core value proposition`,
      proofPoint: messaging?.proofPoints?.[0] || 'Backed by proven results and customer success',
      emotionalHook: strat?.positioningStatement || 'A brand experience that resonates with what matters most',
      primaryCta: 'Get Started Today',
    };

    // Save to campaign
    await prisma.campaign.update({
      where: { id },
      data: { masterMessage: JSON.parse(JSON.stringify(masterMessage)) },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    return NextResponse.json({ masterMessage });
  } catch (error) {
    console.error('[Master Message Generate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
