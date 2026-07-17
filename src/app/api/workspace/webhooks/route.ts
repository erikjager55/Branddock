// =============================================================
// /api/workspace/webhooks — beheer van outbound webhook-endpoints (P3.3).
//
// GET    → lijst endpoints van de actieve workspace (zonder secret — wel
//          secretPrefix, de eerste 8 tekens, voor herkenning in de UI)
// POST   → { url, events } → nieuw endpoint; het whsec_-secret wordt ÉÉN
//          keer teruggegeven zodat de ontvanger signatures kan verifiëren
// DELETE → { id } → hard delete (webhooks hebben geen audit-waarde à la
//          API-keys — de delivery-historie zit in de endpoint-rij zelf)
//
// Owner/admin-only, zelfde idioom als /api/workspace/api-keys. Beheer werkt
// onafhankelijk van PUBLIC_API_ENABLED zodat endpoints klaargezet kunnen
// worden vóór het activatie-moment. SSRF-guard: https verplicht en geen
// loopback/private/link-local bestemmingen (validateWebhookUrl).
// =============================================================

import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceRole } from '@/lib/auth/require-role';
import { validateWebhookUrl, WEBHOOK_EVENT_TYPES } from '@/lib/api/public/webhooks';

const SECRET_PREFIX_LENGTH = 8;

export async function GET() {
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { workspaceId: role.workspaceId },
    select: {
      id: true,
      url: true,
      secret: true,
      events: true,
      active: true,
      createdAt: true,
      lastDeliveryAt: true,
      lastDeliveryStatus: true,
      failureCount: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    endpoints: endpoints.map(({ secret, ...endpoint }) => ({
      ...endpoint,
      secretPrefix: secret.slice(0, SECRET_PREFIX_LENGTH),
    })),
  });
}

const createSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1),
});

export async function POST(request: Request) {
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const urlCheck = validateWebhookUrl(parsed.data.url);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.reason ?? 'Invalid webhook url' }, { status: 400 });
  }

  // Shared secret voor HMAC-verificatie door de ontvanger — hierna alleen
  // nog als prefix zichtbaar in de lijst (wel plain opgeslagen: de
  // dispatcher moet er signatures mee kunnen zetten).
  const secret = `whsec_${randomBytes(24).toString('hex')}`;
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      workspaceId: role.workspaceId,
      url: parsed.data.url,
      secret,
      events: [...new Set(parsed.data.events)],
    },
    select: { id: true, url: true, events: true, active: true, createdAt: true },
  });

  return NextResponse.json({ ...endpoint, secret });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const role = await requireWorkspaceRole(['owner', 'admin']);
  if (role instanceof NextResponse) return role;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id: parsed.data.id, workspaceId: role.workspaceId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 });

  await prisma.webhookEndpoint.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
