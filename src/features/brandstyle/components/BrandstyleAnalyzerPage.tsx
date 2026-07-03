"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("brandstyle");
  const { data, isLoading, isError } = useStyleguide();
  const { analysisJobId, isAnalyzing, stopAnalysis } = useBrandstyleStore();
  const [activeInputTab, setActiveInputTab] = useState<InputTab>("url");

  const hasExistingStyleguide = !isLoading && data?.styleguide?.status === "COMPLETE";

  // Reset stale analysis state on mount — prevents showing ProcessingProgress
  // with a jobId from a previous (completed/deleted) analysis session.
  //
  // Critical: only treat the store as stale when the DB record's jobId MATCHES
  // the store's jobId. If they differ, the store has a fresher jobId from a
  // just-started mutation while the styleguide query hasn't refetched yet —
  // killing the store would abort the new analysis right after it begins
  // (the user would have to click Analyze twice). Wait for the refetch instead.
  const didMountCleanupRef = useRef(false);
  useEffect(() => {
    if (didMountCleanupRef.current) return;
    if (isLoading) return; // wait for the styleguide query to settle
    if (!isAnalyzing || !analysisJobId) return; // nothing to clean up

    const dbJobId = data?.styleguide?.analysisJobId;

    // No DB record at all → store is definitely stale (e.g. record was deleted)
    if (!data?.styleguide) {
      didMountCleanupRef.current = true;
      stopAnalysis();
      return;
    }

    // DB jobId differs from store jobId → a newer analysis just started; the
    // refetch hasn't caught up yet. Don't clean up — let the next render handle it.
    if (dbJobId !== analysisJobId) return;

    // Same jobId AND finalised → genuinely stale store, safe to clean up.
    const status = data.styleguide.analysisStatus;
    if (status === "COMPLETE" || status === "ERROR") {
      didMountCleanupRef.current = true;
      stopAnalysis();
    }
  }, [isAnalyzing, analysisJobId, isLoading, data?.styleguide, stopAnalysis]);

  if (isLoading) {
    return (
      <PageShell maxWidth="7xl">
        <div data-testid="skeleton-loader" className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell maxWidth="7xl">
        <div data-testid="error-message" className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
          <p className="text-sm">{t("errors.loadData")}</p>
        </div>
      </PageShell>
    );
  }

  // Show processing progress if analyzing
  if (isAnalyzing && analysisJobId) {
    return (
      <PageShell maxWidth="7xl">
        <PageHeader
          moduleKey="brandstyle"
          title={t("analyzer.processingTitle")}
          subtitle={t("analyzer.processingSubtitle")}
        />
        <ProcessingProgress jobId={analysisJobId} onComplete={onNavigateToGuide} />
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="7xl">
      <div data-testid="brandstyle-analyzer">
      <PageHeader
        moduleKey="brandstyle"
        title={t("analyzer.title")}
        subtitle={t("analyzer.subtitle")}
      />

      {/* Warning banner when re-analyzing */}
      {hasExistingStyleguide && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {t("analyzer.reanalyzeWarningTitle")}
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              {t("analyzer.reanalyzeWarningBody")}
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
            {t("analyzer.tabUrl")}
          </button>
          <button
            onClick={() => setActiveInputTab("pdf")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeInputTab === "pdf"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("analyzer.tabPdf")}
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
