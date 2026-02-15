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
