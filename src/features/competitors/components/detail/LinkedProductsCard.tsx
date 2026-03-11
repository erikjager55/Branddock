"use client";

import { useState } from "react";
import { Package, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/shared";
import { useProductsStore } from "@/features/products/stores/useProductsStore";
import { useCompetitorProducts, useUnlinkProduct } from "../../hooks";
import { ProductSelectorModal } from "./ProductSelectorModal";

interface LinkedProductsCardProps {
  competitorId: string;
  isLocked: boolean;
  onNavigate?: (section: string) => void;
}

/** Linked products sidebar card with link/unlink functionality */
export function LinkedProductsCard({
  competitorId,
  isLocked,
  onNavigate,
}: LinkedProductsCardProps) {
  const { data, isLoading } = useCompetitorProducts(competitorId);
  const unlinkProduct = useUnlinkProduct(competitorId);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const products = data?.products ?? [];
  const linkedProductIds = products.map((p) => p.id);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          Linked Products
        </h3>
        {!isLocked && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSelectorOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Link
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No products linked yet.</p>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
            >
              <button
                type="button"
                className="text-sm text-gray-700 hover:text-primary truncate text-left"
                onClick={() => {
                  useProductsStore.getState().setSelectedProductId(product.id);
                  onNavigate?.("product-detail");
                }}
              >
                {product.name}
              </button>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => unlinkProduct.mutate(product.id)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                  title="Unlink product"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Product selector modal */}
      <ProductSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        competitorId={competitorId}
        linkedProductIds={linkedProductIds}
      />
    </div>
  );
}
