// ─── Help & Support Types ────────────────────────────────

// Search
export interface HelpSearchParams {
  query: string;
  tag?: string;
  limit?: number;
}

export interface HelpSearchResponse {
  articles: HelpArticleSummary[];
  faqMatches: FaqItemResponse[];
}

// Categories
export interface HelpCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  articleCount: number;
}

// Articles
export interface HelpArticleSummary {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  readTimeMinutes: number;
  helpfulYes: number;
  helpfulNo: number;
  publishedAt: string;
  category: {
    name: string;
    slug: string;
    icon: string;
    iconColor: string;
  };
}

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export interface HelpArticleDetailResponse {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  content: string;
  readTimeMinutes: number;
  helpfulYes: number;
  helpfulNo: number;
  publishedAt: string;
  relatedArticleIds: string[];
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    iconBg: string;
    iconColor: string;
  };
  toc: TocItem[];
  relatedArticles: {
    id: string;
    title: string;
    slug: string;
    subtitle: string | null;
    readTimeMinutes: number;
  }[];
}

export interface CategoryArticlesResponse {
  category: HelpCategoryItem;
  articles: Omit<HelpArticleSummary, "category">[];
}

// FAQ
export interface FaqItemResponse {
  id: string;
  question: string;
  answer: string;
  helpfulYes: number;
  helpfulNo: number;
}

// Videos
export interface VideoTutorialItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  duration: string;
  categoryBadge: string | null;
  categoryColor: string | null;
}

// Support Ticket
export interface SubmitTicketRequest {
  subject: string;
  category: "GENERAL" | "TECHNICAL" | "BILLING" | "FEATURE_REQUEST" | "BUG_REPORT";
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  attachmentUrls?: string[];
}

export interface SubmitTicketResponse {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

// System Status
export interface SystemStatusResponse {
  overall: "operational" | "degraded" | "outage";
  updatedAt: string;
  services: {
    name: string;
    status: "operational" | "degraded" | "outage";
    description: string;
  }[];
  incidents: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }[];
}

// Feature Requests
export interface FeatureRequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  createdAt: string;
  submittedBy: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface SubmitFeatureRequestBody {
  title: string;
  description?: string;
}

export interface VoteResponse {
  id: string;
  voteCount: number;
  voted: boolean;
}

// Feedback
export interface FeedbackBody {
  helpful: boolean;
}

export interface FeedbackResponse {
  id: string;
  helpfulYes: number;
  helpfulNo: number;
}

// Rating
export interface SubmitRatingBody {
  rating: number;
  feedback?: string;
}

export interface RatingResponse {
  id: string;
  rating: number;
  feedback: string | null;
  updatedAt: string;
}
