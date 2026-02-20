import type {
  InsightListParams,
  InsightListResponse,
  InsightDetail,
  InsightStats,
  InsightWithMeta,
  CreateInsightBody,
  UpdateInsightBody,
  AddInsightSourceBody,
  AiResearchBody,
  AiResearchJobResponse,
  ImportProvider,
} from "../types/market-insight.types";
import type { InsightSourceUrl } from "@/types/market-insight";

const API_BASE = "/api/insights";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

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

export async function fetchInsightDetail(id: string): Promise<InsightDetail> {
  const res = await fetch(`${API_BASE}/${id}`);
  return handleResponse<InsightDetail>(res);
}

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

export async function deleteInsight(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchInsightStats(): Promise<InsightStats> {
  const res = await fetch(`${API_BASE}/stats`);
  return handleResponse<InsightStats>(res);
}

export async function startAiResearch(
  body: AiResearchBody
): Promise<AiResearchJobResponse> {
  const res = await fetch(`${API_BASE}/ai-research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<AiResearchJobResponse>(res);
}

export async function addSource(
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

export async function deleteSource(
  insightId: string,
  sourceId: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/${insightId}/sources/${sourceId}`, {
    method: "DELETE",
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchProviders(): Promise<{ providers: ImportProvider[] }> {
  const res = await fetch(`${API_BASE}/providers`);
  return handleResponse<{ providers: ImportProvider[] }>(res);
}
