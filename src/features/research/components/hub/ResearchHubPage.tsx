"use client";

import React from "react";
import { SkeletonCard } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import {
  useResearchStats,
  useMethodStatus,
  useActiveResearch,
  usePendingValidation,
  useQuickInsights,
  useRecommendedActions,
} from "../../hooks";
import { useResearchStore } from "../../stores/useResearchStore";
import { ResearchStatsCards } from "./ResearchStatsCards";
import { ValidationMethodsStatus } from "./ValidationMethodsStatus";
import { ResearchViewTabs } from "./ResearchViewTabs";
import { ActiveResearchSection } from "./ActiveResearchSection";
import { ValidationNeededSection } from "./ValidationNeededSection";
import { QuickInsightsSection } from "./QuickInsightsSection";
import { RecommendedActionsSection } from "./RecommendedActionsSection";
import { SplitButton } from "./SplitButton";

// ─── Types ───────────────────────────────────────────────────

interface ResearchHubPageProps {
  onNavigate: (section: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function ResearchHubPage({ onNavigate }: ResearchHubPageProps) {
  const store = useResearchStore();

  const { data: stats, isLoading: statsLoading } = useResearchStats();
  const { data: methodStatus, isLoading: methodsLoading } = useMethodStatus();
  const { data: activeResearch } = useActiveResearch();
  const { data: pendingValidation } = usePendingValidation();
  const { data: quickInsights } = useQuickInsights();
  const { data: recommendedActions } = useRecommendedActions();

  return (
    <PageShell>
      <div data-testid="research-hub-page">
      <PageHeader
        moduleKey="research"
        title="Research Hub"
        subtitle="Design and run brand research studies"
        actions={<SplitButton onNavigate={onNavigate} />}
      />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <ResearchStatsCards stats={stats} isLoading={statsLoading} />
      )}

      {/* Validation Methods Status */}
      <ValidationMethodsStatus methods={methodStatus} isLoading={methodsLoading} />

      {/* View Tabs */}
      <ResearchViewTabs
        activeTab={store.activeViewTab}
        onTabChange={store.setActiveViewTab}
      />

      {/* Content sections */}
      <div className="space-y-8">
        <ActiveResearchSection items={activeResearch} />
        <ValidationNeededSection items={pendingValidation} />
        <QuickInsightsSection insights={quickInsights} />
        <RecommendedActionsSection
          actions={recommendedActions}
          onNavigate={onNavigate}
        />
      </div>
      </div>
    </PageShell>
  );
}
