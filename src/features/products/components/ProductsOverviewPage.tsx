"use client";

import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("products");
  const { data, isLoading } = useProducts();

  return (
    <PageShell>
      <PageHeader
        moduleKey="products"
        title={t("overview.title")}
        subtitle={t("overview.subtitle")}
        actions={
          <Button data-testid="add-product-button" onClick={onNavigateToAnalyzer} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("overview.addProduct")}
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
          title={t("overview.empty.title")}
          description={t("overview.empty.description")}
          action={{
            label: t("overview.empty.action"),
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
