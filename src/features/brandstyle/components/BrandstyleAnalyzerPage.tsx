"use client";

import { useState, useEffect } from "react";
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
  const { analysisJobId, isAnalyzing } = useBrandstyleStore();
  const [activeInputTab, setActiveInputTab] = useState<InputTab>("url");

  // If styleguide is already COMPLETE, redirect to guide page
  const shouldRedirect = !isLoading && data?.styleguide?.status === "COMPLETE" && !isAnalyzing;
  useEffect(() => {
    if (shouldRedirect) {
      onNavigateToGuide();
    }
  }, [shouldRedirect, onNavigateToGuide]);

  if (shouldRedirect) {
    return null;
  }

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
