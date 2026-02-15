import type { TrendListResponse, TrendListParams, CreateTrendBody, TrendWithMeta } from "@/types/trend";

const API_BASE = "/api/trends";

export async function fetchTrends(workspaceId: string, params?: TrendListParams): Promise<TrendListResponse> {
  const searchParams = new URLSearchParams({ workspaceId });
  if (params?.category) searchParams.set("category", params.category);
  if (params?.impact) searchParams.set("impact", params.impact);
  if (params?.timeframe) searchParams.set("timeframe", params.timeframe);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(`${API_BASE}?${searchParams.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch trends (${res.status})`);
  }
  return res.json();
}

export async function createTrend(workspaceId: string, body: CreateTrendBody): Promise<TrendWithMeta> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create trend (${res.status})`);
  }
  return res.json();
}
