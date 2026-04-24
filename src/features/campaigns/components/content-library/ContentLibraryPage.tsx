"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Library, Plus, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AddContentModal } from "../shared/AddContentModal";
import { EmptyState, SkeletonCard, Button } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { useContentLibrary } from "../../hooks";
import { useContentLibraryStats } from "../../hooks";
import { useToggleContentFavorite } from "../../hooks";
import {
  useDraftCampaigns,
  useArchiveDraft,
  loadDraftForResume,
} from "../../hooks";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";
import { groupByCampaign } from "../../lib/group-by-campaign";
import type { ContentLibraryParams } from "../../types/content-library.types";
import { ContentStatsCards } from "./ContentStatsCards";
import { ContentFilterBar } from "./ContentFilterBar";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { ContentFiltersPanel } from "./ContentFiltersPopover";
import { ContentCardGrid } from "./ContentCardGrid";
import { ContentCardList } from "./ContentCardList";
import { ContentGroupHeader } from "./ContentGroupHeader";
import { ContentLibraryCalendarView } from "./ContentLibraryCalendarView";
import { ContentLibraryTimelineView } from "./ContentLibraryTimelineView";
import { ContentLibraryCampaignMode } from "./ContentLibraryCampaignMode";
import { DraftCampaignsList } from "../overview/DraftCampaignsList";

// ─── Types ────────────────────────────────────────────────

interface ContentLibraryPageProps {
  onNavigate: (section: string) => void;
}

// ─── Component ────────────────────────────────────────────

