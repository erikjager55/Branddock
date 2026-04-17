"use client";

import { useCallback, useMemo, useState, type DragEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  AlertTriangle,
} from "lucide-react";
import type {
  AssetPlanLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  ScheduledDeliverable,
} from "@/lib/campaigns/strategy-blueprint.types";
import { usePersonas } from "@/features/personas/hooks";
import type { PersonaWithMeta } from "@/features/personas/types/persona.types";
import { computeDeploymentSchedule } from "@/features/campaigns/lib/deployment-scheduler";
import { getChannelLabel } from "@/features/campaigns/lib/channel-frequency";
import { getChannelColor } from "@/features/campaigns/lib/channel-colors";
import {
  getPersonaColor,
  type PersonaColorStyle,
} from "@/features/campaigns/lib/persona-colors";
import type {
  PersonaLegendInfo,
  CardPersonaInfo,
} from "./shared-timeline-cards";
import { TimelineFilterBar } from "./TimelineFilterBar";
import {
  parseLocalDate,
  stripTime,
  addDays,
  dateKey,
  formatMonthLabel,
  buildCalendarDays,
  WEEKDAY_LABELS,
} from "@/features/campaigns/lib/calendar-helpers";
import { useUpdateDeliverableSchedule } from "@/features/campaigns/hooks";
import {
  CalendarCard,
  type CardState,
} from "@/features/campaigns/components/shared/calendar-cards";

/** Format Date as YYYY-MM-DD for native date input value */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Map blueprint deliverable status → CalendarCard state.
 *  undefined (no DB record) → "unscheduled" (triggers RED traffic light)
 *  NOT_STARTED → "unscheduled" (RED)
 *  IN_PROGRESS → "scheduled" (AMBER)
 *  COMPLETED → "published" (GREEN) */
function mapBlueprintState(dbStatus: string | undefined): CardState {
  if (!dbStatus || dbStatus === "NOT_STARTED") return "unscheduled";
  if (dbStatus === "COMPLETED") return "published";
  return "scheduled";
}

// ─── Constants ──────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  "must-have": 0,
  "should-have": 1,
  "nice-to-have": 2,
};

/** Phase color palette — shared with Timeline view */
const PHASE_COLORS = [
  { cell: "bg-blue-50/30", border: "border-l-blue-300", dot: "#3b82f6" },
  { cell: "bg-violet-50/30", border: "border-l-violet-300", dot: "#8b5cf6" },
  { cell: "bg-amber-50/30", border: "border-l-amber-300", dot: "#f59e0b" },
  { cell: "bg-emerald-50/30", border: "border-l-emerald-300", dot: "#10b981" },
  { cell: "bg-rose-50/30", border: "border-l-rose-300", dot: "#f43f5e" },
  { cell: "bg-cyan-50/30", border: "border-l-cyan-300", dot: "#06b6d4" },
];

function getPhaseColor(phaseIdx: number) {
  return PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
}

/** Compute beat → date for a deliverable.
 *  Spreads items within the same beat across Mon-Fri based on suggestedOrder.
 *  Items beyond 5 wrap to Sat/Sun. */
function getItemDate(
  startDate: Date,
  beatIndex: number,
  suggestedOrder: number | undefined,
): Date {
  // beatIndex -1 = Preparation (week before campaign start)
  const weekStart =
    beatIndex < 0
      ? addDays(startDate, -7)
      : addDays(startDate, beatIndex * 7);
  const order = suggestedOrder && suggestedOrder > 0 ? suggestedOrder - 1 : 0;
  const dayOffset = order % 7; // Mon..Sun
  return addDays(weekStart, dayOffset);
}

// ─── Time defaults (research-backed, mirrors ContentLibraryCalendar) ─

const CHANNEL_DEFAULT_HOURS: Record<string, number> = {
  linkedin: 14,
  instagram: 11,
  facebook: 13,
  pinterest: 10,
  tiktok: 19,
  twitter: 9,
  x: 9,
  email: 10,
  newsletter: 10,
};
const FALLBACK_HOUR = 10;

