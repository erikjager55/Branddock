// =============================================================
// /api/billing/auto-topup — instellingen voor automatisch bijkopen
// (Fase 6-restpunt, 2026-07-12). GET voor de kaart; PATCH owner/admin.
// De velden zelf bestaan sinds Fase 3 (Organization.autoTopup*); de
// off-session charge leeft in auto-topup.ts (Fase 5a) en vereist een
// actief SEPA-mandaat — deze route beheert alleen de knoppen.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { resolveOrgForWorkspace } from '@/lib/stripe/usage-tracker';
import { getTopupPack, listTopupPacks } from '@/lib/stripe/topup';

const patchSchema = z
  .object({
    autoTopupEnabled: z.boolean().optional(),
    autoTopupPackId: z.string().min(1).nullable().optional(),
    autoTopupExposureCap: z.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export async function GET() {
  const role = await requireWorkspaceRole(['owner', 'admin', 'member', 'viewer']);
  if (role instanceof NextResponse) return role;
  const organizationId = await resolveOrgForWorkspace(role.workspaceId);
  if (!organizationId) {
    return NextResponse.json({ error: 'No organization for workspace' }, { status: 404 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      autoTopupEnabled: true,
      autoTopupPackId: true,
      autoTopupExposureCap: true,
      sepaMandateStatus: true,
    },
  });
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  return NextResponse.json({ ...org, packs: listTopupPacks() });
}

export async function PATCH(request: Request) {
  // Automatisch geld afschrijven aan/uit is een owner/admin-beslissing.
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;
  const organizationId = await resolveOrgForWorkspace(role.workspaceId);
  if (!organizationId) {
    return NextResponse.json({ error: 'No organization for workspace' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }
  const { autoTopupEnabled, autoTopupPackId, autoTopupExposureCap } = parsed.data;

  if (autoTopupPackId && !getTopupPack(autoTopupPackId)) {
    return NextResponse.json({ error: 'Onbekend top-up-pack' }, { status: 400 });
  }
  // Invariant op de EINDstaat (review-W1): enabled ⇒ actief mandaat + pack.
  // Check de resulterende waarden — een expliciete `packId: null` is een
  // wijziging (`!== undefined`), geen "ongewijzigd"; en een pack-clear op een
  // al-enabled org zonder nieuwe enabled-waarde valt hier óók onder.
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { sepaMandateStatus: true, autoTopupPackId: true, autoTopupEnabled: true },
  });
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const enabledAfter = autoTopupEnabled !== undefined ? autoTopupEnabled : org.autoTopupEnabled;
  const packAfter = autoTopupPackId !== undefined ? autoTopupPackId : org.autoTopupPackId;
  if (enabledAfter) {
    if (org.sepaMandateStatus !== 'active') {
      return NextResponse.json(
        { error: 'Stel eerst een SEPA-incasso-mandaat in (via iDEAL) voordat je automatisch bijkopen aanzet.' },
        { status: 409 },
      );
    }
    if (!packAfter) {
      return NextResponse.json(
        { error: 'Kies eerst een top-up-pack (of zet automatisch bijkopen uit vóór je het pack wist).' },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(autoTopupEnabled !== undefined ? { autoTopupEnabled } : {}),
      ...(autoTopupPackId !== undefined ? { autoTopupPackId } : {}),
      ...(autoTopupExposureCap !== undefined ? { autoTopupExposureCap } : {}),
    },
    select: { autoTopupEnabled: true, autoTopupPackId: true, autoTopupExposureCap: true },
  });
  return NextResponse.json(updated);
}
