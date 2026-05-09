import { useQuery } from '@tanstack/react-query';
import {
  deriveVoiceBaseline1Pager,
  type VoiceBaseline1Pager,
} from '@/lib/brand-fidelity/voice-baseline-1pager';

/**
 * Δ-3 sub-cluster B: TanStack Query hook for the derived 1-pager view.
 *
 * Fetches BrandVoiceguide via the existing `/api/brandvoiceguide` endpoint
 * and derives the 1-pager client-side via `deriveVoiceBaseline1Pager`. Pure
 * derivation — no extra server-call needed beyond the standard voiceguide-fetch.
 *
 * staleTime 5 min matches the `getBrandContext` cache (so server-side judge
 * prompts and UI display the same baseline within the same window).
 */
export function useVoiceBaseline1Pager() {
  return useQuery<VoiceBaseline1Pager>({
    queryKey: ['voice-baseline-1pager'],
    queryFn: async () => {
      const res = await fetch('/api/brandvoiceguide');
      if (!res.ok) {
        throw new Error(`Failed to fetch BrandVoiceguide: ${res.status}`);
      }
      const data = (await res.json()) as { voiceguide: unknown };
      // deriveVoiceBaseline1Pager handles null/undefined gracefully via
      // emptyBaseline; consumer renders empty-state UI when all sections empty.
      return deriveVoiceBaseline1Pager(
        data.voiceguide as Parameters<typeof deriveVoiceBaseline1Pager>[0],
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}