function getDefaultHourForType(contentType: string): number {
  const lower = contentType.toLowerCase();
  for (const [channel, hour] of Object.entries(CHANNEL_DEFAULT_HOURS)) {
    if (lower.includes(channel)) return hour;
  }
  return FALLBACK_HOUR;
}

/** Compose ISO datetime, preserving time when re-scheduling. */
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

// ─── Types ──────────────────────────────────────────────────────

/** DB-side deliverable info needed for drag-and-drop scheduling */
export interface DeliverableDbInfo {
  id: string;
  scheduledPublishDate: string | null;
}

interface DeploymentCalendarViewProps {
  assetPlan: AssetPlanLayer;
  architecture: ArchitectureLayer;
  channelPlan: ChannelPlanLayer;
  onBringToLife?: (deliverableTitle: string, contentType: string) => void;
  onDeleteDeliverable?: (title: string) => void;
  campaignStartDate?: string | null;
  deliverableStatuses?: Map<string, string>;
  /** Title (lowercase, trimmed) → DB info for drag-and-drop scheduling.
   *  When provided, items with a DB match become draggable. */
  deliverableDbLookup?: Map<string, DeliverableDbInfo>;
  /** Required for drag-and-drop — used in the PATCH endpoint URL */
  campaignId?: string;
}

interface DragPayload {
  deliverableId: string;
  campaignId: string;
  currentScheduledISO: string | null;
  contentType: string;
}

interface CalendarItem {
  scheduled: ScheduledDeliverable & { schedulerBeatIndex: number };
  date: Date;
  /** Phase index (for cell tinting) */
  phaseIdx: number;
}

// ─── Sub-components ─────────────────────────────────────────────

// (Detail modal removed — cards now navigate directly to canvas via onBringToLife)

