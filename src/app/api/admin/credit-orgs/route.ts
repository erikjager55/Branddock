// =============================================================
// /api/admin/credit-orgs — superuser-beheer van credits per organisatie.
//
// GET  → alle organisaties + saldo + unlimited-vlaggen (voor het admin-paneel).
// POST → { organizationId, action: 'grant', credits }                 → credits toekennen
//        { organizationId, action: 'setUnlimited', value }            → credits-comp aan/uit
//        { organizationId, action: 'setUnlimitedWorkspaces', value }  → maxWorkspaces = -1 (onbeperkt) of 1
//        { organizationId, action: 'setUnlimitedSeats', value }       → maxSeats = -1 (onbeperkt) of 1
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
  // Organization.maxWorkspaces/maxSeats sentinel: -1 = developer-granted
  // unlimited, any other value falls back to the normal PLAN_LIMITS[tier]
  // check (see src/lib/stripe/enforcement.ts). Mirrors setUnlimited above.
  z.object({
    action: z.literal('setUnlimitedWorkspaces'),
    organizationId: z.string().min(1),
    value: z.boolean(),
  }),
  z.object({
    action: z.literal('setUnlimitedSeats'),
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
      maxWorkspaces: true,
      maxSeats: true,
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
      unlimitedWorkspaces: o.maxWorkspaces === -1,
      unlimitedSeats: o.maxSeats === -1,
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

  if (body.action === 'setUnlimitedWorkspaces') {
    await prisma.organization.update({
      where: { id: body.organizationId },
      data: { maxWorkspaces: body.value ? -1 : 1 },
    });
    return NextResponse.json({ ok: true, unlimitedWorkspaces: body.value });
  }

  if (body.action === 'setUnlimitedSeats') {
    await prisma.organization.update({
      where: { id: body.organizationId },
      data: { maxSeats: body.value ? -1 : 1 },
    });
    return NextResponse.json({ ok: true, unlimitedSeats: body.value });
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
