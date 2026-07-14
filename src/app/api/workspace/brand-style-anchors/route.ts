// =============================================================================
// F40 (audit 2026-05-13): Brand-style anchor management API.
//
// GET   /api/workspace/brand-style-anchors  → returns anchor MediaAssets
// PUT   /api/workspace/brand-style-anchors  → set anchor IDs (3-10 max)
//
// Anchors zijn workspace-level: één set die voor elke generation gebruikt
// wordt als style-reference (Recraft V4 / Nano Banana fusion / FLUX 2 multi).
// =============================================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { prisma } from '@/lib/prisma';
import { fetchBrandStyleAnchors, auditStyleAnchorsForLogos } from '@/lib/ai/brand-style-anchors';

const MAX_ANCHORS = 10;
const MIN_ANCHORS = 0; // 0 toegestaan (geen anchors); aanbevolen 3-10

const putSchema = z
  .object({
    anchorIds: z.array(z.string().min(1).max(100)).max(MAX_ANCHORS),
  })
  .strict();

export async function GET(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const anchors = await fetchBrandStyleAnchors(workspaceId);
    // W5 L-Fase 3 — anchor-curatie is opt-in via ?audit=1 (1 vision-call per
    // anchor; niet op elke GET draaien). Surface't de logo-waarschuwing voor
    // de styleguide-UI zodat de user logo-dominante anchors kan vervangen.
    const wantAudit = new URL(request.url).searchParams.get('audit') === '1';
    const logoAudit = wantAudit ? await auditStyleAnchorsForLogos(workspaceId) : null;
    return NextResponse.json({ anchors, logoAudit });
  } catch (err) {
    console.error('[GET /api/workspace/brand-style-anchors]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    // L4 (audit 2026-06-26): workspace-config-mutatie is member+ — viewers
    // zijn read-only (zelfde patroon als de andere workspace-mutatie-routes).
    const role = await requireWorkspaceRole(['owner', 'admin', 'member']);
    if (role instanceof NextResponse) return role;
    const workspaceId = role.workspaceId;

    const body = putSchema.parse(await request.json());

    // Validate anchor-IDs are echte MediaAssets in deze workspace
    if (body.anchorIds.length > 0) {
      const found = await prisma.mediaAsset.findMany({
        where: { id: { in: body.anchorIds }, workspaceId },
        select: { id: true },
      });
      if (found.length !== body.anchorIds.length) {
        return NextResponse.json(
          { error: 'One or more anchor IDs reference assets not in this workspace' },
          { status: 400 },
        );
      }
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { brandStyleAnchorIds: body.anchorIds },
    });

    const anchors = await fetchBrandStyleAnchors(workspaceId);
    return NextResponse.json({
      ok: true,
      anchorCount: anchors.length,
      anchors,
      hint:
        body.anchorIds.length < MIN_ANCHORS
          ? 'No anchors set — generation gebruikt geen style-references. Aanbevolen: 3-10 anchors voor consistente brand-look.'
          : undefined,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.issues }, { status: 400 });
    }
    console.error('[PUT /api/workspace/brand-style-anchors]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
