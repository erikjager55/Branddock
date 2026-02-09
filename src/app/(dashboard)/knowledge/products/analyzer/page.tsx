"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  FileText,
  Edit,
  Sparkles,
  Upload,
  CheckCircle,
  Plus,
  Users,
  DollarSign,
  Target,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

// ── Data ──

const TABS = [
  { label: "Website URL", value: "url" },
  { label: "PDF Upload", value: "pdf" },
  { label: "Manual Entry", value: "manual" },
];

const URL_EXTRACTS = [
  { icon: Package, label: "Features", desc: "Product features and specifications" },
  { icon: DollarSign, label: "Benefits", desc: "Key benefits and advantages" },
  { icon: Target, label: "Target Audience", desc: "Intended customer segments" },
  { icon: DollarSign, label: "Pricing", desc: "Pricing models and tiers" },
];

const PDF_EXTRACTS = [
  { icon: Package, label: "Extraction", desc: "Product information from documents" },
  { icon: DollarSign, label: "Pricing", desc: "Pricing tables and models" },
  { icon: Target, label: "Use Cases", desc: "Application scenarios" },
  { icon: FileText, label: "Images", desc: "Product images and diagrams" },
];

const CATEGORY_OPTIONS = [
  { value: "saas", label: "SaaS Platform" },
  { value: "service", label: "Professional Service" },
  { value: "physical", label: "Physical Product" },
  { value: "digital", label: "Digital Product" },
  { value: "other", label: "Other" },
];

const PRICING_OPTIONS = [
  { value: "subscription", label: "Subscription" },
  { value: "one-time", label: "One-time Purchase" },
  { value: "freemium", label: "Freemium" },
  { value: "usage", label: "Usage-based" },
  { value: "custom", label: "Custom / Enterprise" },
];

const ANALYSIS_STEPS = [
  "Connecting to website",
  "Scanning product information",
  "Extracting features & specifications",
  "Analyzing pricing model",
  "Identifying use cases",
  "Detecting target audience",
  "Generating product profile",
];

// ── Component ──

export default function ProductAnalyzerPage() {
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  // Manual entry fields
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [features, setFeatures] = useState("");
  const [benefits, setBenefits] = useState("");
  const [useCases, setUseCases] = useState("");

  const startAnalysis = () => {
    setShowAnalyzing(true);
    setAnalysisStep(0);
    // Simulate step progression
    const interval = setInterval(() => {
      setAnalysisStep((s) => {
        if (s >= ANALYSIS_STEPS.length - 1) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 1500);
  };

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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Product &amp; Service Analyzer</h1>
          <p className="text-sm text-text-dark/40">Analyze via URL, upload PDF, or enter manually</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="underline" className="mb-6" />

      {/* Tab: Website URL */}
      {activeTab === "url" && (
        <div className="space-y-6">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-text-dark/40" />
              <h3 className="text-sm font-semibold text-text-dark">Website URL</h3>
            </div>
            <div className="flex gap-3">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/product"
                className="flex-1"
              />
              <Button
                variant="primary"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={startAnalysis}
                disabled={!url}
              >
                Analyze
              </Button>
            </div>
          </Card>

          <div>
            <h3 className="text-sm font-semibold text-text-dark mb-3">What we extract</h3>
            <div className="grid grid-cols-2 gap-3">
              {URL_EXTRACTS.map((e) => {
                const Icon = e.icon;
                return (
                  <div key={e.label} className="flex items-start gap-3 p-3 rounded-lg border border-border-dark">
                    <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-text-dark">{e.label}</p>
                      <p className="text-xs text-text-dark/40">{e.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: PDF Upload */}
      {activeTab === "pdf" && (
        <div className="space-y-6">
          <Card padding="lg">
            <div className="border-2 border-dashed border-border-dark rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-text-dark/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-text-dark mb-1">
                Drop your PDF here or click to upload
              </p>
              <p className="text-xs text-text-dark/40">PDF format, max 10MB</p>
            </div>
          </Card>

          <div>
            <h3 className="text-sm font-semibold text-text-dark mb-3">What we extract</h3>
            <div className="grid grid-cols-2 gap-3">
              {PDF_EXTRACTS.map((e) => {
                const Icon = e.icon;
                return (
                  <div key={e.label} className="flex items-start gap-3 p-3 rounded-lg border border-border-dark">
                    <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-text-dark">{e.label}</p>
                      <p className="text-xs text-text-dark/40">{e.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Card padding="md">
              <h4 className="text-xs font-semibold text-text-dark mb-1">What can I upload?</h4>
              <p className="text-xs text-text-dark/50">Product brochures, spec sheets, pricing documents, or any PDF containing product/service information.</p>
            </Card>
            <Card padding="md">
              <h4 className="text-xs font-semibold text-text-dark mb-1">How does it work?</h4>
              <p className="text-xs text-text-dark/50">Our AI extracts text, tables, and images from your PDF and structures the data into a comprehensive product profile.</p>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Manual Entry */}
      {activeTab === "manual" && (
        <div className="space-y-6">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <Edit className="w-4 h-4 text-text-dark/40" />
              <h3 className="text-sm font-semibold text-text-dark">Manual Entry</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">Product Name *</label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Branddock Platform" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the product or service..."
                  rows={3}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Category</label>
                  <Select options={CATEGORY_OPTIONS} value={category} onChange={setCategory} placeholder="Select category" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Pricing Model</label>
                  <Select options={PRICING_OPTIONS} value={pricingModel} onChange={setPricingModel} placeholder="Select model" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">Features (one per line)</label>
                <textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder={"AI-powered brand analysis\nContent generation\nBrand consistency scoring"}
                  rows={4}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">Benefits (one per line)</label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder={"Save 80% vs. agency costs\n10x faster brand creation\nAI-powered consistency"}
                  rows={3}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">Use Cases (one per line)</label>
                <textarea
                  value={useCases}
                  onChange={(e) => setUseCases(e.target.value)}
                  placeholder={"Startup brand creation\nBrand refresh for growing companies\nMulti-brand management"}
                  rows={3}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-2">Target Audience</label>
                <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Select Personas
                </button>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Card padding="md" className="flex-1 mr-4">
              <h4 className="text-xs font-semibold text-text-dark mb-1">Tips</h4>
              <p className="text-xs text-text-dark/50">
                Be as specific as possible with features and benefits. Include pricing details and target audience information for a complete product profile.
              </p>
            </Card>
            <Button
              variant="primary"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              disabled={!productName || !description}
            >
              Save Product / Service
            </Button>
          </div>
        </div>
      )}

      {/* Analyzing Modal (Task 13: SCR-08b) */}
      <Modal
        open={showAnalyzing}
        onClose={() => setShowAnalyzing(false)}
        title="Analyzing Product"
        size="md"
      >
        <div className="text-center py-4">
          {/* Spinner */}
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-dark mb-1">Analyzing Product</p>
          <p className="text-xs text-text-dark/40 mb-6">{url || "Product"}</p>

          {/* Steps */}
          <div className="text-left space-y-3 mb-6">
            {ANALYSIS_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {i < analysisStep ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : i === analysisStep ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border-dark flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    i < analysisStep
                      ? "text-text-dark/60"
                      : i === analysisStep
                      ? "text-text-dark font-medium"
                      : "text-text-dark/30"
                  )}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-dark/30 mb-4">This may take up to 30 seconds</p>
          <Button variant="secondary" size="sm" onClick={() => setShowAnalyzing(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
