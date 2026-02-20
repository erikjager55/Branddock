import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  searchHelp,
  fetchCategories,
  fetchCategoryArticles,
  fetchArticle,
  submitArticleFeedback,
  fetchFaq,
  submitFaqFeedback,
  fetchVideos,
  submitSupportTicket,
  fetchSystemStatus,
  fetchFeatureRequests,
  submitFeatureRequest,
  voteFeatureRequest,
  submitRating,
} from "@/lib/api/help";
import type {
  HelpSearchParams,
  HelpSearchResponse,
  HelpCategoryItem,
  CategoryArticlesResponse,
  HelpArticleDetailResponse,
  FeedbackResponse,
  FaqItemResponse,
  VideoTutorialItem,
  SubmitTicketResponse,
  SystemStatusResponse,
  FeatureRequestItem,
  VoteResponse,
  RatingResponse,
} from "@/types/help";

// ─── Query Keys ──────────────────────────────────────────

export const helpKeys = {
  all: ["help"] as const,
  search: (params: HelpSearchParams) => ["help", "search", params] as const,
  categories: ["help", "categories"] as const,
  categoryArticles: (slug: string) => ["help", "categories", slug, "articles"] as const,
  article: (slug: string) => ["help", "articles", slug] as const,
  faq: ["help", "faq"] as const,
  videos: ["help", "videos"] as const,
  systemStatus: ["help", "system-status"] as const,
  featureRequests: ["help", "feature-requests"] as const,
};

// ─── Search ──────────────────────────────────────────────

export function useHelpSearch(params: HelpSearchParams) {
  return useQuery<HelpSearchResponse>({
    queryKey: helpKeys.search(params),
    queryFn: () => searchHelp(params),
    enabled: params.query.trim().length > 0,
    staleTime: 30_000,
  });
}

// ─── Categories ──────────────────────────────────────────

export function useHelpCategories() {
  return useQuery<HelpCategoryItem[]>({
    queryKey: helpKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60_000, // categories rarely change
    gcTime: 30 * 60_000,
  });
}

export function useCategoryArticles(slug: string) {
  return useQuery<CategoryArticlesResponse>({
    queryKey: helpKeys.categoryArticles(slug),
    queryFn: () => fetchCategoryArticles(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

// ─── Articles ────────────────────────────────────────────

export function useHelpArticle(slug: string) {
  return useQuery<HelpArticleDetailResponse>({
    queryKey: helpKeys.article(slug),
    queryFn: () => fetchArticle(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useArticleFeedback() {
  const queryClient = useQueryClient();
  return useMutation<FeedbackResponse, Error, { slug: string; helpful: boolean }>({
    mutationFn: ({ slug, helpful }) => submitArticleFeedback(slug, { helpful }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpKeys.all });
    },
  });
}

// ─── FAQ ─────────────────────────────────────────────────

export function useFaq() {
  return useQuery<FaqItemResponse[]>({
    queryKey: helpKeys.faq,
    queryFn: fetchFaq,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useFaqFeedback() {
  const queryClient = useQueryClient();
  return useMutation<FeedbackResponse, Error, { id: string; helpful: boolean }>({
    mutationFn: ({ id, helpful }) => submitFaqFeedback(id, { helpful }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpKeys.faq });
    },
  });
}

// ─── Videos ──────────────────────────────────────────────

export function useVideoTutorials() {
  return useQuery<VideoTutorialItem[]>({
    queryKey: helpKeys.videos,
    queryFn: fetchVideos,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

// ─── Support Ticket ──────────────────────────────────────

export function useSubmitTicket() {
  return useMutation<SubmitTicketResponse, Error, Parameters<typeof submitSupportTicket>[0]>({
    mutationFn: submitSupportTicket,
  });
}

// ─── System Status ───────────────────────────────────────

export function useSystemStatus() {
  return useQuery<SystemStatusResponse>({
    queryKey: helpKeys.systemStatus,
    queryFn: fetchSystemStatus,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

// ─── Feature Requests ────────────────────────────────────

export function useFeatureRequests() {
  return useQuery<FeatureRequestItem[]>({
    queryKey: helpKeys.featureRequests,
    queryFn: fetchFeatureRequests,
    staleTime: 30_000,
  });
}

export function useSubmitFeatureRequest() {
  const queryClient = useQueryClient();
  return useMutation<FeatureRequestItem, Error, Parameters<typeof submitFeatureRequest>[0]>({
    mutationFn: submitFeatureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpKeys.featureRequests });
    },
  });
}

export function useVoteFeatureRequest() {
  const queryClient = useQueryClient();
  return useMutation<VoteResponse, Error, string>({
    mutationFn: voteFeatureRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpKeys.featureRequests });
    },
  });
}

// ─── Rating ──────────────────────────────────────────────

export function useSubmitRating() {
  return useMutation<RatingResponse, Error, Parameters<typeof submitRating>[0]>({
    mutationFn: submitRating,
  });
}
