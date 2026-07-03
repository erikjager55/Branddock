"use client";

import React, { useMemo } from "react";
import { Calendar, LayoutGrid, List, ArrowUpDown, GanttChartSquare, FileText, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SearchInput, Button, Select } from "@/components/shared";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import type { ContentLibrarySort } from "../../types/content-library.types";

export function ContentFilterBar() {
  const { t } = useTranslation("campaigns-content-library");
  const SORT_OPTIONS = useMemo<{ value: ContentLibrarySort; label: string }[]>(
    () => [
      { value: "-updatedAt", label: t("filterBar.sort.newest") },
      { value: "updatedAt", label: t("filterBar.sort.oldest") },
      { value: "-createdAt", label: t("filterBar.sort.recentlyCreated") },
      { value: "title", label: t("filterBar.sort.nameAsc") },
      { value: "-title", label: t("filterBar.sort.nameDesc") },
      { value: "-qualityScore", label: t("filterBar.sort.qualityHigh") },
      { value: "qualityScore", label: t("filterBar.sort.qualityLow") },
      { value: "scheduledPublishDate", label: t("filterBar.sort.scheduledEarliest") },
      { value: "-scheduledPublishDate", label: t("filterBar.sort.scheduledLatest") },
    ],
    [t],
  );
  const search = useContentLibraryStore((s) => s.search);
  const setSearch = useContentLibraryStore((s) => s.setSearch);
  const viewMode = useContentLibraryStore((s) => s.viewMode);
  const setViewMode = useContentLibraryStore((s) => s.setViewMode);
  const sort = useContentLibraryStore((s) => s.sort);
  const setSort = useContentLibraryStore((s) => s.setSort);
  const campaigns = useContentLibraryStore((s) => s.filters.campaigns);
  const campaignSubTab = useContentLibraryStore((s) => s.campaignSubTab);
  const setCampaignSubTab = useContentLibraryStore((s) => s.setCampaignSubTab);
  const inCampaignMode = campaigns.length === 1;

  return (
    <div className="flex items-center gap-3">
      {/* Content / Strategy toggle — only in single-campaign mode */}
      {inCampaignMode && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setCampaignSubTab("content")}
            aria-pressed={campaignSubTab === "content"}
            style={{ padding: "6px 10px" }}
            className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-md transition-colors ${
              campaignSubTab === "content"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            {t("filterBar.content")}
          </button>
          <button
            type="button"
            onClick={() => setCampaignSubTab("strategy")}
            aria-pressed={campaignSubTab === "strategy"}
            style={{ padding: "6px 10px" }}
            className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-md transition-colors ${
              campaignSubTab === "strategy"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            {t("filterBar.strategy")}
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex-1 min-w-[160px]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("filterBar.searchPlaceholder")}
        />
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
        <Select
          value={sort}
          onChange={(v) => setSort(v as ContentLibrarySort)}
          options={SORT_OPTIONS}
          className="!w-44 !py-1.5 !text-xs"
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-1 flex-shrink-0">
        <Button
          variant={viewMode === "grid" ? "primary" : "ghost"}
          size="sm"
          icon={LayoutGrid}
          onClick={() => setViewMode("grid")}
          className="!p-1.5"
        />
        <Button
          variant={viewMode === "list" ? "primary" : "ghost"}
          size="sm"
          icon={List}
          onClick={() => setViewMode("list")}
          className="!p-1.5"
        />
        <Button
          variant={viewMode === "calendar" ? "primary" : "ghost"}
          size="sm"
          icon={Calendar}
          onClick={() => setViewMode("calendar")}
          className="!p-1.5"
        />
        <Button
          variant={viewMode === "timeline" ? "primary" : "ghost"}
          size="sm"
          icon={GanttChartSquare}
          onClick={() => setViewMode("timeline")}
          className="!p-1.5"
          title={t("filterBar.timeline")}
        />
      </div>
    </div>
  );
}

export default ContentFilterBar;
