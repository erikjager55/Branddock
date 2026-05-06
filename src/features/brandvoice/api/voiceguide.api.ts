// =============================================================
// Brand Voiceguide API client (mirror of brandstyle.api.ts pattern)
// =============================================================

import type {
  BrandVoiceguide,
  UpdateBrandVoiceguideBody,
  SaveForAiSection,
  RecomputeCentroidResponse,
  MigrateFromPersonalityResponse,
  VoiceAnalysisStartResponse,
  VoiceAnalysisProgress,
} from "../types/voiceguide.types";

const BASE = "/api/brandvoiceguide";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message: string;
    try {
      const data = await res.json();
      message = typeof data?.error === "string" ? data.error : JSON.stringify(data?.error ?? data);
    } catch {
      message = await res.text();
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// ─── Core CRUD ──────────────────────────────────────────────

export async function fetchVoiceguide(): Promise<{ voiceguide: BrandVoiceguide | null }> {
  return handle(await fetch(BASE, { credentials: "include" }));
}

export async function updateVoiceguide(
  body: UpdateBrandVoiceguideBody
): Promise<{ voiceguide: BrandVoiceguide }> {
  return handle(
    await fetch(BASE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
  );
}

export async function saveSectionForAi(
  section: SaveForAiSection,
  value = true
): Promise<{ success: true; section: SaveForAiSection; savedForAi: boolean }> {
  return handle(
    await fetch(`${BASE}/${section}/save-for-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ value }),
    })
  );
}

// ─── Centroid ───────────────────────────────────────────────

export async function recomputeCentroid(): Promise<RecomputeCentroidResponse> {
  return handle(
    await fetch(`${BASE}/recompute-centroid`, {
      method: "POST",
      credentials: "include",
    })
  );
}

// ─── Migration ──────────────────────────────────────────────

export async function migrateFromPersonality(
  computeCentroid = true
): Promise<MigrateFromPersonalityResponse> {
  return handle(
    await fetch(`${BASE}/migrate-from-personality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ computeCentroid }),
    })
  );
}

// ─── Analyzer ───────────────────────────────────────────────

export async function startVoiceAnalyze(payload: {
  url?: string;
  pastedSamples?: string[];
}): Promise<VoiceAnalysisStartResponse> {
  return handle(
    await fetch(`${BASE}/analyze/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
  );
}

export async function fetchVoiceAnalyzeStatus(jobId: string): Promise<VoiceAnalysisProgress> {
  return handle(
    await fetch(`${BASE}/analyze/status/${encodeURIComponent(jobId)}`, {
      credentials: "include",
    })
  );
}
