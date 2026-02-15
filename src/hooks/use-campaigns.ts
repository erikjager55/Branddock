import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCampaigns, createCampaign, updateCampaign } from "@/lib/api/campaigns";
import type {
  CampaignListResponse,
  CampaignListParams,
  CreateCampaignBody,
  UpdateCampaignBody,
} from "@/types/campaign";

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (workspaceId: string, params?: CampaignListParams) =>
    ["campaigns", "list", workspaceId, params ?? {}] as const,
};

export function useCampaigns(workspaceId: string | undefined, params?: CampaignListParams) {
  return useQuery<CampaignListResponse>({
    queryKey: campaignKeys.list(workspaceId ?? "", params),
    queryFn: () => fetchCampaigns(workspaceId!, params),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useCreateCampaign(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCampaignBody) => createCampaign(workspaceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateCampaignBody }) =>
      updateCampaign(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignKeys.all }),
  });
}
