// =============================================================
// /api/admin/credit-orgs — superuser-beheer van credits per organisatie.
//
// GET  → alle organisaties + saldo + unlimited-vlag (voor het admin-paneel).
// POST → { organizationId, action: 'grant', credits }        → credits toekennen
//        { organizationId, action: 'setUnlimited', value }   → comp aan/uit
//
// Auth: uitsluitend DEVELOPER_EMAILS (requireDeveloper) — dit is een platform-
// beheer-tool, geen tenant-feature. Werkt bewust óók met credits-uit, zodat
// pilot-orgs vóór de credit-launch al gecomped/gevuld kunnen worden.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireDeveloper } from '@/lib/developer-access';
import { grantCredits, getBalance } from '@/lib/billing/credits/ledger';
import { invalidateOrgUnlimited } from '@/lib/billing/credits/exempt';

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('grant'),
    organizationId: z.string().min(1),
    credits: z.number().int().min(1).max(1_000_000),
  }),
  z.object({
    action: z.literal('setUnlimited'),
    organizationId: z.string().min(1),
    value: z.boolean(),
  }),
]);

export async function GET() {
  const session = await requireDeveloper();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      unlimitedCredits: true,
      trialEndsAt: true,
      creditBalance: { select: { balance: true, reserved: true } },
      workspaces: { select: { name: true }, take: 5 },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({
    orgs: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      unlimited: o.unlimitedCredits,
      balance: o.creditBalance?.balance ?? 0,
      reserved: o.creditBalance?.reserved ?? 0,
      trialEndsAt: o.trialEndsAt,
      members: o._count.members,
      workspaces: o.workspaces.map((w) => w.name),
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireDeveloper();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const body = parsed.data;

  const org = await prisma.organization.findUnique({
    where: { id: body.organizationId },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  if (body.action === 'setUnlimited') {
    await prisma.organization.update({
      where: { id: body.organizationId },
      data: { unlimitedCredits: body.value },
    });
    invalidateOrgUnlimited(body.organizationId);
    const balance = await getBalance(body.organizationId);
    return NextResponse.json({ ok: true, unlimited: body.value, balance: balance.balance });
  }

  // action === 'grant' — audit-trail via reason (wie kende toe)
  const snapshot = await grantCredits({
    organizationId: body.organizationId,
    credits: body.credits,
    type: 'TOPUP',
    reason: `admin-grant door ${session.user.email}`,
  });
  return NextResponse.json({ ok: true, balance: snapshot.balance });
}
