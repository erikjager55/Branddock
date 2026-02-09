"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Plus, Package } from "lucide-react";

const products = [
  {
    id: "branddock-platform",
    name: "Branddock Platform",
    category: "SaaS",
    description:
      "AI-powered brand management platform that combines brand strategy, validation through research, and content creation in a single workflow.",
    pricing: "Freemium — Free, Starter ($29/mo), Pro ($79/mo), Enterprise (custom)",
    status: "ACTIVE" as const,
    features: ["Brand Foundation", "Campaign Management", "AI Content Generation"],
  },
  {
    id: "branddock-api",
    name: "Branddock API",
    category: "Developer Tool",
    description:
      "RESTful API providing programmatic access to brand assets, design tokens, and AI-powered brand analysis for integration into custom workflows.",
    pricing: "Usage-based — included in Pro and Enterprise plans",
    status: "BETA" as const,
    features: ["Brand Assets API", "Design Tokens", "AI Analysis Endpoints"],
  },
  {
    id: "brand-audit-service",
    name: "Brand Audit Service",
    category: "Service",
    description:
      "Comprehensive AI-assisted brand audit that analyzes your brand's consistency, market positioning, and competitive landscape with actionable recommendations.",
    pricing: "One-time — Starting at $499",
    status: "PLANNED" as const,
    features: ["Consistency Analysis", "Competitor Benchmarking", "Recommendations Report"],
  },
];

const statusConfig: Record<string, { variant: "success" | "info" | "default"; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  BETA: { variant: "info", label: "Beta" },
  PLANNED: { variant: "default", label: "Planned" },
};

export default function ProductsPage() {
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
          >
            Add Product
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Manage your product and service portfolio
        </p>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const config = statusConfig[product.status];
          return (
            <Card key={product.id} hoverable padding="lg" className="h-full">
              <div className="flex flex-col h-full space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default" size="sm">
                      {product.category}
                    </Badge>
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
                  <p className="text-xs text-text-dark/60">
                    <span className="font-medium text-text-dark/80">Pricing:</span>{" "}
                    {product.pricing}
                  </p>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border-dark">
                  {product.features.map((feature) => (
                    <Badge key={feature} variant="default" size="sm">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
