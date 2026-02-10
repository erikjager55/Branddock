"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Plus, Package } from "lucide-react";
import { useProducts, useCreateProduct, Product } from "@/hooks/api/useProducts";
import { useToast } from "@/hooks/useToast";
import { toStringArray } from "@/lib/json-render";

const statusConfig: Record<string, { variant: "success" | "info" | "default"; label: string }> = {
  ANALYZED: { variant: "success", label: "Analyzed" },
  ANALYZING: { variant: "info", label: "Analyzing" },
  DRAFT: { variant: "default", label: "Draft" },
};

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");

  const { data: apiData, isLoading } = useProducts({});
  const createProduct = useCreateProduct();
  const toast = useToast();

  const products = apiData?.data ?? [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(
      { name: formName, description: formDescription, category: formCategory, source: "MANUAL" as const },
      {
        onSuccess: () => {
          toast.success("Product created", "Your product has been added.");
          setFormName("");
          setFormDescription("");
          setFormCategory("");
          setIsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to create product", "Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Products & Services
          </h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Product
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Manage your product and service portfolio
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={280} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No products yet"
          description="Add your first product to manage your portfolio"
          action={
            <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Product
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const config = statusConfig[product.status] || statusConfig.DRAFT;
            const features = toStringArray(product.features);
            return (
              <Link key={product.id} href={`/knowledge/products/${product.id}`}>
                <Card hoverable padding="lg" className="h-full">
                  <div className="flex flex-col h-full space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex gap-2">
                        {product.category && (
                          <Badge variant="default" size="sm">
                            {product.category}
                          </Badge>
                        )}
                        <Badge variant={config.variant} size="sm">
                          {config.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-text-dark mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-text-dark/40 line-clamp-3 mb-3">
                        {product.description}
                      </p>
                      {product.pricingDetails && (
                        <p className="text-xs text-text-dark/60">
                          <span className="font-medium text-text-dark/80">
                            Pricing:
                          </span>{" "}
                          {product.pricingModel ? `${product.pricingModel} — ` : ""}
                          {product.pricingDetails}
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    {features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border-dark">
                        {features.map((feature, i) => (
                          <Badge key={i} variant="default" size="sm">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Product Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Product">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Name *</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Branddock Platform" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Category</label>
            <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g. SaaS, Service" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Description</label>
            <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe this product" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={createProduct.isPending}>
              {createProduct.isPending ? "Creating..." : "Add Product"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
