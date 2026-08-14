// =============================================================
// Cron endpoint — brand.md draft-TTL-opruiming
//
// Verwijdert verlopen, niet-geclaimde generator-drafts volledig
// (payload + bestand + token-hash in één delete — §Ontwerp
// claim-borging: TTL-verwijdering is volledig). Geclaimde profielen
// blijven bestaan als funnel-historie voor het leads-dashboard.
// Protected via CRON_SECRET; dagelijks (zie vercel.json).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const now = new Date();
    // Tweetraps: eerst markeren (dashboard toont Expired), dan na 7 dagen
    // definitief verwijderen — geeft de TTL-mail (touchpoint 2.5) een
    // waarheidsgetrouwe "expires on {date}" zonder race met de delete.
    const marked = await prisma.generatedBrandProfile.updateMany({
      where: { status: 'DRAFT', expiresAt: { lt: now } },
      data: { status: 'EXPIRED' },
    });
    const hardDeleteBefore = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await prisma.generatedBrandProfile.deleteMany({
      where: { status: 'EXPIRED', expiresAt: { lt: hardDeleteBefore } },
    });
    return NextResponse.json({ marked: marked.count, deleted: deleted.count });
  } catch (error) {
    console.error('[GET /api/cron/brandmd-draft-cleanup]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
