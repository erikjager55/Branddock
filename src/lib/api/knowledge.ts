import type { KnowledgeListResponse, KnowledgeListParams, CreateKnowledgeBody, KnowledgeWithMeta } from "@/types/knowledge";

const API_BASE = "/api/knowledge";

export async function fetchKnowledge(workspaceId: string, params?: KnowledgeListParams): Promise<KnowledgeListResponse> {
  const searchParams = new URLSearchParams({ workspaceId });
  if (params?.type) searchParams.set("type", params.type);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(`${API_BASE}?${searchParams.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch knowledge (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch featured resources.
 */
export async function fetchFeaturedResources(): Promise<{ resources: KnowledgeWithMeta[] }> {
  const res = await fetch(`${API_BASE}/featured`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch featured resources (${res.status})`);
  }
  return res.json();
}

/**
 * Toggle isFavorite on a knowledge resource.
 */
export async function toggleFavorite(id: string): Promise<{ id: string; isFavorite: boolean }> {
  const res = await fetch(`${API_BASE}/${id}/favorite`, { method: "PATCH" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to toggle favorite (${res.status})`);
  }
  return res.json();
}

/**
 * Toggle isArchived on a knowledge resource.
 */
export async function toggleArchive(id: string): Promise<{ id: string; isArchived: boolean }> {
  const res = await fetch(`${API_BASE}/${id}/archive`, { method: "PATCH" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to toggle archive (${res.status})`);
  }
  return res.json();
}

/**
 * Toggle isFeatured on a knowledge resource.
 */
export async function toggleFeatured(id: string): Promise<{ id: string; isFeatured: boolean }> {
  const res = await fetch(`${API_BASE}/${id}/featured`, { method: "PATCH" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to toggle featured (${res.status})`);
  }
  return res.json();
}

export async function createKnowledge(workspaceId: string, body: CreateKnowledgeBody): Promise<KnowledgeWithMeta> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create knowledge resource (${res.status})`);
  }
  return res.json();
}
