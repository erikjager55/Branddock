import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

// L8 Zod-sweep (audit 2026-06-26, batch 7): de 4 velden waren presence-only
// (objecten passeerden en landden als JSON in de campaign).
const masterMessageSchema = z.object({
  coreClaim: z.string().min(1).max(2000),
  proofPoint: z.string().min(1).max(2000),
  emotionalHook: z.string().min(1).max(2000),
  primaryCta: z.string().min(1).max(500),
});

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

    const parsed = await parseJsonBody(request, masterMessageSchema);
    if (!parsed.ok) return parsed.response;
    const masterMessage = parsed.data;

    // Workspace-scope (zelfde gat als research-plans PATCH): de update draaide
    // op kaal `id` — elke ingelogde user kon elke campaign cross-workspace
    // overschrijven.
    const existing = await prisma.campaign.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.campaign.update({
      where: { id },
      data: { masterMessage },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    return NextResponse.json({ masterMessage });
  } catch (error) {
    console.error('[Master Message PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
