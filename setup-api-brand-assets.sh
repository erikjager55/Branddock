#!/bin/bash
# =============================================================
# setup-api-brand-assets.sh
# Installeert de eerste API route + TanStack Query integratie
# Draai vanuit ~/Projects/branddock-app/
# =============================================================

set -e

echo "📦 Stap 1: Directories aanmaken..."
mkdir -p src/app/api/brand-assets
mkdir -p src/lib/api
mkdir -p src/providers

echo "📄 Stap 2: API route kopiëren..."
cat > src/app/api/brand-assets/route.ts << 'ROUTE_EOF'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  BrandAssetWithMeta,
  BrandAssetListResponse,
  AssetCategory,
  AssetStatus,
} from "@/types/brand-asset";

// =============================================================
// GET /api/brand-assets?workspaceId=xxx&category=STRATEGY&...
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // TODO: haal workspaceId uit auth sessie zodra auth is geïmplementeerd
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Filter params
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

    // Build orderBy
    const orderByMap: Record<string, string> = {
      name: "name",
      updatedAt: "updatedAt",
      coveragePercentage: "coveragePercentage",
    };
    const orderByField = orderByMap[sortBy] ?? "name";
    const orderBy = { [orderByField]: sortOrder === "desc" ? "desc" : "asc" };

    // Query
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
        coveragePercentage: true,
        validatedCount: true,
        artifactCount: true,
        aiValidated: true,
        workshopValidated: true,
        interviewValidated: true,
        questionnaireValidated: true,
        updatedAt: true,
      },
    });

    // Map to BrandAssetWithMeta
    const assets: BrandAssetWithMeta[] = dbAssets.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      description: a.description,
      category: a.category as AssetCategory,
      status: a.status as AssetStatus,
      coveragePercentage: a.coveragePercentage,
      validatedCount: a.validatedCount,
      artifactCount: a.artifactCount,
      validationMethods: {
        ai: a.aiValidated,
        workshop: a.workshopValidated,
        interview: a.interviewValidated,
        questionnaire: a.questionnaireValidated,
      },
      updatedAt: a.updatedAt.toISOString(),
    }));

    // Compute summary stats
    const stats = {
      total: assets.length,
      ready: assets.filter((a) => a.status === "READY").length,
      needValidation: assets.filter(
        (a) => a.status === "NEEDS_ATTENTION" || a.status === "IN_PROGRESS"
      ).length,
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
// POST /api/brand-assets  { name, category, description?, workspaceId }
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, description, workspaceId } = body;

    if (!name || !category || !workspaceId) {
      return NextResponse.json(
        { error: "name, category and workspaceId are required" },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for duplicate slug
    const existing = await prisma.brandAsset.findUnique({
      where: { slug },
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

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brand-assets]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
ROUTE_EOF

echo "📄 Stap 3: API client kopiëren..."
cat > src/lib/api/brand-assets.ts << 'CLIENT_EOF'
import type {
  BrandAssetListResponse,
  BrandAssetListParams,
  CreateBrandAssetBody,
  BrandAssetWithMeta,
} from "@/types/brand-asset";

const API_BASE = "/api/brand-assets";

/**
 * Fetch brand assets list with optional filters.
 * Used as the queryFn in TanStack Query.
 */
export async function fetchBrandAssets(
  workspaceId: string,
  params?: BrandAssetListParams
): Promise<BrandAssetListResponse> {
  const searchParams = new URLSearchParams({ workspaceId });

  if (params?.category) searchParams.set("category", params.category);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(`${API_BASE}?${searchParams.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch brand assets (${res.status})`);
  }

  return res.json();
}

/**
 * Create a new brand asset.
 * Used as the mutationFn in TanStack Query.
 */
export async function createBrandAsset(
  workspaceId: string,
  body: CreateBrandAssetBody
): Promise<BrandAssetWithMeta> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create brand asset (${res.status})`);
  }

  return res.json();
}
CLIENT_EOF

echo "📄 Stap 4: TanStack Query hook kopiëren..."
cat > src/hooks/use-brand-assets.ts << 'HOOK_EOF'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBrandAssets, createBrandAsset } from "@/lib/api/brand-assets";
import type {
  BrandAssetListParams,
  BrandAssetListResponse,
  CreateBrandAssetBody,
} from "@/types/brand-asset";

// Query key factory — houdt cache keys consistent
export const brandAssetKeys = {
  all: ["brand-assets"] as const,
  list: (workspaceId: string, params?: BrandAssetListParams) =>
    ["brand-assets", "list", workspaceId, params ?? {}] as const,
};

/**
 * Hook: haal brand assets op voor een workspace met optionele filters.
 *
 * Gebruik:
 *   const { data, isLoading, error } = useBrandAssets(workspaceId);
 *   const { data } = useBrandAssets(workspaceId, { category: "STRATEGY" });
 */
export function useBrandAssets(
  workspaceId: string | undefined,
  params?: BrandAssetListParams
) {
  return useQuery<BrandAssetListResponse>({
    queryKey: brandAssetKeys.list(workspaceId ?? "", params),
    queryFn: () => fetchBrandAssets(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 30_000, // 30s — brand assets wijzigen niet vaak
  });
}

/**
 * Hook: maak een nieuw brand asset aan.
 * Invalidate automatisch de lijst-cache na succes.
 *
 * Gebruik:
 *   const { mutate, isPending } = useCreateBrandAsset(workspaceId);
 *   mutate({ name: "Brand Promise", category: "STRATEGY" });
 */
export function useCreateBrandAsset(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateBrandAssetBody) =>
      createBrandAsset(workspaceId, body),
    onSuccess: () => {
      // Invalidate all brand asset lists for this workspace
      queryClient.invalidateQueries({
        queryKey: brandAssetKeys.all,
      });
    },
  });
}
HOOK_EOF

echo "📄 Stap 5: QueryProvider aanmaken..."
cat > src/providers/query-provider.tsx << 'PROVIDER_EOF'
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
PROVIDER_EOF

echo ""
echo "✅ Bestanden aangemaakt:"
echo "   src/app/api/brand-assets/route.ts    ← API route (GET + POST)"
echo "   src/lib/api/brand-assets.ts          ← Type-safe fetch functies"
echo "   src/hooks/use-brand-assets.ts        ← TanStack Query hooks"
echo "   src/providers/query-provider.tsx      ← QueryClientProvider wrapper"
echo ""
echo "⚠️  HANDMATIGE STAP NODIG:"
echo "   Wrap je app met <QueryProvider> in src/app/layout.tsx:"
echo ""
echo '   import { QueryProvider } from "@/providers/query-provider";'
echo ""
echo "   // In de return:"
echo "   <QueryProvider>"
echo "     {children}"
echo "   </QueryProvider>"
echo ""
echo "🧪 Test de API:"
echo '   curl "http://localhost:3000/api/brand-assets?workspaceId=<WORKSPACE_ID>"'
echo ""
echo "   Workspace ID vinden:"
echo '   psql postgresql://erikjager:@localhost:5432/branddock -c "SELECT id, name FROM \"Workspace\" LIMIT 5;"'
