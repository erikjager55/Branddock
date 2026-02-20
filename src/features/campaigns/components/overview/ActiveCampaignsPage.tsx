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
import { QuickContentModal } from "../quick/QuickContentModal";
import { useCampaigns, useDeleteCampaign, useArchiveCampaign } from "../../hooks";
import { useCampaignStore } from "../../stores/useCampaignStore";
import type { CampaignListParams, CampaignSummary } from "@/types/campaign";

interface ActiveCampaignsPageProps {
  onNavigateToCampaign: (campaignId: string) => void;
  onNavigateToQuickDetail?: (campaignId: string) => void;
  onNavigateToWizard?: () => void;
}

export function ActiveCampaignsPage({
  onNavigateToCampaign,
  onNavigateToQuickDetail,
  onNavigateToWizard,
}: ActiveCampaignsPageProps) {
  const { setActiveSection } = useUIState();
  const {
    filterTab,
    searchQuery,
    viewMode,
    openQuickModal,
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

  const handleQuickCreated = (campaignId: string) => {
    if (onNavigateToQuickDetail) {
      onNavigateToQuickDetail(campaignId);
    } else {
      onNavigateToCampaign(campaignId);
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
            <Button data-testid="quick-content-button" variant="secondary" onClick={openQuickModal} className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Content
            </Button>
            <Button data-testid="new-campaign-button" onClick={() => onNavigateToWizard?.()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
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

      {/* Quick Content Modal */}
      <QuickContentModal onCreated={handleQuickCreated} />
    </PageShell>
  );
}