export function ContentLibraryPage({ onNavigate }: ContentLibraryPageProps) {
  // DB-backed drafts — CONTENT only. STRATEGIC drafts belong to the
  // Campaigns page (see ActiveCampaignsPage for that list).
  const { data: draftsData } = useDraftCampaigns("CONTENT");
  const archiveDraftMutation = useArchiveDraft();
  const drafts = draftsData?.drafts ?? [];
  const draftLimit = draftsData?.limit ?? 5;
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);

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
      // loadDraft restores wizardMode from the snapshot, so the wizard
      // opens in the content stepper automatically.
      onNavigate("campaign-wizard");
    } catch (error) {
      console.error("[ContentLibraryPage] failed to resume draft:", error);
    } finally {
      setBusyDraftId(null);
    }
  };

  const handleArchiveDraft = (id: string) => {
    archiveDraftMutation.mutate(id);
  };

  const search = useContentLibraryStore((s) => s.search);
  const statusFilter = useContentLibraryStore((s) => s.statusFilter);
  const sort = useContentLibraryStore((s) => s.sort);
  const viewMode = useContentLibraryStore((s) => s.viewMode);
  const isGrouped = useContentLibraryStore((s) => s.groupByCampaign);
  const showFavorites = useContentLibraryStore((s) => s.showFavorites);
  const filters = useContentLibraryStore((s) => s.filters);
  const campaignSubTab = useContentLibraryStore((s) => s.campaignSubTab);

  // Campaign mode: when a single campaign is filtered, the page transforms
  // into the campaign-detail view — same deliverable rendering, plus
  // campaign header, stats and actions.
  const activeCampaignId = filters.campaigns.length === 1 ? filters.campaigns[0] : null;
  // Hide filter bar + deliverable rendering when viewing Strategy / Channel Plan sub-tabs.
  const showDeliverables = !activeCampaignId || campaignSubTab === "content";

  // Build params from store filters
  const params: ContentLibraryParams = useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter || undefined,
      sort: sort || undefined,
      favorites: showFavorites || undefined,
      groupByCampaign: isGrouped || undefined,
      // Advanced filters
      types: filters.types.length ? filters.types : undefined,
      campaigns: filters.campaigns.length ? filters.campaigns : undefined,
      campaignTypes: filters.campaignTypes.length ? filters.campaignTypes : undefined,
      phases: filters.phases.length ? filters.phases : undefined,
      readiness: filters.readiness.length ? filters.readiness : undefined,
      readinessHints: filters.readinessHints.length ? filters.readinessHints : undefined,
      scheduledFrom: filters.scheduledFrom ?? undefined,
      scheduledTo: filters.scheduledTo ?? undefined,
      qualityMin: filters.qualityMin ?? undefined,
    }),
    [search, statusFilter, sort, showFavorites, isGrouped, filters],
  );

  const { data: items, isLoading } = useContentLibrary(params);
  const { data: stats, isLoading: isStatsLoading } = useContentLibraryStats();
  const toggleFavorite = useToggleContentFavorite();

  // Group tracking for collapsible headers
  const [showAddContentModal, setShowAddContentModal] = useState(false);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const toggleGroupCollapse = (campaignId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const groups = useMemo(() => {
    if (!items || !isGrouped) return null;
    return groupByCampaign(items);
  }, [items, isGrouped]);

  const handleOpenInStudio = (deliverableId: string, campaignId: string) => {
    useCampaignStore.getState().setSelectedCampaignId(campaignId);
    useCampaignStore.getState().setSelectedDeliverableId(deliverableId);
    onNavigate("content-canvas");
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite.mutate(id);
  };

  const qc = useQueryClient();
  const handleDeleteContent = useCallback(async (deliverableId: string, campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/deliverables/${deliverableId}`, { method: 'DELETE' });
      if (!res.ok) return;
      qc.invalidateQueries({ queryKey: ['content-library'] });
    } catch { /* silent */ }
  }, [qc]);

  const handleRenameContent = useCallback(async (deliverableId: string, campaignId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/deliverables/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) return;
      qc.invalidateQueries({ queryKey: ['content-library'] });
    } catch { /* silent */ }
  }, [qc]);

  // ── Render ──

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <EmptyState
          icon={Library}
          title="No content found"
          description="Create content to start generating, or adjust your filters."
          action={{
            label: "Create Content",
            onClick: () => setShowAddContentModal(true),
          }}
        />
      );
    }

    // Calendar view (overrides grouped + flat)
    if (viewMode === "calendar") {
      return (
        <ContentLibraryCalendarView
          items={items}
          onOpenItem={handleOpenInStudio}
          onDeleteItem={handleDeleteContent}
          onRenameItem={handleRenameContent}
        />
      );
    }

    // Timeline view — horizontal swimlanes with Group-By
    if (viewMode === "timeline") {
      return (
        <ContentLibraryTimelineView
          items={items}
          campaignId={activeCampaignId}
          onOpenItem={handleOpenInStudio}
          onDeleteItem={handleDeleteContent}
          onRenameItem={handleRenameContent}
        />
      );
    }

    // Grouped view
    if (isGrouped && groups) {
      return (
        <div className="space-y-4">
          {groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.campaignId);

            return (
              <div key={group.campaignId} className="space-y-3">
                <ContentGroupHeader
                  campaignName={group.campaignName}
                  campaignType={group.campaignType}
                  itemCount={group.items.length}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleGroupCollapse(group.campaignId)}
                />

                {!isCollapsed &&
                  (viewMode === "grid" ? (
                    <ContentCardGrid
                      items={group.items}
                      onOpenInStudio={handleOpenInStudio}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDeleteContent}
                      onRename={handleRenameContent}
                    />
                  ) : (
                    <ContentCardList
                      items={group.items}
                      onOpenInStudio={handleOpenInStudio}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={handleDeleteContent}
                      onRename={handleRenameContent}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      );
    }

    // Flat view
    if (viewMode === "grid") {
      return (
        <ContentCardGrid
          items={items}
          onOpenInStudio={handleOpenInStudio}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDeleteContent}
          onRename={handleRenameContent}
        />
      );
    }

    return (
      <ContentCardList
        items={items}
        onOpenInStudio={handleOpenInStudio}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteContent}
        onRename={handleRenameContent}
      />
    );
  };

  return (
    <PageShell>
      {/* Hide workspace-level PageHeader when in campaign mode — the
          campaign header below takes over. */}
      {!activeCampaignId && (
        <PageHeader
          moduleKey="content-library"
          title="Content"
          subtitle="Browse and manage all your generated content"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => onNavigate('active-campaigns')} className="gap-2">
                <Zap className="h-4 w-4" />
                View Campaigns
              </Button>
              <Button data-testid="create-content-button" onClick={() => setShowAddContentModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Content
              </Button>
            </div>
          }
        />
      )}

      <div className="space-y-6">
        {activeCampaignId ? (
          <ContentLibraryCampaignMode
            campaignId={activeCampaignId}
            onOpenInCanvas={handleOpenInStudio}
          />
        ) : (
          <>
            {/* Draft content list — DB-backed (Fase 2), CONTENT-typed only */}
            <DraftCampaignsList
              drafts={drafts}
              limit={draftLimit}
              onResume={handleResumeDraft}
              onArchive={handleArchiveDraft}
              busyDraftId={busyDraftId}
            />

            <ContentStatsCards stats={stats} isLoading={isStatsLoading} />
          </>
        )}

        {/* ContentFilterBar is ALWAYS visible in campaign mode — it hosts the
            Content/Strategy toggle itself, so hiding it would trap the user on
            the Strategy tab with no way back to Content. */}
        <ContentFilterBar />

        {showDeliverables && (
          <>
            {/* Filter panel + active-filter chips visually belong together.
                Wrap them in a tight space-y-1 so there's no space-y-6 gap
                breaking up the filter area. */}
            <div className="space-y-1">
              <ContentFiltersPanel />
              <ActiveFilterChips />
            </div>

            {renderContent()}
          </>
        )}
      </div>

      <AddContentModal
        isOpen={showAddContentModal}
        onClose={() => setShowAddContentModal(false)}
        onSelectCampaign={(cid) => {
          setShowAddContentModal(false);
          useCampaignStore.getState().setSelectedCampaignId(cid);
          onNavigate("campaign-detail");
        }}
        onStartWizard={(formatName) => {
          setShowAddContentModal(false);
          const store = useCampaignWizardStore.getState();
          store.setWizardMode('content');
          store.setName(formatName);
          onNavigate('campaign-wizard');
        }}
      />
    </PageShell>
  );
}

export default ContentLibraryPage;
