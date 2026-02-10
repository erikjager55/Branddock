"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  Check,
  Users,
  Lightbulb,
  Plus,
  FileText,
  Globe,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useProduct } from "@/hooks/api/useProducts";
import { toStringArray, jsonToString } from "@/lib/json-render";

const statusConfig: Record<string, { variant: "success" | "info" | "default"; label: string }> = {
  ANALYZED: { variant: "success", label: "Analyzed" },
  ANALYZING: { variant: "info", label: "Analyzing" },
  DRAFT: { variant: "default", label: "Draft" },
};

const sourceLabels: Record<string, string> = {
  MANUAL: "Manual Entry",
  WEBSITE_URL: "Website URL",
  PDF_UPLOAD: "PDF Upload",
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const router = useRouter();
  const { data: product, isLoading, isError } = useProduct(productId);

  if (isLoading) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-surface-dark rounded w-1/4" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-dark" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-surface-dark rounded w-1/3" />
              <div className="h-4 bg-surface-dark rounded w-1/4" />
            </div>
          </div>
          <div className="h-32 bg-surface-dark rounded" />
          <div className="h-48 bg-surface-dark rounded" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Product not found
          </h2>
          <p className="text-text-dark/60 mb-4">
            The product you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/knowledge/products")}
          >
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const config = statusConfig[product.status] || statusConfig.DRAFT;
  const features = toStringArray(product.features);
  const rawBenefits = (Array.isArray(product.benefits) ? product.benefits : []) as unknown[];
  const rawUseCases = (Array.isArray(product.useCases) ? product.useCases : []) as unknown[];

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Back */}
      <Link
        href="/knowledge/products"
        className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">{product.name}</h1>
            <p className="text-sm text-text-dark/40">{product.category || "Uncategorized"}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>Edit</Button>
      </div>

      {/* Source */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-text-dark/40">Source:</span>
        <Badge variant="default" size="sm">
          {product.source === "WEBSITE_URL" ? (
            <Globe className="w-3 h-3" />
          ) : (
            <FileText className="w-3 h-3" />
          )}{" "}
          {sourceLabels[product.source] || product.source}
        </Badge>
        <Badge variant={config.variant} size="sm">{config.label}</Badge>
      </div>

      {/* Description + Pricing (2-col) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Description</h3>
          </div>
          <p className="text-sm text-text-dark/70 leading-relaxed">
            {product.description || "No description provided."}
          </p>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Pricing Model</h3>
          </div>
          {product.pricingModel && (
            <Badge variant="info" size="sm" className="mb-2">{product.pricingModel}</Badge>
          )}
          <p className="text-sm text-text-dark/70 leading-relaxed">
            {product.pricingDetails || "No pricing details available."}
          </p>
        </Card>
      </div>

      {/* Features & Specifications */}
      {features.length > 0 && (
        <Card padding="lg" className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-dark">Features &amp; Specifications</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Benefits + Target Audience (2-col) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <Card padding="lg" className="h-full">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-text-dark/40" />
              <h3 className="text-sm font-semibold text-text-dark">Benefits &amp; Advantages</h3>
            </div>
            {rawBenefits.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {rawBenefits.map((b, i) => {
                  const text = jsonToString(b);
                  const obj = (typeof b === "object" && b !== null ? b : {}) as Record<string, unknown>;
                  const title = (obj.title || obj.name || obj.benefit || "") as string;
                  const desc = (obj.text || obj.description || obj.target || "") as string;
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text-dark">{title || text}</p>
                        {desc && <p className="text-xs text-text-dark/50">{desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-dark/40 text-center py-4">
                No benefits data available yet
              </p>
            )}
          </Card>
        </div>
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Target Audience</h3>
          </div>
          {product.personas && product.personas.length > 0 ? (
            <div className="space-y-2">
              {product.personas.map((pp) => (
                <Link key={pp.id} href={`/knowledge/personas/${pp.persona.id}`}>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-dark transition-colors">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Users className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-sm text-text-dark">{pp.persona.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-text-dark/40 mb-3">No personas linked yet</p>
              <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Add Persona
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Use Cases */}
      {rawUseCases.length > 0 && (
        <Card padding="lg" className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Use Cases &amp; Applications</h3>
          </div>
          <div className="space-y-4">
            {rawUseCases.map((uc, i) => {
              const text = jsonToString(uc);
              const obj = (typeof uc === "object" && uc !== null ? uc : {}) as Record<string, unknown>;
              const title = (obj.title || obj.name || "") as string;
              const desc = (obj.text || obj.description || "") as string;
              return (
                <div key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-dark">{title || text}</p>
                    {desc && <p className="text-xs text-text-dark/50">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
