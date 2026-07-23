// =============================================================
// GET    /api/oauth/connections  — de MCP-connector-koppelingen van de ingelogde
//                                  gebruiker (Settings → API & Connectors).
// DELETE /api/oauth/connections  — trek een koppeling in ({ clientId }), of alle
//                                  koppelingen als clientId weggelaten wordt.
//
// Sessie verplicht en strikt op de eigen userId gescopet: een gebruiker kan
// alleen z'n eigen connector-tokens intrekken (audit-feature 2026-07-23).
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth-server';
import { listUserConnections, revokeUserConnection } from '@/lib/api/public/connections';

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ connections: await listUserConnections(session.user.id) });
}

const deleteSchema = z.object({ clientId: z.string().min(1).max(200).optional() });

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(raw ?? {});
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const revoked = await revokeUserConnection(session.user.id, parsed.data.clientId);
  return NextResponse.json({ revoked });
}
