import type {
  ResearchStatsResponse,
  MethodStatusResponse,
  ActiveResearchItem,
  PendingValidationItem,
  QuickInsight,
  RecommendedAction,
  BundleListResponse,
  BundleDetailResponse,
  AvailableAsset,
  MethodConfig,
  CreatePlanBody,
  PlanDetailResponse,
  StudyListItem,
} from "../types/research.types";

const BASE = "/api/research";

// ─── Hub ────────────────────────────────────────────────────

export async function fetchResearchStats(): Promise<ResearchStatsResponse> {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch research stats");
  return res.json();
}

export async function fetchMethodStatus(): Promise<MethodStatusResponse> {
  const res = await fetch(`${BASE}/method-status`);
  if (!res.ok) throw new Error("Failed to fetch method status");
  return res.json();
}

export async function fetchActiveResearch(): Promise<{ items: ActiveResearchItem[] }> {
  const res = await fetch(`${BASE}/active`);
  if (!res.ok) throw new Error("Failed to fetch active research");
  return res.json();
}

export async function fetchPendingValidation(): Promise<{ items: PendingValidationItem[] }> {
  const res = await fetch(`${BASE}/pending-validation`);
  if (!res.ok) throw new Error("Failed to fetch pending validation");
  return res.json();
}

export async function fetchInsights(): Promise<{ insights: QuickInsight[] }> {
  const res = await fetch(`${BASE}/insights`);
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}

export async function fetchRecommendedActions(): Promise<{ actions: RecommendedAction[] }> {
  const res = await fetch(`${BASE}/recommended-actions`);
  if (!res.ok) throw new Error("Failed to fetch recommended actions");
  return res.json();
}

// ─── Bundles ────────────────────────────────────────────────

export async function fetchBundles(): Promise<BundleListResponse> {
  const res = await fetch(`${BASE}/bundles`);
  if (!res.ok) throw new Error("Failed to fetch bundles");
  return res.json();
}

export async function fetchBundleDetail(id: string): Promise<BundleDetailResponse> {
  const res = await fetch(`${BASE}/bundles/${id}`);
  if (!res.ok) throw new Error("Failed to fetch bundle detail");
  return res.json();
}

export async function selectBundle(id: string): Promise<{ purchaseId: string; status: string }> {
  const res = await fetch(`${BASE}/bundles/${id}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to select bundle");
  return res.json();
}

// ─── Custom ─────────────────────────────────────────────────

export async function fetchAvailableAssets(): Promise<{ assets: AvailableAsset[] }> {
  const res = await fetch(`${BASE}/custom/available-assets`);
  if (!res.ok) throw new Error("Failed to fetch available assets");
  return res.json();
}

export async function fetchMethods(): Promise<{ methods: MethodConfig[] }> {
  const res = await fetch(`${BASE}/custom/methods`);
  if (!res.ok) throw new Error("Failed to fetch methods");
  return res.json();
}

export async function createPlan(body: CreatePlanBody): Promise<PlanDetailResponse> {
  const res = await fetch(`${BASE}/custom/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create plan");
  return res.json();
}

export async function fetchPlanDetail(id: string): Promise<PlanDetailResponse> {
  const res = await fetch(`${BASE}/custom/plan/${id}`);
  if (!res.ok) throw new Error("Failed to fetch plan detail");
  return res.json();
}

export async function updatePlan(id: string, body: Partial<CreatePlanBody>): Promise<PlanDetailResponse> {
  const res = await fetch(`${BASE}/custom/plan/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update plan");
  return res.json();
}

export async function purchasePlan(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`${BASE}/custom/plan/${id}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to purchase plan");
  return res.json();
}

export async function startValidation(id: string): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`${BASE}/custom/plan/${id}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to start validation");
  return res.json();
}

// ─── Studies ────────────────────────────────────────────────

export async function fetchStudies(status?: string): Promise<{ studies: StudyListItem[] }> {
  const url = new URL(`${BASE}/studies`, window.location.origin);
  if (status) url.searchParams.set("status", status);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch studies");
  return res.json();
}

export async function updateStudy(
  id: string,
  body: { progress?: number; status?: string }
): Promise<StudyListItem> {
  const res = await fetch(`${BASE}/studies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update study");
  return res.json();
}
