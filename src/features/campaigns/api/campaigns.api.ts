// =============================================================
// Campaigns API — fetch functions
// =============================================================

import type {
  CampaignListResponse,
  CampaignListParams,
  CampaignStatsResponse,
  CampaignDetail,
  KnowledgeAssetResponse,
  DeliverableResponse,
  CoverageResponse,
  StrategyResponse,
  PromptSuggestionsResponse,
  CreateCampaignBody,
  UpdateCampaignBody,
  CreateQuickContentBody,
  ConvertToCampaignBody,
  AddKnowledgeAssetBody,
  CreateDeliverableBody,
  UpdateDeliverableBody,
} from '@/types/campaign';

// ─── Campaigns ─────────────────────────────────────────────

export async function fetchCampaigns(params?: CampaignListParams): Promise<CampaignListResponse> {
  const sp = new URLSearchParams();
  if (params?.type && params.type !== 'all') sp.set('type', params.type);
  if (params?.status && params.status !== 'all') sp.set('status', params.status);
  if (params?.search) sp.set('search', params.search);
  const qs = sp.toString();
  const res = await fetch(`/api/campaigns${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  return res.json();
}

export async function fetchCampaignStats(): Promise<CampaignStatsResponse> {
  const res = await fetch('/api/campaigns/stats');
  if (!res.ok) throw new Error('Failed to fetch campaign stats');
  return res.json();
}

export async function fetchCampaignDetail(id: string): Promise<CampaignDetail> {
  const res = await fetch(`/api/campaigns/${id}`);
  if (!res.ok) throw new Error('Failed to fetch campaign detail');
  return res.json();
}

export async function createCampaign(body: CreateCampaignBody): Promise<CampaignDetail> {
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create campaign');
  return res.json();
}

export async function updateCampaign(id: string, body: UpdateCampaignBody): Promise<CampaignDetail> {
  const res = await fetch(`/api/campaigns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update campaign');
  return res.json();
}

export async function deleteCampaign(id: string): Promise<void> {
  const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete campaign');
}

export async function archiveCampaign(id: string): Promise<CampaignDetail> {
  const res = await fetch(`/api/campaigns/${id}/archive`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to archive campaign');
  return res.json();
}

// ─── Quick Content ─────────────────────────────────────────

export async function createQuickContent(body: CreateQuickContentBody): Promise<CampaignDetail> {
  const res = await fetch('/api/campaigns/quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create quick content');
  return res.json();
}

export async function fetchPromptSuggestions(): Promise<PromptSuggestionsResponse> {
  const res = await fetch('/api/campaigns/quick/prompt-suggestions');
  if (!res.ok) throw new Error('Failed to fetch prompt suggestions');
  return res.json();
}

export async function convertToCampaign(id: string, body: ConvertToCampaignBody): Promise<CampaignDetail> {
  const res = await fetch(`/api/campaigns/quick/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to convert to campaign');
  return res.json();
}

// ─── Knowledge Assets ──────────────────────────────────────

export async function fetchKnowledgeAssets(campaignId: string): Promise<KnowledgeAssetResponse[]> {
  const res = await fetch(`/api/campaigns/${campaignId}/knowledge`);
  if (!res.ok) throw new Error('Failed to fetch knowledge assets');
  return res.json();
}

export async function addKnowledgeAsset(campaignId: string, body: AddKnowledgeAssetBody): Promise<KnowledgeAssetResponse> {
  const res = await fetch(`/api/campaigns/${campaignId}/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to add knowledge asset');
  return res.json();
}

export async function removeKnowledgeAsset(campaignId: string, assetId: string): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}/knowledge/${assetId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove knowledge asset');
}

export async function fetchCoverage(campaignId: string): Promise<CoverageResponse> {
  const res = await fetch(`/api/campaigns/${campaignId}/coverage`);
  if (!res.ok) throw new Error('Failed to fetch coverage');
  return res.json();
}

// ─── Deliverables ──────────────────────────────────────────

export async function fetchDeliverables(campaignId: string): Promise<DeliverableResponse[]> {
  const res = await fetch(`/api/campaigns/${campaignId}/deliverables`);
  if (!res.ok) throw new Error('Failed to fetch deliverables');
  return res.json();
}

export async function addDeliverable(campaignId: string, body: CreateDeliverableBody): Promise<DeliverableResponse> {
  const res = await fetch(`/api/campaigns/${campaignId}/deliverables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to add deliverable');
  return res.json();
}

export async function updateDeliverable(campaignId: string, deliverableId: string, body: UpdateDeliverableBody): Promise<DeliverableResponse> {
  const res = await fetch(`/api/campaigns/${campaignId}/deliverables/${deliverableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update deliverable');
  return res.json();
}

export async function deleteDeliverable(campaignId: string, deliverableId: string): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}/deliverables/${deliverableId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete deliverable');
}

// ─── Strategy ──────────────────────────────────────────────

export async function fetchStrategy(campaignId: string): Promise<StrategyResponse> {
  const res = await fetch(`/api/campaigns/${campaignId}/strategy`);
  if (!res.ok) throw new Error('Failed to fetch strategy');
  return res.json();
}

export async function generateStrategy(campaignId: string): Promise<CampaignDetail> {
  const res = await fetch(`/api/campaigns/${campaignId}/strategy/generate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate strategy');
  return res.json();
}
