"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Package, ChevronRight } from "lucide-react";
import { useProducts } from "@/hooks/api/useProducts";
import { toStringArray } from "@/lib/json-render";

export default function ProductsPage() {
  const { data: apiData, isLoading } = useProducts({});
  const products = apiData?.data ?? [];

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-dark">
                Products & Services
              </h1>
              <p className="text-sm text-text-dark/40">
                Manage your product and service portfolio
              </p>
            </div>
          </div>
          <Link href="/knowledge/products/analyzer">
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={200} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No products yet"
          description="Add your first product to manage your portfolio"
          action={
            <Link href="/knowledge/products/analyzer">
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Add Product
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {products.map((product) => {
            const features = toStringArray(product.features);
            const visibleFeatures = features.slice(0, 2);
            const extraCount = features.length - 2;

            return (
              <Link key={product.id} href={`/knowledge/products/${product.id}`}>
                <Card hoverable padding="lg" className="h-full">
                  <div className="flex flex-col h-full space-y-3">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-text-dark">
                          {product.name}
                        </h3>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-dark/30 flex-shrink-0" />
                    </div>

                    {/* Subtitle */}
                    <p className="text-xs text-text-dark/40">
                      {[product.category, product.pricingModel]
                        .filter(Boolean)
                        .join(" • ") || "Uncategorized"}
                    </p>

                    {/* Description */}
                    {product.description && (
                      <p className="text-sm text-text-dark/60 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Features */}
                    {features.length > 0 && (
                      <div className="pt-3 border-t border-border-dark">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-dark/40 mb-2">
                          Key Features
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {visibleFeatures.map((feature, i) => (
                            <span
                              key={i}
                              className="bg-surface-dark text-text-dark/70 text-xs px-2.5 py-1 rounded-md"
                            >
                              {feature}
                            </span>
                          ))}
                          {extraCount > 0 && (
                            <span className="bg-surface-dark text-text-dark/40 text-xs px-2.5 py-1 rounded-md">
                              +{extraCount} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
