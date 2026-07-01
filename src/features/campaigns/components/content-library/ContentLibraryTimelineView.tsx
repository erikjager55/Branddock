"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { GanttChartSquare, EyeOff, Eye, CalendarClock, Search, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  useContentLibraryStore,
  type TimelineGroupBy,
  type TimelineZoom,
} from "@/features/campaigns/stores/useContentLibraryStore";
import {
  buildTimelineBeats,
  findBeatIndexForDate,
  type TimelineBeat,
} from "@/features/campaigns/lib/timeline-beats";
import {
  CalendarCard,
  type CardState,
} from "@/features/campaigns/components/shared/calendar-cards";
import { getChannelColor } from "@/features/campaigns/lib/channel-colors";
import { useUpdateDeliverableSchedule, useUpdateDeliverable } from "@/features/campaigns/hooks";
import type { ContentLibraryItem } from "@/features/campaigns/types/content-library.types";

/** Try to detect a channel key from a content type label — mirrors the
 *  Calendar view so the two stay visually consistent. */
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

// ─── Types ──────────────────────────────────────────────────────────────

interface ContentLibraryTimelineViewProps {
  items: ContentLibraryItem[];
  /** Single-campaign mode: used to pick the default group-by.  */
  campaignId?: string | null;
  /** Campaign startDate for the first beat, when available. */
  campaignStartDate?: string | null;
  campaignEndDate?: string | null;
  onOpenItem?: (deliverableId: string, campaignId: string) => void;
  onDeleteItem?: (deliverableId: string, campaignId: string) => void;
  onRenameItem?: (deliverableId: string, campaignId: string, newTitle: string) => void;
  /** Duplicate the deliverable and open the copy in Canvas (Sprint B · Step 1). */
  onDuplicateItem?: (deliverableId: string, campaignId: string) => void;
  /** Set of deliverable IDs currently being duplicated. */
  duplicatingIds?: Set<string>;
}

interface DragPayload {
  deliverableId: string;
  campaignId: string;
  currentScheduledISO: string | null;
  /** Value of the current group axis (phase/channel/etc.), used to skip no-op
   *  updates and to decide whether a confirmation is needed for phase changes. */
  currentGroupValue: string | null;
  contentType: string;
}

interface GroupLane {
  key: string;
  label: string;
  /** Optional dot color for the lane header. */
  dotColor?: string;
}

// ─── Config ────────────────────────────────────────────────────────────

const LANE_LABEL_WIDTH = 160;
/** Beat column minimum width per zoom unit. Day matches the Calendar view's
 *  typical cell width so switching between views feels visually consistent. */
const BEAT_MIN_WIDTH_BY_ZOOM: Record<TimelineZoom, number> = {
  day: 180,
  week: 140,
  month: 120,
};
/** How many beats to append when the user scrolls near the right edge.
 *  Step size scales with unit so the visual progress per click is similar. */
const EXTENSION_STEP_BY_ZOOM: Record<TimelineZoom, number> = {
  day: 14,
  week: 4,
  month: 3,
};
/** Pixels from the right edge at which to trigger another extension. */
const EXTENSION_TRIGGER_PX = 400;
/** Height of the month/year group header row (fixed so the beat header row
 *  can offset its sticky `top` below it). */
const GROUP_ROW_HEIGHT = 26;
const LANE_ROW_HEIGHT = 68;
const CELL_MAX_ITEMS = 3;
/** Cap timeline-grid height so the lane rows scroll internally instead of
 *  pushing the page down. The unscheduled block above scrolls via native
 *  page flow + pagination. */
const TIMELINE_MAX_HEIGHT = "calc(100vh - 360px)";
const TIMELINE_MIN_HEIGHT = 420;
/** Same pagination size as the Calendar view — 12 cards fit comfortably in
 *  two rows on most viewports. */
const UNSCHEDULED_PAGE_SIZE = 12;

