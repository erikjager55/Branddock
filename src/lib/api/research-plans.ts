import type {
  ResearchPlanListResponse,
  CreateResearchPlanBody,
  UpdateResearchPlanBody,
  ResearchPlanWithMeta,
  PurchasedBundleListResponse,
  PurchaseBundleBody,
  PurchasedBundleWithMeta,
} from "@/types/research-plan";

// --- Research Plans ---

export async function fetchResearchPlans(
  workspaceId: string,
  status?: string
): Promise<ResearchPlanListResponse> {
  const params = new URLSearchParams({ workspaceId });
  if (status) params.set("status", status);

  const res = await fetch(`/api/research-plans?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch research plans (${res.status})`);
  }
  return res.json();
}

export async function createResearchPlan(
  workspaceId: string,
  body: CreateResearchPlanBody
): Promise<ResearchPlanWithMeta> {
  const res = await fetch("/api/research-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create research plan (${res.status})`);
  }
  return res.json();
}

export async function updateResearchPlan(
  id: string,
  updates: UpdateResearchPlanBody
): Promise<ResearchPlanWithMeta> {
  const res = await fetch("/api/research-plans", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to update research plan (${res.status})`);
  }
  return res.json();
}

// --- Purchased Bundles ---

export async function fetchPurchasedBundles(
  workspaceId: string
): Promise<PurchasedBundleListResponse> {
  const res = await fetch(`/api/purchased-bundles?workspaceId=${workspaceId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch purchased bundles (${res.status})`);
  }
  return res.json();
}

export async function purchaseBundle(
  workspaceId: string,
  body: PurchaseBundleBody
): Promise<PurchasedBundleWithMeta> {
  const res = await fetch("/api/purchased-bundles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to purchase bundle (${res.status})`);
  }
  return res.json();
}
