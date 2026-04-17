"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
} from "lucide-react";
import {
  stripTime,
  dateKey,
  addDays,
  formatMonthLabel,
  buildCalendarDays,
  WEEKDAY_LABELS,
  daysBetween,
} from "@/features/campaigns/lib/calendar-helpers";
import type { CampaignSummary } from "@/types/campaign";
import { campaignKeys } from "@/features/campaigns/hooks";

// ─── Constants ──────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  ACTIVE: {
    bg: "#f0fdfa",
    border: "#5eead4",
    text: "#0f766e",
    dot: "#14b8a6",
    label: "Active",
  },
  COMPLETED: {
    bg: "#f0fdf4",
    border: "#86efac",
    text: "#166534",
    dot: "#10b981",
    label: "Completed",
  },
  ARCHIVED: {
    bg: "#f9fafb",
    border: "#d1d5db",
    text: "#6b7280",
    dot: "#9ca3af",
    label: "Archived",
  },
};

const TYPE_LABEL: Record<string, string> = {
  STRATEGIC: "Strategic",
  QUICK: "Quick",
};

// ─── Types ──────────────────────────────────────────────────────

interface CampaignsOverviewCalendarViewProps {
  campaigns: CampaignSummary[];
  onSelectCampaign?: (campaignId: string) => void;
}

interface CampaignBar {
  campaign: CampaignSummary;
  start: Date;
  end: Date;
  /** Row index for vertical stacking */
  row: number;
}

/** Drag mode determines how a bar's dates change on drop */
type GanttDragMode = "move" | "resize-left" | "resize-right";

interface GanttDragPayload {
  campaignId: string;
  mode: GanttDragMode;
  currentStart: string;
  currentEnd: string;
  /** Day-of-month-grid offset where the user grabbed the bar (for move precision) */
  grabOffsetDays: number;
}

interface BarSegment {
  bar: CampaignBar;
  /** Week index in the visible 6-week grid (0-5) */
  weekIndex: number;
  /** Starting day-of-week column (0=Mon, 6=Sun) */
  startCol: number;
  /** Span (number of columns occupied in this week) */
  span: number;
  /** True when bar continues into a previous week (off-screen left) */
  continuesLeft: boolean;
  /** True when bar continues into a future week (off-screen right) */
  continuesRight: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Stack campaigns into rows so overlapping campaigns get separate rows.
 *  Greedy first-fit algorithm — earliest start gets row 0, then each next
 *  campaign reuses the first row whose last end-date doesn't overlap. */
function stackCampaigns(
  bars: Omit<CampaignBar, "row">[],
): CampaignBar[] {
  const sorted = bars.slice().sort((a, b) => a.start.getTime() - b.start.getTime());
  /** rowEnds[i] = end-date of last bar placed in row i */
  const rowEnds: Date[] = [];
  return sorted.map((bar) => {
    let row = -1;
    for (let i = 0; i < rowEnds.length; i++) {
      if (rowEnds[i].getTime() < bar.start.getTime()) {
        row = i;
        break;
      }
    }
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(bar.end);
    } else {
      rowEnds[row] = bar.end;
    }
    return { ...bar, row };
  });
}

/** Compute bar segments for a single visible week.
 *  A bar may span multiple weeks; for each week it overlaps, we emit a segment
 *  positioned via Mon-Sun column indices. */
function computeBarSegments(
  bars: CampaignBar[],
  weekStart: Date,
  weekIndex: number,
): BarSegment[] {
  const weekStartTs = stripTime(weekStart).getTime();
  const weekEndTs = weekStartTs + 6 * 24 * 60 * 60 * 1000; // Sun
  const segments: BarSegment[] = [];

  for (const bar of bars) {
    const barStartTs = stripTime(bar.start).getTime();
    const barEndTs = stripTime(bar.end).getTime();
    if (barEndTs < weekStartTs || barStartTs > weekEndTs) continue;

    const visibleStartTs = Math.max(barStartTs, weekStartTs);
    const visibleEndTs = Math.min(barEndTs, weekEndTs);
    const startCol = Math.round(
      (visibleStartTs - weekStartTs) / (24 * 60 * 60 * 1000),
    );
    const endCol = Math.round(
      (visibleEndTs - weekStartTs) / (24 * 60 * 60 * 1000),
    );
    segments.push({
      bar,
      weekIndex,
      startCol,
      span: endCol - startCol + 1,
      continuesLeft: barStartTs < weekStartTs,
      continuesRight: barEndTs > weekEndTs,
    });
  }
  return segments;
}

// (NoDatedCampaignsBanner removed — undated campaigns now shown as a list below the grid)

// ─── Main Component ─────────────────────────────────────────────

