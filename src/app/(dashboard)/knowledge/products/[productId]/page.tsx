"use client";

import { use } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// ── Data ──

const PRODUCT = {
  name: "Branddock Platform",
  category: "SaaS Platform",
  source: "Manual Entry",
  description:
    "An intelligent brand management platform that combines AI-powered analysis, strategic planning, and content generation in a single seamless workflow. Branddock helps teams of all sizes build, manage, and scale their brand identity with consistency and speed.",
  pricingModel: "Subscription",
  pricingDetails: "Starting at €49/month for Starter, €149/month for Professional, €399/month for Enterprise. Annual billing with 20% discount available.",
};

const FEATURES = [
  "AI-powered brand analysis and scoring",
  "Automated content generation across formats",
  "Brand consistency monitoring and alerts",
  "Campaign planning and management",
  "Persona research and validation tools",
  "Multi-channel content distribution",
  "Real-time collaboration for teams",
  "Brand asset library with version control",
  "Custom brand style guide generator",
  "Integration with major marketing platforms",
];

const BENEFITS = [
  { num: 1, title: "80% Cost Reduction", text: "Replace expensive agency retainers with AI-powered brand management at a fraction of the cost." },
  { num: 2, title: "10x Faster Execution", text: "Go from brand strategy to published content in hours instead of weeks." },
  { num: 3, title: "Consistent Brand Voice", text: "AI ensures every piece of content aligns with your brand guidelines automatically." },
  { num: 4, title: "Data-Driven Decisions", text: "Make branding decisions backed by research, validation, and competitive analysis." },
];

const USE_CASES = [
  { num: 1, title: "Startup Brand Creation", text: "First-time founders building a professional brand identity from scratch without agency costs." },
  { num: 2, title: "Brand Refresh", text: "Growing companies updating their brand identity to match their evolved positioning and audience." },
  { num: 3, title: "Multi-Brand Management", text: "Agencies and enterprises managing multiple brand identities with consistent quality." },
  { num: 4, title: "Content at Scale", text: "Marketing teams producing high-volume, brand-consistent content across channels." },
];

// ── Component ──

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { productId } = use(params);

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
            <h1 className="text-xl font-semibold text-text-dark">{PRODUCT.name}</h1>
            <p className="text-sm text-text-dark/40">{PRODUCT.category}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>Edit</Button>
      </div>

      {/* Source */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-text-dark/40">Source:</span>
        <Badge variant="default" size="sm">
          <FileText className="w-3 h-3" /> {PRODUCT.source}
        </Badge>
        <Badge variant="info" size="sm">Analyzed</Badge>
      </div>

      {/* Description + Pricing (2-col) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Description</h3>
          </div>
          <p className="text-sm text-text-dark/70 leading-relaxed">{PRODUCT.description}</p>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Pricing Model</h3>
          </div>
          <Badge variant="info" size="sm" className="mb-2">{PRODUCT.pricingModel}</Badge>
          <p className="text-sm text-text-dark/70 leading-relaxed">{PRODUCT.pricingDetails}</p>
        </Card>
      </div>

      {/* Features & Specifications */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Check className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-dark">Features &amp; Specifications</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-2 text-sm text-text-dark/70">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              {f}
            </div>
          ))}
        </div>
      </Card>

      {/* Benefits + Target Audience (2-col) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <Card padding="lg" className="h-full">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-text-dark/40" />
              <h3 className="text-sm font-semibold text-text-dark">Benefits &amp; Advantages</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {BENEFITS.map((b) => (
                <div key={b.num} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {b.num}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-dark">{b.title}</p>
                    <p className="text-xs text-text-dark/50">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-text-dark/40" />
            <h3 className="text-sm font-semibold text-text-dark">Target Audience</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-sm text-text-dark/40 mb-3">No personas linked yet</p>
            <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add Persona
            </Button>
          </div>
        </Card>
      </div>

      {/* Use Cases */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-text-dark/40" />
          <h3 className="text-sm font-semibold text-text-dark">Use Cases &amp; Applications</h3>
        </div>
        <div className="space-y-4">
          {USE_CASES.map((uc) => (
            <div key={uc.num} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                {uc.num}
              </span>
              <div>
                <p className="text-sm font-medium text-text-dark">{uc.title}</p>
                <p className="text-xs text-text-dark/50">{uc.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
