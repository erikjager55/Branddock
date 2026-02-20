// =============================================================
// AI Brand Analysis — API Fetch Functions (S1 — Fase 1B)
// =============================================================

import type {
  AIAnalysisSession,
  StartSessionResponse,
  SubmitAnswerResponse,
  GenerateReportResponse,
  ReportResponse,
  RawReportResponse,
  ToggleLockResponse,
} from "@/types/ai-analysis";

const BASE = "/api/brand-assets";

function url(assetId: string, ...segments: string[]): string {
  return `${BASE}/${assetId}/ai-analysis${segments.length ? "/" + segments.join("/") : ""}`;
}

// ─── Start Session ──────────────────────────────────────────

export async function startAnalysisSession(
  assetId: string,
  personaId?: string,
): Promise<StartSessionResponse> {
  const res = await fetch(url(assetId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) throw new Error(`Failed to start session: ${res.statusText}`);
  return res.json();
}

// ─── Get Session ────────────────────────────────────────────

export async function getAnalysisSession(
  assetId: string,
  sessionId: string,
): Promise<AIAnalysisSession> {
  const res = await fetch(url(assetId, sessionId));
  if (!res.ok) throw new Error(`Failed to get session: ${res.statusText}`);
  return res.json();
}

// ─── Submit Answer ──────────────────────────────────────────

export async function submitAnswer(
  assetId: string,
  sessionId: string,
  content: string,
): Promise<SubmitAnswerResponse> {
  const res = await fetch(url(assetId, sessionId, "answer"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to submit answer: ${res.statusText}`);
  return res.json();
}

// ─── Complete Session ───────────────────────────────────────

export async function completeSession(
  assetId: string,
  sessionId: string,
): Promise<{ id: string; status: string; completedAt: string | null }> {
  const res = await fetch(url(assetId, sessionId, "complete"), {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to complete session: ${res.statusText}`);
  return res.json();
}

// ─── Generate Report ────────────────────────────────────────

export async function generateReport(
  assetId: string,
  sessionId: string,
): Promise<GenerateReportResponse> {
  const res = await fetch(url(assetId, sessionId, "generate-report"), {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to generate report: ${res.statusText}`);
  return res.json();
}

// ─── Get Report ─────────────────────────────────────────────

export async function getReport(
  assetId: string,
  sessionId: string,
): Promise<ReportResponse> {
  const res = await fetch(url(assetId, sessionId, "report"));
  if (!res.ok) throw new Error(`Failed to get report: ${res.statusText}`);
  return res.json();
}

// ─── Get Raw Report ─────────────────────────────────────────

export async function getRawReport(
  assetId: string,
  sessionId: string,
): Promise<RawReportResponse> {
  const res = await fetch(url(assetId, sessionId, "report", "raw"));
  if (!res.ok) throw new Error(`Failed to get raw report: ${res.statusText}`);
  return res.json();
}

// ─── Toggle Lock ────────────────────────────────────────────

export async function toggleSessionLock(
  assetId: string,
  sessionId: string,
): Promise<ToggleLockResponse> {
  const res = await fetch(url(assetId, sessionId, "lock"), {
    method: "PATCH",
  });
  if (!res.ok) throw new Error(`Failed to toggle lock: ${res.statusText}`);
  return res.json();
}
