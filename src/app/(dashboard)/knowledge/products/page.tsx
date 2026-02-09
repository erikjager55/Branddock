"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Plus, Package } from "lucide-react";
import { useProducts, useCreateProduct, Product } from "@/hooks/api/useProducts";
import { useToast } from "@/hooks/useToast";

const placeholderProducts: Product[] = [
  {
    id: "branddock-platform",
    name: "Branddock Platform",
    category: "SaaS",
    description:
      "AI-powered brand management platform that combines brand strategy, validation through research, and content creation in a single workflow.",
    pricingModel: "Freemium",
    pricingDetails: "Free, Starter ($29/mo), Pro ($79/mo), Enterprise (custom)",
    status: "ANALYZED",
    source: "MANUAL",
    sourceUrl: null,
    features: ["Brand Foundation", "Campaign Management", "AI Content Generation"],
    benefits: null,
    useCases: null,
    targetAudience: null,
    analyzedAt: null,
    analysisSteps: null,
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "branddock-api",
    name: "Branddock API",
    category: "Developer Tool",
    description:
      "RESTful API providing programmatic access to brand assets, design tokens, and AI-powered brand analysis for integration into custom workflows.",
    pricingModel: "Usage-based",
    pricingDetails: "Included in Pro and Enterprise plans",
    status: "ANALYZING",
    source: "MANUAL",
    sourceUrl: null,
    features: ["Brand Assets API", "Design Tokens", "AI Analysis Endpoints"],
    benefits: null,
    useCases: null,
    targetAudience: null,
    analyzedAt: null,
    analysisSteps: null,
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "brand-audit-service",
    name: "Brand Audit Service",
    category: "Service",
    description:
      "Comprehensive AI-assisted brand audit that analyzes your brand's consistency, market positioning, and competitive landscape with actionable recommendations.",
    pricingModel: "One-time",
    pricingDetails: "Starting at $499",
    status: "DRAFT",
    source: "MANUAL",
    sourceUrl: null,
    features: ["Consistency Analysis", "Competitor Benchmarking", "Recommendations Report"],
    benefits: null,
    useCases: null,
    targetAudience: null,
    analyzedAt: null,
    analysisSteps: null,
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
  },
];

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

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError } = useProducts({ workspaceId });
  const createProduct = useCreateProduct();
  const toast = useToast();

  const hasApiData = !isError && apiData?.data && apiData.data.length > 0;
  const products = hasApiData ? apiData!.data : placeholderProducts;
  const isDemo = !isLoading && !hasApiData;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(
      { name: formName, description: formDescription, category: formCategory, source: "MANUAL" as const, workspaceId },
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

      {/* Demo Banner */}
      {isDemo && <DemoBanner />}

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
            const features = (product.features as string[]) || [];
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
                        {features.map((feature) => (
                          <Badge key={feature} variant="default" size="sm">
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
