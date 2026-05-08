import { useQuery } from '@tanstack/react-query';

export interface BriefMissingFlag {
  section: number;
  fieldName: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface BriefRenderResponse {
  markdown: string;
  missing: BriefMissingFlag[];
  generatedAt: string;
  durationMs: number;
  weekThemeError: string | null;
  weekThemeDurationMs: number;
}

interface ErrorBody {
  error?: string;
}

async function fetchBriefRender(campaignId: string): Promise<BriefRenderResponse> {
  const res = await fetch(`/api/campaigns/${campaignId}/brief/render`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(body.error ?? `Brief render failed (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Fetcht een gerenderde campagne-brief. `staleTime: 60_000` voorkomt dat
 * close+reopen binnen 60s een nieuwe Anthropic-call triggert (week-thema's
 * zijn duur — ~3-5s per render). User die echt wil refreshen kan via een
 * dedicated "Regenerate" actie de query invalideren (out-of-scope MVP).
 *
 * `enabled` op `false` houdt de hook idle tot caller hem activeert, zodat
 * de modal pas fetcht wanneer hij geopend wordt — geen onnodige call bij
 * modal-mount-zonder-trigger.
 */
export function useGenerateBrief(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['campaign-brief', campaignId],
    queryFn: () => fetchBriefRender(campaignId),
    enabled: options?.enabled ?? false,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export interface MarkBriefReadyPayload {
  sectionsRenderedCount: number;
  missingDataFlags: string[];
}

export async function markBriefReady(
  campaignId: string,
  payload: MarkBriefReadyPayload,
): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}/brief/mark-ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(body.error ?? `Mark-ready failed (HTTP ${res.status})`);
  }
}
