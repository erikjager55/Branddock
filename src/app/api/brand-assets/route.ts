import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import type {
  BrandAssetWithMeta,
  BrandAssetListResponse,
  AssetCategory,
  AssetStatus,
} from "@/types/brand-asset";
import { computeValidationPercentage } from "@/lib/validation-percentage";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/brand-assets
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as AssetCategory | null;
    const status = searchParams.get("status") as AssetStatus | null;
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "name";
    const sortOrder = searchParams.get("sortOrder") ?? "asc";

    // Build Prisma where clause
    const where: Record<string, unknown> = { workspaceId };
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy — coveragePercentage is computed from research methods,
    // not stored in DB, so we sort in-memory after computation when requested
    const sortByCoverage = sortBy === "coveragePercentage";
    const orderByMap: Record<string, string> = {
      name: "name",
      updatedAt: "updatedAt",
    };
    const orderByField = orderByMap[sortBy] ?? "name";
    const orderBy = sortByCoverage ? { name: "asc" as const } : { [orderByField]: sortOrder === "desc" ? "desc" : "asc" };

    // Query — include research methods to compute real validation %
    const dbAssets = await prisma.brandAsset.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        status: true,
        validatedCount: true,
        artifactCount: true,
        frameworkType: true,
        frameworkData: true,
        aiValidated: true,
        workshopValidated: true,
        interviewValidated: true,
        questionnaireValidated: true,
        updatedAt: true,
        researchMethods: {
          select: { method: true, status: true, progress: true },
        },
      },
    });

    // Map to BrandAssetWithMeta — compute validation % from research methods
    const assets: BrandAssetWithMeta[] = dbAssets.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      description: a.description,
      category: a.category as AssetCategory,
      status: a.status as AssetStatus,
      coveragePercentage: computeValidationPercentage(a.researchMethods),
      validatedCount: a.validatedCount,
      artifactCount: a.artifactCount,
      frameworkType: a.frameworkType,
      frameworkData: a.frameworkData as Record<string, unknown> | null,
      validationMethods: {
        ai: a.aiValidated,
        workshop: a.workshopValidated,
        interview: a.interviewValidated,
        questionnaire: a.questionnaireValidated,
      },
      updatedAt: a.updatedAt.toISOString(),
    }));

    // Sort by computed coveragePercentage if requested
    if (sortByCoverage) {
      const dir = sortOrder === "desc" ? -1 : 1;
      assets.sort((a, b) => dir * (a.coveragePercentage - b.coveragePercentage));
    }

    // Compute summary stats
    const avgCoverage = assets.length > 0
      ? Math.round(assets.reduce((sum, a) => sum + a.coveragePercentage, 0) / assets.length)
      : 0;

    const stats = {
      total: assets.length,
      ready: assets.filter((a) => a.status === "READY").length,
      needValidation: assets.filter(
        (a) => a.status === "NEEDS_ATTENTION" || a.status === "IN_PROGRESS" || a.status === "DRAFT"
      ).length,
      avgCoverage,
    };

    const response: BrandAssetListResponse = { assets, stats };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/brand-assets]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================
// POST /api/brand-assets  { name, category, description? }
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, description } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "name and category are required" },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for duplicate slug within workspace
    const existing = await prisma.brandAsset.findFirst({
      where: { slug, workspaceId },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Brand asset with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const asset = await prisma.brandAsset.create({
      data: {
        name,
        slug,
        description: description ?? "",
        category,
        status: "DRAFT",
        workspaceId,
      },
    });

    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brand-assets]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
