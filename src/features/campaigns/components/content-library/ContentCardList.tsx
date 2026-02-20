"use client";

import React from "react";
import { ExternalLink, Heart } from "lucide-react";
import { Badge } from "@/components/shared";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { QualityScoreBadge } from "./QualityScoreBadge";
import type { ContentLibraryItem } from "../../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

interface ContentCardListProps {
  items: ContentLibraryItem[];
  onOpenInStudio: (deliverableId: string, campaignId: string) => void;
  onToggleFavorite: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────

const STATUS_MAP: Record<
  ContentLibraryItem["status"],
  { label: string; variant: "default" | "warning" | "success" }
> = {
  NOT_STARTED: { label: "Not Started", variant: "default" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────

export function ContentCardList({
  items,
  onOpenInStudio,
  onToggleFavorite,
}: ContentCardListProps) {
  const selectedIds = useContentLibraryStore((s) => s.selectedIds);
  const toggleSelected = useContentLibraryStore((s) => s.toggleSelected);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_100px_160px_100px_80px_80px_80px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div />
        <div>Title</div>
        <div>Type</div>
        <div>Campaign</div>
        <div>Status</div>
        <div>Quality</div>
        <div>Updated</div>
        <div>Actions</div>
      </div>

      {/* Rows */}
      {items.map((item) => {
        const statusInfo = STATUS_MAP[item.status];
        const isSelected = selectedIds.includes(item.id);

        return (
          <div
            key={item.id}
            className={`grid grid-cols-[40px_1fr_100px_160px_100px_80px_80px_80px] gap-3 px-4 py-3 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors ${
              isSelected ? "bg-teal-50/50" : ""
            }`}
          >
            {/* Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelected(item.id)}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
            </div>

            {/* Title + favorite */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => onToggleFavorite(item.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    item.isFavorite
                      ? "text-red-500 fill-red-500"
                      : "text-gray-300"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-900 truncate">
                {item.title}
              </span>
            </div>

            {/* Type */}
            <div>
              <Badge size="sm">{item.type}</Badge>
            </div>

            {/* Campaign */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-gray-600 truncate">
                {item.campaignName}
              </span>
              <Badge
                variant={
                  item.campaignType === "STRATEGIC" ? "teal" : "default"
                }
                size="sm"
              >
                {item.campaignType === "STRATEGIC" ? "S" : "Q"}
              </Badge>
            </div>

            {/* Status */}
            <div>
              <Badge variant={statusInfo.variant} size="sm" dot>
                {statusInfo.label}
              </Badge>
            </div>

            {/* Quality */}
            <div>
              <QualityScoreBadge score={item.qualityScore} size="sm" />
            </div>

            {/* Updated */}
            <div className="text-xs text-gray-500">
              {formatDate(item.updatedAt)}
            </div>

            {/* Actions */}
            <div>
              <button
                type="button"
                onClick={() => onOpenInStudio(item.id, item.campaignId)}
                className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Studio
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ContentCardList;
