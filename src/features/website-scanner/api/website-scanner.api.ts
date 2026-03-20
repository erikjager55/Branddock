import type {
  StartScanResponse,
  ScanProgressResponse,
  ApplyResultsResponse,
  ApplyBody,
} from '../types/website-scanner.types';

const BASE = '/api/website-scanner';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export function startScan(url: string): Promise<StartScanResponse> {
  return json(`${BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}

export function pollScanProgress(jobId: string): Promise<ScanProgressResponse> {
  return json(`${BASE}/${jobId}`);
}

export function cancelScan(jobId: string): Promise<{ success: boolean }> {
  return json(`${BASE}/${jobId}/cancel`, { method: 'POST' });
}

export function applyResults(
  jobId: string,
  body: ApplyBody,
): Promise<ApplyResultsResponse> {
  return json(`${BASE}/${jobId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
