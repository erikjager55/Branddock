"use client";

import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, ExternalLink, Heart, Trash2, Copy } from "lucide-react";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { formatContentType } from "../../lib/format-content-type";

// ─── Traffic Light System ───────────────────────────────────────

export type TrafficLight = "red" | "amber" | "green";

/** Visual tokens per traffic light level */
const TRAFFIC_LIGHT: Record<
  TrafficLight,
  { stripe: string; bg: string; border: string; text: string; dot: string; label: string }
> = {
  red: {
    stripe: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
    dot: "#ef4444",
    label: "Not started",
  },
  amber: {
    stripe: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    dot: "#f59e0b",
    label: "In progress",
  },
  green: {
    stripe: "#10b981",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    text: "#065f46",
    dot: "#10b981",
    label: "Ready",
  },
};

/** Exported for reuse in grid/list views */
export { TRAFFIC_LIGHT };

/**
 * Derive traffic light from available signals.
 *
 * GREEN: content generated + approved/published → publish-ready
 * RED: nothing done yet (not started, no content)
 * AMBER: everything in between (in progress, needs review, pipeline incomplete, overdue)
 */
export function deriveTrafficLight(
  isPublishReady?: boolean,
  workflowStatus?: string,
  state?: string,
  hasContent?: boolean,
): { light: TrafficLight; label: string } {
  // Match user mental model: an item is "in progress" as soon as *any*
  // forward movement happened — scheduled on the calendar, content
  // generated, or status moved past NOT_STARTED. Workflow status alone
  // under-counts progress because wizard-created items stay NOT_STARTED
  // even after scheduling.
  //
  // Overdue is a label modifier (date passed + not published) — it never
  // changes the bucket, otherwise "In progress" filter would hide
  // overdue-in-progress items.
  if (state === "published") return { light: "green", label: "Published" };
  // Approved-and-scheduled: green pill with "Scheduled" label so the user can
  // distinguish queued items from "ready but not yet timed" ones at a glance.
  if (isPublishReady === true && state === "scheduled") {
    return { light: "green", label: "Scheduled" };
  }
  if (isPublishReady === true) return { light: "green", label: "Ready" };

  const isOverdue = state === "overdue";
  const isScheduled = state === "scheduled" || state === "overdue";
  const hasAnyProgress =
    hasContent === true ||
    isScheduled ||
    workflowStatus === "IN_PROGRESS" ||
    workflowStatus === "COMPLETED";

  if (!hasAnyProgress) {
    return {
      light: "red",
      label: isOverdue ? "Not started · overdue" : "Not started",
    };
  }

  let label =
    workflowStatus === "COMPLETED" ? "Needs review" : "In progress";
  if (isOverdue) label += " · overdue";
  return { light: "amber", label };
}

// ─── Phase pill ─────────────────────────────────────────────────

