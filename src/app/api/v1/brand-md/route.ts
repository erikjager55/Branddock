// =============================================================
// GET /api/v1/brand-md — publieke Brand-API: het merk als brand.md
//
// Zelfde emitter-output als de UI-export en de MCP-tool (één
// codebron). Zero-cost by design (merkcontext kennen is gratis —
// ADR 2026-07-07 pricing). Auth via workspace-API-key; hele
// oppervlak achter PUBLIC_API_ENABLED. ?profile=extended voegt
// Market Context toe — alleen voor eigen gebruik, nooit delen.
// =============================================================

import { NextResponse } from 'next/server';
import { buildDesignSystemModel } from '@/lib/export/design-system/resolver';
import { emitBrandMd } from '@/lib/export/design-system/emitters/brandmd';
import { appBaseUrl, BRAND_MD_USE_HUB_PATH } from '@/lib/brandmd/constants';
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

  const profileParam = new URL(request.url).searchParams.get('profile');
  const profile = profileParam === 'extended' ? 'extended' : 'public';

  const startedAt = Date.now();
  try {
    const model = await buildDesignSystemModel(auth.workspaceId);
    const base = appBaseUrl();
    const file = emitBrandMd(model, {
      profile,
      useHubUrl: base ? `${base}${BRAND_MD_USE_HUB_PATH}` : undefined,
    });
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_brand_md',
      authVia: 'api_key',
      success: true,
      latencyMs: Date.now() - startedAt,
    });
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${model.meta.workspaceSlug}-brand.md"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/v1/brand-md]', error);
    await logApiCall({
      workspaceId: auth.workspaceId,
      tool: 'get_brand_md',
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
