import type {
  ProductListResponse,
  ProductListParams,
  CreateProductBody,
  ProductWithMeta,
} from "@/types/product";

const API_BASE = "/api/products";

/**
 * Fetch products list with optional filters.
 */
export async function fetchProducts(
  workspaceId: string,
  params?: ProductListParams
): Promise<ProductListResponse> {
  const searchParams = new URLSearchParams({ workspaceId });

  if (params?.category) searchParams.set("category", params.category);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(`${API_BASE}?${searchParams.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch products (${res.status})`);
  }

  return res.json();
}

// --- ProductPersona types ---
export interface ProductPersonaLink {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  occupation: string | null;
  location: string | null;
}

/**
 * Fetch personas linked to a product.
 */
export async function fetchProductPersonas(
  productId: string
): Promise<{ personas: ProductPersonaLink[] }> {
  const res = await fetch(`${API_BASE}/${productId}/personas`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch product personas (${res.status})`);
  }
  return res.json();
}

/**
 * Link a persona to a product.
 */
export async function linkPersona(
  productId: string,
  personaId: string
): Promise<{ productId: string; personaId: string }> {
  const res = await fetch(`${API_BASE}/${productId}/personas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to link persona (${res.status})`);
  }
  return res.json();
}

/**
 * Unlink a persona from a product.
 */
export async function unlinkPersona(
  productId: string,
  personaId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/${productId}/personas/${personaId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to unlink persona (${res.status})`);
  }
  return res.json();
}

/**
 * Create a new product.
 */
export async function createProduct(
  workspaceId: string,
  body: CreateProductBody
): Promise<ProductWithMeta> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create product (${res.status})`);
  }

  return res.json();
}
