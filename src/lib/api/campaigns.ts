import type {
  CampaignListResponse,
  CampaignListParams,
  CreateCampaignBody,
  UpdateCampaignBody,
  CampaignWithMeta,
} from "@/types/campaign";

const API_BASE = "/api/campaigns";

export async function fetchCampaigns(
  workspaceId: string,
  params?: CampaignListParams
): Promise<CampaignListResponse> {
  const searchParams = new URLSearchParams({ workspaceId });
  if (params?.status) searchParams.set("status", params.status);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const res = await fetch(`${API_BASE}?${searchParams.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch campaigns (${res.status})`);
  }
  return res.json();
}

export async function createCampaign(
  workspaceId: string,
  body: CreateCampaignBody
): Promise<CampaignWithMeta> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, workspaceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to create campaign (${res.status})`);
  }
  return res.json();
}

export async function updateCampaign(
  id: string,
  updates: UpdateCampaignBody
): Promise<CampaignWithMeta> {
  const res = await fetch(API_BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Failed to update campaign (${res.status})`);
  }
  return res.json();
}
