import type { ProductServiceData } from "@/components/ProductServiceAnalyzer";
import type { ProductWithMeta } from "@/types/product";

/**
 * Maps a DB Product (ProductWithMeta) to the existing mock format
 * (ProductServiceData) so downstream components remain unchanged.
 */
export function apiProductToMockFormat(product: ProductWithMeta): ProductServiceData {
  return {
    id: product.id,
    source: product.source,
    name: product.name,
    description: product.description ?? "",
    category: product.category ?? "",
    pricing: {
      model: product.pricingModel ?? "Custom",
    },
    features: product.features,
    benefits: product.benefits,
    useCases: product.useCases,
  };
}

export function apiProductsToMockFormat(products: ProductWithMeta[]): ProductServiceData[] {
  return products.map(apiProductToMockFormat);
}
