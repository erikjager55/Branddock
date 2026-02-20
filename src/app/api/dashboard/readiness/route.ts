import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';
import { getDashboardReadiness } from '@/lib/db/queries';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.readiness(workspaceId));
    if (hit) return hit;

    const data = await getDashboardReadiness(workspaceId);
    setCache(cacheKeys.dashboard.readiness(workspaceId), data, CACHE_TTL.DASHBOARD);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/dashboard/readiness]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
