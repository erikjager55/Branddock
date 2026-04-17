"use client";

import {
  useCallback,
  useMemo,
  useState,
  type DragEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Inbox,
} from "lucide-react";
import {
  stripTime,
  dateKey,
  formatMonthLabel,
  buildCalendarDays,
  WEEKDAY_LABELS,
} from "@/features/campaigns/lib/calendar-helpers";
import { getChannelColor } from "@/features/campaigns/lib/channel-colors";
import {
  CalendarCard,
  type CardState,
} from "@/features/campaigns/components/shared/calendar-cards";
import type { ContentLibraryItem } from "@/features/campaigns/types/content-library.types";
import { useUpdateDeliverableSchedule } from "@/features/campaigns/hooks";

// ─── Types ──────────────────────────────────────────────────────

type ItemState = "scheduled" | "published" | "overdue";

interface PlacedItem {
  item: ContentLibraryItem;
  date: Date;
  state: ItemState;
}

interface DragPayload {
  deliverableId: string;
  campaignId: string;
  /** ISO timestamp of the item's current scheduledPublishDate, or null if unscheduled */
  currentScheduledISO: string | null;
  /** Lowercased contentType — used to pick a channel-aware default time */
  contentType: string;
}

interface ContentLibraryCalendarViewProps {
  items: ContentLibraryItem[];
  onOpenItem?: (deliverableId: string, campaignId: string) => void;
  onDeleteItem?: (deliverableId: string, campaignId: string) => void;
  onRenameItem?: (deliverableId: string, campaignId: string, newTitle: string) => void;
}

// ─── Time defaults (research-backed) ────────────────────────────

/**
 * Channel-aware default publish hours (24h local time).
 * Sources: Sprout Social 2026 best-times analysis, Buffer baseline.
 */
const CHANNEL_DEFAULT_HOURS: Record<string, number> = {
  linkedin: 14, // afternoon professional
  instagram: 11, // late morning
  facebook: 13, // early afternoon
  pinterest: 10, // morning
  tiktok: 19, // evening
  twitter: 9, // morning news cycle
  x: 9,
  email: 10, // newsletters: morning
  newsletter: 10,
};

const FALLBACK_HOUR = 10; // generic midweek-midday baseline

function getDefaultHourForType(contentType: string): number {
  const lower = contentType.toLowerCase();
  for (const [channel, hour] of Object.entries(CHANNEL_DEFAULT_HOURS)) {
    if (lower.includes(channel)) return hour;
  }
  return FALLBACK_HOUR;
}

/**
 * Build a new ISO datetime for a drop target.
 *
 * - When moving an already-scheduled item: preserve time of day, only change date.
 * - When scheduling for the first time: use channel-aware default hour.
 *
 * Local time is used (avoids UTC drift on day boundaries).
 */
function buildScheduledISO(
  targetDate: Date,
  currentScheduledISO: string | null,
  contentType: string,
): string {
  let hour = getDefaultHourForType(contentType);
  let minute = 0;
  if (currentScheduledISO) {
    const prev = new Date(currentScheduledISO);
    hour = prev.getHours();
    minute = prev.getMinutes();
  }
  const result = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    hour,
    minute,
    0,
    0,
  );
  return result.toISOString();
}

// ─── Style tokens (inline-style to bypass Tailwind 4 purge) ─────

/** Grid template uses inline style — Tailwind 4 sometimes drops grid-cols-7 */
const SEVEN_COL_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
};

/** Try to detect a channel key from a content type label.
 *  Returns null when no known channel matches. */
function detectChannelKey(contentType: string): string | null {
  const lower = contentType.toLowerCase();
  const channels = [
    "linkedin",
    "instagram",
    "facebook",
    "twitter",
    "tiktok",
    "youtube",
    "pinterest",
    "email",
    "newsletter",
  ];
  for (const c of channels) {
    if (lower.includes(c)) return c;
  }
  return null;
}

