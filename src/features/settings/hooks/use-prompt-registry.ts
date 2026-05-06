import { useQuery } from '@tanstack/react-query';
import {
  fetchPromptRegistry,
  fetchPromptDetail,
  type PromptRegistryEntry,
  type PromptRegistryDetail,
} from '../api/prompt-registry.api';

export const promptRegistryKeys = {
  all: ['prompt-registry'] as const,
  list: () => [...promptRegistryKeys.all, 'list'] as const,
  detail: (identifier: string) =>
    [...promptRegistryKeys.all, 'detail', identifier] as const,
};

export function usePromptRegistry() {
  return useQuery<PromptRegistryEntry[]>({
    queryKey: promptRegistryKeys.list(),
    queryFn: fetchPromptRegistry,
    staleTime: 60_000,
  });
}

export function usePromptDetail(identifier: string | null) {
  return useQuery<PromptRegistryDetail>({
    queryKey: promptRegistryKeys.detail(identifier ?? ''),
    queryFn: () => fetchPromptDetail(identifier!),
    enabled: !!identifier,
    staleTime: 60_000,
  });
}
