"use client";

import React from "react";
import { ExternalLink, Heart, FileText, Clock } from "lucide-react";
import { Card, Badge, Button } from "@/components/shared";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { QualityScoreBadge } from "./QualityScoreBadge";
import type { ContentLibraryItem } from "../../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

interface ContentCardGridProps {
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
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────

export function ContentCardGrid({
  items,
  onOpenInStudio,
  onToggleFavorite,
}: ContentCardGridProps) {
  const selectedIds = useContentLibraryStore((s) => s.selectedIds);
  const toggleSelected = useContentLibraryStore((s) => s.toggleSelected);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const statusInfo = STATUS_MAP[item.status];
        const isSelected = selectedIds.includes(item.id);

        return (
          <Card
            key={item.id}
            hoverable
            padding="none"
            className={`flex flex-col ${isSelected ? "ring-2 ring-teal-500" : ""}`}
          >
            <div className="p-4 flex flex-col gap-3 flex-1">
              {/* Top row: checkbox + favorite */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(item.id)}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <Badge size="sm">{item.type}</Badge>
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      item.isFavorite
                        ? "text-red-500 fill-red-500"
                        : "text-gray-400"
                    }`}
                  />
                </button>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                {item.title}
              </h3>

              {/* Campaign info */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 truncate">
                  {item.campaignName}
                </span>
                <Badge
                  variant={
                    item.campaignType === "STRATEGIC" ? "teal" : "default"
                  }
                  size="sm"
                >
                  {item.campaignType === "STRATEGIC" ? "Strategic" : "Quick"}
                </Badge>
              </div>

              {/* Status + Quality */}
              <div className="flex items-center gap-2">
                <Badge variant={statusInfo.variant} size="sm" dot>
                  {statusInfo.label}
                </Badge>
                <QualityScoreBadge score={item.qualityScore} size="sm" />
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
                {item.wordCount !== null && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {item.wordCount.toLocaleString()} words
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(item.updatedAt)}
                </span>
              </div>
            </div>

            {/* Footer action */}
            <div className="px-4 pb-4">
              <Button
                variant="ghost"
                size="sm"
                icon={ExternalLink}
                onClick={() => onOpenInStudio(item.id, item.campaignId)}
                fullWidth
              >
                Open in Studio
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default ContentCardGrid;
