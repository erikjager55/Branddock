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
