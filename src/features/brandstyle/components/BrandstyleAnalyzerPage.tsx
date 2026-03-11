"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { useStyleguide } from "../hooks/useBrandstyleHooks";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { WebsiteUrlInput } from "./WebsiteUrlInput";
import { PdfUploadInput } from "./PdfUploadInput";
import { ExtractionCapabilities } from "./ExtractionCapabilities";
import { HowItWorks } from "./HowItWorks";
import { ProcessingProgress } from "./ProcessingProgress";

interface BrandstyleAnalyzerPageProps {
  onNavigateToGuide: () => void;
  onNavigate?: (route: string) => void;
}

type InputTab = "url" | "pdf";

export function BrandstyleAnalyzerPage({ onNavigateToGuide, onNavigate }: BrandstyleAnalyzerPageProps) {
  const { data, isLoading, isError } = useStyleguide();
  const { analysisJobId, isAnalyzing, stopAnalysis } = useBrandstyleStore();
  const [activeInputTab, setActiveInputTab] = useState<InputTab>("url");

  const hasExistingStyleguide = !isLoading && data?.styleguide?.status === "COMPLETE";

  // Reset stale analysis state on mount — prevents showing ProcessingProgress
  // with a jobId from a previous (completed/deleted) analysis session
  useEffect(() => {
    if (isAnalyzing && analysisJobId && !isLoading) {
      const currentStatus = data?.styleguide?.analysisStatus;
      // If there's no styleguide or it's already COMPLETE/ERROR, the store is stale
      if (!data?.styleguide || currentStatus === "COMPLETE" || currentStatus === "ERROR") {
        stopAnalysis();
      }
    }
  }, [isAnalyzing, analysisJobId, isLoading, data?.styleguide, stopAnalysis]);

  if (isLoading) {
    return (
      <PageShell maxWidth="5xl">
        <div data-testid="skeleton-loader" className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell maxWidth="5xl">
        <div data-testid="error-message" className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
          <p className="text-sm">Failed to load brandstyle data. Please try again.</p>
        </div>
      </PageShell>
    );
  }

  // Show processing progress if analyzing
  if (isAnalyzing && analysisJobId) {
    return (
      <PageShell maxWidth="5xl">
        <PageHeader
          moduleKey="brandstyle"
          title="Analyzing Your Brand Style"
          subtitle="Our AI is extracting your brand guidelines. This may take a moment."
        />
        <ProcessingProgress jobId={analysisJobId} onComplete={onNavigateToGuide} />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="brandstyle-analyzer">
      <PageHeader
        moduleKey="brandstyle"
        title="Brandstyle"
        subtitle="Your visual identity guidelines"
      />

      {/* Warning banner when re-analyzing */}
      {hasExistingStyleguide && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              You already have a styleguide
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Running a new analysis will update your existing styleguide with the new results.
            </p>
          </div>
        </div>
      )}

      {/* Input tabs */}
      <div className="mb-6">
        <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveInputTab("url")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeInputTab === "url"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Website URL
          </button>
          <button
            onClick={() => setActiveInputTab("pdf")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeInputTab === "pdf"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            PDF Upload
          </button>
        </div>
      </div>

      {/* Input area */}
      <div className="mb-8">
        {activeInputTab === "url" ? <WebsiteUrlInput /> : <PdfUploadInput />}
      </div>

      {/* Info sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExtractionCapabilities />
        <HowItWorks />
      </div>
      </div>
    </PageShell>
  );
}
