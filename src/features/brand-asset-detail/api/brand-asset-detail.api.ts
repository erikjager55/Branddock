import type {
  BrandAssetDetail,
  VersionsResponse,
  ContentUpdatePayload,
  StatusUpdatePayload,
  FrameworkUpdatePayload,
} from "../types/brand-asset-detail.types";

const BASE = "/api/brand-assets";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAssetDetail(id: string): Promise<BrandAssetDetail> {
  const res = await fetch(`${BASE}/${id}`);
  return handleResponse(res);
}

export async function updateAssetContent(
  id: string,
  payload: ContentUpdatePayload
): Promise<unknown> {
  const res = await fetch(`${BASE}/${id}/content`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateAssetStatus(
  id: string,
  payload: StatusUpdatePayload
): Promise<unknown> {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function toggleAssetLock(id: string): Promise<unknown> {
  const res = await fetch(`${BASE}/${id}/lock`, {
    method: "PATCH",
  });
  return handleResponse(res);
}

export async function duplicateAsset(id: string): Promise<unknown> {
  const res = await fetch(`${BASE}/${id}/duplicate`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function deleteAsset(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

export async function regenerateAssetContent(
  id: string,
  instructions?: string
): Promise<unknown> {
  const res = await fetch(`${BASE}/${id}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instructions }),
  });
  return handleResponse(res);
}

export async function fetchAssetVersions(
  id: string,
  limit = 20,
  offset = 0
): Promise<VersionsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${BASE}/${id}/versions?${params}`);
  return handleResponse(res);
}

export async function updateAssetFramework(
  id: string,
  payload: FrameworkUpdatePayload
): Promise<unknown> {
  const res = await fetch(`${BASE}/${id}/framework`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
