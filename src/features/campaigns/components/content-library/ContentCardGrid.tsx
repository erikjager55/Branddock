"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Heart, CalendarDays, Trash2, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/lib/ui-i18n/format";
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
  const { t } = useTranslation("campaigns-content-library");
  const { formatDate } = useFormat();
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

            {/* min-w-0 hier kritiek: zonder dit verhindert de default
                min-width:auto van flex-items dat truncate/line-clamp werkt —
                lange campaign-namen of titles duwen dan de column voorbij
                de kaart-grens (waardoor de Trash-knop off-screen valt EN
                tekst over de rechterrand loopt). */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="pl-4 pr-6 py-4 flex flex-col gap-3 flex-1 min-w-0">
                {/* Row 1: campaign name + favorite + delete */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  {/* flex-1 + min-w-0 zorgt dat het span de beschikbare
                      ruimte krijgt zonder de actions-row weg te duwen. */}
                  <span className="flex-1 min-w-0 text-xs text-gray-500 truncate">{item.campaignName}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title={t("card.toggleFavorite")}
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
                        title={t("card.duplicate")}
                      >
                        <Copy className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: item.id, campaignId: item.campaignId, title: item.title }); }}
                        className="p-1 rounded hover:bg-red-50 transition-colors"
                        title={t("card.delete")}
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Title — inline editable. break-words als safety-
                    net voor extreem lange tokens (URLs/hashes/joined-words)
                    die anders min-w-0 + line-clamp ontwijken. */}
                {onRename ? (
                  <InlineRenameField
                    placeholder={t("card.untitledPlaceholder", { type: formatContentType(item.type) })}
                    currentValue={item.title.toLowerCase() === item.type.toLowerCase() ? undefined : item.title}
                    className="text-sm font-semibold text-gray-900 line-clamp-2 break-words"
                    onRename={(t) => onRename(item.id, item.campaignId, t)}
                  />
                ) : (
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 break-words">
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
                      {formatDate(item.scheduledPublishDate, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer actions — Open in Canvas uses an outline button so
                  it doesn't fight the campaign brand colors of the card stripe.
                  2026-05-20: padding rolled back to symmetric px-4. The
                  earlier asymmetric pr-6 was meant to balance the 6px left
                  stripe, but in narrower grid columns the extra right pad
                  pushed the button outside the visible card edge for some
                  states. Symmetric padding renders cleaner on every column
                  width. */}
              <div className="px-4 pb-4 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => onOpenInStudio(item.id, item.campaignId)}
                  fullWidth
                  className="!bg-white !text-gray-900 !border-gray-900 hover:!bg-gray-50"
                >
                  {t("card.openInCanvas")}
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
