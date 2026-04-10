"use client";

import React, { useMemo, useState } from "react";
import { Plus, Zap } from "lucide-react";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { Button } from "@/components/shared";
import { CampaignStatsCards } from "./CampaignStatsCards";
import { CampaignFilterBar } from "./CampaignFilterBar";
import { CampaignGrid } from "./CampaignGrid";
import { CampaignList } from "./CampaignList";
import { DraftCampaignsList } from "./DraftCampaignsList";
import { DraftPickerModal } from "./DraftPickerModal";
import {
  useCampaigns,
  useDeleteCampaign,
  useArchiveCampaign,
  useDraftCampaigns,
  useArchiveDraft,
  loadDraftForResume,
} from "../../hooks";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { useEnsureWizardWorkspace } from "../../hooks/useEnsureWizardWorkspace";
import type { CampaignListParams } from "@/types/campaign";

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
  // Defense-in-depth alongside clearAllStorage on workspace switch.
  useEnsureWizardWorkspace();

  // DB-backed drafts (Fase 2) — STRATEGIC only. CONTENT drafts belong to
  // the Content Library page; see ContentLibraryPage for that list.
  const { data: draftsData } = useDraftCampaigns('STRATEGIC');
  const archiveDraftMutation = useArchiveDraft();
  const drafts = draftsData?.drafts ?? [];
  const draftLimit = draftsData?.limit ?? 5;
  const draftCount = drafts.length;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);

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

  // ─── Draft handlers ───────────────────────────────────────

  /**
   * Loads a draft's full state from the server, hydrates the wizard store,
   * and navigates to the wizard. Used by both the inline DraftCampaignsList
   * (direct click) and the DraftPickerModal (when user came via New Campaign).
   */
  const handleResumeDraft = async (id: string) => {
    setBusyDraftId(id);
    try {
      const data = await loadDraftForResume(id);
      useCampaignWizardStore.getState().loadDraft({
        campaignId: data.campaignId,
        wizardState: data.wizardState,
        wizardStep: data.wizardStep,
        lastSavedAt: data.wizardLastSavedAt,
      });
      setPickerOpen(false);
      onResumeWizard?.();
    } catch (error) {
      console.error("[handleResumeDraft] failed to resume draft:", error);
      // Leave the user on the overview; they can try again. A toast system
      // would be a nice enhancement but is out of scope for this sprint.
    } finally {
      setBusyDraftId(null);
    }
  };

  const handleArchiveDraft = (id: string) => {
    archiveDraftMutation.mutate(id);
  };

  const handleStartNewCampaign = () => {
    setPickerOpen(false);
    onNavigateToWizard?.();
  };

  const handleNewCampaignClick = () => {
    if (draftCount === 0) {
      // No drafts — start fresh directly, skip the picker.
      onNavigateToWizard?.();
      return;
    }
    setPickerOpen(true);
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
            <Button data-testid="new-campaign-button" onClick={handleNewCampaignClick} className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
              {draftCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold">
                  {draftCount}
                </span>
              )}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Draft campaigns list — DB-backed (Fase 2) */}
        <DraftCampaignsList
          drafts={drafts}
          limit={draftLimit}
          onResume={handleResumeDraft}
          onArchive={handleArchiveDraft}
          busyDraftId={busyDraftId}
        />

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

      <DraftPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        drafts={drafts}
        limit={draftLimit}
        onResume={handleResumeDraft}
        onArchive={handleArchiveDraft}
        onStartNew={handleStartNewCampaign}
        busyDraftId={busyDraftId}
      />
    </PageShell>
  );
}
