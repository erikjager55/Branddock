// =============================================================
// /api/workspace/api-keys — beheer van publieke-API-keys (sessie-auth).
//
// GET    → lijst keys van de actieve workspace (zonder geheimen)
// POST   → { name } → nieuwe key; de volledige key wordt ÉÉN keer
//          teruggegeven en daarna nooit meer (alleen hash opgeslagen)
// DELETE → { id } → intrekken (revokedAt; audit-trail blijft bestaan)
//
// Owner/admin-only. Beheer werkt onafhankelijk van PUBLIC_API_ENABLED
// zodat keys klaargezet kunnen worden vóór het activatie-moment.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { getServerSession } from '@/lib/auth-server';
import { generateApiKey } from '@/lib/api/public/auth';

export async function GET() {
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;

  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: role.workspaceId },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ keys });
}

const createSchema = z.object({ name: z.string().trim().min(1).max(60) });

export async function POST(request: Request) {
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;
  const session = await getServerSession();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const { key, keyHash, keyPrefix } = generateApiKey();
  const record = await prisma.apiKey.create({
    data: {
      workspaceId: role.workspaceId,
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      createdByUserId: session?.user.id ?? null,
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  // `key` is hierna nergens meer opvraagbaar — bewust (hash-only opslag).
  return NextResponse.json({ ...record, key });
}

const revokeSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = revokeSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const existing = await prisma.apiKey.findFirst({
    where: { id: parsed.data.id, workspaceId: role.workspaceId },
    select: { id: true, revokedAt: true },
  });
  if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  if (existing.revokedAt) return NextResponse.json({ ok: true, alreadyRevoked: true });

  await prisma.apiKey.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
