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

// ─── Drafts (Fase 2 — DB-backed wizard drafts) ─────────────

import type {
  DraftListResponse,
  DraftDetail,
  DraftType,
} from '../types/campaign-wizard.types';

/**
 * List the current user's drafts in the active workspace. Pass a `type` to
 * get only STRATEGIC (campaign wizard) or CONTENT (single-content wizard)
 * drafts — without it, all drafts are returned.
 */
export async function fetchDrafts(type?: DraftType): Promise<DraftListResponse> {
  const url = type
    ? `/api/campaigns/wizard/drafts?type=${type}`
    : '/api/campaigns/wizard/drafts';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch drafts');
  return res.json();
}

/** Load a single draft's full state — used by the Resume flow. */
export async function fetchDraftDetail(id: string): Promise<DraftDetail> {
  const res = await fetch(`/api/campaigns/wizard/drafts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch draft detail');
  return res.json();
}

/** Soft-delete a draft (sets isArchived=true on the Campaign row). */
export async function archiveDraft(id: string): Promise<void> {
  const res = await fetch(`/api/campaigns/wizard/drafts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to archive draft');
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
  const data = await res.json();
  return data?.assets ?? data ?? [];
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
  const data = await res.json();
  return data?.deliverables ?? data ?? [];
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

/**
 * Generate campaign blueprint via SSE stream.
 * Calls onEvent for each SSE data event (progress, complete, error).
 * Returns an abort function.
 */
export function generateBlueprintSSE(
  campaignId: string,
  body: import('@/lib/campaigns/strategy-blueprint.types').GenerateBlueprintBody,
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/strategy/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to start generation' }));
        onError(err.error || 'Failed to start generation');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        onError('No response stream');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(data);
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      // Flush any remaining bytes from the TextDecoder and process all buffered lines
      buffer += decoder.decode();
      const remaining = buffer.split('\n');
      for (const line of remaining) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch {
            // Skip malformed final chunk
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      onError(message);
    }
  })();

  return { abort: () => controller.abort() };
}

/** Regenerate a specific layer of the blueprint */
export async function regenerateBlueprintLayer(
  campaignId: string,
  body: import('@/lib/campaigns/strategy-blueprint.types').RegenerateBlueprintBody,
): Promise<import('@/lib/campaigns/strategy-blueprint.types').CampaignBlueprint> {
  const res = await fetch(`/api/campaigns/${campaignId}/strategy/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to regenerate blueprint layer');
  return res.json();
}

// ─── Interactive Strategy Phase SSE Functions ────────────────

/** Shared SSE stream reader for phase endpoints */
function createPhaseSSE(
  url: string,
  body: unknown,
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to start phase' }));
          onError(err.error || 'Failed to start phase');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
          onError('No response stream');
        return;
      }


      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(data);
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      buffer += decoder.decode();
      const remaining = buffer.split('\n');
      for (const line of remaining) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch {
            // Skip malformed final chunk
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      onError(message);
    }
  })();

  return { abort: () => controller.abort() };
}


/** Phase C: Elaborate journey (channel + asset plan) via SSE stream */
export function elaborateJourneySSE(
  body: import('@/lib/campaigns/strategy-blueprint.types').ElaborateJourneyBody,
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/elaborate', body, onEvent, onError);
}

/** Phase 1: Validate briefing completeness via SSE stream */
export function validateBriefingSSE(
  body: import('@/lib/campaigns/strategy-blueprint.types').ValidateBriefingBody,
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/validate-briefing', body, onEvent, onError);
}

/** Phase 1c: AI-improve briefing based on validation gaps (simple POST, not SSE) */
export async function improveBriefingApi(
  body: import('@/lib/campaigns/strategy-blueprint.types').ImproveBriefingBody,
): Promise<import('@/lib/campaigns/strategy-blueprint.types').ImprovedBriefing> {
  const res = await fetch('/api/campaigns/wizard/strategy/improve-briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to improve briefing' }));
    throw new Error(err.error || 'Failed to improve briefing');
  }
  return res.json();
}

/** Phase 2: Build analytical strategy foundation via SSE stream */
export function buildFoundationSSE(
  body: import('@/lib/campaigns/strategy-blueprint.types').BuildFoundationBody,
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/build-foundation', body, onEvent, onError);
}


// ─── Creative Quality Pipeline SSE Functions ───────────────

/** Shared pipeline config body shape — see features/campaigns/lib/pipeline-config.ts */
type PipelineConfigBody = import('@/lib/campaigns/strategy-blueprint.types').PipelineConfigBody;

/**
 * Quick concept via SSE — single Gemini Flash call that produces an
 * insight + concept in one shot. Used when pipelineConfig.creativeRange
 * is 'single' (Quick preset). Returns the same shape as
 * generateConceptsSSE so the client can handle both paths uniformly.
 */
export function quickConceptSSE(
  body: { workspaceId: string; wizardContext: object; personaIds?: string[]; productIds?: string[]; competitorIds?: string[]; trendIds?: string[]; strategicIntent?: string; pipelineConfig?: PipelineConfigBody },
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/quick-concept', body, onEvent, onError);
}

/** Mine 3 human insights via SSE */
export function mineInsightsSSE(
  body: { workspaceId: string; wizardContext: object; personaIds?: string[]; productIds?: string[]; competitorIds?: string[]; trendIds?: string[]; strategicIntent?: string; pipelineConfig?: PipelineConfigBody },
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/mine-insights', body, onEvent, onError);
}

/** Generate 3 creative concepts via SSE */
export function generateConceptsSSE(
  body: { workspaceId: string; wizardContext: object; selectedInsight: object; personaIds?: string[]; productIds?: string[]; competitorIds?: string[]; trendIds?: string[]; strategicIntent?: string; regenerationContext?: { feedback: string; failedConcepts: Array<{ campaignLine: string; whyItFailed: string }> }; pipelineConfig?: PipelineConfigBody },
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/generate-concepts', body, onEvent, onError);
}

/** Run creative debate (critic + defense) via SSE */
export function creativeDebateSSE(
  body: { workspaceId: string; wizardContext: object; selectedConcept: object; selectedInsight: object; personaIds?: string[]; productIds?: string[]; competitorIds?: string[]; trendIds?: string[]; strategicIntent?: string; pipelineConfig?: PipelineConfigBody },
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/creative-debate', body, onEvent, onError);
}

/** Build strategy from approved concept via SSE */
export function buildStrategySSE(
  body: { workspaceId: string; wizardContext: object; approvedConcept: object; approvedInsight: object; debateContext?: string; personaIds?: string[]; productIds?: string[]; competitorIds?: string[]; trendIds?: string[]; strategicIntent?: string; pipelineConfig?: PipelineConfigBody },
  onEvent: (event: unknown) => void,
  onError: (error: string) => void,
): { abort: () => void } {
  return createPhaseSSE('/api/campaigns/wizard/strategy/build-strategy', body, onEvent, onError);
}
