// =============================================================
// Product types — DB model + API contracts
// =============================================================

export interface ProductServiceData {
  id: string;
  source: string;
  name: string;
  description: string;
  category: string;
  pricing: { model: string; amount?: string };
  features: string[];
  benefits: string[];
  useCases: string[];
}

export interface ProductWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  source: string;
  status: string;
  pricingModel: string | null;
  pricingDetails: string | null;
  categoryIcon: string | null;
  features: string[];
  benefits: string[];
  useCases: string[];
  linkedPersonaCount: number;
  createdAt: string;
  updatedAt: string;
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

export interface UpdateProductBody extends Partial<CreateProductBody> {}
