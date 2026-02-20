import type {
  HelpSearchParams,
  HelpSearchResponse,
  HelpCategoryItem,
  CategoryArticlesResponse,
  HelpArticleDetailResponse,
  FeedbackBody,
  FeedbackResponse,
  FaqItemResponse,
  VideoTutorialItem,
  SubmitTicketRequest,
  SubmitTicketResponse,
  SystemStatusResponse,
  FeatureRequestItem,
  SubmitFeatureRequestBody,
  VoteResponse,
  SubmitRatingBody,
  RatingResponse,
} from "@/types/help";

// ─── Search ──────────────────────────────────────────────

export async function searchHelp(params: HelpSearchParams): Promise<HelpSearchResponse> {
  const sp = new URLSearchParams();
  if (params.query) sp.set("query", params.query);
  if (params.tag) sp.set("tag", params.tag);
  if (params.limit) sp.set("limit", String(params.limit));

  const res = await fetch(`/api/help/search?${sp.toString()}`);
  if (!res.ok) throw new Error("Failed to search help");
  return res.json();
}

// ─── Categories ──────────────────────────────────────────

export async function fetchCategories(): Promise<HelpCategoryItem[]> {
  const res = await fetch("/api/help/categories");
  if (!res.ok) throw new Error("Failed to fetch help categories");
  return res.json();
}

export async function fetchCategoryArticles(slug: string): Promise<CategoryArticlesResponse> {
  const res = await fetch(`/api/help/categories/${slug}/articles`);
  if (!res.ok) throw new Error("Failed to fetch category articles");
  return res.json();
}

// ─── Articles ────────────────────────────────────────────

export async function fetchArticle(slug: string): Promise<HelpArticleDetailResponse> {
  const res = await fetch(`/api/help/articles/${slug}`);
  if (!res.ok) throw new Error("Failed to fetch article");
  return res.json();
}

export async function submitArticleFeedback(slug: string, body: FeedbackBody): Promise<FeedbackResponse> {
  const res = await fetch(`/api/help/articles/${slug}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit article feedback");
  return res.json();
}

// ─── FAQ ─────────────────────────────────────────────────

export async function fetchFaq(): Promise<FaqItemResponse[]> {
  const res = await fetch("/api/help/faq");
  if (!res.ok) throw new Error("Failed to fetch FAQ");
  return res.json();
}

export async function submitFaqFeedback(id: string, body: FeedbackBody): Promise<FeedbackResponse> {
  const res = await fetch(`/api/help/faq/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit FAQ feedback");
  return res.json();
}

// ─── Videos ──────────────────────────────────────────────

export async function fetchVideos(): Promise<VideoTutorialItem[]> {
  const res = await fetch("/api/help/videos");
  if (!res.ok) throw new Error("Failed to fetch video tutorials");
  return res.json();
}

// ─── Support Ticket ──────────────────────────────────────

export async function submitSupportTicket(body: SubmitTicketRequest): Promise<SubmitTicketResponse> {
  const res = await fetch("/api/help/support-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit support ticket");
  return res.json();
}

// ─── System Status ───────────────────────────────────────

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const res = await fetch("/api/help/system-status");
  if (!res.ok) throw new Error("Failed to fetch system status");
  return res.json();
}

// ─── Feature Requests ────────────────────────────────────

export async function fetchFeatureRequests(): Promise<FeatureRequestItem[]> {
  const res = await fetch("/api/help/feature-requests");
  if (!res.ok) throw new Error("Failed to fetch feature requests");
  return res.json();
}

export async function submitFeatureRequest(body: SubmitFeatureRequestBody): Promise<FeatureRequestItem> {
  const res = await fetch("/api/help/feature-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit feature request");
  return res.json();
}

export async function voteFeatureRequest(id: string): Promise<VoteResponse> {
  const res = await fetch(`/api/help/feature-requests/${id}/vote`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to vote on feature request");
  return res.json();
}

// ─── Rating ──────────────────────────────────────────────

export async function submitRating(body: SubmitRatingBody): Promise<RatingResponse> {
  const res = await fetch("/api/help/rating", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit rating");
  return res.json();
}
