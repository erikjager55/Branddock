// =============================================================
// GET /api/v1/brand-context — publieke Brand-API: read-only merkcontext.
//
// Zero-cost by design (merkcontext kennen is gratis — ADR 2026-07-07
// pricing). Auth via workspace-API-key; hele oppervlak achter
// PUBLIC_API_ENABLED (404 zolang dicht). Metadata-only usage-log.
// =============================================================

import { NextResponse } from 'next/server';
import { getBrandContext } from '@/lib/ai/brand-context';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';
import { rateLimitIp, rateLimitWorkspace } from '@/lib/api/public/rate-limit';
import { logApiCall } from '@/lib/api/public/usage';

export async function GET(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ipLimited = await rateLimitIp(request);
  if (ipLimited) return ipLimited;

  const auth = await requireApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

  const wsLimited = await rateLimitWorkspace(auth.workspaceId);
  if (wsLimited) return wsLimited;

  const startedAt = Date.now();
  try {
    const context = await getBrandContext(auth.workspaceId);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_brand_context',
      authVia: 'api_key',
      success: true,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ workspaceId: auth.workspaceId, context });
  } catch (error) {
    console.error('[GET /api/v1/brand-context]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_brand_context',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
