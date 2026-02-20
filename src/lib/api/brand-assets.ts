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
 * workspaceId is resolved server-side from the session cookie.
 */
export async function fetchBrandAssets(
  params?: BrandAssetListParams
): Promise<BrandAssetListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.category) searchParams.set("category", params.category);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const qs = searchParams.toString();
  const res = await fetch(qs ? `${API_BASE}?${qs}` : API_BASE);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch brand assets (${res.status})`);
  }

  return res.json();
}

/**
 * Create a new brand asset.
 * Used as the mutationFn in TanStack Query.
 * workspaceId is resolved server-side from the session cookie.
 */
export async function createBrandAsset(
  body: CreateBrandAssetBody
): Promise<BrandAssetWithMeta> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create brand asset (${res.status})`);
  }

  return res.json();
}
