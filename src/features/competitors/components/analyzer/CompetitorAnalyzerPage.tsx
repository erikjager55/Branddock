"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Globe, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageShell } from "@/components/ui/layout";
import { useCompetitorsStore } from "../../stores/useCompetitorsStore";
import { useCreateCompetitor } from "../../hooks";
import { UrlAnalyzerTab } from "./UrlAnalyzerTab";
import { ManualEntryTab } from "./ManualEntryTab";
import { AnalyzingCompetitorModal } from "./AnalyzingCompetitorModal";


// ─── Tab config ───────────────────────────────────────────

type TabId = "url" | "manual";

const TABS: { id: TabId; icon: LucideIcon; label: string }[] = [
  { id: "url", icon: Globe, label: "Website URL" },
  { id: "manual", icon: Pencil, label: "Manual Entry" },
];

// ─── Component ────────────────────────────────────────────

interface CompetitorAnalyzerPageProps {
  onBack: () => void;
  onNavigateToDetail: (id: string) => void;
}

/** Competitor analyzer page with URL and manual tabs */
export function CompetitorAnalyzerPage({
  onBack,
  onNavigateToDetail,
}: CompetitorAnalyzerPageProps) {
  const {
    isProcessingModalOpen,
    analyzeResultData,
    closeProcessingModal,
  } = useCompetitorsStore();
  const createCompetitor = useCreateCompetitor();
  const [activeTab, setActiveTab] = useState<TabId>("url");
  const [createError, setCreateError] = useState<string | null>(null);

  const handleModalComplete = useCallback(() => {
    const latestData = useCompetitorsStore.getState().analyzeResultData;
    const result = latestData?.result;
    if (result) {
      setCreateError(null);
      createCompetitor
        .mutateAsync({
          name: result.name,
          websiteUrl: result.websiteUrl ?? undefined,
          description: result.description ?? undefined,
          tagline: result.tagline ?? undefined,
          tier: result.tier ?? undefined,
          source: result.source ?? "WEBSITE_URL",
          status: "ANALYZED",
          foundingYear: result.foundingYear ?? undefined,
          headquarters: result.headquarters ?? undefined,
          employeeRange: result.employeeRange ?? undefined,
          valueProposition: result.valueProposition ?? undefined,
          targetAudience: result.targetAudience ?? undefined,
          differentiators: result.differentiators,
          mainOfferings: result.mainOfferings,
          pricingModel: result.pricingModel ?? undefined,
          pricingDetails: result.pricingDetails ?? undefined,
          toneOfVoice: result.toneOfVoice ?? undefined,
          messagingThemes: result.messagingThemes,
          visualStyleNotes: result.visualStyleNotes ?? undefined,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          socialLinks: result.socialLinks ?? undefined,
          hasBlog: result.hasBlog ?? undefined,
          hasCareersPage: result.hasCareersPage ?? undefined,
          competitiveScore: result.competitiveScore ?? undefined,
          analysisData: result as unknown as Record<string, unknown>,
        })
        .then((created) => {
          closeProcessingModal();
          onNavigateToDetail(created.id);
        })
        .catch((err: unknown) => {
          closeProcessingModal();
          const message = err instanceof Error ? err.message : "Failed to save competitor";
          setCreateError(message);
        });
    } else {
      closeProcessingModal();
    }
  }, [createCompetitor, closeProcessingModal, onNavigateToDetail]);

  const handleModalCancel = useCallback(() => {
    closeProcessingModal();
  }, [closeProcessingModal]);

  return (
    <PageShell maxWidth="5xl">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Competitors
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Competitor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import competitor information from a URL or enter details manually
          </p>
        </div>

        {/* Tab header */}
        <div className="flex gap-6 border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error from competitor creation */}
        {createError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {createError}
          </div>
        )}

        {/* Tab content */}
        {activeTab === "url" && <UrlAnalyzerTab />}
        {activeTab === "manual" && (
          <ManualEntryTab
            onBack={onBack}
            onNavigateToDetail={onNavigateToDetail}
          />
        )}

        {/* Processing modal */}
        {isProcessingModalOpen && (
          <AnalyzingCompetitorModal
            onComplete={handleModalComplete}
            onCancel={handleModalCancel}
            isApiComplete={analyzeResultData?.status === "complete"}
          />
        )}
      </div>
    </PageShell>
  );
}
