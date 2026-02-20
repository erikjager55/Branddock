"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";

// ─── Component ────────────────────────────────────────────

export function ContentViewToggle() {
  const viewMode = useContentLibraryStore((s) => s.viewMode);
  const setViewMode = useContentLibraryStore((s) => s.setViewMode);

  return (
    <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setViewMode("grid")}
        className={`p-1.5 transition-colors ${
          viewMode === "grid"
            ? "bg-gray-200 text-gray-900"
            : "bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        }`}
        title="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode("list")}
        className={`p-1.5 transition-colors ${
          viewMode === "list"
            ? "bg-gray-200 text-gray-900"
            : "bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        }`}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ContentViewToggle;
