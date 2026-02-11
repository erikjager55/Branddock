"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  FileText,
  Edit,
  Sparkles,
  Upload,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Users,
  Plus,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useCreateProduct } from "@/hooks/api/useProducts";
import { useToast } from "@/hooks/useToast";

// ── Data ──

const TABS = [
  { label: "Website URL", value: "url" },
  { label: "PDF Upload", value: "pdf" },
  { label: "Manual Entry", value: "manual" },
];

const URL_EXTRACTS = [
  { label: "Feature Extraction", desc: "Product features and specifications" },
  { label: "Benefits Analysis", desc: "Key benefits and advantages" },
  { label: "Target Audience", desc: "Intended customer segments" },
  { label: "Pricing Model", desc: "Pricing models and tiers" },
];

const PDF_EXTRACTS = [
  { label: "Automatic Extraction", desc: "Product information from documents" },
  { label: "Pricing Information", desc: "Pricing tables and models" },
  { label: "Use Cases", desc: "Application scenarios" },
  { label: "Images", desc: "Product images and diagrams" },
];

const PDF_UPLOAD_TYPES = [
  "Product brochures and datasheets",
  "Service descriptions and proposals",
  "Pricing documents and rate cards",
];

const PDF_STEPS = [
  "Upload your PDF document",
  "AI extracts text, tables, and images",
  "Structured product profile is generated",
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

const TIPS = [
  "Be specific — detailed descriptions lead to better analysis",
  "One item per line — enter features, benefits, and use cases as separate lines",
  "Edit later — you can always update and refine your product profile",
];

// ── Component ──

export default function ProductAnalyzerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [showUrlHowItWorks, setShowUrlHowItWorks] = useState(false);

  // Manual entry fields
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [features, setFeatures] = useState("");
  const [benefits, setBenefits] = useState("");
  const [useCases, setUseCases] = useState("");

  const createProduct = useCreateProduct();
  const toast = useToast();

  const startAnalysis = () => {
    setShowAnalyzing(true);
    setAnalysisStep(0);
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

  const handleManualSave = () => {
    const featuresList = features.split("\n").filter(Boolean);
    const benefitsList = benefits.split("\n").filter(Boolean);
    const useCasesList = useCases.split("\n").filter(Boolean);

    createProduct.mutate(
      {
        name: productName,
        description,
        category: category || undefined,
        pricingModel: pricingModel || undefined,
        features: featuresList.length > 0 ? featuresList : undefined,
        benefits: benefitsList.length > 0 ? benefitsList : undefined,
        useCases: useCasesList.length > 0 ? useCasesList : undefined,
        source: "MANUAL",
      },
      {
        onSuccess: (data) => {
          toast.success("Product saved", "Your product has been created successfully.");
          const id = (data as { id?: string })?.id;
          if (id) {
            router.push(`/knowledge/products/${id}`);
          } else {
            router.push("/knowledge/products");
          }
        },
        onError: () => {
          toast.error("Failed to save product", "Please try again.");
        },
      }
    );
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
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-dark">
            Product & Service Analyzer
          </h1>
          <p className="text-sm text-text-dark/40">
            Analyze a product via URL, upload a PDF, or enter manually
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="underline" className="mb-6" />

      {/* ─── Tab: Website URL ─── */}
      {activeTab === "url" && (
        <div className="space-y-6">
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-dark">Analyze Product URL</h3>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/30" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/product"
                  className="pl-9"
                />
              </div>
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

          {/* What we extract */}
          <div>
            <h3 className="text-sm font-semibold text-text-dark mb-3">What we extract:</h3>
            <div className="grid grid-cols-2 gap-3">
              {URL_EXTRACTS.map((e) => (
                <div key={e.label} className="flex items-start gap-3 p-3 rounded-lg border border-border-dark">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-dark">{e.label}</p>
                    <p className="text-xs text-text-dark/40">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How does it work? */}
          <button
            onClick={() => setShowUrlHowItWorks(!showUrlHowItWorks)}
            className="flex items-center gap-2 text-sm text-text-dark/50 hover:text-text-dark transition-colors"
          >
            {showUrlHowItWorks ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            How does it work?
          </button>
          {showUrlHowItWorks && (
            <Card padding="md">
              <p className="text-xs text-text-dark/50">
                Our AI visits the provided URL, extracts product information, and structures it into a comprehensive product profile including features, benefits, pricing, and target audience data.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ─── Tab: PDF Upload ─── */}
      {activeTab === "pdf" && (
        <div className="space-y-6">
          <Card padding="lg" className="border-dashed">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-dark">Upload Product/Service PDF</h3>
              </div>
            </div>
            <div className="border-2 border-dashed border-border-dark rounded-lg p-10 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-text-dark/20 mx-auto mb-3" />
              <p className="text-sm font-medium text-text-dark mb-1">
                Drop your PDF here or click to upload
              </p>
              <p className="text-xs text-text-dark/40">PDF format, max 10MB</p>
            </div>
          </Card>

          {/* What we extract */}
          <div>
            <h3 className="text-sm font-semibold text-text-dark mb-3">What we extract:</h3>
            <div className="grid grid-cols-2 gap-3">
              {PDF_EXTRACTS.map((e) => (
                <div key={e.label} className="flex items-start gap-3 p-3 rounded-lg border border-border-dark">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-dark">{e.label}</p>
                    <p className="text-xs text-text-dark/40">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What can I upload? */}
          <div>
            <h4 className="text-xs font-semibold text-text-dark mb-2">What can I upload?</h4>
            <div className="space-y-2">
              {PDF_UPLOAD_TYPES.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-text-dark/60">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How does it work? */}
          <div>
            <h4 className="text-xs font-semibold text-text-dark mb-3">How does it work?</h4>
            <div className="space-y-3">
              {PDF_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-xs text-text-dark/60">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Manual Entry ─── */}
      {activeTab === "manual" && (
        <div className="space-y-6">
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Edit className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-dark">Manual Product/Service Entry</h3>
              </div>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Branddock Platform"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the product or service..."
                  rows={3}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Category + Pricing Model (2-col) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Category</label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. SaaS, Service"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark/60 mb-1">Pricing Model</label>
                  <Input
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                    placeholder="e.g. Subscription, Freemium"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">
                  Features <span className="text-text-dark/30">(One per line)</span>
                </label>
                <textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder={"AI-powered brand analysis\nContent generation\nBrand consistency scoring"}
                  rows={4}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">
                  Benefits <span className="text-text-dark/30">(One per line)</span>
                </label>
                <textarea
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder={"Save 80% vs. agency costs\n10x faster brand creation\nAI-powered consistency"}
                  rows={3}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Use Cases */}
              <div>
                <label className="block text-xs font-medium text-text-dark/60 mb-1">
                  Use Cases <span className="text-text-dark/30">(One per line)</span>
                </label>
                <textarea
                  value={useCases}
                  onChange={(e) => setUseCases(e.target.value)}
                  placeholder={"Startup brand creation\nBrand refresh for growing companies\nMulti-brand management"}
                  rows={3}
                  className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark font-mono placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Target Audience */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-text-dark/60">Target Audience</label>
                  <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Select Personas
                  </button>
                </div>
                <div className="border border-dashed border-border-dark rounded-lg p-6 text-center">
                  <Users className="w-6 h-6 text-text-dark/20 mx-auto mb-2" />
                  <p className="text-xs text-text-dark/40 mb-2">No personas selected</p>
                  <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mx-auto transition-colors">
                    <Plus className="w-3 h-3" /> Add Persona
                  </button>
                </div>
              </div>

              {/* Save button */}
              <Button
                variant="primary"
                className="w-full py-3"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                disabled={!productName || !description || createProduct.isPending}
                onClick={handleManualSave}
              >
                {createProduct.isPending ? "Saving..." : "Save Product / Service"}
              </Button>
            </div>
          </Card>

          {/* Tips card */}
          <Card padding="md">
            <h4 className="text-xs font-semibold text-text-dark mb-2">Tips</h4>
            <div className="space-y-1.5">
              {TIPS.map((tip, i) => (
                <p key={i} className="text-xs text-text-dark/50">• {tip}</p>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ─── Analyzing Modal ─── */}
      <Modal
        open={showAnalyzing}
        onClose={() => setShowAnalyzing(false)}
        title="Analyzing Product"
        size="md"
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-text-dark mb-1">Analyzing Product</p>
          <p className="text-xs text-text-dark/40 mb-6">{url || "Product"}</p>

          <div className="text-left space-y-3 mb-6">
            {ANALYSIS_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {i < analysisStep ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
