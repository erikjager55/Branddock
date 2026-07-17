// =============================================================
// GET /api/oauth/my-brands — merken van de ingelogde gebruiker voor het
// consent-scherm (/oauth/consent, "vergrendel op één merk"-checkbox).
//
// Zelfde helper als de MCP-tool list_brands (listBrandsForUser: actieve
// memberships, ACL-bewust). Sessie verplicht: het consent-scherm is per
// definitie ingelogd — geen anoniem enumeratie-oppervlak (zelfde principe
// als /api/oauth/client-info).
// =============================================================

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { listBrandsForUser } from '@/lib/api/public/brand-resolver';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brands = await listBrandsForUser(session.user.id);
  return NextResponse.json({
    brands: brands.map((brand) => ({
      workspaceId: brand.workspaceId,
      name: brand.name,
      organizationName: brand.organizationName,
    })),
  });
}
