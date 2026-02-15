// =============================================================
// Product types — DB model + API contracts
// =============================================================

export interface ProductWithMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  source: string;
  pricingModel: string;
  pricingAmount: string | null;
  pricingCurrency: string | null;
  features: string[];
  benefits: string[];
  useCases: string[];
  specifications: { key: string; value: string }[] | null;
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
  category: string;
  description?: string;
  source?: string;
  pricingModel?: string;
  pricingAmount?: string;
  pricingCurrency?: string;
  features?: string[];
  benefits?: string[];
  useCases?: string[];
  specifications?: { key: string; value: string }[];
}

export interface UpdateProductBody extends Partial<CreateProductBody> {}
