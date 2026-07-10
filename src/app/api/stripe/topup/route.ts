// =============================================================
// /api/stripe/topup — prepaid credit-pack-aankoop (Fase 3, A3).
//
// GET  → pack-catalogus (voor de top-up-UI).
// POST → start een Stripe Checkout-sessie voor een pack en geeft de redirect-URL
//        terug (spiegel van de subscription-checkout). Prijs server-side uit
//        TOPUP_PACKS. Auth: member+ (viewers zijn read-only). De webhook
//        (payment_intent.succeeded, type 'credit_topup') kent de credits toe.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { resolveOrgForWorkspace } from '@/lib/stripe/usage-tracker';
import { createTopupCheckout, listTopupPacks } from '@/lib/stripe/topup';

const bodySchema = z.object({ packId: z.string().min(1) });

/** Pack-catalogus (voor de top-up-UI). */
export async function GET() {
  const role = await requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']);
  if (role instanceof NextResponse) return role;
  return NextResponse.json({ packs: listTopupPacks() });
}

export async function POST(request: Request) {
  const role = await requireWorkspaceRole(['owner', 'admin', 'member']);
  if (role instanceof NextResponse) return role;
  const workspaceId = role.workspaceId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'packId required' }, { status: 400 });
  }

  const organizationId = await resolveOrgForWorkspace(workspaceId);
  if (!organizationId) {
    return NextResponse.json({ error: 'No organization for workspace' }, { status: 404 });
  }

  try {
    const baseUrl = new URL(request.url).origin;
    const { url } = await createTopupCheckout({
      organizationId,
      workspaceId,
      packId: parsed.data.packId,
      baseUrl,
    });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Top-up aanmaken faalde' },
      { status: 400 },
    );
  }
}
