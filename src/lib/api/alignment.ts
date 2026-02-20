import type {
  AlignmentOverviewResponse,
  AlignmentModulesResponse,
  AlignmentHistoryResponse,
  StartScanResponse,
  ScanProgressResponse,
  CancelScanResponse,
  AlignmentIssuesResponse,
  AlignmentIssueDetailResponse,
  AlignmentIssueListParams,
  DismissIssueBody,
  DismissIssueResponse,
  FixOptionsResponse,
  ApplyFixBody,
  ApplyFixResponse,
} from "@/types/brand-alignment";

const API_BASE = "/api/alignment";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch latest scan overview (score, modules, openIssuesCount).
 */
export async function fetchAlignmentOverview(): Promise<AlignmentOverviewResponse> {
  const res = await fetch(API_BASE);
  return handleResponse<AlignmentOverviewResponse>(res);
}

/**
 * Fetch per-module scores from latest completed scan.
 */
export async function fetchAlignmentModules(): Promise<AlignmentModulesResponse> {
  const res = await fetch(`${API_BASE}/modules`);
  return handleResponse<AlignmentModulesResponse>(res);
}

/**
 * Fetch scan history.
 */
export async function fetchAlignmentHistory(): Promise<AlignmentHistoryResponse> {
  const res = await fetch(`${API_BASE}/history`);
  return handleResponse<AlignmentHistoryResponse>(res);
}

/**
 * Start a new alignment scan.
 */
export async function startAlignmentScan(): Promise<StartScanResponse> {
  const res = await fetch(`${API_BASE}/scan`, { method: "POST" });
  return handleResponse<StartScanResponse>(res);
}

/**
 * Poll scan progress.
 */
export async function fetchScanProgress(
  scanId: string
): Promise<ScanProgressResponse> {
  const res = await fetch(`${API_BASE}/scan/${scanId}`);
  return handleResponse<ScanProgressResponse>(res);
}

/**
 * Cancel a running scan.
 */
export async function cancelAlignmentScan(
  scanId: string
): Promise<CancelScanResponse> {
  const res = await fetch(`${API_BASE}/scan/${scanId}/cancel`, {
    method: "POST",
  });
  return handleResponse<CancelScanResponse>(res);
}

/**
 * Fetch alignment issues with optional filters.
 */
export async function fetchAlignmentIssues(
  params?: AlignmentIssueListParams
): Promise<AlignmentIssuesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.module) searchParams.set("module", params.module);
  if (params?.status) searchParams.set("status", params.status);

  const qs = searchParams.toString();
  const res = await fetch(qs ? `${API_BASE}/issues?${qs}` : `${API_BASE}/issues`);
  return handleResponse<AlignmentIssuesResponse>(res);
}

/**
 * Fetch single issue detail.
 */
export async function fetchAlignmentIssueById(
  id: string
): Promise<AlignmentIssueDetailResponse> {
  const res = await fetch(`${API_BASE}/issues/${id}`);
  return handleResponse<AlignmentIssueDetailResponse>(res);
}

/**
 * Dismiss an alignment issue.
 */
export async function dismissAlignmentIssue(
  id: string,
  body?: DismissIssueBody
): Promise<DismissIssueResponse> {
  const res = await fetch(`${API_BASE}/issues/${id}/dismiss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return handleResponse<DismissIssueResponse>(res);
}

/**
 * Fetch fix options for an issue.
 */
export async function fetchFixOptions(
  id: string
): Promise<FixOptionsResponse> {
  const res = await fetch(`${API_BASE}/issues/${id}/fix-options`);
  return handleResponse<FixOptionsResponse>(res);
}

/**
 * Apply a fix option to an issue.
 */
export async function applyFix(
  id: string,
  body: ApplyFixBody
): Promise<ApplyFixResponse> {
  const res = await fetch(`${API_BASE}/issues/${id}/fix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<ApplyFixResponse>(res);
}
