// =============================================================
// POST /api/oauth/consent-lock — vergrendelt (of ontgrendelt) een zojuist
// gegeven OAuth-consent op één merk ("merken zijn taal"-batch).
//
// Flow: /oauth/consent POSTt eerst naar Better Auth's /api/auth/oauth2/consent
// (dat de OauthConsent-rij aanmaakt/bijwerkt) en daarná hierheen met
// { clientId, workspaceId } — workspaceId null = expliciet ontgrendelen
// (re-consent zonder vinkje). Sessie verplicht + membership-check op het
// merk: je kunt een koppeling alleen vergrendelen op een merk waar je zelf
// (actief, ACL-bewust) lid van bent. Better Auth beheert de consent-rij
// zelf; wij muteren uitsluitend de eigen lockedWorkspaceId-kolom.
//
// NB: consent verschijnt alleen bij prompt=consent (claude.ai stuurt de
// authorize doorgaans mét consent-prompt); de auto-consent-flow zónder
// prompt passeert dit scherm en kent dus geen slot — gedocumenteerde
// beperking.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import { getMembershipForWorkspace } from '@/lib/api/public/brand-resolver';

const bodySchema = z.object({
  clientId: z.string().min(1),
  /** null = slot verwijderen (re-consent zonder vergrendeling). */
  workspaceId: z.string().min(1).nullable(),
});

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, workspaceId } = parsed.data;

  if (workspaceId) {
    const membership = await getMembershipForWorkspace(session.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: 'No access to this brand' }, { status: 403 });
    }
  }

  // updatedAt handmatig: Better Auth beheert deze kolom zonder @updatedAt.
  const updated = await prisma.oauthConsent.updateMany({
    where: { userId: session.user.id, clientId, consentGiven: true },
    data: { lockedWorkspaceId: workspaceId, updatedAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: 'No consent found for this application' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lockedWorkspaceId: workspaceId });
}
