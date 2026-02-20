"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/shared";

// ─── Types ────────────────────────────────────────────────

interface ContentGroupHeaderProps {
  campaignName: string;
  campaignType: string;
  itemCount: number;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

// ─── Component ────────────────────────────────────────────

export function ContentGroupHeader({
  campaignName,
  campaignType,
  itemCount,
  isCollapsed: externalCollapsed,
  onToggle: externalToggle,
}: ContentGroupHeaderProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = externalCollapsed ?? internalCollapsed;
  const handleToggle =
    externalToggle ?? (() => setInternalCollapsed((prev) => !prev));

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex items-center gap-3 w-full py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
    >
      {isCollapsed ? (
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
      )}

      <span className="text-sm font-semibold text-gray-900">
        {campaignName}
      </span>

      <Badge
        variant={campaignType === "STRATEGIC" ? "teal" : "default"}
        size="sm"
      >
        {campaignType === "STRATEGIC" ? "Strategic" : "Quick"}
      </Badge>

      <span className="text-xs text-gray-500 ml-auto">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </span>
    </button>
  );
}

export default ContentGroupHeader;
