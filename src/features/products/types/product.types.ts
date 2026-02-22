// =============================================================
// Product feature types — used by feature hooks, API client, and UI
// =============================================================

export interface ProductWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  pricingModel: string | null;
  source: string; // ProductSource enum value
  status: string; // ProductStatus enum value
  features: string[];
  categoryIcon: string | null;
  linkedPersonaCount: number;
  isLocked: boolean;
  updatedAt: string;
}

export interface ProductDetail extends ProductWithMeta {
  pricingDetails: string | null;
  benefits: string[];
  useCases: string[];
  sourceUrl: string | null;
  linkedPersonas: { id: string; name: string; avatarUrl: string | null }[];
  analysisData: unknown;
  lockedAt: string | null;
  lockedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface ProductListResponse {
  products: ProductWithMeta[];
  stats: {
    total: number;
    byCategory: Record<string, number>;
  };
}

export interface ProductListParams {
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateProductBody {
  name: string;
  description?: string;
  category?: string;
  pricingModel?: string;
  features?: string[];
  benefits?: string[];
  useCases?: string[];
  linkedPersonaIds?: string[];
}

export interface UpdateProductBody {
  name?: string;
  description?: string;
  category?: string;
  pricingModel?: string;
  pricingDetails?: string;
  features?: string[];
  benefits?: string[];
  useCases?: string[];
  categoryIcon?: string;
  status?: string;
}

export interface AnalyzeUrlBody {
  url: string;
}

export interface AnalyzeStep {
  name: string;
  status: "pending" | "in_progress" | "complete";
}

export interface AnalyzeJobResponse {
  jobId: string;
  status: "pending" | "processing" | "complete" | "failed";
  currentStep: number;
  totalSteps: number;
  steps: AnalyzeStep[];
  result?: ProductWithMeta;
  error?: string;
}

export interface LinkedPersona {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ProductPersonasResponse {
  personas: {
    id: string;
    name: string;
    tagline: string | null;
    avatarUrl: string | null;
    occupation: string | null;
    location: string | null;
  }[];
}
