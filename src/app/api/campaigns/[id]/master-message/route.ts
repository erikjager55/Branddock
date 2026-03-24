import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { masterMessage: true },
    });
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ masterMessage: campaign.masterMessage ?? null });
  } catch (error) {
    console.error('[Master Message GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const { coreClaim, proofPoint, emotionalHook, primaryCta } = body;

    // Validate required fields
    if (!coreClaim || !proofPoint || !emotionalHook || !primaryCta) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const masterMessage = { coreClaim, proofPoint, emotionalHook, primaryCta };

    await prisma.campaign.update({
      where: { id },
      data: { masterMessage: JSON.parse(JSON.stringify(masterMessage)) },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    return NextResponse.json({ masterMessage });
  } catch (error) {
    console.error('[Master Message PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
