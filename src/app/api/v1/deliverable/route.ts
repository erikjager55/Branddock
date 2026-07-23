// =============================================================
// GET /api/v1/deliverable?id=… — publieke Brand-API: de volledige inhoud
// van een content-item ("merken zijn taal"-batch).
//
// Workspace-gescoped via de API-key; retourneert titel/type/status,
// recentste F-VAL-score en alle componenten (tekst, image-URL, video-URL,
// variant-info) gesorteerd op volgorde — zelfde service als de MCP-tool
// get_deliverable_content. Zero-cost by design (eigen inhoud lezen is
// gratis). Hele oppervlak achter PUBLIC_API_ENABLED (404 zolang dicht);
// metadata-only usage-log.
// =============================================================

import { NextResponse } from 'next/server';
import { getDeliverableContent } from '@/lib/content/deliverable-content';
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

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Query parameter "id" is required' }, { status: 400 });

  const startedAt = Date.now();
  try {
    const result = await getDeliverableContent(auth.workspaceId, id);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_deliverable_content',
      authVia: 'api_key',
      success: result.ok,
      latencyMs: Date.now() - startedAt,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 404 });
    }
    return NextResponse.json({ workspaceId: auth.workspaceId, ...result.deliverable });
  } catch (error) {
    console.error('[GET /api/v1/deliverable]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_deliverable_content',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
