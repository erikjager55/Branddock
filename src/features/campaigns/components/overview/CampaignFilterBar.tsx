"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { SearchInput, Button } from "@/components/shared";
import { useCampaignStore } from "../../stores/useCampaignStore";

const FILTER_TABS = [
  { id: "all" as const, label: "All" },
  { id: "strategic" as const, label: "Strategic" },
  { id: "quick" as const, label: "Quick" },
  { id: "completed" as const, label: "Completed" },
];

export function CampaignFilterBar() {
  const { filterTab, setFilterTab, searchQuery, setSearchQuery, viewMode, setViewMode } = useCampaignStore();

  return (
    <div className="flex items-center gap-4">
      {/* Tabs */}
      <div data-testid="campaign-filter-tabs" className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            data-testid={`campaign-filter-${tab.id}`}
            onClick={() => setFilterTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filterTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div data-testid="campaign-search" className="flex-1">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search campaigns..."
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-1">
        <Button
          data-testid="campaign-view-grid"
          variant={viewMode === "grid" ? "primary" : "ghost"}
          size="sm"
          icon={LayoutGrid}
          onClick={() => setViewMode("grid")}
          className="!p-1.5"
        />
        <Button
          data-testid="campaign-view-list"
          variant={viewMode === "list" ? "primary" : "ghost"}
          size="sm"
          icon={List}
          onClick={() => setViewMode("list")}
          className="!p-1.5"
        />
      </div>
    </div>
  );
}
