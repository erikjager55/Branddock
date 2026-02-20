"use client";

import React, { useMemo, useState } from "react";
import { Library, Plus } from "lucide-react";
import { EmptyState, SkeletonCard, Button } from "@/components/shared";
import { PageShell, PageHeader } from "@/components/ui/layout";
import { useContentLibrary } from "../../hooks";
import { useContentLibraryStats } from "../../hooks";
import { useToggleContentFavorite } from "../../hooks";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { useCampaignStore } from "../../stores/useCampaignStore";
import { groupByCampaign } from "../../lib/group-by-campaign";
import type { ContentLibraryParams } from "../../types/content-library.types";
import { ContentStatsCards } from "./ContentStatsCards";
import { ContentFilterBar } from "./ContentFilterBar";
import { ContentCardGrid } from "./ContentCardGrid";
import { ContentCardList } from "./ContentCardList";
import { ContentGroupHeader } from "./ContentGroupHeader";

// ─── Types ────────────────────────────────────────────────

interface ContentLibraryPageProps {
  onNavigate: (section: string) => void;
}

// ─── Component ────────────────────────────────────────────

export function ContentLibraryPage({ onNavigate }: ContentLibraryPageProps) {
  const search = useContentLibraryStore((s) => s.search);
  const typeFilter = useContentLibraryStore((s) => s.typeFilter);
  const campaignFilter = useContentLibraryStore((s) => s.campaignFilter);
  const statusFilter = useContentLibraryStore((s) => s.statusFilter);
  const sort = useContentLibraryStore((s) => s.sort);
  const viewMode = useContentLibraryStore((s) => s.viewMode);
  const isGrouped = useContentLibraryStore((s) => s.groupByCampaign);
  const showFavorites = useContentLibraryStore((s) => s.showFavorites);

  // Build params from store filters
  const params: ContentLibraryParams = useMemo(
    () => ({
      search: search || undefined,
      type: typeFilter || undefined,
      campaignType: campaignFilter || undefined,
      status: statusFilter || undefined,
      sort: sort || undefined,
      favorites: showFavorites || undefined,
      groupByCampaign: isGrouped || undefined,
    }),
    [search, typeFilter, campaignFilter, statusFilter, sort, showFavorites, isGrouped],
  );

  const { data: items, isLoading } = useContentLibrary(params);
  const { data: stats, isLoading: isStatsLoading } = useContentLibraryStats();
  const toggleFavorite = useToggleContentFavorite();

  // Group tracking for collapsible headers
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
    onNavigate("content-studio");
  };

  const handleToggleFavorite = (id: string) => {
    toggleFavorite.mutate(id);
  };

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
          description="Create a campaign to start generating content, or adjust your filters."
          action={{
            label: "Create Campaign",
            onClick: () => onNavigate("campaign-wizard"),
          }}
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
                    />
                  ) : (
                    <ContentCardList
                      items={group.items}
                      onOpenInStudio={handleOpenInStudio}
                      onToggleFavorite={handleToggleFavorite}
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
        />
      );
    }

    return (
      <ContentCardList
        items={items}
        onOpenInStudio={handleOpenInStudio}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  };

  return (
    <PageShell>
      <PageHeader
        moduleKey="content-library"
        title="Content Library"
        subtitle="All your campaign content in one place"
        actions={
          <Button data-testid="create-content-button" onClick={() => onNavigate('campaign-wizard')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Content
          </Button>
        }
      />

      <div className="space-y-6">
        <ContentStatsCards stats={stats} isLoading={isStatsLoading} />

        <ContentFilterBar />

        {renderContent()}
      </div>
    </PageShell>
  );
}

export default ContentLibraryPage;
