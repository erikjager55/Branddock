import type {
  InsightListParams,
  InsightListResponse,
  InsightDetailResponse,
  InsightStats,
  InsightWithMeta,
  CreateInsightBody,
  UpdateInsightBody,
  AddInsightSourceBody,
  InsightSourceUrl,
} from "@/types/market-insight";

const API_BASE = "/api/insights";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch insights list with optional filters.
 * workspaceId is resolved server-side from the session cookie.
 */
export async function fetchInsights(
  params?: InsightListParams
): Promise<InsightListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.category) searchParams.set("category", params.category);
  if (params?.impactLevel) searchParams.set("impactLevel", params.impactLevel);
  if (params?.timeframe) searchParams.set("timeframe", params.timeframe);
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  const res = await fetch(qs ? `${API_BASE}?${qs}` : API_BASE);
  return handleResponse<InsightListResponse>(res);
}

/**
 * Fetch single insight by ID (includes aiResearchPrompt/Config).
 */
export async function fetchInsightById(
  id: string
): Promise<InsightDetailResponse> {
  const res = await fetch(`${API_BASE}/${id}`);
  return handleResponse<InsightDetailResponse>(res);
}

/**
 * Fetch insight stats only.
 */
export async function fetchInsightStats(): Promise<InsightStats> {
  const res = await fetch(`${API_BASE}/stats`);
  return handleResponse<InsightStats>(res);
}

/**
 * Create a new insight.
 */
export async function createInsight(
  body: CreateInsightBody
): Promise<InsightWithMeta> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<InsightWithMeta>(res);
}

/**
 * Update an existing insight.
 */
export async function updateInsight(
  id: string,
  body: UpdateInsightBody
): Promise<InsightWithMeta> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<InsightWithMeta>(res);
}

/**
 * Delete an insight (cascades to source URLs).
 */
export async function deleteInsight(
  id: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  return handleResponse<{ success: boolean }>(res);
}

/**
 * Add a source URL to an insight.
 */
export async function addInsightSource(
  insightId: string,
  body: AddInsightSourceBody
): Promise<InsightSourceUrl> {
  const res = await fetch(`${API_BASE}/${insightId}/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<InsightSourceUrl>(res);
}

/**
 * Delete a source URL from an insight.
 */
export async function deleteInsightSource(
  insightId: string,
  sourceId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/${insightId}/sources/${sourceId}`, {
    method: "DELETE",
  });
  return handleResponse<{ success: boolean }>(res);
}
