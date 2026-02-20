import type {
  ProductListResponse,
  ProductListParams,
  ProductDetail,
  ProductWithMeta,
  CreateProductBody,
  UpdateProductBody,
  AnalyzeJobResponse,
  ProductPersonasResponse,
} from "../types/product.types";

const BASE = "/api/products";

// ─── List ───────────────────────────────────────────────────

export async function fetchProducts(
  params?: ProductListParams,
): Promise<ProductListResponse> {
  const url = new URL(BASE, window.location.origin);
  if (params?.category) url.searchParams.set("category", params.category);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch products (${res.status})`);
  }
  return res.json();
}

// ─── Create ─────────────────────────────────────────────────

export async function createProduct(
  body: CreateProductBody,
): Promise<ProductWithMeta> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create product (${res.status})`);
  }
  return res.json();
}

// ─── Detail ─────────────────────────────────────────────────

export async function fetchProductDetail(
  id: string,
): Promise<ProductDetail> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch product detail (${res.status})`);
  }
  return res.json();
}

// ─── Update ─────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  body: UpdateProductBody,
): Promise<ProductDetail> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to update product (${res.status})`);
  }
  return res.json();
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteProduct(
  id: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to delete product (${res.status})`);
  }
  return res.json();
}

// ─── Analyze URL ────────────────────────────────────────────

export async function analyzeUrl(
  url: string,
): Promise<AnalyzeJobResponse> {
  const res = await fetch(`${BASE}/analyze/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to analyze URL (${res.status})`);
  }
  return res.json();
}

// ─── Analyze PDF ────────────────────────────────────────────

export async function analyzePdf(
  file: File,
): Promise<AnalyzeJobResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/analyze/pdf`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to analyze PDF (${res.status})`);
  }
  return res.json();
}

// ─── Link / Unlink Persona ──────────────────────────────────

export async function linkPersona(
  productId: string,
  personaId: string,
): Promise<{ productId: string; personaId: string }> {
  const res = await fetch(`${BASE}/${productId}/link-persona`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to link persona (${res.status})`);
  }
  return res.json();
}

export async function unlinkPersona(
  productId: string,
  personaId: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${productId}/unlink-persona/${personaId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to unlink persona (${res.status})`);
  }
  return res.json();
}

// ─── Product Personas ───────────────────────────────────────

export async function fetchProductPersonas(
  productId: string,
): Promise<ProductPersonasResponse> {
  const res = await fetch(`${BASE}/${productId}/personas`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error ?? `Failed to fetch product personas (${res.status})`,
    );
  }
  return res.json();
}