const PHASE_CONFIG: Record<string, { label: string; order: number; dot: string; bg: string; text: string }> = {
  awareness: { label: "Awareness", order: 1, dot: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8" },
  consideration: { label: "Consideration", order: 2, dot: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
  conversion: { label: "Conversion", order: 3, dot: "#10b981", bg: "#ecfdf5", text: "#059669" },
  decision: { label: "Decision", order: 3, dot: "#10b981", bg: "#ecfdf5", text: "#059669" },
  retention: { label: "Retention", order: 4, dot: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" },
  advocacy: { label: "Advocacy", order: 5, dot: "#f43f5e", bg: "#fff1f2", text: "#be123c" },
};

export function getPhaseConfig(phase: string | null | undefined) {
  if (!phase) return null;
  const lower = phase.toLowerCase();
  for (const [key, config] of Object.entries(PHASE_CONFIG)) {
    if (lower.includes(key)) return config;
  }
  return { label: phase, order: 0, dot: "#6b7280", bg: "#f9fafb", text: "#374151" };
}

// ─── Quality score color ────────────────────────────────────────

function getQualityHex(score: number): { text: string; bg: string } {
  if (score >= 8) return { text: "#059669", bg: "#ecfdf5" };
  if (score >= 6) return { text: "#ca8a04", bg: "#fefce8" };
  if (score >= 4) return { text: "#ea580c", bg: "#fff7ed" };
  return { text: "#dc2626", bg: "#fef2f2" };
}

// ─── Types ──────────────────────────────────────────────────────

export type CardState = "scheduled" | "published" | "overdue" | "unscheduled";
export type WorkflowStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface CalendarCardProps {
  title: string;
  typeLabel: string;
  state: CardState;
  qualityScore?: number | null;
  personaHexes?: string[];
  isFavorite?: boolean;
  workflowStatus?: WorkflowStatus;
  campaignName?: string;
  isDraggable?: boolean;
  onClick?: () => void;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
  onToggleFavorite?: () => void;
  onDatePick?: (isoDate: string | null) => void;
  currentDateValue?: string;
  isPublishReady?: boolean;
  /** True when any content has been generated — drives the "has progress"
   *  classification alongside workflow status. */
  hasContent?: boolean;
  readinessHint?: string | null;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
  /** Duplicate the deliverable and open the copy in Canvas (Sprint B · Step 1). */
  onDuplicate?: () => void;
  /** True while the duplicate mutation is in-flight — disables the button. */
  isDuplicating?: boolean;
  phase?: string | null;
  isSelected?: boolean;
  onToggleSelected?: () => void;
  // Kept for backward compat — accepted but not rendered
  channelHex?: string | null;
  campaignType?: string;
  campaignConfidence?: number | null;
}

/** Inline rename input — click-to-edit title field.
 *
 *  The `className` prop controls *typography only* (font-size, weight,
 *  color, truncation). Box / affordance styling is centralised so the
 *  view-state button and the edit-state input stay visually cohesive:
 *
 *  - View: plain text, left-aligned, tiny negative horizontal margin so
 *    the hover background tint sits visually behind the text. Hover =
 *    faint gray tint + dashed underline → reader knows it's editable
 *    without a heavy frame around every card.
 *  - Edit: transparent bg, bottom border only (no box around the text).
 *  - Untitled: dashed-underlined italic placeholder inviting a click.
 *
 *  Callsites should NOT pass `bg-*`, `border-*`, `rounded-*` or
 *  `text-center` in className — those conflict with the base styling. */
const BASE_VIEW_CLASSES =
  "text-left leading-tight block w-full rounded px-1 -mx-1 " +
  "transition-colors cursor-text " +
  "hover:bg-black/[0.04] hover:underline decoration-dashed decoration-gray-400 underline-offset-2";

const BASE_EDIT_CLASSES =
  "text-left leading-tight block w-full " +
  "bg-transparent border-0 border-b border-primary-400 " +
  "rounded-none px-1 -mx-1 py-0 outline-none focus:border-primary-600";

const DEFAULT_TYPOGRAPHY = "text-[12px] font-semibold text-gray-900";

export function InlineRenameField({
  placeholder,
  currentValue,
  className,
  onRename,
}: {
  placeholder: string;
  currentValue?: string;
  /** Typography-only overrides (font-size, weight, color, line-clamp/truncate). */
  className?: string;
  onRename: (newTitle: string) => void;
}) {
  const { t } = useTranslation('campaigns-core');
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const typography = className ?? DEFAULT_TYPOGRAPHY;

  const handleStartEdit = () => {
    setValue(currentValue ?? "");
    setEditing(true);
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== (currentValue ?? "")) {
      onRename(trimmed);
    }
    setEditing(false);
    setValue("");
  };

  if (editing) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
          if (e.key === "Escape") { setEditing(false); setValue(""); }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        autoFocus
        className={`${BASE_EDIT_CLASSES} ${typography}`}
      />
    );
  }

  if (currentValue) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleStartEdit(); }}
        className={`${BASE_VIEW_CLASSES} ${typography}`}
        title={t('card.rename.tooltip')}
      >
        {currentValue}
      </button>
    );
  }

  // Empty state: dashed placeholder, invites a click.
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleStartEdit(); }}
      className={`${BASE_VIEW_CLASSES} italic text-gray-400 hover:text-gray-600 ${typography.replace(/text-gray-\d+/g, "")}`}
      title={t('card.rename.addTitleTooltip')}
    >
      {placeholder}
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────

