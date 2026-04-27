"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Heart, CalendarDays, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/shared";
import { deriveTrafficLight, TRAFFIC_LIGHT, getPhaseConfig, InlineRenameField } from "../shared/calendar-cards";
import { formatContentType } from "../../lib/format-content-type";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { QualityScoreBadge } from "./QualityScoreBadge";
import { QuickPublishMenu } from "./QuickPublishMenu";
import { sameTimeAsLast } from "../../lib/publish-scheduler";
import type { ContentLibraryItem } from "../../types/content-library.types";

// ─── Types ────────────────────────────────────────────────

interface ContentCardGridProps {
  items: ContentLibraryItem[];
  onOpenInStudio: (deliverableId: string, campaignId: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete?: (deliverableId: string, campaignId: string) => void;
  onRename?: (deliverableId: string, campaignId: string, newTitle: string) => void;
  /** Duplicate the deliverable and open the copy in Canvas (Sprint B · Step 1). */
  onDuplicate?: (deliverableId: string, campaignId: string) => void;
  /** Set of deliverable IDs currently being duplicated — disables the button. */
  duplicatingIds?: Set<string>;
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
  onDuplicate,
  duplicatingIds,
}: ContentCardGridProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; campaignId: string; title: string } | null>(null);

  // Precomputed once per render — the "Schedule same as last" action
  // reads this to propose a sensible default; null when nothing is scheduled.
  const sameAsLastDate = useMemo(() => sameTimeAsLast(items), [items]);

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
        const { light, label: lightLabel } = deriveTrafficLight(
          item.isPublishReady,
          item.status,
          item.publishedAt ? "published" : item.scheduledPublishDate ? "scheduled" : "unscheduled",
          item.hasContent,
        );
        const tl = TRAFFIC_LIGHT[light];

        return (
          <div
            key={item.id}
            className="rounded-lg border overflow-hidden flex hover:shadow-sm transition-shadow"
            style={{ backgroundColor: tl.bg, borderColor: tl.border }}
          >
            {/* Traffic light stripe */}
            <div
              className="w-1.5 flex-shrink-0"
              style={{ backgroundColor: tl.stripe }}
              aria-label={lightLabel}
            />

            <div className="flex-1 flex flex-col">
              <div className="pl-4 pr-5 py-4 flex flex-col gap-3 flex-1">
                {/* Row 1: campaign name + favorite + delete */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate min-w-0">{item.campaignName}</span>
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
                    {onDuplicate && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDuplicate(item.id, item.campaignId); }}
                        disabled={duplicatingIds?.has(item.id)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                      </button>
                    )}
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

                {/* Row 2: Title — inline editable */}
                {onRename ? (
                  <InlineRenameField
                    placeholder={`Untitled ${formatContentType(item.type)}`}
                    currentValue={item.title.toLowerCase() === item.type.toLowerCase() ? undefined : item.title}
                    className="text-sm font-semibold text-gray-900 line-clamp-2"
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

              {/* Footer actions — Open in Canvas uses an outline button so
                  it doesn't fight the campaign brand colors of the card stripe.
                  When the QuickPublishMenu is shown, the Canvas button shrinks
                  to make room and the menu sits on its right. Right padding is
                  pr-5 to match the content area above (slightly more breathing
                  room on the right than the stripe-side left). */}
              <div className="pl-4 pr-5 pb-4 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => onOpenInStudio(item.id, item.campaignId)}
                  fullWidth
                  className="!bg-white !text-gray-900 !border-gray-900 hover:!bg-gray-50"
                >
                  Open in Canvas
                </Button>
                {item.hasContent && !item.isPublishReady && (
                  <QuickPublishMenu
                    deliverableId={item.id}
                    campaignId={item.campaignId}
                    sameAsLastDate={sameAsLastDate}
                    variant="button"
                  />
                )}
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
