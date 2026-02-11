"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  CheckCircle2,
  Users,
  Lightbulb,
  Plus,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useProduct } from "@/hooks/api/useProducts";
import { toStringArray, jsonToString } from "@/lib/json-render";

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
            <div className="w-10 h-10 rounded-full bg-surface-dark" />
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
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-dark">{product.name}</h1>
            <p className="text-sm text-text-dark/40">{product.category || "Uncategorized"}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>
          Edit
        </Button>
      </div>

      {/* Metadata bar */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-text-dark/40">
          Source: {sourceLabels[product.source] || product.source}
        </span>
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium px-2.5 py-0.5">
          {product.status === "ANALYZED" ? "Analyzed" : product.status === "ANALYZING" ? "Analyzing" : "Draft"}
        </span>
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
            <h3 className="text-sm font-semibold text-text-dark">Pricing</h3>
          </div>
          {product.pricingModel && (
            <div className="mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-dark/40 mb-1">Model</p>
              <p className="text-sm text-text-dark">{product.pricingModel}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-dark/40 mb-1">Details</p>
            <p className="text-sm text-text-dark/70 leading-relaxed">
              {product.pricingDetails || "No pricing details available."}
            </p>
          </div>
        </Card>
      </div>

      {/* Features & Specifications */}
      {features.length > 0 && (
        <Card padding="lg" className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-dark">Features & Specifications</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Benefits */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-text-dark/40" />
          <h3 className="text-sm font-semibold text-text-dark">Benefits & Advantages</h3>
        </div>
        {rawBenefits.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {rawBenefits.map((b, i) => {
              const text = jsonToString(b);
              const obj = (typeof b === "object" && b !== null ? b : {}) as Record<string, unknown>;
              const title = (obj.title || obj.name || obj.benefit || "") as string;
              const desc = (obj.text || obj.description || obj.target || "") as string;
              return (
                <div key={i} className="bg-surface-dark rounded-lg p-3 flex items-center gap-3">
                  <div className="bg-primary text-white rounded-full w-7 h-7 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
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

      {/* Target Audience + Use Cases (2-col equal) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card padding="lg" className="h-full">
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
            <div className="border border-dashed border-border-dark rounded-lg p-6 text-center">
              <Users className="w-6 h-6 text-text-dark/20 mx-auto mb-2" />
              <p className="text-sm text-text-dark/40 mb-3">No personas linked yet</p>
              <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mx-auto transition-colors">
                <Plus className="w-3 h-3" /> Add Persona
              </button>
            </div>
          )}
        </Card>

        <Card padding="lg" className="h-full">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Use Cases & Applications</h3>
          </div>
          {rawUseCases.length > 0 ? (
            <div className="space-y-3">
              {rawUseCases.map((uc, i) => {
                const text = jsonToString(uc);
                const obj = (typeof uc === "object" && uc !== null ? uc : {}) as Record<string, unknown>;
                const title = (obj.title || obj.name || "") as string;
                const desc = (obj.text || obj.description || "") as string;
                return (
                  <div key={i} className="flex gap-3">
                    <span className="text-text-dark/40 text-sm font-mono flex-shrink-0 w-5 text-right">
                      {i + 1}.
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
              No use cases available yet
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
