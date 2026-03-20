import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { getScanProgress } from '@/lib/website-scanner/scanner-pipeline';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * GET /api/website-scanner/[jobId] — Poll scan progress.
 * Checks in-memory progress first (fastest for running jobs), falls back to DB.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { jobId } = await params;

    // Check in-memory progress first (fastest for running jobs)
    const memProgress = getScanProgress(jobId);
    if (memProgress) {
      return NextResponse.json({
        id: memProgress.id,
        status: memProgress.status,
        progress: memProgress.progress,
        pagesDiscovered: memProgress.pagesDiscovered,
        pagesCrawled: memProgress.pagesCrawled,
        currentPage: memProgress.currentPage,
        crawledPages: memProgress.crawledPages,
        currentCategory: memProgress.currentCategory,
        categoriesDone: memProgress.categoriesDone,
        categoriesTotal: memProgress.categoriesTotal,
        results: memProgress.results,
        errors: memProgress.errors,
        brandstyleStatus: memProgress.brandstyleStatus,
        brandstyleError: memProgress.brandstyleError,
      });
    }

    // Fallback to DB (for completed/failed/old jobs)
    const scan = await prisma.websiteScan.findFirst({
      where: { id: jobId, workspaceId },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Calculate progress from DB status
    let progress = 0;
    switch (scan.status) {
      case 'PENDING': progress = 0; break;
      case 'CRAWLING': progress = 15; break;
      case 'EXTRACTING': progress = 40; break;
      case 'ANALYZING': progress = 65; break;
      case 'MAPPING': progress = 85; break;
      case 'STYLING': progress = 92; break;
      case 'COMPLETED': progress = 100; break;
      case 'FAILED': progress = 0; break;
      case 'CANCELLED': progress = 0; break;
    }

    return NextResponse.json({
      id: scan.id,
      status: scan.status,
      progress,
      pagesDiscovered: scan.pagesDiscovered,
      pagesCrawled: scan.pagesCrawled,
      currentPage: null,
      crawledPages: scan.crawledPages ?? [],
      currentCategory: null,
      categoriesDone: scan.categoriesDone,
      categoriesTotal: scan.categoriesTotal,
      results: scan.status === 'COMPLETED' ? scan.aiResults : null,
      errors: scan.errors,
      brandstyleStatus: null,
      brandstyleError: null,
    });
  } catch (error) {
    console.error('[GET /api/website-scanner/:jobId]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
