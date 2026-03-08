// =============================================================
// Trend Radar API Client
// =============================================================

import type {
  TrendListResponse,
  TrendRadarStats,
  DetectedTrendWithMeta,
  TrendResearchJobResponse,
  ResearchProgressResponse,
  CreateManualTrendBody,
  UpdateTrendBody,
  TrendListParams,
  StartResearchBody,
} from '../types/trend-radar.types';

const BASE = '/api/trend-radar';

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Trends ──────────────────────────────────────────────────

export function fetchTrends(params?: TrendListParams): Promise<TrendListResponse> {
  return json(`${BASE}${qs(params as Record<string, string | number | boolean | undefined> ?? {})}`);
}

export function fetchTrendById(id: string): Promise<DetectedTrendWithMeta> {
  return json(`${BASE}/${id}`);
}

export function updateTrend(id: string, body: UpdateTrendBody): Promise<DetectedTrendWithMeta> {
  return json(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function deleteTrend(id: string): Promise<{ success: boolean }> {
  return json(`${BASE}/${id}`, { method: 'DELETE' });
}

export function activateTrend(id: string): Promise<DetectedTrendWithMeta> {
  return json(`${BASE}/${id}/activate`, { method: 'PATCH' });
}

export function dismissTrend(id: string): Promise<DetectedTrendWithMeta> {
  return json(`${BASE}/${id}/dismiss`, { method: 'PATCH' });
}

export function createManualTrend(body: CreateManualTrendBody): Promise<DetectedTrendWithMeta> {
  return json(`${BASE}/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function lockTrend(id: string, locked: boolean): Promise<{ isLocked: boolean; lockedAt: string | null; lockedBy: { id: string; name: string } | null }> {
  return json(`${BASE}/${id}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locked }),
  });
}

// ─── Stats ───────────────────────────────────────────────────

export function fetchTrendStats(): Promise<TrendRadarStats> {
  return json(`${BASE}/stats`);
}

// ─── Research ────────────────────────────────────────────────

export function startResearch(body: StartResearchBody): Promise<TrendResearchJobResponse> {
  return json(`${BASE}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchResearchProgress(jobId: string): Promise<ResearchProgressResponse> {
  return json(`${BASE}/research/${jobId}`);
}

export function cancelResearch(jobId: string): Promise<{ success: boolean }> {
  return json(`${BASE}/research/${jobId}/cancel`, { method: 'POST' });
}

export function approveResearchTrends(jobId: string, selectedIndices: number[]): Promise<{ approved: number; total: number }> {
  return json(`${BASE}/research/${jobId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedIndices }),
  });
}
