// =============================================================
// GET /api/oauth/client-info?client_id=… — naam/icoon van een
// geregistreerde OAuth-client voor het consent-scherm (/oauth/consent).
//
// De mcp-plugin geeft de consent-pagina alleen consent_code + client_id +
// scope mee; de client-náám staat in OauthApplication. Sessie verplicht:
// het consent-scherm is per definitie ingelogd, en zo is dit endpoint geen
// anoniem enumeratie-oppervlak voor geregistreerde client-id's.
// =============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = new URL(request.url).searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  const client = await prisma.oauthApplication.findUnique({
    where: { clientId },
    select: { name: true, icon: true },
  });
  if (!client) {
    return NextResponse.json({ error: 'Unknown client' }, { status: 404 });
  }

  return NextResponse.json({ name: client.name, icon: client.icon ?? null });
}
