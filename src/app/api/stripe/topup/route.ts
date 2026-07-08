// =============================================================
// POST /api/stripe/topup — start een prepaid credit-pack-aankoop (Fase 3, A3).
//
// Auth: member+ (viewers zijn read-only). Prijs wordt server-side afgeleid uit
// TOPUP_PACKS (nooit uit de body). Retourneert een PaymentIntent-clientSecret;
// de webhook (payment_intent.succeeded, type 'credit_topup') kent de credits toe.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { getServerSession } from '@/lib/auth-server';
import { resolveOrgForWorkspace } from '@/lib/stripe/usage-tracker';
import { createTopupPayment, listTopupPacks } from '@/lib/stripe/topup';

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

  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const result = await createTopupPayment({
    organizationId,
    workspaceId,
    userId: session.user.id,
    packId: parsed.data.packId,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    clientSecret: result.clientSecret,
    paymentIntentId: result.paymentIntentId,
  });
}
