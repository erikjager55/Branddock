"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { SearchInput, Button } from "@/components/shared";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";

const FILTER_TABS = [
  { id: "all" as const, label: "All" },
  { id: "IN_PROGRESS" as const, label: "In Progress" },
  { id: "COMPLETED" as const, label: "Complete" },
  { id: "favorites" as const, label: "Favorites" },
];

export function ContentFilterBar() {
  const search = useContentLibraryStore((s) => s.search);
  const setSearch = useContentLibraryStore((s) => s.setSearch);
  const statusFilter = useContentLibraryStore((s) => s.statusFilter);
  const setStatusFilter = useContentLibraryStore((s) => s.setStatusFilter);
  const showFavorites = useContentLibraryStore((s) => s.showFavorites);
  const setShowFavorites = useContentLibraryStore((s) => s.setShowFavorites);
  const viewMode = useContentLibraryStore((s) => s.viewMode);
  const setViewMode = useContentLibraryStore((s) => s.setViewMode);

  const activeTab = showFavorites ? "favorites" : (statusFilter || "all");

  const handleTabClick = (tabId: string) => {
    if (tabId === "favorites") {
      setShowFavorites(true);
      setStatusFilter(null);
    } else if (tabId === "all") {
      setShowFavorites(false);
      setStatusFilter(null);
    } else {
      setShowFavorites(false);
      setStatusFilter(tabId);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex-1">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search content..."
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-1">
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
      </div>
    </div>
  );
}

export default ContentFilterBar;