/** Banner shown when campaignStartDate is missing */
function NoStartDateBanner() {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-900 mb-1">
          Campaign start date required
        </p>
        <p className="text-xs text-amber-800">
          Set a start date on the campaign to anchor deliverables to real
          calendar dates. The Timeline and Grid views work without dates.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function DeploymentCalendarView({
  assetPlan,
  architecture,
  channelPlan,
  onBringToLife,
  campaignStartDate,
  deliverableStatuses,
  deliverableDbLookup,
  campaignId,
}: DeploymentCalendarViewProps) {
  const updateSchedule = useUpdateDeliverableSchedule();
  const canDragDrop = !!deliverableDbLookup && !!campaignId;

  /** Schedule via date picker (alternative to drag-drop) */
  const handleDatePick = useCallback(
    (item: CalendarItem, isoDate: string | null) => {
      if (!campaignId) return;
      const dbInfo = deliverableDbLookup?.get(
        item.scheduled.deliverable.title.trim().toLowerCase(),
      );
      if (!dbInfo) return;
      if (!isoDate) {
        updateSchedule.mutate({
          deliverableId: dbInfo.id,
          campaignId,
          scheduledPublishDate: null,
        });
        return;
      }
      const [y, m, day] = isoDate.split("-").map(Number);
      const targetDate = new Date(y, m - 1, day);
      const newISO = buildScheduledISO(
        targetDate,
        dbInfo.scheduledPublishDate,
        item.scheduled.deliverable.contentType,
      );
      updateSchedule.mutate({
        deliverableId: dbInfo.id,
        campaignId,
        scheduledPublishDate: newISO,
      });
    },
    [campaignId, deliverableDbLookup, updateSchedule],
  );

  // ─── Persona data ─────────────────────────────────────────────
  const { data: personasData } = usePersonas();
  const personaLookup = useMemo(() => {
    const map = new Map<string, PersonaWithMeta>();
    for (const p of personasData?.personas ?? []) map.set(p.id, p);
    return map;
  }, [personasData]);
  const personaNameLookup = useMemo(() => {
    const map = new Map<string, PersonaWithMeta>();
    for (const p of personasData?.personas ?? []) {
      map.set(p.name.toLowerCase(), p);
    }
    return map;
  }, [personasData]);

  // ─── Schedule + persona enrichment (mirrors Timeline) ─────────
  const schedule = useMemo(
    () => computeDeploymentSchedule(assetPlan, architecture, channelPlan),
    [assetPlan, architecture, channelPlan],
  );

  const { personaNames, personaLegendList, personaColorMap, idRemapping } = useMemo(() => {
    const colorMap = new Map<string, number>();
    const nameMap = new Map<string, string>();
    const legendList: PersonaLegendInfo[] = [];
    const nameToFirstId = new Map<string, string>();
    const remapping = new Map<string, string>();
    let idx = 0;

    for (const phase of architecture.journeyPhases ?? []) {
      for (const ppd of phase.personaPhaseData ?? []) {
        const realPersona =
          personaLookup.get(ppd.personaId) ??
          personaNameLookup.get((ppd.personaName ?? "").toLowerCase());
        if (!realPersona) continue;
        const canonicalId = realPersona.id;
        const name = realPersona.name;
        const nameLower = name.toLowerCase();
        if (ppd.personaId !== canonicalId) {
          remapping.set(ppd.personaId, canonicalId);
        }
        const existingId = nameToFirstId.get(nameLower);
        if (existingId && existingId !== canonicalId) {
          remapping.set(ppd.personaId, existingId);
          continue;
        }
        if (!colorMap.has(canonicalId)) {
          nameToFirstId.set(nameLower, canonicalId);
          colorMap.set(canonicalId, idx);
          nameMap.set(canonicalId, name);
          legendList.push({
            personaId: canonicalId,
            personaName: name,
            colorIndex: idx,
          });
          idx++;
        }
      }
    }

    for (const s of schedule.scheduled) {
      for (const p of s.targetPersonas) {
        const canonicalId = remapping.get(p) ?? p;
        if (!colorMap.has(canonicalId)) {
          const realPersona =
            personaLookup.get(canonicalId) ??
            personaNameLookup.get(canonicalId.toLowerCase());
          if (!realPersona) continue;
          const resolvedId = realPersona.id;
          const name = realPersona.name;
          const nameLower = name.toLowerCase();
          if (canonicalId !== resolvedId) {
            remapping.set(canonicalId, resolvedId);
          }
          const existingNameId = nameToFirstId.get(nameLower);
          if (existingNameId && existingNameId !== resolvedId) {
            remapping.set(resolvedId, existingNameId);
            if (p !== resolvedId) remapping.set(p, existingNameId);
            continue;
          }
          if (!colorMap.has(resolvedId)) {
            nameToFirstId.set(nameLower, resolvedId);
            colorMap.set(resolvedId, idx);
            nameMap.set(resolvedId, name);
            legendList.push({
              personaId: resolvedId,
              personaName: name,
              colorIndex: idx,
            });
            idx++;
          }
        }
        if (p !== canonicalId && !remapping.has(p)) {
          remapping.set(p, canonicalId);
        }
      }
    }

    const pColorMap = new Map<string, PersonaColorStyle>();
    for (const [personaId, colorIdx] of colorMap) {
      pColorMap.set(personaId, getPersonaColor(colorIdx));
    }

    return {
      personaNames: nameMap,
      personaLegendList: legendList,
      personaColorMap: pColorMap,
      idRemapping: remapping,
    };
  }, [architecture, schedule, personaLookup, personaNameLookup]);

  const resolvePersonas = useCallback(
    (ids: string[]): CardPersonaInfo[] => {
      return ids
        .map((id) => idRemapping.get(id) ?? id)
        .filter((id, i, arr) => arr.indexOf(id) === i)
        .filter((id) => personaNames.has(id))
        .map((id) => ({
          personaId: id,
          name: personaNames.get(id)!,
          colorStyle: personaColorMap.get(id) ?? getPersonaColor(0),
        }));
    },
    [personaNames, personaColorMap, idRemapping],
  );

  // ─── Channels list (for filter) ───────────────────────────────
  const channels = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of schedule.scheduled) {
      if (!seen.has(s.normalizedChannel)) {
        seen.set(s.normalizedChannel, s.channel);
      }
    }
    return Array.from(seen.entries()).map(([norm, orig]) => {
      const resolved = getChannelLabel(norm);
      return { normalized: norm, label: resolved !== "Other" ? resolved : orig };
    });
  }, [schedule]);

  // ─── Filter state ─────────────────────────────────────────────
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const handleTogglePersona = useCallback((id: string) => {
    setSelectedPersonaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const handleToggleChannel = useCallback((normalized: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return next;
    });
  }, []);
  const handleClearFilters = useCallback(() => {
    setSelectedPersonaIds(new Set());
    setSelectedChannels(new Set());
  }, []);

  // ─── Calendar item placement (date → items) ───────────────────
  const startDate = useMemo(
    () => (campaignStartDate ? parseLocalDate(campaignStartDate) : null),
    [campaignStartDate],
  );

  /** itemsByDate: dateKey → CalendarItem[]
   *  Empty when startDate missing. */
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    if (!startDate) return map;

    for (const s of schedule.scheduled) {
      // Prefer DB scheduledPublishDate when available (drag-and-drop persisted result),
      // fall back to blueprint-derived date (beatIndex + suggestedOrder).
      const dbInfo = deliverableDbLookup?.get(
        s.deliverable.title.trim().toLowerCase(),
      );
      const itemDate =
        dbInfo?.scheduledPublishDate
          ? new Date(dbInfo.scheduledPublishDate)
          : getItemDate(startDate, s.beatIndex, s.deliverable.suggestedOrder);
      const key = dateKey(itemDate);
      const remappedPersonas = s.targetPersonas.map(
        (id) => idRemapping.get(id) ?? id,
      );
      const uniquePersonas = remappedPersonas.filter(
        (id, i, arr) => arr.indexOf(id) === i,
      );
      const item: CalendarItem = {
        scheduled: {
          ...s,
          schedulerBeatIndex: s.beatIndex,
          targetPersonas: uniquePersonas,
        },
        date: itemDate,
        phaseIdx: s.phaseIndex,
      };
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    // Sort each day by priority then suggestedOrder
    for (const items of map.values()) {
      items.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.scheduled.deliverable.productionPriority] ?? 2;
        const pb = PRIORITY_ORDER[b.scheduled.deliverable.productionPriority] ?? 2;
        if (pa !== pb) return pa - pb;
        return (
          (a.scheduled.deliverable.suggestedOrder ?? 999) -
          (b.scheduled.deliverable.suggestedOrder ?? 999)
        );
      });
    }
    return map;
  }, [schedule, startDate, idRemapping, deliverableDbLookup]);

  // ─── Filtered items ───────────────────────────────────────────
  const filteredItemsByDate = useMemo(() => {
    if (selectedPersonaIds.size === 0 && selectedChannels.size === 0) {
      return itemsByDate;
    }
    const map = new Map<string, CalendarItem[]>();
    for (const [key, items] of itemsByDate) {
      const filtered = items.filter((item) => {
        if (
          selectedChannels.size > 0 &&
          !selectedChannels.has(item.scheduled.normalizedChannel)
        )
          return false;
        if (
          selectedPersonaIds.size > 0 &&
          item.scheduled.targetPersonas.length > 0 &&
          !item.scheduled.targetPersonas.some((p) => selectedPersonaIds.has(p))
        )
          return false;
        return true;
      });
      if (filtered.length > 0) map.set(key, filtered);
    }
    return map;
  }, [itemsByDate, selectedPersonaIds, selectedChannels]);

  // ─── Month navigation state ──────────────────────────────────
  const today = useMemo(() => stripTime(new Date()), []);
  const todayKey = useMemo(() => dateKey(today), [today]);

  // Initial month: campaign start month if available, otherwise current month
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const anchor = startDate ?? today;
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }, []);
  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }, []);
  const handleToday = useCallback(() => {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }, [today]);

  // ─── Phase boundary lookup (date → phase) ────────────────────
  const phaseAtDate = useCallback(
    (date: Date): number => {
      if (!startDate) return -1;
      const daysFromStart = Math.floor(
        (stripTime(date).getTime() - stripTime(startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      // beatIndex 0 = startDate week; -1 = prep week (before start)
      const beatIndex = Math.floor(daysFromStart / 7);
      if (beatIndex < 0) return -1;
      const pb = schedule.phaseBoundaries.findIndex(
        (b) => beatIndex >= b.startBeat && beatIndex <= b.endBeat,
      );
      return pb;
    },
    [startDate, schedule.phaseBoundaries],
  );

  // ─── Detail modal state ──────────────────────────────────────
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
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, item: CalendarItem) => {
      const dbInfo = deliverableDbLookup?.get(
        item.scheduled.deliverable.title.trim().toLowerCase(),
      );
      if (!dbInfo || !campaignId) {
        e.preventDefault();
        return;
      }
      const payload: DragPayload = {
        deliverableId: dbInfo.id,
        campaignId,
        currentScheduledISO: dbInfo.scheduledPublishDate,
        contentType: item.scheduled.deliverable.contentType,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
      setIsDraggingActive(true);
    },
    [deliverableDbLookup, campaignId],
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
        if (
          payload.currentScheduledISO &&
          dateKey(new Date(payload.currentScheduledISO)) === dateKey(targetDate)
        ) {
          return;
        }
        const newISO = buildScheduledISO(
          targetDate,
          payload.currentScheduledISO,
          payload.contentType,
        );
        updateSchedule.mutate({
          deliverableId: payload.deliverableId,
          campaignId: payload.campaignId,
          scheduledPublishDate: newISO,
        });
      } catch {
        // Malformed payload — ignore
      }
    },
    [updateSchedule],
  );

  // ─── Calendar grid construction (always 6 weeks = 42 cells) ──
  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);

  const visibleItemCount = useMemo(() => {
    let count = 0;
    for (const d of calendarDays) {
      if (!d.isCurrentMonth) continue;
      count += filteredItemsByDate.get(d.key)?.length ?? 0;
    }
    return count;
  }, [calendarDays, filteredItemsByDate]);

  // ─── Empty state: no startDate ───────────────────────────────
  if (!startDate) {
    return (
      <div className="space-y-4">
        <NoStartDateBanner />
      </div>
    );
  }

  // ─── Empty state: no scheduled deliverables ──────────────────
  if (schedule.scheduled.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
        <Info className="w-4 h-4 text-gray-400" />
        No deliverables to schedule. Generate an asset plan first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      {(personaLegendList.length > 0 || channels.length > 0) && (
        <TimelineFilterBar
          personaLegendList={personaLegendList}
          channels={channels}
          selectedPersonaIds={selectedPersonaIds}
          selectedChannels={selectedChannels}
          onTogglePersona={handleTogglePersona}
          onToggleChannel={handleToggleChannel}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Toolbar: month nav + Today + count */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
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
            onClick={handleNextMonth}
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
        <div className="text-xs text-gray-500">
          <CalendarIcon className="w-3.5 h-3.5 inline mr-1" />
          {visibleItemCount} deliverable{visibleItemCount !== 1 ? "s" : ""} this month
        </div>
      </div>

      {/* Calendar grid */}
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

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
          {calendarDays.map((d) => {
            const items = filteredItemsByDate.get(d.key) ?? [];
            const isToday = d.key === todayKey;
            const phaseIdx = phaseAtDate(d.date);
            const phaseColor = phaseIdx >= 0 ? getPhaseColor(phaseIdx) : null;

            const isDragOver = dragOverKey === d.key;
            return (
              <div
                key={d.key}
                onDragOver={canDragDrop ? (e) => handleDragOver(e, d.key) : undefined}
                onDragLeave={canDragDrop ? handleDragLeave : undefined}
                onDrop={canDragDrop ? (e) => handleDrop(e, d.date) : undefined}
                className={`relative border-b border-r border-gray-100 p-1 min-h-[140px] flex flex-col gap-1 transition-all ${
                  d.isCurrentMonth
                    ? phaseColor?.cell ?? "bg-white"
                    : "bg-gray-50/50"
                } ${isToday ? "ring-2 ring-inset ring-primary-400" : ""} ${
                  isDragOver
                    ? "ring-2 ring-inset ring-cyan-400 bg-cyan-50/60 z-10"
                    : isDraggingActive && d.isCurrentMonth
                      ? "hover:ring-1 hover:ring-inset hover:ring-cyan-200"
                      : ""
                }`}
              >
                <div className="flex items-center justify-between">
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
                  {phaseColor && d.isCurrentMonth && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: phaseColor.dot }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {(() => {
                    const isExpanded = expandedDayKeys.has(d.key);
                    const visibleItems = isExpanded ? items : items.slice(0, 2);
                    const overflowCount = Math.max(0, items.length - 2);
                    return (
                      <>
                        {visibleItems.map((item, i) => {
                          const dbInfo = deliverableDbLookup?.get(
                            item.scheduled.deliverable.title.trim().toLowerCase(),
                          );
                          const itemDraggable = !!dbInfo && canDragDrop;
                          const channelColor = getChannelColor(
                            item.scheduled.normalizedChannel,
                          );
                          const cardState: CardState = mapBlueprintState(
                            deliverableStatuses?.get(
                              item.scheduled.deliverable.title.trim().toLowerCase(),
                            ),
                          );
                          const personas = resolvePersonas(
                            item.scheduled.targetPersonas,
                          );
                          const personaHexes = personas.map(
                            (p) => p.colorStyle.activeHex,
                          );
                          const dateValue = dbInfo?.scheduledPublishDate
                            ? toDateInputValue(new Date(dbInfo.scheduledPublishDate))
                            : toDateInputValue(item.date);
                          return (
                            <CalendarCard
                              key={`${item.scheduled.deliverable.title}-${i}`}
                              title={item.scheduled.deliverable.title}
                              typeLabel={getChannelLabel(
                                item.scheduled.normalizedChannel,
                              )}
                              state={cardState}
                              channelHex={channelColor.hex}
                              personaHexes={personaHexes}
                              workflowStatus={
                                deliverableStatuses?.get(
                                  item.scheduled.deliverable.title
                                    .trim()
                                    .toLowerCase(),
                                ) as
                                  | "NOT_STARTED"
                                  | "IN_PROGRESS"
                                  | "COMPLETED"
                                  | undefined
                              }
                              isDraggable={itemDraggable}
                              currentDateValue={dateValue}
                              onClick={() =>
                                onBringToLife?.(
                                  item.scheduled.deliverable.title,
                                  item.scheduled.deliverable.contentType,
                                )
                              }
                              onDragStart={
                                itemDraggable
                                  ? (e) => handleDragStart(e, item)
                                  : undefined
                              }
                              onDragEnd={handleDragEnd}
                              onDatePick={
                                itemDraggable
                                  ? (iso) => handleDatePick(item, iso)
                                  : undefined
                              }
                              phase={item.scheduled.deliverable.phase}
                            />
                          );
                        })}
                        {overflowCount > 0 && !isExpanded && (
                          <button
                            type="button"
                            onClick={() => toggleDayExpansion(d.key)}
                            className="text-[10px] text-gray-500 hover:text-gray-700 text-left px-1 py-0.5 rounded hover:bg-gray-100"
                          >
                            +{overflowCount} more
                          </button>
                        )}
                        {isExpanded && items.length > 2 && (
                          <button
                            type="button"
                            onClick={() => toggleDayExpansion(d.key)}
                            className="text-[10px] text-gray-500 hover:text-gray-700 text-left px-1 py-0.5 rounded hover:bg-gray-100"
                          >
                            Show less
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Helper note */}
      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
        <Info className="w-3 h-3" />
        {canDragDrop
          ? "Drag a card onto a date or hover and click the date icon to schedule. Default time follows channel best-practice; moving a scheduled item preserves its time."
          : "Days within each week are derived from production order — for exact publish dates, use Timeline view and the publish scheduler in Canvas."}
      </p>

    </div>
  );
}
