import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchKnowledge, createKnowledge } from "@/lib/api/knowledge";
import type { KnowledgeListResponse, KnowledgeListParams, CreateKnowledgeBody } from "@/types/knowledge";

export const knowledgeKeys = {
  all: ["knowledge"] as const,
  list: (workspaceId: string, params?: KnowledgeListParams) =>
    ["knowledge", "list", workspaceId, params ?? {}] as const,
};

export function useKnowledge(workspaceId: string | undefined, params?: KnowledgeListParams) {
  return useQuery<KnowledgeListResponse>({
    queryKey: knowledgeKeys.list(workspaceId ?? "", params),
    queryFn: () => fetchKnowledge(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateKnowledge(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateKnowledgeBody) => createKnowledge(workspaceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKeys.all }),
  });
}