export function CalendarCard({
  title,
  typeLabel,
  state,
  qualityScore,
  personaHexes,
  isFavorite,
  workflowStatus,
  campaignName,
  isDraggable = false,
  onClick,
  onDragStart,
  onDragEnd,
  onToggleFavorite,
  onDatePick,
  isPublishReady,
  hasContent,
  readinessHint,
  currentDateValue,
  onDelete,
  onRename,
  onDuplicate,
  isDuplicating,
  phase,
  isSelected,
  onToggleSelected,
}: CalendarCardProps) {
  const { t } = useTranslation('campaigns-core');
  const phaseConfig = getPhaseConfig(phase);
  const { light, label: lightLabel } = deriveTrafficLight(
    isPublishReady,
    workflowStatus,
    state,
    hasContent,
  );
  const tl = TRAFFIC_LIGHT[light];

  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const didDragRef = useRef(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable || !onDragStart) return;
        didDragRef.current = true;
        setIsDragging(true);
        onDragStart(e);
      }}
      onDragEnd={() => {
        setIsDragging(false);
        requestAnimationFrame(() => {
          didDragRef.current = false;
        });
        onDragEnd?.();
      }}
      onClick={() => {
        if (didDragRef.current) return;
        onClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group relative rounded-md border text-left text-[11px] hover:shadow-sm transition-all overflow-hidden flex ${
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: tl.bg,
        borderColor: tl.border,
        color: "#374151",
        opacity: isDragging ? 0.4 : 1,
      }}
      title={`${title} — ${lightLabel}${readinessHint ? ` (${readinessHint})` : ""}`}
    >
      {/* Traffic light left stripe */}
      <div
        className="w-1 flex-shrink-0 rounded-l-md"
        style={{ backgroundColor: tl.stripe }}
        aria-hidden="true"
      />

      {/* Card content */}
      <div className="flex-1 min-w-0 p-1.5">
        {/* Row 1: checkbox + campaign name (breadcrumb) + favorite */}
        <div className="flex items-center gap-1 mb-0.5">
          {onToggleSelected && (
            <input
              type="checkbox"
              checked={isSelected ?? false}
              onChange={(e) => { e.stopPropagation(); onToggleSelected(); }}
              onClick={(e) => e.stopPropagation()}
              className="w-3 h-3 rounded border-gray-300 text-primary flex-shrink-0"
            />
          )}
          <span className="truncate flex-1 text-[9px] text-gray-500">
            {campaignName ?? t(`campaigns-content-types:types.${typeLabel}`, { defaultValue: formatContentType(typeLabel) })}
          </span>
          {isFavorite !== undefined && onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-0.5 rounded hover:bg-white/60 flex-shrink-0"
              aria-label={isFavorite ? t('card.favorite.remove') : t('card.favorite.add')}
            >
              <Heart
                className={`w-3 h-3 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"}`}
              />
            </button>
          )}
        </div>

        {/* Row 2: Title — inline editable when untitled */}
        {title.toLowerCase() === typeLabel.toLowerCase() && onRename ? (
          <InlineRenameField
            placeholder={t('card.untitled', { type: t(`campaigns-content-types:types.${typeLabel}`, { defaultValue: formatContentType(typeLabel) }) })}
            onRename={onRename}
          />
        ) : (
          <div className="font-semibold leading-tight line-clamp-2 text-gray-900 text-[12px] mb-0.5">
            {title}
          </div>
        )}

        {/* Row 3: Phase pill (#N phase) */}
        {phaseConfig && (
          <div className="mb-0.5">
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium truncate max-w-full"
              style={{ backgroundColor: phaseConfig.bg, color: phaseConfig.text }}
              title={`${campaignName ?? ""} > #${phaseConfig.order} ${phaseConfig.label}`}
            >
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: phaseConfig.dot }} />
              <span className="flex-shrink-0 font-semibold">#{phaseConfig.order}</span>
              <span className="truncate">{phaseConfig.label}</span>
            </span>
          </div>
        )}

        {/* Row 4: Traffic light pill + quality + personas */}
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
            style={{ backgroundColor: `${tl.stripe}18`, color: tl.text }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: tl.dot }}
            />
            {lightLabel}
          </span>

          {qualityScore !== null && qualityScore !== undefined && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold"
              style={{
                backgroundColor: getQualityHex(qualityScore).bg,
                color: getQualityHex(qualityScore).text,
              }}
            >
              {qualityScore.toFixed(1)}
            </span>
          )}

          {personaHexes && personaHexes.length > 0 && (
            <span className="inline-flex items-center gap-0.5 ml-auto">
              {personaHexes.slice(0, 3).map((hex, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: hex }}
                  aria-hidden="true"
                />
              ))}
            </span>
          )}
        </div>

        {/* Readiness hint (amber/red only — green doesn't need it) */}
        {readinessHint && light !== "green" && (
          <div className="text-[8px] mt-0.5 truncate" style={{ color: tl.text }}>
            {readinessHint}
          </div>
        )}

        {/* Hover-revealed action row */}
        {(onDatePick || onClick || onDelete || onDuplicate) && (
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDatePick && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Fallback first, then showPicker as enhancement (Safari compat)
                    dateInputRef.current?.click();
                    dateInputRef.current?.showPicker?.();
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/80 hover:bg-white border border-gray-200"
                  title={t('card.actions.pickDate')}
                >
                  <CalendarIcon className="w-2.5 h-2.5" />
                  {t('card.actions.date')}
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  defaultValue={currentDateValue}
                  onChange={(e) => onDatePick(e.target.value || null)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                disabled={isDuplicating}
                className="p-0.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                title={t('card.actions.duplicate')}
              >
                <Copy className="w-2.5 h-2.5 text-gray-400 hover:text-gray-700" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                className="p-0.5 rounded hover:bg-red-50 transition-colors"
                title={t('card.actions.delete')}
              >
                <Trash2 className="w-2.5 h-2.5 text-gray-400 hover:text-red-500" />
              </button>
            )}
            {onClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/80 hover:bg-white border border-gray-200 ml-auto"
                title={t('card.actions.open')}
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {t('card.actions.open')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {showDeleteModal && onDelete && (
        <DeleteConfirmModal
          title={title}
          onConfirm={onDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
