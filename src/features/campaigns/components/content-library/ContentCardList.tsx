"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Heart, CalendarDays, Trash2, Copy, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFormat } from "@/lib/ui-i18n/format";
import { Badge } from "@/components/shared";
import { deriveTrafficLight, TRAFFIC_LIGHT, getPhaseConfig, InlineRenameField } from "../shared/calendar-cards";
import { formatContentType } from "../../lib/format-content-type";
import { DeleteConfirmModal } from "../shared/DeleteConfirmModal";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";
import { QuickPublishMenu } from "./QuickPublishMenu";
import { sameTimeAsLast } from "../../lib/publish-scheduler";
import type { ContentLibraryItem, ContentLibrarySort } from "../../types/content-library.types";

// ─── Sortable header helper ──────────────────────────────

type SortableField = "title" | "contentType" | "campaignName" | "scheduledPublishDate";

function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortableField;
  currentSort: ContentLibrarySort;
  onSort: (next: ContentLibrarySort) => void;
}) {
  const activeField = currentSort.startsWith("-") ? currentSort.slice(1) : currentSort;
  const isActive = activeField === field;
  const isDesc = currentSort.startsWith("-");

  const handleClick = () => {
    // Cycle: none → asc → desc → asc → ...
    if (!isActive) {
      onSort(field as ContentLibrarySort);
    } else {
      onSort((isDesc ? field : `-${field}`) as ContentLibrarySort);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-left transition-colors uppercase tracking-wider ${
        isActive ? "text-gray-700 font-semibold" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      {isActive ? (
        isDesc ? (
          <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUp className="w-3 h-3" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────

interface ContentCardListProps {
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

export function ContentCardList({
  items,
  onOpenInStudio,
  onToggleFavorite,
  onDelete,
  onRename,
  onDuplicate,
  duplicatingIds,
}: ContentCardListProps) {
  const { t } = useTranslation("campaigns-content-library");
  const { formatDate } = useFormat();
  const sort = useContentLibraryStore((s) => s.sort);
  const setSort = useContentLibraryStore((s) => s.setSort);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; campaignId: string; title: string } | null>(null);

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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table header */}
      <div
        className="gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider"
        style={{
          display: "grid",
          gridTemplateColumns: "6px 1fr 100px 160px 110px 90px 80px 80px",
        }}
      >
        <div />
        <SortableHeader label={t("list.title")} field="title" currentSort={sort} onSort={setSort} />
        <SortableHeader label={t("list.type")} field="contentType" currentSort={sort} onSort={setSort} />
        <SortableHeader label={t("list.campaign")} field="campaignName" currentSort={sort} onSort={setSort} />
        <div>{t("list.readiness")}</div>
        <div>{t("list.phase")}</div>
        <SortableHeader label={t("list.scheduled")} field="scheduledPublishDate" currentSort={sort} onSort={setSort} />
        <div>{t("list.actions")}</div>
      </div>

      {/* Rows */}
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
            className="gap-3 px-4 py-3 border-b border-gray-100 items-center hover:brightness-95 transition-all"
            style={{
              display: "grid",
              gridTemplateColumns: "6px 1fr 100px 160px 110px 90px 80px 80px",
              backgroundColor: tl.bg,
            }}
          >
            {/* Traffic light stripe */}
            <div
              className="w-1.5 h-full rounded-full self-stretch"
              style={{ backgroundColor: tl.stripe }}
              title={lightLabel}
            />

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
              {onRename ? (
                <InlineRenameField
                  placeholder={t("card.untitledPlaceholder", { type: t(`campaigns-content-types:types.${item.type}`, { defaultValue: formatContentType(item.type) }) })}
                  currentValue={item.title.toLowerCase() === item.type.toLowerCase() ? undefined : item.title}
                  className="text-sm font-medium text-gray-900 truncate"
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
              <Badge size="sm">{t(`campaigns-content-types:types.${item.type}`, { defaultValue: formatContentType(item.type) })}</Badge>
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
                  {formatDate(item.scheduledPublishDate, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>

            {/* Actions — solid button matches Grid view's "Open in Canvas" */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenInStudio(item.id, item.campaignId)}
                className="inline-flex items-center gap-1 text-xs font-medium text-white bg-primary hover:bg-primary-600 rounded-md transition-colors"
                style={{ padding: "4px 8px" }}
                title={t("card.openInCanvas")}
              >
                <ExternalLink className="w-3 h-3" />
                {t("card.canvas")}
              </button>
              {item.hasContent && !item.isPublishReady && (
                <QuickPublishMenu
                  deliverableId={item.id}
                  campaignId={item.campaignId}
                  sameAsLastDate={sameAsLastDate}
                  variant="icon"
                />
              )}
              {onDuplicate && (
                <button
                  type="button"
                  onClick={() => onDuplicate(item.id, item.campaignId)}
                  disabled={duplicatingIds?.has(item.id)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title={t("card.duplicate")}
                >
                  <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: item.id, campaignId: item.campaignId, title: item.title })}
                  className="p-1 rounded hover:bg-red-50 transition-colors"
                  title={t("card.delete")}
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
