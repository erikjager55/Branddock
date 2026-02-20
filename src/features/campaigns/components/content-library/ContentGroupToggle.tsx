"use client";

import React from "react";
import { Layers, LayoutGrid } from "lucide-react";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";

// ─── Component ────────────────────────────────────────────

export function ContentGroupToggle() {
  const groupByCampaign = useContentLibraryStore((s) => s.groupByCampaign);
  const toggleGroupByCampaign = useContentLibraryStore(
    (s) => s.toggleGroupByCampaign,
  );

  return (
    <button
      type="button"
      onClick={toggleGroupByCampaign}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        groupByCampaign
          ? "bg-teal-50 text-teal-700 border border-teal-200"
          : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
      }`}
      title={groupByCampaign ? "Ungroup items" : "Group by campaign"}
    >
      {groupByCampaign ? (
        <Layers className="w-3.5 h-3.5" />
      ) : (
        <LayoutGrid className="w-3.5 h-3.5" />
      )}
      <span>{groupByCampaign ? "Grouped" : "Group"}</span>
    </button>
  );
}

export default ContentGroupToggle;
