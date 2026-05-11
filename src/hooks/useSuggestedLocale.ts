// ============================================================
// useSuggestedLocale — TanStack hook voor BrandVoiceguide locale-picker.
// Wraps GET /api/i18n/detect-suggested-locale en cached binnen sessie.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from './use-workspace';

export interface SuggestedLocaleResponse {
  locale: 'nl-NL' | 'nl-BE' | 'en-GB' | 'de-DE' | null;
  language: 'nl' | 'en' | 'de' | null;
  confidence: 'high' | 'medium' | 'low';
  sourceCount: number;
  totalChars: number;
}

interface ErrorBody {
  error?: string;
  message?: string;
}

async function fetchSuggestedLocale(): Promise<SuggestedLocaleResponse> {
  const res = await fetch('/api/i18n/detect-suggested-locale');
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new Error(
      body.error ?? `Failed to fetch suggested locale (HTTP ${res.status})`,
    );
  }
  return res.json();
}

/**
 * Query hook voor de auto-detected locale-suggestion in de Voice DNA tab.
 *
 * `staleTime: Infinity` — detection-resultaat is stabiel binnen de sessie
 * zolang brand-content niet wijzigt. Bij voice-guide edits invalideert de
 * mutation-flow automatisch (cache-keys gedeeld met `voiceguideKeys`),
 * maar voor v1 is een page-refresh OK: detection-suggestion verandert
 * pas wanneer user voice-description / writing-samples / brand-assets
 * substantieel update.
 *
 * `workspaceId` in queryKey voorkomt cross-workspace cache-bleed.
 */
export function useSuggestedLocale() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ['suggested-locale', workspaceId],
    queryFn: fetchSuggestedLocale,
    enabled: !!workspaceId,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
