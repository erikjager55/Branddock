"use client";

import { useState, useMemo } from "react";
import { Search, Package, Loader2 } from "lucide-react";
import { Modal, Button, Input } from "@/components/shared";
import { useProducts } from "@/features/products/hooks";
import { useLinkProduct } from "../../hooks";

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitorId: string;
  linkedProductIds: string[];
}

/** Multi-select modal for linking products to a competitor */
export function ProductSelectorModal({
  isOpen,
  onClose,
  competitorId,
  linkedProductIds,
}: ProductSelectorModalProps) {
  const { data, isLoading, isError } = useProducts();
  const products = data?.products ?? [];
  const linkProduct = useLinkProduct(competitorId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const availableProducts = useMemo(() => {
    return products
      .filter((p) => !linkedProductIds.includes(p.id))
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
        );
      });
  }, [products, linkedProductIds, searchQuery]);

  const toggleSelection = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleLink = async () => {
    setIsLinking(true);
    setLinkError(null);
    try {
      for (const productId of selectedIds) {
        await linkProduct.mutateAsync(productId);
      }
      setSelectedIds([]);
      setSearchQuery("");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to link product";
      setLinkError(message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearchQuery("");
    setLinkError(null);
    onClose();
  };

  const allLinked = products.length > 0 && products.length === linkedProductIds.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Link Product"
      subtitle="Select products to link to this competitor"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="cta"
            onClick={handleLink}
            disabled={selectedIds.length === 0}
            isLoading={isLinking}
          >
            Link Selected ({selectedIds.length})
          </Button>
        </div>
      }
    >
      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search products..."
          icon={Search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Error banner */}
      {linkError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {linkError}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="mx-auto h-6 w-6 text-gray-400 animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading products...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-8 w-8 text-red-300 mb-2" />
          <p className="text-sm text-red-600">
            Could not load products. Please try again.
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            No products in this workspace yet.
          </p>
        </div>
      ) : allLinked ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-8 w-8 text-green-300 mb-2" />
          <p className="text-sm text-gray-500">
            All products are already linked to this competitor.
          </p>
        </div>
      ) : availableProducts.length === 0 ? (
        <div className="text-center py-8">
          <Search className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No products match your search.</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {availableProducts.map((product) => {
            const isSelected = selectedIds.includes(product.id);
            return (
              <label
                key={product.id}
                className={`flex items-center gap-3 rounded-lg p-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-red-50 border border-red-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(product.id)}
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <Package className="h-4 w-4 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  {product.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {product.description}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
