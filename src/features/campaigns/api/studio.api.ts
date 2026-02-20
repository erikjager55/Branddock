import type {
  StudioStateResponse,
  UpdateStudioBody,
  GenerateContentBody,
  GenerateContentResponse,
  CostEstimateResponse,
  QualityScoreResponse,
  ImproveSuggestionsResponse,
  AvailableInsight,
  InsertInsightBody,
  ContentVersionItem,
  ExportBody,
  ExportResponse,
} from '@/types/studio';

export async function fetchStudioState(deliverableId: string): Promise<StudioStateResponse> {
  const res = await fetch(`/api/studio/${deliverableId}`);
  if (!res.ok) throw new Error('Failed to fetch studio state');
  const data = await res.json();

  // API returns nested { deliverable, campaign, ... } — flatten to StudioStateResponse
  const d = data.deliverable;
  return {
    id: d.id,
    title: d.title,
    contentType: d.contentTab || 'text',
    contentTab: d.contentTab || null,
    status: d.status,
    prompt: d.prompt || null,
    aiModel: d.aiModel || null,
    settings: d.settings || null,
    generatedText: d.generatedText || null,
    generatedImageUrls: d.generatedImageUrls || [],
    generatedVideoUrl: d.generatedVideoUrl || null,
    generatedSlides: d.generatedSlides || null,
    qualityScore: d.qualityScore ?? null,
    qualityMetrics: d.qualityMetrics ?? null,
    checklistItems: d.checklistItems || null,
    isFavorite: d.isFavorite ?? false,
    lastAutoSavedAt: d.lastAutoSavedAt || null,
    campaignId: data.campaign.id,
    campaignTitle: data.campaign.title,
  };
}

export async function updateStudio(deliverableId: string, body: UpdateStudioBody): Promise<StudioStateResponse> {
  const res = await fetch(`/api/studio/${deliverableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update studio');
  return res.json();
}

export async function autoSaveStudio(deliverableId: string, body: Partial<UpdateStudioBody>): Promise<{ lastAutoSavedAt: string }> {
  const res = await fetch(`/api/studio/${deliverableId}/auto-save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to auto-save');
  return res.json();
}

export async function generateContent(deliverableId: string, body: GenerateContentBody): Promise<GenerateContentResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to generate content');
  return res.json();
}

export async function regenerateContent(deliverableId: string, body: GenerateContentBody): Promise<GenerateContentResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to regenerate content');
  return res.json();
}

export async function fetchCostEstimate(deliverableId: string): Promise<CostEstimateResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/cost-estimate`);
  if (!res.ok) throw new Error('Failed to fetch cost estimate');
  return res.json();
}

// ─── Right Panel API Functions ──────────────────────────

export async function fetchQualityScore(deliverableId: string): Promise<QualityScoreResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/quality`);
  if (!res.ok) throw new Error('Failed to fetch quality score');
  return res.json();
}

export async function refreshQualityScore(deliverableId: string): Promise<QualityScoreResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/quality/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh quality score');
  return res.json();
}

export async function fetchImproveSuggestions(deliverableId: string): Promise<ImproveSuggestionsResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/improve`);
  if (!res.ok) throw new Error('Failed to fetch improve suggestions');
  return res.json();
}

export async function applySuggestion(deliverableId: string, suggestionId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/improve/${suggestionId}/apply`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to apply suggestion');
}

export async function dismissSuggestion(deliverableId: string, suggestionId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/improve/${suggestionId}/dismiss`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to dismiss suggestion');
}

export async function previewSuggestion(deliverableId: string, suggestionId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/improve/${suggestionId}/preview`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to preview suggestion');
}

export async function bulkApplySuggestions(deliverableId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/improve/apply-all`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to bulk apply suggestions');
}

export async function fetchResearchInsights(deliverableId: string): Promise<AvailableInsight[]> {
  const res = await fetch(`/api/studio/${deliverableId}/insights`);
  if (!res.ok) throw new Error('Failed to fetch research insights');
  return res.json();
}

export async function insertInsight(deliverableId: string, body: InsertInsightBody): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/insights/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to insert insight');
}

export async function fetchVersions(deliverableId: string): Promise<ContentVersionItem[]> {
  const res = await fetch(`/api/studio/${deliverableId}/versions`);
  if (!res.ok) throw new Error('Failed to fetch versions');
  return res.json();
}

export async function createVersion(deliverableId: string): Promise<ContentVersionItem> {
  const res = await fetch(`/api/studio/${deliverableId}/versions`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create version');
  return res.json();
}

export async function restoreVersion(deliverableId: string, versionId: string): Promise<void> {
  const res = await fetch(`/api/studio/${deliverableId}/versions/${versionId}/restore`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restore version');
}

export async function exportContent(deliverableId: string, body: ExportBody): Promise<ExportResponse> {
  const res = await fetch(`/api/studio/${deliverableId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to export content');
  return res.json();
}
