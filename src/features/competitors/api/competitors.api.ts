// =============================================================
// Competitor API Client
// =============================================================

import type {
  CompetitorListResponse,
  CompetitorListParams,
  CompetitorDetail,
  CreateCompetitorBody,
  UpdateCompetitorBody,
  AnalyzeJobResponse,
  CompetitorProductsResponse,
} from "../types/competitor.types";

const BASE = "/api/competitors";

// ─── List ───────────────────────────────────────────────────

export async function fetchCompetitors(
  params?: CompetitorListParams,
): Promise<CompetitorListResponse> {
  const url = new URL(BASE, window.location.origin);
  if (params?.tier) url.searchParams.set("tier", params.tier);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch competitors (${res.status})`);
  }
  return res.json();
}

// ─── Detail ─────────────────────────────────────────────────

export async function fetchCompetitorDetail(
  id: string,
): Promise<CompetitorDetail> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch competitor detail (${res.status})`);
  }
  return res.json();
}

// ─── Create ─────────────────────────────────────────────────

export async function createCompetitor(
  body: CreateCompetitorBody,
): Promise<CompetitorDetail> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create competitor (${res.status})`);
  }
  return res.json();
}

// ─── Update ─────────────────────────────────────────────────

export async function updateCompetitor(
  id: string,
  body: UpdateCompetitorBody,
): Promise<CompetitorDetail> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to update competitor (${res.status})`);
  }
  return res.json();
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteCompetitor(
  id: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to delete competitor (${res.status})`);
  }
  return res.json();
}

// ─── Analyze URL ────────────────────────────────────────────

export async function analyzeCompetitorUrl(
  url: string,
): Promise<AnalyzeJobResponse> {
  const res = await fetch(`${BASE}/analyze/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to analyze competitor URL (${res.status})`);
  }
  return res.json();
}

// ─── Refresh Analysis ───────────────────────────────────────

export async function refreshCompetitor(
  id: string,
): Promise<CompetitorDetail> {
  const res = await fetch(`${BASE}/${id}/refresh`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to refresh competitor (${res.status})`);
  }
  return res.json();
}

// ─── Lock / Unlock ──────────────────────────────────────────

export async function toggleCompetitorLock(
  id: string,
  locked: boolean,
): Promise<{
  isLocked: boolean;
  lockedById: string | null;
  lockedAt: string | null;
  lockedBy: { id: string; name: string | null } | null;
}> {
  const res = await fetch(`${BASE}/${id}/lock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to toggle lock (${res.status})`);
  }
  return res.json();
}

// ─── Linked Products ────────────────────────────────────────

export async function fetchCompetitorProducts(
  competitorId: string,
): Promise<CompetitorProductsResponse> {
  const res = await fetch(`${BASE}/${competitorId}/products`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to fetch linked products (${res.status})`);
  }
  return res.json();
}

export async function linkProduct(
  competitorId: string,
  productId: string,
): Promise<{ competitorId: string; productId: string }> {
  const res = await fetch(`${BASE}/${competitorId}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to link product (${res.status})`);
  }
  return res.json();
}

export async function unlinkProduct(
  competitorId: string,
  productId: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${competitorId}/products/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to unlink product (${res.status})`);
  }
  return res.json();
}

// ─── Auto-Discovery ─────────────────────────────────────

export interface DiscoveredCompetitor {
  name: string;
  websiteUrl: string;
  description: string;
  relevanceScore: number;
  relevanceReason: string;
  tier: 'DIRECT' | 'INDIRECT' | 'ASPIRATIONAL';
}

export async function discoverCompetitors(): Promise<{ competitors: DiscoveredCompetitor[] }> {
  const res = await fetch(`${BASE}/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to discover competitors (${res.status})`);
  }
  return res.json();
}
