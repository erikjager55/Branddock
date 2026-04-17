"use client";

import React, { useState } from "react";
import { ExternalLink, Heart, CalendarDays, Trash2 } from "lucide-react";
import { Badge } from "@/components/shared";
import { deriveTrafficLight, TRAFFIC_LIGHT, getPhaseConfig, InlineRenameField } from "../shared/calendar-cards";
import { formatContentType } from "../../lib/format-content-type";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import type { ContentLibraryItem } from "../../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

interface ContentCardListProps {
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
  });
}

// ─── Component ────────────────────────────────────────────

export function ContentCardList({
  items,
  onOpenInStudio,
  onToggleFavorite,
  onDelete,
  onRename,
}: ContentCardListProps) {
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table header */}
      <div
        className="gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider"
        style={{
          display: "grid",
          gridTemplateColumns: "6px 40px 1fr 100px 160px 110px 90px 80px 80px",
        }}
      >
        <div />
        <div />
        <div>Title</div>
        <div>Type</div>
        <div>Campaign</div>
        <div>Readiness</div>
        <div>Phase</div>
        <div>Scheduled</div>
        <div>Actions</div>
      </div>

      {/* Rows */}
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
            className={`gap-3 px-4 py-3 border-b border-gray-100 items-center hover:brightness-95 transition-all ${
              isSelected ? "ring-2 ring-inset ring-primary-400" : ""
            }`}
            style={{
              display: "grid",
              gridTemplateColumns: "6px 40px 1fr 100px 160px 110px 90px 80px 80px",
              backgroundColor: tl.bg,
            }}
          >
            {/* Traffic light stripe */}
            <div
              className="w-1.5 h-full rounded-full self-stretch"
              style={{ backgroundColor: tl.stripe }}
              title={lightLabel}
            />

            {/* Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelected(item.id)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary-500"
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
              {item.title.toLowerCase() === item.type.toLowerCase() && onRename ? (
                <InlineRenameField
                  placeholder={`Untitled ${formatContentType(item.type)}`}
                  onRename={(t) => onRename(item.id, item.campaignId, t)}
                />
              ) : (
                <span className="text-sm font-medium text-gray-900 truncate">
                  {item.title}
                </span>
              )}
            </div>

            {/* Type */}
            <div className="overflow-hidden">
              <Badge size="sm">{formatContentType(item.type)}</Badge>
            </div>

            {/* Campaign */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-gray-600 truncate">
                {item.campaignName}
              </span>
            </div>

            {/* Readiness (traffic light pill) */}
            <div className="overflow-hidden">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${tl.stripe}18`, color: tl.text }}
                title={item.readinessHint ?? lightLabel}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: tl.dot }}
                />
                {lightLabel}
              </span>
            </div>

            {/* Phase */}
            <div className="overflow-hidden">
              {(() => {
                const pc = getPhaseConfig(item.phase);
                return pc ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: pc.bg, color: pc.text }}
                  >
                    <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: pc.dot }} />
                    <span className="font-semibold">#{pc.order}</span>
                    {pc.label}
                  </span>
                ) : <span className="text-xs text-gray-400">—</span>;
              })()}
            </div>

            {/* Scheduled date */}
            <div className="overflow-hidden">
              {item.scheduledPublishDate ? (
                <span className="inline-flex items-center gap-1 text-xs text-teal-600">
                  <CalendarDays className="w-3 h-3" />
                  {formatDate(item.scheduledPublishDate)}
                </span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenInStudio(item.id, item.campaignId)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Canvas
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: item.id, campaignId: item.campaignId, title: item.title })}
                  className="p-1 rounded hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

export default ContentCardList;
