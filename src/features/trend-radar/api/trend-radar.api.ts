// =============================================================
// Trend Radar API Client
// =============================================================

import type {
  TrendListResponse,
  SourceListResponse,
  TrendRadarStats,
  DetectedTrendWithMeta,
  TrendSourceWithMeta,
  TrendScanJobWithMeta,
  ScanProgressResponse,
  CreateSourceBody,
  UpdateSourceBody,
  CreateManualTrendBody,
  UpdateTrendBody,
  TrendListParams,
  SourceListParams,
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

// ─── Stats ───────────────────────────────────────────────────

export function fetchTrendStats(): Promise<TrendRadarStats> {
  return json(`${BASE}/stats`);
}

// ─── Sources ─────────────────────────────────────────────────

export function fetchSources(params?: SourceListParams): Promise<SourceListResponse> {
  return json(`${BASE}/sources${qs(params as Record<string, string | number | boolean | undefined> ?? {})}`);
}

export function fetchSourceById(id: string): Promise<TrendSourceWithMeta> {
  return json(`${BASE}/sources/${id}`);
}

export function createSource(body: CreateSourceBody): Promise<TrendSourceWithMeta> {
  return json(`${BASE}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function updateSource(id: string, body: UpdateSourceBody): Promise<TrendSourceWithMeta> {
  return json(`${BASE}/sources/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function deleteSource(id: string): Promise<{ success: boolean }> {
  return json(`${BASE}/sources/${id}`, { method: 'DELETE' });
}

export function toggleSourcePause(id: string): Promise<TrendSourceWithMeta> {
  return json(`${BASE}/sources/${id}/pause`, { method: 'PATCH' });
}

// ─── Scan ────────────────────────────────────────────────────

export function startScan(sourceId?: string): Promise<TrendScanJobWithMeta> {
  return json(`${BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sourceId ? { sourceId } : {}),
  });
}

export function fetchScanProgress(jobId: string): Promise<ScanProgressResponse> {
  return json(`${BASE}/scan/${jobId}`);
}

export function cancelScan(jobId: string): Promise<{ success: boolean }> {
  return json(`${BASE}/scan/${jobId}/cancel`, { method: 'POST' });
}
