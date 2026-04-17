"use client";

import React, { useState } from "react";
import { ExternalLink, Heart, CalendarDays, Trash2 } from "lucide-react";
import { Button } from "@/components/shared";
import { deriveTrafficLight, TRAFFIC_LIGHT, getPhaseConfig, InlineRenameField } from "../shared/calendar-cards";
import { formatContentType } from "../../lib/format-content-type";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { QualityScoreBadge } from "./QualityScoreBadge";
import type { ContentLibraryItem } from "../../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

interface ContentCardGridProps {
  items: ContentLibraryItem[];
  onOpenInStudio: (deliverableId: string, campaignId: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete?: (deliverableId: string, campaignId: string) => void;
  onRename?: (deliverableId: string, campaignId: string, newTitle: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────

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
  onDelete,
  onRename,
}: ContentCardGridProps) {
  const selectedIds = useContentLibraryStore((s) => s.selectedIds);
  const toggleSelected = useContentLibraryStore((s) => s.toggleSelected);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; campaignId: string; title: string } | null>(null);

  return (
    <>
    {deleteTarget && (
      <DeleteConfirmModal
        title={deleteTarget.title}
        onConfirm={() => onDelete?.(deleteTarget.id, deleteTarget.campaignId)}
        onCancel={() => setDeleteTarget(null)}
      />
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        const { light, label: lightLabel } = deriveTrafficLight(
          item.isPublishReady,
          item.status,
          item.publishedAt ? "published" : item.scheduledPublishDate ? "scheduled" : "unscheduled",
        );
        const tl = TRAFFIC_LIGHT[light];

        return (
          <div
            key={item.id}
            className={`rounded-lg border overflow-hidden flex hover:shadow-sm transition-shadow ${isSelected ? "ring-2 ring-primary-500" : ""}`}
            style={{ backgroundColor: tl.bg, borderColor: tl.border }}
          >
            {/* Traffic light stripe */}
            <div
              className="w-1.5 flex-shrink-0"
              style={{ backgroundColor: tl.stripe }}
              aria-label={lightLabel}
            />

            <div className="flex-1 flex flex-col">
              <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Row 1: checkbox + campaign name + favorite + delete */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary-500 flex-shrink-0"
                    />
                    <span className="text-xs text-gray-500 truncate">{item.campaignName}</span>
                  </label>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Toggle favorite"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          item.isFavorite
                            ? "text-red-500 fill-red-500"
                            : "text-gray-400"
                        }`}
                      />
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: item.id, campaignId: item.campaignId, title: item.title }); }}
                        className="p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Title — inline editable when untitled */}
                {item.title.toLowerCase() === item.type.toLowerCase() && onRename ? (
                  <InlineRenameField
                    placeholder={`Untitled ${formatContentType(item.type)}`}
                    onRename={(t) => onRename(item.id, item.campaignId, t)}
                  />
                ) : (
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {item.title}
                  </h3>
                )}

                {/* Row 3: Phase pill */}
                {(() => {
                  const pc = getPhaseConfig(item.phase);
                  return pc ? (
                    <div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: pc.bg, color: pc.text }}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: pc.dot }} />
                        <span className="font-semibold">#{pc.order}</span>
                        {pc.label}
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* Row 4: Traffic light pill + Quality */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: `${tl.stripe}18`, color: tl.text }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tl.dot }}
                    />
                    {lightLabel}
                  </span>
                  {item.qualityScore !== null && (
                    <QualityScoreBadge score={item.qualityScore} size="sm" />
                  )}
                </div>

                {/* Readiness hint (red/amber only) */}
                {item.readinessHint && light !== "green" && (
                  <p className="text-[11px] font-medium" style={{ color: tl.text }}>
                    {item.readinessHint}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
                  {item.scheduledPublishDate && (
                    <span className="flex items-center gap-1 text-teal-600">
                      <CalendarDays className="w-3 h-3" />
                      {formatDate(item.scheduledPublishDate)}
                    </span>
                  )}
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
                  Open in Canvas
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

export default ContentCardGrid;
