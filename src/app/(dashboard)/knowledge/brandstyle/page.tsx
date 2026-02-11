"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Globe,
  FileText,
  Upload,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  useBrandStyleguide,
  useAnalyzeBrandstyle,
} from "@/hooks/api/useBrandstyle";

const PROCESSING_STEPS = [
  { name: "Scanning website structure", duration: 600 },
  { name: "Extracting color palette", duration: 800 },
  { name: "Analyzing typography", duration: 700 },
  { name: "Detecting component styles", duration: 600 },
  { name: "Generating styleguide", duration: 900 },
];

const URL_CAPABILITIES = [
  { title: "Color Palette Extraction", desc: "Primary, secondary, accent" },
  { title: "Typography Analysis", desc: "Fonts, sizes and hierarchy" },
  { title: "Spacing & Layout", desc: "Margins, padding, grid" },
  { title: "Component Styles", desc: "Buttons, borders, shadows" },
];

const PDF_CAPABILITIES = [
  { title: "Automatic Extraction", desc: "Colors, fonts, design elements" },
  { title: "Logo Detection", desc: "Primary logos and variations" },
  { title: "Tone of Voice", desc: "Communication style, guidelines" },
  { title: "Visual Assets", desc: "Photos and illustrations" },
];

const URL_HOW_IT_WORKS = [
  {
    step: 1,
    title: "Enter a website URL",
    desc: "Paste the URL of a website whose style you want to analyze",
  },
  {
    step: 2,
    title: "AI analyzes the website",
    desc: "Our AI scans the website and extracts all visual design elements",
  },
  {
    step: 3,
    title: "View your styleguide",
    desc: "You get a complete styleguide with all colors, fonts and style elements",
  },
];

const PDF_HOW_IT_WORKS = [
  {
    step: 1,
    title: "Upload a PDF styleguide",
    desc: "Upload an existing brand styleguide document in PDF format",
  },
  {
    step: 2,
    title: "AI analyzes the PDF",
    desc: "Our AI reads the document and extracts all design elements and guidelines",
  },
  {
    step: 3,
    title: "View your styleguide",
    desc: "You get a complete styleguide with all colors, fonts and style elements",
  },
];

export default function BrandstyleAnalyzerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[800px] mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-surface-dark rounded w-1/3" />
            <div className="h-64 bg-surface-dark rounded" />
          </div>
        </div>
      }
    >
      <BrandstyleAnalyzerContent />
    </Suspense>
  );
}

function BrandstyleAnalyzerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reanalyze = searchParams.get("reanalyze") === "true";

  const { data: apiData, isLoading: loadingGuide } = useBrandStyleguide();
  const analyzeMutation = useAnalyzeBrandstyle();

  const styleguide = apiData?.data ?? null;

  // Redirect if styleguide already complete (unless reanalyzing)
  useEffect(() => {
    if (!loadingGuide && styleguide?.status === "COMPLETE" && !reanalyze) {
      router.replace("/knowledge/brandstyle/guide");
    }
  }, [loadingGuide, styleguide, reanalyze, router]);

  const [activeTab, setActiveTab] = useState<"url" | "pdf">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);

  const isValidUrl = url.trim().length > 3 && /[a-zA-Z]/.test(url);

  const startAnalysis = useCallback(async () => {
    setProcessing(true);
    setCurrentStep(0);

    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, PROCESSING_STEPS[i].duration));
    }
    setCurrentStep(PROCESSING_STEPS.length);

    try {
      await analyzeMutation.mutateAsync({
        sourceType: activeTab === "url" ? "WEBSITE" : "PDF",
        sourceUrl: activeTab === "url" ? url : undefined,
        sourceFileName: file?.name,
      });
      router.push("/knowledge/brandstyle/guide");
    } catch {
      setProcessing(false);
      setCurrentStep(-1);
    }
  }, [activeTab, url, file, analyzeMutation, router]);

  const handleAnalyze = () => {
    if (reanalyze && styleguide?.status === "COMPLETE") {
      setShowReanalyzeConfirm(true);
    } else {
      startAnalysis();
    }
  };

  const capabilities =
    activeTab === "url" ? URL_CAPABILITIES : PDF_CAPABILITIES;
  const howItWorks =
    activeTab === "url" ? URL_HOW_IT_WORKS : PDF_HOW_IT_WORKS;

  if (loadingGuide) {
    return (
      <div className="max-w-[800px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-dark rounded w-1/3" />
          <div className="h-64 bg-surface-dark rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-dark">
            Brandstyle Analyzer
          </h1>
          <p className="text-sm text-text-dark/60">
            Analyze a website or upload a brand styleguide PDF
          </p>
        </div>
      </div>

      {/* Processing State */}
      {processing ? (
        <Card padding="lg" className="mb-8">
          <h2 className="text-lg font-bold text-text-dark mb-6">
            Processing...
          </h2>
          <div className="space-y-5">
            {PROCESSING_STEPS.map((step, i) => {
              const isComplete = i < currentStep;
              const isActive = i === currentStep;

              return (
                <div key={step.name} className="flex items-center gap-4">
                  {isComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-text-dark/40">
                        {i + 1}
                      </span>
                    </div>
                  )}
                  <span
                    className={cn(
                      "text-base font-medium",
                      isComplete
                        ? "text-text-dark"
                        : isActive
                          ? "text-text-dark"
                          : "text-text-dark/30"
                    )}
                  >
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <>
          {/* Input Method Tabs — Pill style */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setActiveTab("url")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === "url"
                  ? "bg-surface-dark border border-border-dark text-text-dark shadow-sm"
                  : "text-text-dark/40 hover:text-text-dark/60"
              )}
            >
              <Globe className="w-4 h-4" />
              Website URL
            </button>
            <button
              onClick={() => setActiveTab("pdf")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === "pdf"
                  ? "bg-surface-dark border border-border-dark text-text-dark shadow-sm"
                  : "text-text-dark/40 hover:text-text-dark/60"
              )}
            >
              <FileText className="w-4 h-4" />
              PDF Upload
            </button>
          </div>

          {/* Tab Content */}
          <Card padding="lg" className="mb-8">
            {activeTab === "url" ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-dark">
                      Analyze Website URL
                    </h2>
                    <p className="text-sm text-text-dark/50">
                      Enter a website URL and our AI automatically analyzes the
                      brand style, including colors, typography, spacing, and
                      other visual elements.
                    </p>
                  </div>
                </div>

                {/* URL input + Analyze button on same row */}
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1.5">
                    Website URL
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/30" />
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="www.example.com or https://example.com"
                        disabled={processing}
                        className="w-full rounded-lg border border-border-dark bg-surface-dark pl-10 pr-3 py-2.5 text-sm text-text-dark placeholder:text-text-dark/30 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                    </div>
                    <Button
                      variant="primary"
                      disabled={!isValidUrl || processing}
                      onClick={handleAnalyze}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      Analyze
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-dark">
                      Upload Brand Styleguide PDF
                    </h2>
                    <p className="text-sm text-text-dark/50">
                      Upload an existing brand styleguide in PDF format. Our AI
                      analyzes the document and extracts all visual elements
                      automatically.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-1.5">
                      Brand Styleguide PDF
                    </label>
                    {file ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border-dark bg-surface-dark">
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-dark truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-text-dark/40">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => setFile(null)}
                          className="p-1 rounded text-text-dark/30 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-3 p-12 rounded-xl border-2 border-dashed border-border-dark hover:border-primary/40 cursor-pointer transition-colors">
                        <Upload className="w-10 h-10 text-text-dark/20" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-text-dark/60">
                            Click to upload a file
                          </p>
                          <p className="text-xs text-text-dark/40 mt-1">
                            Or drag and drop a PDF file here
                          </p>
                          <p className="text-xs text-text-dark/30 mt-1">
                            PDF &bull; Max 10MB
                          </p>
                        </div>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setFile(f);
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={!file || processing}
                    onClick={handleAnalyze}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    Analyze
                  </Button>
                </div>
              </>
            )}
          </Card>

          {/* Divider */}
          <div className="border-t border-border-dark my-6" />

          {/* Extraction Capabilities */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-text-dark/60 mb-3">
              What we extract:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {capabilities.map((cap) => (
                <div
                  key={cap.title}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-dark">
                      {cap.title}
                    </p>
                    <p className="text-xs text-text-dark/40">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border-dark my-6" />

          {/* How It Works — Vertical steps */}
          <div>
            <h3 className="text-lg font-semibold text-text-dark mb-4">
              How does it work?
            </h3>
            <div className="space-y-4">
              {howItWorks.map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">
                      {item.step}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-dark">
                      {item.title}
                    </p>
                    <p className="text-sm text-text-dark/40">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reanalyze Confirmation Modal */}
      {showReanalyzeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background-dark border border-border-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-text-dark mb-2">
              Replace current styleguide?
            </h3>
            <p className="text-sm text-text-dark/60 mb-6">
              This will replace your current styleguide with a new analysis.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowReanalyzeConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowReanalyzeConfirm(false);
                  startAnalysis();
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
