import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { createVersion } from '@/lib/versioning';
import { buildBrandAssetSnapshot } from '@/lib/snapshot-builders';
import type { Prisma } from '@prisma/client';
import type { MappedResults } from '@/lib/website-scanner/types';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * POST /api/website-scanner/[jobId]/apply — Apply scan results to workspace data.
 *
 * Reads the completed scan's aiResults, then:
 *  1. Updates frameworkData on existing canonical brand assets (by slug)
 *  2. Creates personas
 *  3. Creates products
 *  4. Creates competitors
 *  5. Creates ResourceVersion snapshots for brand asset changes
 *  6. Updates workspace (websiteUrl)
 *  7. Invalidates caches
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { jobId } = await params;

    // Only apply results from completed scans
    const scan = await prisma.websiteScan.findFirst({
      where: { id: jobId, workspaceId, status: 'COMPLETED' },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Completed scan not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { applyAll, categories } = body as {
      applyAll?: boolean;
      categories?: string[];
    };

    const results = scan.aiResults as unknown as MappedResults;
    if (!results) {
      return NextResponse.json({ error: 'No results to apply' }, { status: 400 });
    }

    const shouldApply = (category: string) =>
      applyAll || categories?.includes(category);

    let assetsUpdated = 0;
    let personasCreated = 0;
    let productsCreated = 0;
    let competitorsCreated = 0;

    // Use a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Brand Assets — merge frameworkData on existing canonical assets by slug
      if (shouldApply('brandAssets') && results.brandAssets?.length > 0) {
        for (const asset of results.brandAssets) {
          const existing = await tx.brandAsset.findFirst({
            where: { workspaceId, slug: asset.slug },
          });
          if (!existing) continue;

          // Merge framework data (don't replace)
          const currentData = (existing.frameworkData as Record<string, unknown>) ?? {};
          const mergedData = { ...currentData, ...asset.frameworkData };

          const updated = await tx.brandAsset.update({
            where: { id: existing.id },
            data: {
              frameworkData: mergedData as unknown as Prisma.InputJsonValue,
              status: 'IN_PROGRESS',
            },
          });

          // Create version snapshot
          try {
            await createVersion({
              resourceType: 'BRAND_ASSET',
              resourceId: existing.id,
              snapshot: buildBrandAssetSnapshot(updated),
              changeType: 'IMPORT',
              changeNote: `Auto-populated from website scan of ${scan.url}`,
              userId,
              workspaceId,
            });
          } catch (versionErr) {
            console.error(`[website-scanner] Version snapshot failed for asset ${existing.id}:`, versionErr);
          }

          assetsUpdated++;
        }
      }

      // 2. Personas — create new (skip if name already exists in workspace)
      if (shouldApply('personas') && results.personas?.length > 0) {
        for (const persona of results.personas) {
          const existing = await tx.persona.findFirst({
            where: { workspaceId, name: persona.name },
          });
          if (existing) continue;

          await tx.persona.create({
            data: {
              name: persona.name,
              workspaceId,
              createdById: userId,
              ...persona.fields,
              researchMethods: {
                create: [
                  { method: 'AI_EXPLORATION', status: 'AVAILABLE', workspaceId },
                ],
              },
            },
          });
          personasCreated++;
        }
      }

      // 3. Products — create new
      if (shouldApply('products') && results.products?.length > 0) {
        for (const product of results.products) {
          let slug = product.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          if (!slug) {
            slug = `product-${Date.now()}`;
          }

          // Check for slug collision and append suffix
          const existingProduct = await tx.product.findUnique({ where: { slug } });
          if (existingProduct) {
            slug = `${slug}-${Date.now().toString(36)}`;
          }

          const { images, ...fields } = product.fields as Record<string, unknown> & {
            images?: unknown[];
          };

          await tx.product.create({
            data: {
              name: product.name,
              slug,
              workspaceId,
              source: 'WEBSITE_URL',
              status: 'ANALYZED',
              sourceUrl: scan.url,
              ...fields,
            },
          });
          productsCreated++;
        }
      }

      // 4. Competitors — create new (skip if slug already exists in workspace)
      if (shouldApply('competitors') && results.competitors?.length > 0) {
        for (const competitor of results.competitors) {
          let slug = competitor.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          if (!slug) {
            slug = `competitor-${Date.now()}`;
          }

          // Check for slug collision and skip if already exists
          const existingCompetitor = await tx.competitor.findFirst({
            where: { workspaceId, slug },
          });
          if (existingCompetitor) continue;

          await tx.competitor.create({
            data: {
              name: competitor.name,
              slug,
              workspaceId,
              createdById: userId,
              ...competitor.fields,
            },
          });
          competitorsCreated++;
        }
      }

      // 5. Workspace updates (websiteUrl)
      if (results.workspaceUpdates) {
        const updateData: Record<string, unknown> = {};
        if (results.workspaceUpdates.websiteUrl) {
          updateData.websiteUrl = results.workspaceUpdates.websiteUrl;
        }
        if (Object.keys(updateData).length > 0) {
          await tx.workspace.update({
            where: { id: workspaceId },
            data: updateData,
          });
        }
      }
    });

    // 6. Cache invalidation
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    if (assetsUpdated > 0) {
      // Brand assets don't have server-side caching, but dashboard might reference them
    }
    if (personasCreated > 0) {
      invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    }
    if (productsCreated > 0) {
      invalidateCache(cacheKeys.prefixes.products(workspaceId));
    }
    if (competitorsCreated > 0) {
      invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    }

    return NextResponse.json({
      success: true,
      applied: {
        assetsUpdated,
        personasCreated,
        productsCreated,
        competitorsCreated,
      },
    });
  } catch (error) {
    console.error('[POST /api/website-scanner/:jobId/apply]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
