"use client";

import React, { useMemo } from "react";
import { Plus, Zap } from "lucide-react";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { Button } from "@/components/shared";
import { useUIState } from "@/contexts/UIStateContext";
import { CampaignStatsCards } from "./CampaignStatsCards";
import { CampaignFilterBar } from "./CampaignFilterBar";
import { CampaignGrid } from "./CampaignGrid";
import { CampaignList } from "./CampaignList";
import { useCampaigns, useDeleteCampaign, useArchiveCampaign } from "../../hooks";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useEnsureWizardWorkspace } from "../../hooks/useEnsureWizardWorkspace";
import type { CampaignListParams, CampaignSummary } from "@/types/campaign";

interface ActiveCampaignsPageProps {
  onNavigateToCampaign: (campaignId: string) => void;
  onNavigateToQuickDetail?: (campaignId: string) => void;
  onNavigateToWizard?: () => void;
  onNavigateToContentWizard?: () => void;
  onResumeWizard?: () => void;
}

export function ActiveCampaignsPage({
  onNavigateToCampaign,
  onNavigateToQuickDetail,
  onNavigateToWizard,
  onNavigateToContentWizard,
  onResumeWizard,
}: ActiveCampaignsPageProps) {
  // Reset persisted wizard state if it belongs to a different workspace.
  // The DraftCampaignBanner reads name + currentStep from the wizard store, so
  // without this check it would render a draft from a previously active workspace.
  useEnsureWizardWorkspace();

  const { setActiveSection } = useUIState();
  const {
    filterTab,
    searchQuery,
    viewMode,
  } = useCampaignStore();

  // Build API params from store state
  const params: CampaignListParams = useMemo(() => {
    const p: CampaignListParams = {};
    if (filterTab === "strategic") p.type = "STRATEGIC";
    else if (filterTab === "quick") p.type = "QUICK";
    if (filterTab === "completed") p.status = "COMPLETED";
    if (searchQuery) p.search = searchQuery;
    return p;
  }, [filterTab, searchQuery]);

  const { data, isLoading } = useCampaigns(params);
  const deleteCampaign = useDeleteCampaign();
  const archiveCampaign = useArchiveCampaign();

  const campaigns = data?.campaigns ?? [];
  const stats = data?.stats;

  const handleCampaignClick = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (campaign?.type === "QUICK" && onNavigateToQuickDetail) {
      onNavigateToQuickDetail(id);
    } else {
      onNavigateToCampaign(id);
    }
  };

  const handleConvert = (id: string) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (campaign) {
      useCampaignStore.getState().openConvertModal();
      useCampaignStore.getState().setSelectedCampaignId(id);
    }
  };


  return (
    <PageShell>
      <PageHeader
        moduleKey="campaigns"
        title="Campaigns"
        subtitle="Plan, create, and manage your campaigns"
        actions={
          <div className="flex items-center gap-3">
            <Button data-testid="create-content-button" variant="secondary" onClick={() => onNavigateToContentWizard?.()} className="gap-2">
              <Zap className="h-4 w-4" />
              Create Content
            </Button>
            <Button data-testid="new-campaign-button" onClick={() => onNavigateToWizard?.()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Draft campaign banner */}
        <DraftCampaignBanner onResume={() => onResumeWizard?.()} />

        {/* Stats */}
        <CampaignStatsCards stats={stats} isLoading={isLoading} />

        {/* Filters */}
        <CampaignFilterBar />

        {/* Grid / List */}
        {viewMode === "grid" ? (
            <CampaignGrid
            campaigns={campaigns}
            isLoading={isLoading}
            onCampaignClick={handleCampaignClick}
            onArchive={(id) => archiveCampaign.mutate(id)}
            onDelete={(id) => deleteCampaign.mutate(id)}
            onConvert={handleConvert}
          />
        ) : (
          <CampaignList
            campaigns={campaigns}
            isLoading={isLoading}
            onCampaignClick={handleCampaignClick}
            onArchive={(id) => archiveCampaign.mutate(id)}
            onDelete={(id) => deleteCampaign.mutate(id)}
            onConvert={handleConvert}
          />
        )}
      </div>

    </PageShell>
  );
}

// ─── Draft Campaign Banner ─────────────────────────────────

import { ArrowRight, FileEdit, X } from "lucide-react";

function DraftCampaignBanner({ onResume }: { onResume: () => void }) {
  const name = useCampaignWizardStore((s) => s.name);
  const currentStep = useCampaignWizardStore((s) => s.currentStep);
  const resetWizard = useCampaignWizardStore((s) => s.resetWizard);

  // Only show if there's an in-progress wizard (name filled in or past step 1)
  if (!name && currentStep <= 1) return null;

  const STEP_LABELS = ['Setup', 'Knowledge', 'Strategy', 'Concept', 'Deliverables', 'Review'];
  const stepLabel = STEP_LABELS[currentStep - 1] ?? `Step ${currentStep}`;

  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <FileEdit className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            Draft in progress: {name || 'Untitled Campaign'}
          </p>
          <p className="text-xs text-muted-foreground">
            Currently at step {currentStep} ({stepLabel})
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resetWizard}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </button>
        <Button size="sm" onClick={onResume} className="gap-1.5">
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
