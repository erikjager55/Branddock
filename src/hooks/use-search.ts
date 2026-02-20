import { useQuery } from '@tanstack/react-query';
import { globalSearch, fetchQuickActions } from '@/lib/api/search';
import type { SearchResponse, SearchParams } from '@/types/search';

export const searchKeys = {
  results: (params: SearchParams) => ['search', 'results', params] as const,
  quickActions: ['search', 'quick-actions'] as const,
};

export function useSearch(params: SearchParams) {
  return useQuery<SearchResponse>({
    queryKey: searchKeys.results(params),
    queryFn: () => globalSearch(params),
    enabled: params.query.length >= 2,
    staleTime: 10_000,
  });
}

export function useQuickActions() {
  return useQuery({
    queryKey: searchKeys.quickActions,
    queryFn: fetchQuickActions,
    staleTime: 300_000,
    gcTime: 30 * 60_000,
  });
}