export function CampaignsOverviewCalendarView({
  campaigns,
  onSelectCampaign,
}: CampaignsOverviewCalendarViewProps) {
  // ─── Filter campaigns with valid date range ──────────────────
  const { datedBars, undatedCampaigns } = useMemo(() => {
    const bars: Omit<CampaignBar, "row">[] = [];
    const undated: CampaignSummary[] = [];
    for (const c of campaigns) {
      if (!c.startDate) {
        undated.push(c);
        continue;
      }
      const start = new Date(c.startDate);
      // Default end = start + 14 days if endDate missing
      const end = c.endDate ? new Date(c.endDate) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
      // Ensure end >= start
      if (end.getTime() < start.getTime()) {
        bars.push({ campaign: c, start, end: start });
      } else {
        bars.push({ campaign: c, start, end });
      }
    }
    return { datedBars: stackCampaigns(bars), undatedCampaigns: undated };
  }, [campaigns]);

  const undatedCount = undatedCampaigns.length;
  const [showUndated, setShowUndated] = useState(false);

  // ─── Month navigation ────────────────────────────────────────
  const today = useMemo(() => stripTime(new Date()), []);
  const todayKey = useMemo(() => dateKey(today), [today]);

  // Initial month: earliest active campaign start, else current month
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const earliestActive = datedBars.find(
      (b) => b.campaign.status === "ACTIVE",
    );
    const anchor = earliestActive?.start ?? today;
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

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

  // ─── Drag & drop state ───────────────────────────────────────
  const queryClient = useQueryClient();
  const [dragOverDayKey, setDragOverDayKey] = useState<string | null>(null);
  const [draggingCampaignId, setDraggingCampaignId] = useState<string | null>(null);

  const handleBarDragStart = useCallback(
    (
      e: React.DragEvent<HTMLElement>,
      bar: CampaignBar,
      mode: GanttDragMode,
      grabOffsetDays: number,
    ) => {
      const payload: GanttDragPayload = {
        campaignId: bar.campaign.id,
        mode,
        currentStart: bar.start.toISOString(),
        currentEnd: bar.end.toISOString(),
        grabOffsetDays,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      e.stopPropagation();
      setDraggingCampaignId(bar.campaign.id);
    },
    [],
  );

  const handleBarDragEnd = useCallback(() => {
    setDraggingCampaignId(null);
    setDragOverDayKey(null);
  }, []);

  const handleDayDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, key: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverDayKey(key);
    },
    [],
  );

  const handleDayDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragOverDayKey(null);
    },
    [],
  );

  /** Compute new start/end based on drag mode + target date, then PATCH. */
  const applyGanttDrop = useCallback(
    async (payload: GanttDragPayload, targetDate: Date) => {
      const currentStart = new Date(payload.currentStart);
      const currentEnd = new Date(payload.currentEnd);
      let newStart = currentStart;
      let newEnd = currentEnd;
      const targetDay = stripTime(targetDate);

      if (payload.mode === "move") {
        // Preserve duration; account for grab offset so bar moves relative to grabbed day
        const adjustedTarget = addDays(targetDay, -payload.grabOffsetDays);
        const durationDays = daysBetween(currentStart, currentEnd);
        newStart = adjustedTarget;
        newEnd = addDays(adjustedTarget, durationDays);
      } else if (payload.mode === "resize-left") {
        newStart =
          targetDay.getTime() > stripTime(currentEnd).getTime()
            ? stripTime(currentEnd)
            : targetDay;
      } else if (payload.mode === "resize-right") {
        newEnd =
          targetDay.getTime() < stripTime(currentStart).getTime()
            ? stripTime(currentStart)
            : targetDay;
      }

      // No-op when dates didn't change
      if (
        newStart.getTime() === currentStart.getTime() &&
        newEnd.getTime() === currentEnd.getTime()
      ) {
        return;
      }

      try {
        const res = await fetch(`/api/campaigns/${payload.campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate: newStart.toISOString(),
            endDate: newEnd.toISOString(),
          }),
        });
        if (!res.ok) {
          console.error("[Gantt drop] PATCH failed with status", res.status);
          return;
        }
        // Refetch all campaign queries so the bar visually moves to the new dates
        queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      } catch (error) {
        console.error("[Gantt drop] PATCH error:", error);
      }
    },
    [queryClient],
  );

  const handleDayDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetDate: Date) => {
      e.preventDefault();
      setDragOverDayKey(null);
      setDraggingCampaignId(null);
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        const payload: GanttDragPayload = JSON.parse(raw);
        applyGanttDrop(payload, targetDate);
      } catch {
        // Malformed payload — ignore
      }
    },
    [applyGanttDrop],
  );

  // ─── Compute segments per week ───────────────────────────────
  const weekSegments = useMemo(() => {
    const segmentsByWeek: BarSegment[][] = [];
    for (let weekIdx = 0; weekIdx < 6; weekIdx++) {
      const weekStart = calendarDays[weekIdx * 7].date;
      segmentsByWeek.push(computeBarSegments(datedBars, weekStart, weekIdx));
    }
    return segmentsByWeek;
  }, [datedBars, calendarDays]);

  /** Max row used in any visible week → determines week-row height */
  const maxRowsPerWeek = useMemo(() => {
    return weekSegments.map((segs) =>
      segs.reduce((max, s) => Math.max(max, s.bar.row + 1), 0),
    );
  }, [weekSegments]);

  // ─── Visible counts ──────────────────────────────────────────
  const visibleCount = useMemo(() => {
    const ids = new Set<string>();
    for (const segs of weekSegments) {
      for (const s of segs) ids.add(s.bar.campaign.id);
    }
    return ids.size;
  }, [weekSegments]);

  /** Pixel height for one campaign bar row (must match inline style below) */
  const BAR_ROW_HEIGHT = 22;
  /** Vertical padding inside cell */
  const CELL_PADDING_TOP = 24; // room for date number
  const MIN_CELL_HEIGHT = 88;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-semibold text-gray-900 min-w-[140px] text-center">
            {formatMonthLabel(viewMonth)}
          </h3>
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="ml-2 px-3 py-1 text-xs font-medium border border-gray-200 rounded hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 text-gray-600">
            <CalendarIcon className="w-3.5 h-3.5" />
            {visibleCount} campaign{visibleCount !== 1 ? "s" : ""} this view
          </span>
          {undatedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowUndated((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              {showUndated ? "Hide" : "Show"} undated ({undatedCount})
            </button>
          )}
          {/* Status legend */}
          <div className="flex items-center gap-2">
            {Object.entries(STATUS_STYLES).map(([key, style]) => (
              <span key={key} className="inline-flex items-center gap-1 text-gray-600">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: style.dot }}
                />
                {style.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt-style calendar — only when at least one campaign has dates */}
      {datedBars.length > 0 && (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Weekday header */}
        <div
          className="border-b border-gray-200 bg-gray-50"
          style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-2 py-1.5 text-[10px] font-semibold text-gray-600 text-center uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {Array.from({ length: 6 }).map((_, weekIdx) => {
          const weekDays = calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7);
          const segments = weekSegments[weekIdx];
          const rowsThisWeek = maxRowsPerWeek[weekIdx];
          const cellHeight = Math.max(
            MIN_CELL_HEIGHT,
            CELL_PADDING_TOP + rowsThisWeek * (BAR_ROW_HEIGHT + 4) + 8,
          );

          return (
            <div
              key={`week-${weekIdx}`}
              className="relative border-b border-gray-100 last:border-b-0"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                minHeight: cellHeight,
              }}
            >
              {/* Day cells (background + drop targets) */}
              {weekDays.map((d) => {
                const isToday = d.key === todayKey;
                const isDragOver = dragOverDayKey === d.key;
                const isDragActive = draggingCampaignId !== null;
                return (
                  <div
                    key={d.key}
                    onDragOver={(e) => handleDayDragOver(e, d.key)}
                    onDragLeave={handleDayDragLeave}
                    onDrop={(e) => handleDayDrop(e, d.date)}
                    className={`relative border-r border-gray-100 last:border-r-0 p-1 transition-all ${
                      d.isCurrentMonth ? "bg-white" : "bg-gray-50/50"
                    } ${isToday ? "ring-2 ring-inset ring-primary-400" : ""} ${
                      isDragOver
                        ? "ring-2 ring-inset ring-cyan-400 bg-cyan-50/60"
                        : isDragActive && d.isCurrentMonth
                          ? "hover:ring-1 hover:ring-inset hover:ring-cyan-200"
                          : ""
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center text-[11px] font-medium ${
                        isToday
                          ? "bg-primary-500 text-white w-5 h-5 rounded-full"
                          : d.isCurrentMonth
                            ? "text-gray-700"
                            : "text-gray-400"
                      }`}
                    >
                      {d.date.getDate()}
                    </span>
                  </div>
                );
              })}

              {/* Bar segments overlay (absolute-positioned) */}
              {segments.map((seg, i) => {
                const style = STATUS_STYLES[seg.bar.campaign.status] ?? STATUS_STYLES.ACTIVE;
                const leftPct = (seg.startCol / 7) * 100;
                const widthPct = (seg.span / 7) * 100;
                const top = CELL_PADDING_TOP + seg.bar.row * (BAR_ROW_HEIGHT + 4);
                const totalDays = daysBetween(seg.bar.start, seg.bar.end) + 1;
                const isThisDragging = draggingCampaignId === seg.bar.campaign.id;
                /** This segment hosts the actual start of the bar (left handle visible here) */
                const isStartSegment = !seg.continuesLeft;
                /** This segment hosts the actual end of the bar (right handle visible here) */
                const isEndSegment = !seg.continuesRight;

                /** Day offset within the bar from where the user grabs (for move precision).
                 *  We approximate to startCol of THIS segment as the grab point — accurate enough
                 *  given our cell-snap behavior. */
                const grabOffsetDays =
                  daysBetween(seg.bar.start, addDays(weekDays[0].date, seg.startCol));

                return (
                  <div
                    key={`seg-${weekIdx}-${seg.bar.campaign.id}-${i}`}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) =>
                      handleBarDragStart(e, seg.bar, "move", grabOffsetDays)
                    }
                    onDragEnd={handleBarDragEnd}
                    onClick={() =>
                      onSelectCampaign && onSelectCampaign(seg.bar.campaign.id)
                    }
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && onSelectCampaign) {
                        e.preventDefault();
                        onSelectCampaign(seg.bar.campaign.id);
                      }
                    }}
                    className="group absolute flex items-center gap-1 px-2 text-[11px] font-medium border rounded overflow-hidden hover:shadow-sm transition-all z-10 cursor-grab active:cursor-grabbing"
                    style={{
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      top,
                      height: BAR_ROW_HEIGHT,
                      backgroundColor: style.bg,
                      borderColor: style.border,
                      color: style.text,
                      borderTopLeftRadius: seg.continuesLeft ? 0 : undefined,
                      borderBottomLeftRadius: seg.continuesLeft ? 0 : undefined,
                      borderTopRightRadius: seg.continuesRight ? 0 : undefined,
                      borderBottomRightRadius: seg.continuesRight ? 0 : undefined,
                      opacity: isThisDragging ? 0.4 : 1,
                    }}
                    title={`${seg.bar.campaign.title} — ${TYPE_LABEL[seg.bar.campaign.type] ?? seg.bar.campaign.type}, ${totalDays} day${totalDays !== 1 ? "s" : ""} (drag to reschedule, drag edges to resize)`}
                  >
                    {/* Left resize handle — only shown on the start segment */}
                    {isStartSegment && (
                      <div
                        draggable
                        onDragStart={(e) =>
                          handleBarDragStart(e, seg.bar, "resize-left", 0)
                        }
                        onDragEnd={handleBarDragEnd}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: style.dot }}
                        title="Drag to change start date"
                      />
                    )}

                    {seg.continuesLeft && (
                      <ChevronLeft className="w-3 h-3 flex-shrink-0 -ml-1" />
                    )}
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: style.dot }}
                      aria-hidden="true"
                    />
                    <span className="truncate flex-1 text-left pointer-events-none">
                      {seg.bar.campaign.title}
                    </span>
                    {seg.continuesRight && (
                      <ChevronRight className="w-3 h-3 flex-shrink-0 -mr-1" />
                    )}

                    {/* Right resize handle — only shown on the end segment */}
                    {isEndSegment && (
                      <div
                        draggable
                        onDragStart={(e) =>
                          handleBarDragStart(e, seg.bar, "resize-right", 0)
                        }
                        onDragEnd={handleBarDragEnd}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: style.dot }}
                        title="Drag to change end date"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      )}

      {/* Undated campaigns drawer (auto-open if no dated campaigns at all) */}
      {undatedCount > 0 && (showUndated || datedBars.length === 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
              Undated campaigns
            </span>
            <span className="text-[11px] text-amber-700">
              {datedBars.length === 0
                ? "No campaigns have a start date yet — open one to schedule"
                : "These campaigns have no start date — open one to schedule"}
            </span>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {undatedCampaigns.map((c) => {
              const style = STATUS_STYLES[c.status] ?? STATUS_STYLES.ACTIVE;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    onSelectCampaign && onSelectCampaign(c.id)
                  }
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-left text-[12px] transition-all overflow-hidden"
                  title={`${c.title} — ${TYPE_LABEL[c.type] ?? c.type}, ${style.label}`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: style.dot }}
                    aria-hidden="true"
                  />
                  <span className="truncate flex-1 font-medium text-gray-800">
                    {c.title}
                  </span>
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {style.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Helper note */}
      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
        <Info className="w-3 h-3" />
        Click a bar to open the campaign. Drag a bar to reschedule (preserves
        duration). Hover the bar edges and drag the colored handles to resize
        the start or end date.
      </p>
    </div>
  );
}
