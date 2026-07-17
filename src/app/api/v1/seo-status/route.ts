// =============================================================
// GET /api/v1/seo-status?jobId=… — voortgang van een SEO-generatie-job
// (Fase D1). Metadata-only; workspace-gescoped via de API-key.
// =============================================================

import { NextResponse } from 'next/server';
import { getSeoStatus } from '@/lib/content/headless-seo';
import { isPublicApiEnabled, requireApiKey } from '@/lib/api/public/auth';

export async function GET(request: Request) {
  if (!isPublicApiEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const auth = await requireApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });

  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });

  const status = await getSeoStatus(auth.workspaceId, jobId);
  if (!status) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json(status);
}