/** Tiny hook — returns true when the user has set `prefers-reduced-motion:
 *  reduce` in their OS, so we can disable non-essential animations. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const listener = () => setReduced(mql.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);
  return reduced;
}

const PHASE_DOT_COLORS: Record<string, string> = {
  awareness: "#3b82f6",
  consideration: "#f59e0b",
  conversion: "#10b981",
  decision: "#10b981",
  retention: "#8b5cf6",
  advocacy: "#f43f5e",
};

/** Derive a dot color from a phase label. Matches the earliest word. */
function colorForPhase(label: string): string | undefined {
  const lower = label.toLowerCase();
  for (const [key, color] of Object.entries(PHASE_DOT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return undefined;
}

const UNGROUPED_KEY = "__ungrouped__";

// ─── Helpers ───────────────────────────────────────────────────────────

function resolveCardState(item: ContentLibraryItem): CardState {
  if (item.publishedAt) return "published";
  const effectiveDate = item.scheduledPublishDate ?? item.suggestedPublishDate;
  if (!effectiveDate) return "unscheduled";
  const today = Date.now();
  const dateMs = new Date(effectiveDate).getTime();
  // Don't mark AI-suggested dates as overdue — only user-committed dates count.
  if (item.scheduledPublishDate && dateMs < today) return "overdue";
  return "scheduled";
}

/** True when the item has an AI-suggested date but the user hasn't
 *  committed it yet (no scheduledPublishDate). */
function isSuggested(item: ContentLibraryItem): boolean {
  return !item.scheduledPublishDate && !!item.suggestedPublishDate;
}

/** The date used for placement: committed > suggested > null. */
function resolveItemDate(item: ContentLibraryItem): string | null {
  return item.scheduledPublishDate ?? item.suggestedPublishDate ?? null;
}

/** Extract the group key + label for an item given the active Group-By. */
function extractGroupValue(
  item: ContentLibraryItem,
  groupBy: TimelineGroupBy,
  t: TFunction,
): {
  key: string;
  label: string;
} {
  if (groupBy === "phase") {
    const phase = (item.phase ?? "").trim();
    if (!phase) return { key: UNGROUPED_KEY, label: t("timeline.groupValue.noPhase") };
    return { key: phase, label: phase };
  }
  if (groupBy === "campaign") {
    return {
      key: item.campaignId,
      label: item.campaignName || t("timeline.groupValue.untitledCampaign"),
    };
  }
  if (groupBy === "channel") {
    const channel = item.type ?? "";
    if (!channel) return { key: UNGROUPED_KEY, label: t("timeline.groupValue.noChannel") };
    return { key: channel.toLowerCase(), label: channel };
  }
  return { key: "__all__", label: t("timeline.groupValue.allContent") };
}

function buildScheduledISOForBeat(
  beat: TimelineBeat,
  currentScheduledISO: string | null,
): string {
  // Keep time-of-day when moving; otherwise default to mid-day Monday.
  const target = new Date(beat.startDate);
  let hour = 10;
  let minute = 0;
  if (currentScheduledISO) {
    const prev = new Date(currentScheduledISO);
    hour = prev.getHours();
    minute = prev.getMinutes();
  }
  target.setHours(hour, minute, 0, 0);
  return target.toISOString();
}

// ─── Component ─────────────────────────────────────────────────────────

export function ContentLibraryTimelineView({
  items,
  campaignId,
  campaignStartDate,
  campaignEndDate,
  onOpenItem,
  onDeleteItem,
  onRenameItem,
  onDuplicateItem,
  duplicatingIds,
}: ContentLibraryTimelineViewProps) {
  const { t } = useTranslation("campaigns-content-library");
  const groupBy = useContentLibraryStore((s) => s.timelineGroupBy);
  const setGroupBy = useContentLibraryStore((s) => s.setTimelineGroupBy);
  const zoom = useContentLibraryStore((s) => s.timelineZoom);
  const setZoom = useContentLibraryStore((s) => s.setTimelineZoom);
  const updateSchedule = useUpdateDeliverableSchedule();
  const updatePhase = useUpdateDeliverable(campaignId ?? "");
  const prefersReducedMotion = usePrefersReducedMotion();

  // Hide lanes that have no items scheduled in the visible range. When
  // grouping by Campaign in workspace mode with 20+ campaigns, most lanes
  // are empty — this keeps the view scannable.
  const [hideEmptyLanes, setHideEmptyLanes] = useState(true);

  // Pagination + search for the unscheduled block.
  const [unscheduledPage, setUnscheduledPage] = useState(0);
  const [unscheduledSearch, setUnscheduledSearch] = useState("");

  // Row/column hover highlight — improves scannability on dense timelines.
  const [hoveredLaneKey, setHoveredLaneKey] = useState<string | null>(null);
  const [hoveredBeatIndex, setHoveredBeatIndex] = useState<number | null>(null);

  // Chronology cursor — shows a vertical line + date tooltip at mouse X.
  const [cursorX, setCursorX] = useState<number | null>(null);

  // Expanded cells: clicking "+N more" reveals all items in a (lane, beat) cell.
  const [expandedCellKeys, setExpandedCellKeys] = useState<Set<string>>(new Set());

  // Forward-infinite scroll: beats grow as the user approaches the right
  // edge. Resets to 0 when zoom changes so we don't carry over an absurd
  // month-level extension into day zoom (which would explode DOM size).
  const [forwardExtension, setForwardExtension] = useState(0);
  const pendingExtendRef = useRef(false);
  useEffect(() => {
    setForwardExtension(0);
    pendingExtendRef.current = false;
  }, [zoom]);

  // Scrollable wrapper ref — used to scroll to today and to measure cursor X.
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const groupSelectRef = useRef<HTMLSelectElement>(null);

  // Auto-adjust default group-by when entering/leaving campaign mode.
  // Do this once on mount — user can still override.
  const autoAdjustedRef = useRef(false);
  if (!autoAdjustedRef.current) {
    autoAdjustedRef.current = true;
    if (campaignId && groupBy === "campaign") {
      setGroupBy("phase");
    } else if (!campaignId && groupBy === "phase") {
      setGroupBy("campaign");
    }
  }

  // Group-by options — hide "phase" in workspace mode since phase names vary
  // per campaign and don't cluster meaningfully across campaigns.
  const groupByOptions = useMemo(() => {
    const opts: Array<{ value: TimelineGroupBy; label: string }> = [];
    if (campaignId) opts.push({ value: "phase", label: t("timeline.groupBy.phase") });
    if (!campaignId) opts.push({ value: "campaign", label: t("timeline.groupBy.campaign") });
    opts.push({ value: "channel", label: t("timeline.groupBy.channel") });
    opts.push({ value: "none", label: t("timeline.groupBy.none") });
    return opts;
  }, [campaignId, t]);

  // ─── Beats (unit columns: day / week / month) ───────────────────
  const { beats, todayBeatIndex } = useMemo(
    () =>
      buildTimelineBeats(
        campaignStartDate,
        items.flatMap((it) => [
          it.scheduledPublishDate,
          it.suggestedPublishDate,
        ]),
        campaignEndDate,
        zoom,
        forwardExtension,
      ),
    [campaignStartDate, campaignEndDate, items, zoom, forwardExtension],
  );
  // Release the pending-extend latch once new beats have been built.
  useEffect(() => {
    pendingExtendRef.current = false;
  }, [beats.length]);

  const beatMinWidth = BEAT_MIN_WIDTH_BY_ZOOM[zoom];

  // Cluster beats by their shared group label — months for day/week zoom,
  // years for month zoom. Used to render the sticky month/year row above
  // the beat headers so the current period is always visible.
  const groups = useMemo(() => {
    const out: { label: string; startIndex: number; endIndex: number }[] = [];
    if (beats.length === 0) return out;
    let currentLabel = beats[0].groupLabel ?? "";
    let currentStart = 0;
    for (let i = 1; i < beats.length; i++) {
      const label = beats[i].groupLabel ?? "";
      if (label !== currentLabel) {
        out.push({ label: currentLabel, startIndex: currentStart, endIndex: i - 1 });
        currentLabel = label;
        currentStart = i;
      }
    }
    out.push({ label: currentLabel, startIndex: currentStart, endIndex: beats.length - 1 });
    return out;
  }, [beats]);

  // ─── Chronology cursor: compute hover date from cursor X ─────────
  // Uses each beat's real date extent so the math works for day/week/month
  // units uniformly (beat width varies per unit but formula is the same).
  const hoverDate = useMemo(() => {
    if (cursorX === null || !gridInnerRef.current) return null;
    const beatsStart = LANE_LABEL_WIDTH;
    if (cursorX < beatsStart) return null;
    const fullWidth = gridInnerRef.current.scrollWidth;
    const beatsAreaWidth = fullWidth - beatsStart;
    if (beatsAreaWidth <= 0) return null;
    const beatWidth = beatsAreaWidth / beats.length;
    const relativeX = cursorX - beatsStart;
    const beatIndex = Math.min(
      beats.length - 1,
      Math.max(0, Math.floor(relativeX / beatWidth)),
    );
    const beat = beats[beatIndex];
    if (!beat) return null;
    // Interpolate within the beat's actual start→end range.
    const fractionInBeat = Math.max(
      0,
      Math.min(1, (relativeX - beatIndex * beatWidth) / beatWidth),
    );
    const spanMs = beat.endDate.getTime() - beat.startDate.getTime();
    const date = new Date(beat.startDate.getTime() + spanMs * fractionInBeat);
    return { date, left: cursorX };
  }, [cursorX, beats]);

  // ─── Scroll-to-today ──────────────────────────────────────────────
  const scrollToToday = useCallback(() => {
    if (todayBeatIndex === null || !scrollWrapperRef.current || !gridInnerRef.current) return;
    const wrapperWidth = scrollWrapperRef.current.clientWidth;
    const totalWidth = gridInnerRef.current.scrollWidth;
    const beatsWidth = totalWidth - LANE_LABEL_WIDTH;
    const beatWidth = beatsWidth / beats.length;
    const targetLeft = LANE_LABEL_WIDTH + beatWidth * todayBeatIndex - wrapperWidth / 3;
    scrollWrapperRef.current.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [todayBeatIndex, beats.length, prefersReducedMotion]);

  // Auto-scroll once on mount so the user lands on today.
  const autoScrolledRef = useRef(false);
  useLayoutEffect(() => {
    if (autoScrolledRef.current) return;
    if (todayBeatIndex !== null) {
      autoScrolledRef.current = true;
      // rAF so layout is measured first.
      requestAnimationFrame(scrollToToday);
    }
  }, [todayBeatIndex, scrollToToday]);

  // ─── Bucket items into (lane, beat) + unscheduled drawer ──────────
  const { lanes, bucket, unscheduled, hiddenLaneCount } = useMemo(() => {
    const laneMap = new Map<string, GroupLane>();
    const bucket = new Map<string, ContentLibraryItem[]>();
    const unscheduled: ContentLibraryItem[] = [];

    for (const item of items) {
      const { key, label } = extractGroupValue(item, groupBy, t);
      if (!laneMap.has(key)) {
        laneMap.set(key, {
          key,
          label,
          dotColor: groupBy === "phase" ? colorForPhase(label) : undefined,
        });
      }

      // Placement date: committed schedule wins, then AI suggestion. Items
      // with neither fall through to the unscheduled drawer.
      const placementDate = resolveItemDate(item);
      if (!placementDate) {
        unscheduled.push(item);
        continue;
      }
      const beatIdx = findBeatIndexForDate(beats, placementDate);
      if (beatIdx === null) {
        unscheduled.push(item);
        continue;
      }
      const bucketKey = `${key}::${beatIdx}`;
      if (!bucket.has(bucketKey)) bucket.set(bucketKey, []);
      bucket.get(bucketKey)!.push(item);
    }

    // Stable ordering — phases keep insertion order (blueprint order),
    // other dimensions sort alphabetically with Ungrouped at the end.
    let laneList = Array.from(laneMap.values());
    if (groupBy !== "phase") {
      laneList.sort((a, b) => {
        if (a.key === UNGROUPED_KEY) return 1;
        if (b.key === UNGROUPED_KEY) return -1;
        return a.label.localeCompare(b.label);
      });
    }

    // Collect the set of lane keys that have at least one scheduled item,
    // so the UI can hide lanes that would otherwise be pure whitespace.
    const laneKeysWithItems = new Set<string>();
    for (const bk of bucket.keys()) {
      laneKeysWithItems.add(bk.split("::")[0]);
    }
    const totalLaneCount = laneList.length;
    if (hideEmptyLanes) {
      laneList = laneList.filter((l) => laneKeysWithItems.has(l.key));
    }

    // If everything is empty, still show one placeholder lane.
    if (laneList.length === 0) {
      laneList.push({ key: "__empty__", label: t("timeline.groupValue.noScheduled") });
    }

    return {
      lanes: laneList,
      bucket,
      unscheduled,
      hiddenLaneCount: totalLaneCount - laneList.length,
    };
  }, [items, groupBy, beats, hideEmptyLanes, t]);

  // ─── Drag state ────────────────────────────────────────────────────
  const [dragOver, setDragOver] = useState<{ laneKey: string; beatIndex: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, item: ContentLibraryItem) => {
      const { key: currentGroupValue } = extractGroupValue(item, groupBy, t);
      const payload: DragPayload = {
        deliverableId: item.id,
        campaignId: item.campaignId,
        // Fall back to suggestedPublishDate so dragging a suggested item
        // preserves its time-of-day and beat position correctly.
        currentScheduledISO: resolveItemDate(item),
        currentGroupValue:
          currentGroupValue === UNGROUPED_KEY || currentGroupValue === "__all__"
            ? null
            : currentGroupValue,
        contentType: item.type,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
    },
    [groupBy, t],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOver(null);
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/contentEditable.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      // Ignore with modifier keys so we don't hijack Cmd/Ctrl combos.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case "t":
          e.preventDefault();
          scrollToToday();
          break;
        case "d":
          e.preventDefault();
          setZoom("day");
          break;
        case "w":
          e.preventDefault();
          setZoom("week");
          break;
        case "m":
          e.preventDefault();
          setZoom("month");
          break;
        case "h":
          e.preventDefault();
          setHideEmptyLanes((v) => !v);
          break;
        case "g":
          e.preventDefault();
          groupSelectRef.current?.focus();
          break;
        case "escape":
          if (isDragging) {
            e.preventDefault();
            setIsDragging(false);
            setDragOver(null);
          }
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [scrollToToday, setZoom, isDragging]);

  // ─── Unscheduled filter (inline search) ────────────────────────────
  const toggleExpandedCell = useCallback((key: string) => {
    setExpandedCellKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /** Schedule / unschedule via date picker — same UX as Calendar view. */
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
      // Parse YYYY-MM-DD locally, preserve time-of-day from previous schedule.
      const [y, m, d] = isoDate.split("-").map(Number);
      const target = new Date(y, m - 1, d);
      let hour = 10;
      let minute = 0;
      if (item.scheduledPublishDate) {
        const prev = new Date(item.scheduledPublishDate);
        hour = prev.getHours();
        minute = prev.getMinutes();
      }
      target.setHours(hour, minute, 0, 0);
      updateSchedule.mutate({
        deliverableId: item.id,
        campaignId: item.campaignId,
        scheduledPublishDate: target.toISOString(),
      });
    },
    [updateSchedule],
  );

  const handleCellDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, laneKey: string, beatIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOver({ laneKey, beatIndex });
    },
    [],
  );

  const handleCellDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragOver(null);
    },
    [],
  );

  const handleCellDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, laneKey: string, beatIndex: number) => {
      e.preventDefault();
      setDragOver(null);
      setIsDragging(false);
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        const payload: DragPayload = JSON.parse(raw);
        const beat = beats[beatIndex];
        if (!beat) return;

        // 1. Update schedule if the beat changed OR item was unscheduled.
        const currentBeatIdx = payload.currentScheduledISO
          ? findBeatIndexForDate(beats, payload.currentScheduledISO)
          : null;
        const dateChanged = currentBeatIdx !== beatIndex;
        if (dateChanged) {
          const newISO = buildScheduledISOForBeat(beat, payload.currentScheduledISO);
          updateSchedule.mutate({
            deliverableId: payload.deliverableId,
            campaignId: payload.campaignId,
            scheduledPublishDate: newISO,
          });
        }

        // 2. Update group field if we're grouping by a writable dimension
        //    and the lane changed. Only phase writes to the DB today —
        //    campaign/channel changes would need a different endpoint.
        const groupChanged = payload.currentGroupValue !== laneKey && laneKey !== UNGROUPED_KEY;
        if (groupChanged && groupBy === "phase" && payload.campaignId === campaignId) {
          updatePhase.mutate({
            deliverableId: payload.deliverableId,
            body: { journeyPhase: laneKey } as Parameters<typeof updatePhase.mutate>[0]["body"],
          });
        }
      } catch {
        // malformed payload — ignore
      }
    },
    [beats, updateSchedule, updatePhase, groupBy, campaignId],
  );

  // ─── Render ────────────────────────────────────────────────────────
  const gridTemplateColumns = `${LANE_LABEL_WIDTH}px repeat(${beats.length}, minmax(${beatMinWidth}px, 1fr))`;

  // Items broken down by commitment state.
  const suggestedItems = useMemo(
    () => items.filter(isSuggested),
    [items],
  );
  const suggestedCount = suggestedItems.length;
  const committedCount = items.filter((it) => !!it.scheduledPublishDate).length;
  const scheduledCount = items.length - unscheduled.length;

  /** Bulk-accept all AI-suggested dates → convert to committed scheduledPublishDate. */
  const handleAcceptAllSuggestions = useCallback(() => {
    if (suggestedItems.length === 0) return;
    for (const item of suggestedItems) {
      if (!item.suggestedPublishDate) continue;
      updateSchedule.mutate({
        deliverableId: item.id,
        campaignId: item.campaignId,
        scheduledPublishDate: item.suggestedPublishDate,
      });
    }
  }, [suggestedItems, updateSchedule]);

  // Filter unscheduled by search query (case-insensitive title contains).
  const filteredUnscheduled = useMemo(() => {
    const q = unscheduledSearch.trim().toLowerCase();
    if (!q) return unscheduled;
    return unscheduled.filter((item) =>
      (item.title + " " + (item.campaignName ?? "") + " " + item.type)
        .toLowerCase()
        .includes(q),
    );
  }, [unscheduled, unscheduledSearch]);

  // Unscheduled pagination bookkeeping (identical math to Calendar view).
  const totalUnscheduledPages = Math.ceil(filteredUnscheduled.length / UNSCHEDULED_PAGE_SIZE);
  const safeUnscheduledPage = Math.min(unscheduledPage, Math.max(0, totalUnscheduledPages - 1));
  const pageStart = safeUnscheduledPage * UNSCHEDULED_PAGE_SIZE;
  const unscheduledPageItems = filteredUnscheduled.slice(pageStart, pageStart + UNSCHEDULED_PAGE_SIZE);
  const showUnscheduledPagination = totalUnscheduledPages > 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2 flex-wrap">
          <GanttChartSquare className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">{t("timeline.title")}</span>
          <span className="mx-1 text-gray-300">·</span>
          <span className="text-xs text-gray-500">{t("timeline.groupByLabel")}</span>
          <select
            ref={groupSelectRef}
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as TimelineGroupBy)}
            className="text-xs rounded-md border border-gray-300 bg-white py-1 px-2 focus:outline-none focus:ring-2 focus:ring-primary-400"
            style={{ minWidth: 160 }}
            aria-label={t("timeline.groupByAria")}
          >
            {groupByOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Zoom preset toggle: Day / Week / Month */}
          <div
            className="inline-flex items-center bg-white rounded-md border border-gray-300 ml-2"
            style={{ padding: 2 }}
          >
            {(["day", "week", "month"] as TimelineZoom[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                aria-pressed={zoom === z}
                title={t("timeline.zoomTitle", { label: t(`timeline.zoom.${z}`), key: z[0].toUpperCase() })}
                className={`inline-flex items-center gap-1 text-xs font-medium rounded transition-colors ${
                  zoom === z
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                style={{ padding: "3px 8px" }}
              >
                {t(`timeline.zoom.${z}`)}
              </button>
            ))}
          </div>

          {/* Today button */}
          {todayBeatIndex !== null && (
            <button
              type="button"
              onClick={scrollToToday}
              title={t("timeline.jumpToday")}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ml-1"
              style={{ padding: "4px 10px" }}
            >
              <CalendarClock className="h-3 w-3" />
              {t("timeline.today")}
            </button>
          )}

          {hiddenLaneCount > 0 && (
            <button
              type="button"
              onClick={() => setHideEmptyLanes(false)}
              className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 ml-2"
              title={t("timeline.showEmptyTitle")}
            >
              <Eye className="h-3 w-3" />
              {t("timeline.showEmpty", { n: hiddenLaneCount })}
            </button>
          )}
          {!hideEmptyLanes && (
            <button
              type="button"
              onClick={() => setHideEmptyLanes(true)}
              className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 ml-2"
              title={t("timeline.hideEmptyTitle")}
            >
              <EyeOff className="h-3 w-3" />
              {t("timeline.hideEmpty")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {suggestedCount > 0 && (
            <button
              type="button"
              onClick={handleAcceptAllSuggestions}
              disabled={updateSchedule.isPending}
              title={t("timeline.acceptAllTitle")}
              className="inline-flex items-center gap-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors disabled:opacity-50"
              style={{ padding: "4px 10px" }}
            >
              <Sparkles className="h-3 w-3" />
              {t("timeline.acceptSuggestions", { count: suggestedCount })}
            </button>
          )}
          <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
            <span>{t("timeline.weeks", { n: beats.length })}</span>
            <span>·</span>
            <span title={t("timeline.committedTitle")}>{t("timeline.committedScheduled", { n: committedCount })}</span>
            {suggestedCount > 0 && (
              <>
                <span>·</span>
                <span
                  title={t("timeline.suggestedTitle")}
                  className="text-teal-600"
                >
                  {t("timeline.suggested", { n: suggestedCount })}
                </span>
              </>
            )}
            <span>·</span>
            <span>{t("timeline.unscheduled", { n: unscheduled.length })}</span>
          </div>
        </div>
      </div>

      {/* Unscheduled block — matches Calendar view pattern: horizontal grid
          above the timeline, with pagination when > 12 items + inline search. */}
      {unscheduled.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                {t("timeline.unscheduledHeading")}
                {unscheduledSearch ? (
                  <span className="ml-1 text-gray-500">
                    ({filteredUnscheduled.length}/{unscheduled.length})
                  </span>
                ) : (
                  <span className="ml-1 text-gray-500">({unscheduled.length})</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search — quick filter within the drawer */}
              <div className="relative" style={{ minWidth: 200 }}>
                <Search
                  aria-hidden
                  className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"
                  style={{ left: 10 }}
                />
                <input
                  type="text"
                  value={unscheduledSearch}
                  onChange={(e) => {
                    setUnscheduledSearch(e.target.value);
                    setUnscheduledPage(0);
                  }}
                  placeholder={t("timeline.filterPlaceholder")}
                  className="text-[11px] bg-white border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-400"
                  style={{ padding: "5px 10px 5px 30px", width: "100%" }}
                />
              </div>
              <span className="text-[11px] text-gray-500">
                {t("timeline.dragWeekHint")}
              </span>
              {showUnscheduledPagination && (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    disabled={safeUnscheduledPage === 0}
                    onClick={() => setUnscheduledPage((p) => Math.max(0, p - 1))}
                    className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("common.prev")}
                  </button>
                  <span className="text-[11px] text-gray-600 tabular-nums">
                    {safeUnscheduledPage + 1}/{totalUnscheduledPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeUnscheduledPage >= totalUnscheduledPages - 1}
                    onClick={() =>
                      setUnscheduledPage((p) =>
                        Math.min(totalUnscheduledPages - 1, p + 1),
                      )
                    }
                    className="px-1.5 py-0.5 rounded text-[11px] font-medium border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("common.next")}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
            onDragEnd={handleDragEnd}
          >
            {unscheduledPageItems.map((item) => {
              const channelKey = detectChannelKey(item.type);
              const channelHex = channelKey ? getChannelColor(channelKey).hex : undefined;
              return (
                <CalendarCard
                  key={item.id}
                  title={item.title}
                  typeLabel={item.type}
                  state="unscheduled"
                  qualityScore={item.qualityScore ?? null}
                  channelHex={channelHex}
                  isFavorite={item.isFavorite}
                  workflowStatus={item.status}
                  campaignName={item.campaignName}
                  isPublishReady={item.isPublishReady}
                  hasContent={item.hasContent}
                  readinessHint={item.readinessHint ?? null}
                  phase={item.phase ?? null}
                  campaignType={item.campaignType}
                  isDraggable
                  onClick={() => onOpenItem?.(item.id, item.campaignId)}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onDatePick={(iso) => handleDatePick(item, iso)}
                  onDelete={
                    onDeleteItem
                      ? () => onDeleteItem(item.id, item.campaignId)
                      : undefined
                  }
                  onRename={
                    onRenameItem
                      ? (newTitle) => onRenameItem(item.id, item.campaignId, newTitle)
                      : undefined
                  }
                  onDuplicate={
                    onDuplicateItem
                      ? () => onDuplicateItem(item.id, item.campaignId)
                      : undefined
                  }
                  isDuplicating={duplicatingIds?.has(item.id)}
                />
              );
            })}
            {unscheduledPageItems.length === 0 && unscheduledSearch && (
              <div className="col-span-full text-xs text-gray-400 italic px-2 py-3">
                {t("timeline.noMatches", { query: unscheduledSearch })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline grid — bordered box, scrolls internally for wide/tall content */}
      <div
        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
        style={{
          maxHeight: TIMELINE_MAX_HEIGHT,
          minHeight: TIMELINE_MIN_HEIGHT,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Main timeline */}
        <div
          ref={scrollWrapperRef}
          style={{ flex: 1, minWidth: 0, overflow: "auto", position: "relative" }}
          onMouseMove={(e) => {
            if (!gridInnerRef.current) return;
            const rect = gridInnerRef.current.getBoundingClientRect();
            setCursorX(e.clientX - rect.left);
          }}
          onMouseLeave={() => setCursorX(null)}
          onScroll={(e) => {
            if (pendingExtendRef.current) return;
            const el = e.currentTarget;
            const remaining = el.scrollWidth - el.scrollLeft - el.clientWidth;
            if (remaining < EXTENSION_TRIGGER_PX) {
              pendingExtendRef.current = true;
              setForwardExtension((n) => n + EXTENSION_STEP_BY_ZOOM[zoom]);
            }
          }}
        >

        {/* Grid */}
        <div ref={gridInnerRef} style={{ position: "relative", minWidth: "fit-content" }}>
          {/* Group row — month (day/week zoom) or year (month zoom) spans.
              Each group label is sticky-left within its own column span, so
              the current period's label stays visible even when you scroll
              past its leftmost edge. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns,
              position: "sticky",
              top: 0,
              zIndex: 3,
              backgroundColor: "#ffffff",
              height: GROUP_ROW_HEIGHT,
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            {/* Corner — sticky on both axes, sits above lane-label column */}
            <div
              style={{
                position: "sticky",
                left: 0,
                zIndex: 4,
                backgroundColor: "#f9fafb",
                borderRight: "1px solid #e5e7eb",
              }}
            />
            {groups.map((g) => (
              <div
                key={g.startIndex}
                style={{
                  gridColumn: `${g.startIndex + 2} / ${g.endIndex + 3}`,
                  backgroundColor: "#f9fafb",
                  borderRight: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  overflow: "hidden",
                  padding: "0 10px",
                }}
              >
                <span
                  style={{
                    position: "sticky",
                    // Clamp just right of the lane-label column so the label
                    // slides along with horizontal scroll within its span.
                    left: LANE_LABEL_WIDTH + 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#374151",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  {g.label}
                </span>
              </div>
            ))}
          </div>

          {/* Header row with beat labels (week / day / month) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns,
              position: "sticky",
              top: GROUP_ROW_HEIGHT,
              zIndex: 2,
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRight: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                fontSize: 11,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                // Sticky on BOTH axes so the Group-By label stays pinned
                // in the top-left corner while scrolling either direction.
                position: "sticky",
                left: 0,
                zIndex: 3,
              }}
            >
              {groupByLabelForSelect(groupBy, t)}
            </div>
            {beats.map((beat) => {
              // Count items in this column (across all lanes) for tooltip.
              let beatItemCount = 0;
              for (const lane of lanes) {
                beatItemCount += (bucket.get(`${lane.key}::${beat.index}`) ?? []).length;
              }
              const isHovered = hoveredBeatIndex === beat.index;
              const isToday = beat.index === todayBeatIndex;
              // Weekend shading — only meaningful at day granularity.
              const dayNr = beat.startDate.getDay();
              const isWeekend = zoom === "day" && (dayNr === 0 || dayNr === 6);
              return (
                <div
                  key={beat.index}
                  title={t("timeline.beatTitle", { label: beat.longLabel, count: beatItemCount })}
                  onMouseEnter={() => setHoveredBeatIndex(beat.index)}
                  onMouseLeave={() => setHoveredBeatIndex((i) => (i === beat.index ? null : i))}
                  style={{
                    padding: zoom === "day" ? "8px 6px" : "8px 10px",
                    borderRight: "1px solid #f3f4f6",
                    // Heavier border at group boundaries (start of month/year)
                    // so the scanning still gives a sense of larger time scale.
                    borderLeft: beat.isGroupStart && beat.index !== 0 ? "2px solid #e5e7eb" : undefined,
                    color: isToday ? "#0d9488" : "#6b7280",
                    backgroundColor: isHovered
                      ? "rgba(13, 148, 136, 0.05)"
                      : isWeekend
                        ? "#f3f4f6"
                        : undefined,
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.2,
                    }}
                  >
                    {beat.label}
                  </div>
                  {beat.secondary && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#9ca3af",
                        fontWeight: beat.isGroupStart ? 600 : 400,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.2,
                        marginTop: 1,
                      }}
                    >
                      {beat.secondary}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lane rows */}
          {lanes.map((lane) => {
            const isLaneHovered = hoveredLaneKey === lane.key;
            const laneDimmed = hoveredLaneKey !== null && !isLaneHovered && !prefersReducedMotion;
            return (
              <div
                key={lane.key}
                onMouseEnter={() => setHoveredLaneKey(lane.key)}
                onMouseLeave={() =>
                  setHoveredLaneKey((k) => (k === lane.key ? null : k))
                }
                style={{
                  display: "grid",
                  gridTemplateColumns,
                  borderBottom: "1px solid #f3f4f6",
                  minHeight: LANE_ROW_HEIGHT,
                  opacity: laneDimmed ? 0.55 : 1,
                  transition: prefersReducedMotion ? undefined : "opacity 120ms ease",
                  backgroundColor: isLaneHovered ? "rgba(13, 148, 136, 0.02)" : undefined,
                }}
              >
                {/* Lane label */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderRight: "1px solid #e5e7eb",
                    backgroundColor: isLaneHovered ? "#f3f4f6" : "#f9fafb",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  {lane.dotColor && (
                    <span
                      className="rounded-full flex-shrink-0"
                      style={{ width: 8, height: 8, backgroundColor: lane.dotColor }}
                    />
                  )}
                  <span
                    className="text-sm font-medium text-gray-700 truncate"
                    title={lane.label}
                  >
                    {lane.label}
                  </span>
                </div>

                {/* Beat cells */}
                {beats.map((beat) => {
                  const bucketKey = `${lane.key}::${beat.index}`;
                  const cellItems = bucket.get(bucketKey) ?? [];
                  const isOver =
                    dragOver?.laneKey === lane.key && dragOver?.beatIndex === beat.index;
                  const isToday = beat.index === todayBeatIndex;
                  const isColumnHovered = hoveredBeatIndex === beat.index;
                  const expanded = expandedCellKeys.has(bucketKey);
                  const overflow = cellItems.length > CELL_MAX_ITEMS;
                  const visibleItems = expanded
                    ? cellItems
                    : cellItems.slice(0, CELL_MAX_ITEMS);
                  const dayNr = beat.startDate.getDay();
                  const isWeekend = zoom === "day" && (dayNr === 0 || dayNr === 6);
                  return (
                    <div
                      key={beat.index}
                      onDragOver={(e) => handleCellDragOver(e, lane.key, beat.index)}
                      onDragLeave={handleCellDragLeave}
                      onDrop={(e) => handleCellDrop(e, lane.key, beat.index)}
                      onMouseEnter={() => setHoveredBeatIndex(beat.index)}
                      onMouseLeave={() =>
                        setHoveredBeatIndex((i) => (i === beat.index ? null : i))
                      }
                      style={{
                        padding: zoom === "day" ? 3 : 6,
                        borderRight: "1px solid #f3f4f6",
                        borderLeft: beat.isGroupStart && beat.index !== 0 ? "2px solid #e5e7eb" : undefined,
                        backgroundColor: isOver
                          ? "rgba(13, 148, 136, 0.08)"
                          : isColumnHovered
                            ? "rgba(13, 148, 136, 0.04)"
                            : isToday
                              ? "rgba(13, 148, 136, 0.03)"
                              : isWeekend
                                ? "rgba(0, 0, 0, 0.025)"
                                : undefined,
                        boxShadow: isOver ? "inset 0 0 0 2px #0d9488" : undefined,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {visibleItems.map((item) => {
                        const suggested = isSuggested(item);
                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}
                            style={{
                              cursor: "grab",
                              ...(suggested
                                ? {
                                    // Dashed teal outline signals the date is AI-suggested,
                                    // not user-committed. Accepting a suggestion removes it.
                                    borderRadius: 6,
                                    outline: "1px dashed #14b8a6",
                                    outlineOffset: 1,
                                    opacity: 0.92,
                                  }
                                : {}),
                            }}
                            title={
                              suggested
                                ? t("timeline.suggestedCardTitle")
                                : undefined
                            }
                          >
                            <CalendarCard
                              title={item.title}
                              typeLabel={item.type}
                              state={resolveCardState(item)}
                              qualityScore={item.qualityScore ?? null}
                              isFavorite={item.isFavorite}
                              campaignName={
                                groupBy !== "campaign" ? item.campaignName : undefined
                              }
                              isPublishReady={item.isPublishReady}
                              hasContent={item.hasContent}
                              readinessHint={item.readinessHint ?? null}
                              phase={item.phase ?? null}
                              onClick={() => onOpenItem?.(item.id, item.campaignId)}
                              onDelete={
                                onDeleteItem
                                  ? () => onDeleteItem(item.id, item.campaignId)
                                  : undefined
                              }
                              onRename={
                                onRenameItem
                                  ? (newTitle) =>
                                      onRenameItem(item.id, item.campaignId, newTitle)
                                  : undefined
                              }
                              onDuplicate={
                                onDuplicateItem
                                  ? () =>
                                      onDuplicateItem(item.id, item.campaignId)
                                  : undefined
                              }
                              isDuplicating={duplicatingIds?.has(item.id)}
                            />
                          </div>
                        );
                      })}
                      {overflow && (
                        <button
                          type="button"
                          onClick={() => toggleExpandedCell(bucketKey)}
                          className="text-[11px] font-medium text-teal-700 hover:text-teal-900 text-left rounded hover:bg-teal-50 transition-colors"
                          style={{ padding: "2px 4px" }}
                        >
                          {expanded
                            ? t("common.showLess")
                            : t("common.more", { n: cellItems.length - CELL_MAX_ITEMS })}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Today vertical indicator */}
          {todayBeatIndex !== null && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `calc(${LANE_LABEL_WIDTH}px + (100% - ${LANE_LABEL_WIDTH}px) * ${
                  (todayBeatIndex + 0.5) / beats.length
                })`,
                width: 2,
                backgroundColor: "#0d9488",
                opacity: 0.4,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Chronology cursor — vertical line + date tooltip following mouse */}
          {hoverDate && (
            <>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: hoverDate.left,
                  width: 1,
                  backgroundColor: "#9ca3af",
                  pointerEvents: "none",
                  zIndex: 3,
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 4,
                  left: hoverDate.left + 6,
                  padding: "2px 6px",
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: "#374151",
                  borderRadius: 3,
                  pointerEvents: "none",
                  zIndex: 3,
                  whiteSpace: "nowrap",
                }}
              >
                {hoverDate.date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </>
          )}
        </div>
      </div>

      </div>{/* /timeline grid container */}

      {/* Global drag indicator — shows lane-level drop hint. Unused for now. */}
      {isDragging && null}
    </div>
  );
}

function groupByLabelForSelect(groupBy: TimelineGroupBy, t: TFunction): string {
  switch (groupBy) {
    case "phase":
      return t("timeline.groupBy.phase");
    case "campaign":
      return t("timeline.groupBy.campaign");
    case "channel":
      return t("timeline.groupBy.channel");
    case "none":
      return t("timeline.groupValue.allContent");
  }
}

export default ContentLibraryTimelineView;
