// =============================================================
// Competitor Types
// =============================================================

/** Competitor list item (overview) */
export interface CompetitorWithMeta {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  description: string | null;
  tagline: string | null;
  logoUrl: string | null;
  tier: "DIRECT" | "INDIRECT" | "ASPIRATIONAL";
  status: "DRAFT" | "ANALYZED" | "ARCHIVED";
  competitiveScore: number | null;
  differentiators: string[];
  isLocked: boolean;
  linkedProductCount: number;
  updatedAt: string;
}

/** Competitor detail (full record) */
export interface CompetitorDetail {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  description: string | null;
  tagline: string | null;
  foundingYear: number | null;
  headquarters: string | null;
  employeeRange: string | null;
  logoUrl: string | null;
  valueProposition: string | null;
  targetAudience: string | null;
  differentiators: string[];
  mainOfferings: string[];
  pricingModel: string | null;
  pricingDetails: string | null;
  toneOfVoice: string | null;
  messagingThemes: string[];
  visualStyleNotes: string | null;
  strengths: string[];
  weaknesses: string[];
  socialLinks: Record<string, string> | null;
  hasBlog: boolean | null;
  hasCareersPage: boolean | null;
  competitiveScore: number | null;
  tier: "DIRECT" | "INDIRECT" | "ASPIRATIONAL";
  status: "DRAFT" | "ANALYZED" | "ARCHIVED";
  source: string;
  lastScrapedAt: string | null;
  analysisData: unknown;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: { id: string; name: string | null } | null;
  linkedProducts: LinkedProduct[];
  createdAt: string;
  updatedAt: string;
}

/** Simplified product for competitor-product links */
export interface LinkedProduct {
  id: string;
  name: string;
  category: string | null;
}

/** List response with stats */
export interface CompetitorListResponse {
  competitors: CompetitorWithMeta[];
  stats: {
    total: number;
    direct: number;
    indirect: number;
    aspirational: number;
    avgScore: number;
  };
}

/** Query parameters for competitor list */
export interface CompetitorListParams {
  tier?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

/** Request body for creating a competitor */
export interface CreateCompetitorBody {
  name: string;
  websiteUrl?: string;
  description?: string;
  tagline?: string;
  tier?: "DIRECT" | "INDIRECT" | "ASPIRATIONAL";
  source?: string;
  status?: string;
  // AI-extracted fields (populated after analyze)
  foundingYear?: number;
  headquarters?: string;
  employeeRange?: string;
  logoUrl?: string;
  valueProposition?: string;
  targetAudience?: string;
  differentiators?: string[];
  mainOfferings?: string[];
  pricingModel?: string;
  pricingDetails?: string;
  toneOfVoice?: string;
  messagingThemes?: string[];
  visualStyleNotes?: string;
  strengths?: string[];
  weaknesses?: string[];
  socialLinks?: Record<string, string>;
  hasBlog?: boolean;
  hasCareersPage?: boolean;
  competitiveScore?: number;
  analysisData?: unknown;
}

/** Request body for updating a competitor */
export interface UpdateCompetitorBody {
  name?: string;
  description?: string;
  tagline?: string;
  foundingYear?: number;
  headquarters?: string;
  employeeRange?: string;
  logoUrl?: string;
  valueProposition?: string;
  targetAudience?: string;
  differentiators?: string[];
  mainOfferings?: string[];
  pricingModel?: string;
  pricingDetails?: string;
  toneOfVoice?: string;
  messagingThemes?: string[];
  visualStyleNotes?: string;
  strengths?: string[];
  weaknesses?: string[];
  tier?: "DIRECT" | "INDIRECT" | "ASPIRATIONAL";
  status?: "DRAFT" | "ANALYZED" | "ARCHIVED";
  competitiveScore?: number;
}

/** Individual analysis step */
export interface AnalyzeStep {
  name: string;
  status: "pending" | "active" | "complete";
}

/** Analysis result data (from AI) — includes all extracted fields */
export interface AnalyzeResultData {
  name: string;
  websiteUrl: string | null;
  description: string | null;
  tagline: string | null;
  logoUrl: string | null;
  tier: "DIRECT" | "INDIRECT" | "ASPIRATIONAL" | null;
  competitiveScore: number | null;
  differentiators: string[];
  source: string;
  sourceUrl: string;
  // AI-extracted fields
  foundingYear: number | null;
  headquarters: string | null;
  employeeRange: string | null;
  valueProposition: string | null;
  targetAudience: string | null;
  mainOfferings: string[];
  pricingModel: string | null;
  pricingDetails: string | null;
  toneOfVoice: string | null;
  messagingThemes: string[];
  visualStyleNotes: string | null;
  strengths: string[];
  weaknesses: string[];
  socialLinks: Record<string, string> | null;
  hasBlog: boolean | null;
  hasCareersPage: boolean | null;
}

/** Response from the analyze/url endpoint */
export interface AnalyzeJobResponse {
  jobId: string;
  status: "complete" | "error";
  currentStep: number;
  totalSteps: number;
  steps: AnalyzeStep[];
  result: AnalyzeResultData;
  error?: string;
}

/** Response for linked products */
export interface CompetitorProductsResponse {
  products: LinkedProduct[];
}