/** Format a Date as YYYY-MM-DD for native date input value */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Toolbar counter dot colors per state */
const STATE_META: Record<ItemState, { iconColor: string }> = {
  scheduled: { iconColor: "#06b6d4" },
  published: { iconColor: "#6b7280" },
  overdue: { iconColor: "#d97706" },
};

// ─── Helpers ────────────────────────────────────────────────────

/** Resolve canonical date for an item (scheduled → published → suggested) */
function resolveItemDate(item: ContentLibraryItem): {
  date: Date;
  state: ItemState;
} | null {
  if (item.scheduledPublishDate) {
    const d = new Date(item.scheduledPublishDate);
    const today = stripTime(new Date());
    const itemDay = stripTime(d);
    const isOverdue = itemDay.getTime() < today.getTime() && !item.publishedAt;
    return { date: d, state: isOverdue ? "overdue" : "scheduled" };
  }
  if (item.publishedAt) {
    return { date: new Date(item.publishedAt), state: "published" };
  }
  if (item.suggestedPublishDate) {
    return { date: new Date(item.suggestedPublishDate), state: "scheduled" };
  }
  return null;
}

// (Detail modal removed — cards now navigate directly to canvas on click)

// ─── Main Component ─────────────────────────────────────────────

export function ContentLibraryCalendarView({
  items,
  onOpenItem,
  onDeleteItem,
  onRenameItem,
}: ContentLibraryCalendarViewProps) {
  // ─── Item placement ──────────────────────────────────────────
  const { placedByDate, unscheduledItems } = useMemo(() => {
    const byDate = new Map<string, PlacedItem[]>();
    const unscheduled: ContentLibraryItem[] = [];
    for (const item of items) {
      const resolved = resolveItemDate(item);
      if (!resolved) {
        unscheduled.push(item);
        continue;
      }
      const key = dateKey(resolved.date);
      const placed: PlacedItem = {
        item,
        date: resolved.date,
        state: resolved.state,
      };
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(placed);
    }
    const stateOrder: Record<ItemState, number> = {
      overdue: 0,
      scheduled: 1,
      published: 2,
    };
    for (const arr of byDate.values()) {
      arr.sort((a, b) => stateOrder[a.state] - stateOrder[b.state]);
    }
    return { placedByDate: byDate, unscheduledItems: unscheduled };
  }, [items]);

  // ─── Month nav ───────────────────────────────────────────────
  const today = useMemo(() => stripTime(new Date()), []);
  const todayKey = useMemo(() => dateKey(today), [today]);

  const [viewMonth, setViewMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const handlePrev = useCallback(() => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }, []);
  const handleNext = useCallback(() => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }, []);
  const handleToday = useCallback(() => {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }, [today]);

  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);

  // ─── Trim trailing empty week (only show needed weeks, max 6) ─
  const visibleWeekCount = useMemo(() => {
    // If last week is entirely outside-month, show only 5 weeks
    const allOutside = calendarDays
      .slice(35, 42)
      .every((d) => !d.isCurrentMonth);
    return allOutside ? 5 : 6;
  }, [calendarDays]);

  const visibleDays = useMemo(
    () => calendarDays.slice(0, visibleWeekCount * 7),
    [calendarDays, visibleWeekCount],
  );

  // ─── Modal state ─────────────────────────────────────────────
  // (Unscheduled drawer is always visible — no toggle needed)
  const UNSCHEDULED_PAGE_SIZE = 12;
  const [unscheduledPage, setUnscheduledPage] = useState(0);
  /** Day keys whose cells are expanded to show all items (overrides max-2 limit) */
  const [expandedDayKeys, setExpandedDayKeys] = useState<Set<string>>(new Set());

  const toggleDayExpansion = useCallback((key: string) => {
    setExpandedDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ─── Drag & drop state ───────────────────────────────────────
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  /** True while ANY item is being dragged — used to dim non-target cells subtly */
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const updateSchedule = useUpdateDeliverableSchedule();

  /** Schedule (or unschedule) an item via date picker — `isoDate` is YYYY-MM-DD or null */
  const handleDatePick = useCallback(
    (item: ContentLibraryItem, isoDate: string | null) => {
      if (!isoDate) {
        updateSchedule.mutate({
          deliverableId: item.id,
          campaignId: item.campaignId,
          scheduledPublishDate: null,
        });
        return;
      }
      const [y, m, day] = isoDate.split("-").map(Number);
      const targetDate = new Date(y, m - 1, day);
      const newISO = buildScheduledISO(
        targetDate,
        item.scheduledPublishDate ?? item.suggestedPublishDate ?? null,
        item.type,
      );
      updateSchedule.mutate({
        deliverableId: item.id,
        campaignId: item.campaignId,
        scheduledPublishDate: newISO,
      });
    },
    [updateSchedule],
  );

  const handleDragStartScheduled = useCallback(
    (e: DragEvent<HTMLDivElement>, placed: PlacedItem) => {
      const payload: DragPayload = {
        deliverableId: placed.item.id,
        campaignId: placed.item.campaignId,
        currentScheduledISO:
          placed.item.scheduledPublishDate ??
          placed.item.publishedAt ??
          placed.item.suggestedPublishDate ??
          null,
        contentType: placed.item.type,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      setIsDraggingActive(true);
    },
    [],
  );

  const handleDragStartUnscheduled = useCallback(
    (e: DragEvent<HTMLDivElement>, item: ContentLibraryItem) => {
      const payload: DragPayload = {
        deliverableId: item.id,
        campaignId: item.campaignId,
        currentScheduledISO: null,
        contentType: item.type,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      setIsDraggingActive(true);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setIsDraggingActive(false);
    setDragOverKey(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverKey(key);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Suppress flicker when moving between child elements within same cell
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverKey(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetDate: Date) => {
      e.preventDefault();
      setDragOverKey(null);
      setIsDraggingActive(false);
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        const payload: DragPayload = JSON.parse(raw);
        const newISO = buildScheduledISO(
          targetDate,
          payload.currentScheduledISO,
          payload.contentType,
        );
        // No-op if dropping on the same date (preserves time too)
        if (
          payload.currentScheduledISO &&
          dateKey(new Date(payload.currentScheduledISO)) === dateKey(targetDate)
        ) {
          return;
        }
        updateSchedule.mutate({
          deliverableId: payload.deliverableId,
          campaignId: payload.campaignId,
          scheduledPublishDate: newISO,
        });
      } catch {
        // Malformed drag data — ignore
      }
    },
    [updateSchedule],
  );

  // ─── Counts for header summary ───────────────────────────────
  const monthCounts = useMemo(() => {
    let scheduled = 0;
    let published = 0;
    let overdue = 0;
    for (const d of visibleDays) {
      if (!d.isCurrentMonth) continue;
      const placed = placedByDate.get(d.key);
      if (!placed) continue;
      for (const p of placed) {
        if (p.state === "scheduled") scheduled++;
        else if (p.state === "published") published++;
        else if (p.state === "overdue") overdue++;
      }
    }
    return { scheduled, published, overdue };
  }, [visibleDays, placedByDate]);

  const totalThisMonth =
    monthCounts.scheduled + monthCounts.published + monthCounts.overdue;

  // ─── Empty state ─────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
        <Inbox className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No content yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Create your first piece to see it on the calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-semibold text-gray-900 min-w-[150px] text-center">
            {formatMonthLabel(viewMonth)}
          </h3>
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="ml-2 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Status counters */}
        <div className="flex items-center gap-3 text-xs">
          {totalThisMonth === 0 ? (
            <span className="text-gray-400">No content this month</span>
          ) : (
            <>
              {monthCounts.overdue > 0 && (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: STATE_META.overdue.iconColor }}
                  />
                  {monthCounts.overdue} overdue
                </span>
              )}
              {monthCounts.scheduled > 0 && (
                <span className="inline-flex items-center gap-1.5 text-cyan-700">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: STATE_META.scheduled.iconColor }}
                  />
                  {monthCounts.scheduled} scheduled
                </span>
              )}
              {monthCounts.published > 0 && (
                <span className="inline-flex items-center gap-1.5 text-gray-600">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: STATE_META.published.iconColor }}
                  />
                  {monthCounts.published} published
                </span>
              )}
            </>
          )}
          {unscheduledItems.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-gray-500 bg-gray-100">
              <Inbox className="w-3 h-3" />
              {unscheduledItems.length} unscheduled
            </span>
          )}
        </div>
      </div>

      {/* ── Unscheduled drawer (cards, drag or use date picker to schedule) ── */}
      {unscheduledItems.length > 0 && (() => {
        const totalPages = Math.ceil(unscheduledItems.length / UNSCHEDULED_PAGE_SIZE);
        const safePage = Math.min(unscheduledPage, totalPages - 1);
        const pageStart = safePage * UNSCHEDULED_PAGE_SIZE;
        const pageItems = unscheduledItems.slice(pageStart, pageStart + UNSCHEDULED_PAGE_SIZE);
        const showPagination = totalPages > 1;

        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                Unscheduled ({unscheduledItems.length})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">
                  Drag onto a date or use the date picker
                </span>
                {showPagination && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      disabled={safePage === 0}
                      onClick={() => setUnscheduledPage((p) => Math.max(0, p - 1))}
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-[11px] text-gray-600 tabular-nums">
                      {safePage + 1}/{totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setUnscheduledPage((p) => Math.min(totalPages - 1, p + 1))}
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              }}
              onDragEnd={handleDragEnd}
            >
              {pageItems.map((item) => {
                const channelKey = detectChannelKey(item.type);
                const channelHex = channelKey
                  ? getChannelColor(channelKey).hex
                  : null;
                return (
                  <CalendarCard
                    key={item.id}
                    title={item.title}
                    typeLabel={item.type}
                    state="unscheduled"
                    qualityScore={item.qualityScore}
                    channelHex={channelHex}
                    isFavorite={item.isFavorite}
                    workflowStatus={item.status}
                    campaignName={item.campaignName}
                    isPublishReady={item.isPublishReady}
                    readinessHint={item.readinessHint}
                    isDraggable
                    onClick={() =>
                      onOpenItem && onOpenItem(item.id, item.campaignId)
                    }
                    onDragStart={(e) => handleDragStartUnscheduled(e, item)}
                    onDatePick={(iso) => handleDatePick(item, iso)}
                    onDelete={() => onDeleteItem?.(item.id, item.campaignId)}
                    onRename={(t) => onRenameItem?.(item.id, item.campaignId, t)}
                    phase={item.phase}
                    campaignType={item.campaignType}
                  />
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Calendar grid ── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Weekday header */}
        <div
          className="border-b border-gray-200 bg-gray-50/80"
          style={SEVEN_COL_GRID}
        >
          {WEEKDAY_LABELS.map((label, i) => {
            const isWeekend = i >= 5;
            return (
              <div
                key={label}
                className={`px-2 py-2 text-[10px] font-semibold text-center uppercase tracking-wider ${
                  isWeekend ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Day grid */}
        <div style={SEVEN_COL_GRID}>
          {visibleDays.map((d, i) => {
            const placed = placedByDate.get(d.key) ?? [];
            const isToday = d.key === todayKey;
            const dayOfWeek = i % 7;
            const isWeekend = dayOfWeek >= 5;
            const isLastRow = i >= (visibleWeekCount - 1) * 7;
            const isLastCol = dayOfWeek === 6;
            const isExpanded = expandedDayKeys.has(d.key);
            const visibleItems = isExpanded ? placed : placed.slice(0, 2);
            const overflowCount = Math.max(0, placed.length - 2);

            const isDragOver = dragOverKey === d.key;
            return (
              <div
                key={d.key}
                onDragOver={(e) => handleDragOver(e, d.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, d.date)}
                className={`relative min-h-[140px] flex flex-col gap-1 p-1.5 transition-all ${
                  !isLastRow ? "border-b border-gray-100" : ""
                } ${!isLastCol ? "border-r border-gray-100" : ""} ${
                  d.isCurrentMonth
                    ? isToday
                      ? "bg-cyan-50/40"
                      : isWeekend
                        ? "bg-gray-50/40"
                        : "bg-white"
                    : "bg-gray-50/30"
                } ${
                  isDragOver
                    ? "ring-2 ring-inset ring-cyan-400 bg-cyan-50/60 z-10"
                    : isDraggingActive && d.isCurrentMonth
                      ? "hover:ring-1 hover:ring-inset hover:ring-cyan-200"
                      : ""
                }`}
              >
                {/* Day number — top right */}
                <div className="flex items-start justify-end">
                  {isToday ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-semibold">
                      {d.date.getDate()}
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-medium ${
                        d.isCurrentMonth
                          ? isWeekend
                            ? "text-gray-400"
                            : "text-gray-700"
                          : "text-gray-300"
                      }`}
                    >
                      {d.date.getDate()}
                    </span>
                  )}
                </div>

                {/* Items */}
                {placed.length > 0 && d.isCurrentMonth && (
                  <div className="flex flex-col gap-1">
                    {visibleItems.map((p, idx) => {
                      const channelKey = detectChannelKey(p.item.type);
                      const channelHex = channelKey
                        ? getChannelColor(channelKey).hex
                        : null;
                      const dateValue = p.item.scheduledPublishDate
                        ? toDateInputValue(new Date(p.item.scheduledPublishDate))
                        : toDateInputValue(p.date);
                      return (
                        <CalendarCard
                          key={`${p.item.id}-${idx}`}
                          title={p.item.title}
                          typeLabel={p.item.type}
                          state={p.state as CardState}
                          qualityScore={p.item.qualityScore}
                          channelHex={channelHex}
                          isFavorite={p.item.isFavorite}
                          workflowStatus={p.item.status}
                          campaignName={p.item.campaignName}
                          isPublishReady={p.item.isPublishReady}
                          readinessHint={p.item.readinessHint}
                          isDraggable
                          currentDateValue={dateValue}
                          onClick={() =>
                            onOpenItem?.(p.item.id, p.item.campaignId)
                          }
                          onDragStart={(e) =>
                            handleDragStartScheduled(e, p)
                          }
                          onDatePick={(iso) => handleDatePick(p.item, iso)}
                          onDelete={() => onDeleteItem?.(p.item.id, p.item.campaignId)}
                          onRename={(t) => onRenameItem?.(p.item.id, p.item.campaignId, t)}
                          phase={p.item.phase}
                          campaignType={p.item.campaignType}
                        />
                      );
                    })}
                    {overflowCount > 0 && !isExpanded && (
                      <button
                        type="button"
                        onClick={() => toggleDayExpansion(d.key)}
                        className="text-[10px] text-gray-500 hover:text-gray-700 text-left px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                      >
                        +{overflowCount} more
                      </button>
                    )}
                    {isExpanded && placed.length > 2 && (
                      <button
                        type="button"
                        onClick={() => toggleDayExpansion(d.key)}
                        className="text-[10px] text-gray-500 hover:text-gray-700 text-left px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Helper note ── */}
      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <CalendarIcon className="w-3 h-3" />
        Drag a card onto a date or hover the card and click the date icon to
        pick an exact day. Default time follows channel best-practice (LinkedIn
        14:00, Instagram 11:00, else 10:00). Moving a scheduled item preserves
        its time.
      </p>

    </div>
  );
}
