"use client";

import { Package, Plus } from "lucide-react";
import { EmptyState, SkeletonCard, Button } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { useProducts } from "../hooks";
import { ProductCard } from "./ProductCard";

interface ProductsOverviewPageProps {
  onNavigateToAnalyzer: () => void;
  onNavigateToDetail: (id: string) => void;
  onNavigate?: (route: string) => void;
}

export function ProductsOverviewPage({
  onNavigateToAnalyzer,
  onNavigateToDetail,
  onNavigate,
}: ProductsOverviewPageProps) {
  const { data, isLoading } = useProducts();

  return (
    <PageShell>
      <PageHeader
        moduleKey="products"
        title="Products & Services"
        subtitle="Manage your product portfolio"
        actions={
          <Button data-testid="add-product-button" onClick={onNavigateToAnalyzer} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !data?.products?.length ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product or service to start building your product catalog."
          action={{
            label: "Add your first product",
            onClick: onNavigateToAnalyzer,
          }}
        />
      ) : (
        <div data-testid="products-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => onNavigateToDetail(product.id)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
