import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDashboard,
  fetchReadiness,
  fetchDashboardStats,
  fetchAttention,
  fetchRecommended,
  fetchCampaignsPreview,
  fetchPreferences,
  updatePreferences,
  completeQuickStartItem,
} from '@/lib/api/dashboard';
import type {
  DashboardResponse,
  DashboardPreferencesResponse,
  AttentionItem,
  RecommendedAction,
  CampaignPreviewItem,
} from '@/types/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  readiness: ['dashboard', 'readiness'] as const,
  stats: ['dashboard', 'stats'] as const,
  attention: ['dashboard', 'attention'] as const,
  recommended: ['dashboard', 'recommended'] as const,
  campaigns: ['dashboard', 'campaigns'] as const,
  preferences: ['dashboard', 'preferences'] as const,
};

export function useDashboard() {
  return useQuery<DashboardResponse>({
    queryKey: dashboardKeys.all,
    queryFn: fetchDashboard,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useReadiness() {
  return useQuery<DashboardResponse['readiness']>({
    queryKey: dashboardKeys.readiness,
    queryFn: fetchReadiness,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useDashboardStats() {
  return useQuery<DashboardResponse['stats']>({
    queryKey: dashboardKeys.stats,
    queryFn: fetchDashboardStats,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useAttentionItems() {
  return useQuery<AttentionItem[]>({
    queryKey: dashboardKeys.attention,
    queryFn: fetchAttention,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useRecommendedAction() {
  return useQuery<RecommendedAction | null>({
    queryKey: dashboardKeys.recommended,
    queryFn: fetchRecommended,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useCampaignsPreview() {
  return useQuery<CampaignPreviewItem[]>({
    queryKey: dashboardKeys.campaigns,
    queryFn: fetchCampaignsPreview,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useDashboardPreferences() {
  return useQuery<DashboardPreferencesResponse>({
    queryKey: dashboardKeys.preferences,
    queryFn: fetchPreferences,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.preferences });
    },
  });
}

export function useCompleteQuickStart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeQuickStartItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.preferences });
    },
  });
}
