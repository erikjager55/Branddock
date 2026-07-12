// =============================================================
// /api/stripe/setup-mandate — iDEAL→SEPA-mandaat-setup (Fase 5a).
//
// GET  → mandaat-status voor de org van de actieve workspace (voor de
//        PaymentMethodsCard).
// POST → start de gehoste Checkout-setup-flow (mode 'setup') en geeft de
//        redirect-URL terug — spiegel van /api/stripe/topup. Auth: owner/admin
//        (een incasso-mandaat afgeven is zwaarder dan een losse aankoop).
//        De webhook (setup_intent.succeeded) activeert het mandaat.
// =============================================================

import { NextResponse } from 'next/server';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { resolveOrgForWorkspace } from '@/lib/stripe/usage-tracker';
import { createSepaMandateCheckout } from '@/lib/stripe/sepa-mandate';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const role = await requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']);
  if (role instanceof NextResponse) return role;

  const organizationId = await resolveOrgForWorkspace(role.workspaceId);
  if (!organizationId) {
    return NextResponse.json({ error: 'No organization for workspace' }, { status: 404 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { sepaMandateStatus: true, autoTopupEnabled: true },
  });
  return NextResponse.json({
    sepaMandateStatus: org?.sepaMandateStatus ?? null,
    autoTopupEnabled: org?.autoTopupEnabled ?? false,
  });
}

export async function POST(request: Request) {
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;
  const workspaceId = role.workspaceId;

  const organizationId = await resolveOrgForWorkspace(workspaceId);
  if (!organizationId) {
    return NextResponse.json({ error: 'No organization for workspace' }, { status: 404 });
  }

  try {
    const baseUrl = new URL(request.url).origin;
    const { url } = await createSepaMandateCheckout({ organizationId, workspaceId, baseUrl });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Mandaat-setup aanmaken faalde' },
      { status: 400 },
    );
  }
}
