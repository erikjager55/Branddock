"use client";

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Check,
  Minus,
  Plus,
  Maximize2,
  Info,
  Route,
  Trash2,
} from "lucide-react";
import type {
  AssetPlanLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  ScheduledDeliverable,
  DeploymentCollision,
  ContinuityGap,
} from "@/lib/campaigns/strategy-blueprint.types";
import { usePersonas } from "@/features/personas/hooks";
import type { PersonaWithMeta } from "@/features/personas/types/persona.types";
import { computeDeploymentSchedule } from "@/features/campaigns/lib/deployment-scheduler";
import { getChannelLabel } from "@/features/campaigns/lib/channel-frequency";
import { getPersonaColor, type PersonaColorStyle } from "@/features/campaigns/lib/persona-colors";
import {
  DeliverableCard,
  type DeliverableCardDragData,
  type PersonaLegendInfo,
  type CardPersonaInfo,
} from "./shared-timeline-cards";
import { TimelineFilterBar } from "./TimelineFilterBar";

// ─── Zoom constants ─────────────────────────────────────────────

const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;
const ZOOM_DEFAULT = 100;

/** Priority sort order for deliverables within a beat (must-have first) */
const PRIORITY_ORDER: Record<string, number> = { 'must-have': 0, 'should-have': 1, 'nice-to-have': 2 };

/** Validate and narrow a deliverable status string to the expected union type */
function resolveDeliverableStatus(
  statuses: Map<string, string> | undefined,
  title: string,
): 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | undefined {
  const s = statuses?.get(title.trim().toLowerCase());
  return s === 'NOT_STARTED' || s === 'IN_PROGRESS' || s === 'COMPLETED' ? s : undefined;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Format a date as short label, e.g. "Mar 7" */
function formatWeekDate(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** Get the date for a specific week index, given a campaign start date.
 *  Appends T00:00:00 to parse as local midnight (avoids off-by-one from UTC parsing). */
function getWeekDate(startDate: string, weekIndex: number): Date {
  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + weekIndex * 7);
  return d;
}

// ─── Types ──────────────────────────────────────────────────────

interface DeploymentTimelineSectionProps {
  assetPlan: AssetPlanLayer;
  architecture: ArchitectureLayer;
  channelPlan: ChannelPlanLayer;
  onBringToLife?: (deliverableTitle: string, contentType: string) => void;
  /** Called when user deletes a deliverable from the timeline */
  onDeleteDeliverable?: (title: string) => void;
  /** Optional campaign start date — enables week date labels in headers */
  campaignStartDate?: string | null;
  /** Deliverable title → status lookup (from DB deliverables) */
  deliverableStatuses?: Map<string, string>;
}

// ─── Sub-components ─────────────────────────────────────────────

/** Floating zoom toolbar */
function TimelineToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
}) {
  return (
    <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-md px-1 py-1">
      <button
        type="button"
        onClick={onFitToScreen}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        title="Fit to screen"
        aria-label="Fit to screen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      <div className="w-px h-5 bg-gray-200 mx-0.5" />
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= ZOOM_MIN}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="text-xs font-medium text-gray-600 w-10 text-center select-none tabular-nums">
        {zoom}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= ZOOM_MAX}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Red collision badge with keyboard/mouse/touch tooltip */
function CollisionBadge({ collision }: { collision: DeploymentCollision }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative inline-flex"
      tabIndex={0}
      aria-label={`${collision.items.length} items on ${getChannelLabel(collision.channel)}, channel ${collision.severity === "overload" ? "overloaded" : "near capacity"}`}
      aria-describedby={showTooltip ? `collision-tooltip-${collision.channel}` : undefined}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${
          collision.severity === "overload" ? "bg-red-600" : "bg-red-400"
        }`}
      >
        {collision.items.length}
      </span>
      {showTooltip && (
        <div id={`collision-tooltip-${collision.channel}`} className="absolute z-50 bottom-full left-0 mb-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-2.5 pointer-events-none" role="tooltip">
          <p className="font-semibold text-red-300 mb-1">
            Channel {collision.severity === "overload" ? "overloaded" : "near capacity"}
          </p>
          <p className="text-gray-300">
            {collision.items.length} items on {getChannelLabel(collision.channel)} (max {collision.capacity}/week)
          </p>
        </div>
      )}
    </div>
  );
}

/** Amber gap warning row below the grid */
function GapWarnings({ gaps, personaNames }: { gaps: ContinuityGap[]; personaNames: Map<string, string> }) {
  if (gaps.length === 0) return null;

  return (
    <div className="space-y-1.5 mt-3">
      {gaps.map((gap, i) => (
        <div
          key={`gap-${gap.persona}-${gap.startBeat}-${i}`}
          className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span>
            <span className="font-medium">{personaNames.get(gap.persona) ?? gap.persona}</span>
            {" "}has no content for {gap.gapLength} consecutive week{gap.gapLength !== 1 ? "s" : ""} (week {gap.startBeat + 1}&ndash;{gap.endBeat + 1}).
            Mental availability may decrease.
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Phase color palette ────────────────────────────────────────

const PHASE_COLORS = [
  { header: "bg-blue-50", cell: "bg-blue-50/30", border: "border-l-blue-300", text: "text-blue-700" },
  { header: "bg-violet-50", cell: "bg-violet-50/30", border: "border-l-violet-300", text: "text-violet-700" },
  { header: "bg-amber-50", cell: "bg-amber-50/30", border: "border-l-amber-300", text: "text-amber-700" },
  { header: "bg-emerald-50", cell: "bg-emerald-50/30", border: "border-l-emerald-300", text: "text-emerald-700" },
  { header: "bg-rose-50", cell: "bg-rose-50/30", border: "border-l-rose-300", text: "text-rose-700" },
  { header: "bg-cyan-50", cell: "bg-cyan-50/30", border: "border-l-cyan-300", text: "text-cyan-700" },
];

function getPhaseColor(phaseIdx: number) {
  return PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
}

// ─── Grid column constants ──────────────────────────────────────

const CELL_MIN_WIDTH = 240;

/** Create a stable key for a scheduled deliverable (used for beat overrides).
 *  Uses phase instead of beatIndex so keys don't change when items are
 *  removed and the scheduler recomputes beat assignments. */
function getItemKey(d: { title: string; channel: string; phase?: string }): string {
  return `${d.title}::${d.channel}::${d.phase ?? ''}`;
}

// ─── Main Component ─────────────────────────────────────────────

export function DeploymentTimelineSection({
  assetPlan,
  architecture,
  channelPlan,
  onBringToLife,
  onDeleteDeliverable,
  campaignStartDate,
  deliverableStatuses,
}: DeploymentTimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  // Manual beat position overrides: itemKey → new absolute beatIndex
  const [beatOverrides, setBeatOverrides] = useState<Map<string, number>>(new Map());

  // Track previous effective beat positions to prevent scheduler redistribution
  // after item deletion from shifting other items to different beats.
  const prevItemBeatsRef = useRef<Map<string, number>>(new Map());

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) { setZoom(ZOOM_DEFAULT); return; }
    const scrollEl = container.querySelector("[data-timeline-scroll]") as HTMLElement | null;
    if (!scrollEl) { setZoom(ZOOM_DEFAULT); return; }
    // CSS zoom affects layout, so scrollWidth reflects zoomed size.
    // Compute natural width by dividing out current zoom factor.
    const currentZoomFactor = zoom / 100 || 1;
    const containerWidth = scrollEl.clientWidth;
    const naturalGridWidth = scrollEl.scrollWidth / currentZoomFactor;
    if (naturalGridWidth <= 0) { setZoom(ZOOM_DEFAULT); return; }
    const idealZoom = Math.floor((containerWidth / naturalGridWidth) * 100);
    setZoom(Math.max(ZOOM_MIN, Math.min(idealZoom, ZOOM_MAX)));
  }, [zoom]);

  // Fetch real persona data for name resolution + legend enrichment
  const { data: personasData } = usePersonas();
  const personaLookup = useMemo(() => {
    const map = new Map<string, PersonaWithMeta>();
    for (const p of personasData?.personas ?? []) {
      map.set(p.id, p);
    }
    return map;
  }, [personasData]);

  // Name-based fallback lookup (AI may use fake IDs but correct names)
  const personaNameLookup = useMemo(() => {
    const map = new Map<string, PersonaWithMeta>();
    for (const p of personasData?.personas ?? []) {
      map.set(p.name.toLowerCase(), p);
    }
    return map;
  }, [personasData]);

  // Compute schedule
  const schedule = useMemo(
    () => computeDeploymentSchedule(assetPlan, architecture, channelPlan),
    [assetPlan, architecture, channelPlan],
  );

  // Build persona color + name maps, enriching with real persona names from DB
  const { personaNames, personaLegendList, personaColorMap, idRemapping } = useMemo(() => {
    const colorMap = new Map<string, number>();
    const nameMap = new Map<string, string>();
    const legendList: PersonaLegendInfo[] = [];
    const nameToFirstId = new Map<string, string>(); // lowercase name → canonical personaId
    const remapping = new Map<string, string>();       // duplicate personaId → canonical personaId
    let idx = 0;

    // Extract persona names from architecture (personaPhaseData), deduplicate on name.
    // Only include personas that exist in the workspace database.
    for (const phase of architecture.journeyPhases ?? []) {
      for (const ppd of phase.personaPhaseData ?? []) {
        // Resolve to a real DB persona: first by ID, then by name fallback
        const realPersona = personaLookup.get(ppd.personaId)
          ?? personaNameLookup.get((ppd.personaName ?? "").toLowerCase());

        // Skip personas that don't exist in the database
        if (!realPersona) continue;

        const canonicalId = realPersona.id;
        const name = realPersona.name;
        const nameLower = name.toLowerCase();

        // Remap AI-generated ID to the real DB ID if they differ
        if (ppd.personaId !== canonicalId) {
          remapping.set(ppd.personaId, canonicalId);
        }

        // Check for duplicate name with different ID → remap to canonical
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

    // Also pick up any personas only referenced in deliverables
    // Only include personas that exist in the workspace database.
    for (const s of schedule.scheduled) {
      for (const p of s.targetPersonas) {
        const canonicalId = remapping.get(p) ?? p;
        if (!colorMap.has(canonicalId)) {
          // Resolve to a real DB persona: first by ID, then by name fallback
          const realPersona = personaLookup.get(canonicalId)
            ?? personaNameLookup.get(canonicalId.toLowerCase());

          // Skip personas that don't exist in the database
          if (!realPersona) continue;

          const resolvedId = realPersona.id;
          const name = realPersona.name;
          const nameLower = name.toLowerCase();

          // Remap AI-generated ID to the real DB ID if they differ
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
        // Ensure the original ID is also remapped if it differs
        if (p !== canonicalId && !remapping.has(p)) {
          remapping.set(p, canonicalId);
        }
      }
    }

    // Derive personaId → PersonaColorStyle map
    const pColorMap = new Map<string, PersonaColorStyle>();
    for (const [personaId, colorIdx] of colorMap) {
      pColorMap.set(personaId, getPersonaColor(colorIdx));
    }

    return { personaNames: nameMap, personaLegendList: legendList, personaColorMap: pColorMap, idRemapping: remapping };
  }, [architecture, schedule, personaLookup, personaNameLookup]);

  // ─── Persona resolution helpers ───────────────────────────────
  const resolvePersonas = useCallback((ids: string[]): CardPersonaInfo[] => {
    return ids
      .map((id) => idRemapping.get(id) ?? id)
      .filter((id, i, arr) => arr.indexOf(id) === i) // deduplicate after remapping
      .filter((id) => personaNames.has(id))
      .map((id) => ({
        personaId: id,
        name: personaNames.get(id)!,
        colorStyle: personaColorMap.get(id) ?? getPersonaColor(0),
      }));
  }, [personaNames, personaColorMap, idRemapping]);

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

  /** Move a deliverable to a different beat (week).
   *  Beat -1 represents Week 0 (Preparation column).
   *  TODO: Recompute collisions/gaps after repositioning — currently they reflect the original schedule. */
  const handleMoveBeat = useCallback((deliverable: { title: string; channel: string; phase?: string }, currentBeat: number, direction: -1 | 1) => {
    const newBeat = currentBeat + direction;
    if (newBeat < -1 || newBeat >= schedule.totalBeats) return;
    const key = getItemKey(deliverable);
    setBeatOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, newBeat);
      return next;
    });
  }, [schedule.totalBeats]);

  // ─── Prep checklist state (two-phase animation) ────────────────
  const [checkedPrep, setCheckedPrep] = useState<Set<number>>(new Set());
  /** Items currently animating out (checkbox fills → card shrinks) */
  const [dismissingPrep, setDismissingPrep] = useState<Set<number>>(new Set());
  /** Permanently deleted prep items */
  const [deletedPrep, setDeletedPrep] = useState<Set<number>>(new Set());
  /** Index of the prep item currently showing a delete confirmation */
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  const togglePrepItem = useCallback((idx: number) => {
    if (dismissingPrep.has(idx)) return; // animation in progress
    // Phase 1: show checked state + start dismiss animation
    setDismissingPrep((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    // Phase 2: after animation, actually hide the item
    setTimeout(() => {
      setCheckedPrep((prev) => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
      setDismissingPrep((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 500);
  }, [dismissingPrep]);

  const handleDeletePrep = useCallback((idx: number) => {
    setConfirmDeleteIdx(null);
    // Reuse dismiss animation then permanently delete
    setDismissingPrep((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    setTimeout(() => {
      setDeletedPrep((prev) => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
      setDismissingPrep((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }, 500);
  }, []);

  // ─── Drag & drop state + handlers ──────────────────────────────
  const [dragOverBeat, setDragOverBeat] = useState<number | null>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, beatIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverBeat(beatIdx);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Suppress leave events when the pointer moves to a child element inside the same cell
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverBeat(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, targetBeat: number) => {
    e.preventDefault();
    setDragOverBeat(null);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const data: DeliverableCardDragData = JSON.parse(raw);
      if (data.sourceBeat === targetBeat) return;
      if (targetBeat < -1 || targetBeat >= schedule.totalBeats) return;
      setBeatOverrides((prev) => {
        const next = new Map(prev);
        next.set(data.itemKey, targetBeat);
        return next;
      });
    } catch {
      // ignore malformed drag data
    }
  }, [schedule.totalBeats]);

  // Collect unique channels from deliverables (sorted by first appearance)
  const channels = useMemo(() => {
    const seen = new Map<string, string>(); // normalizedChannel → original channel label
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

  // Build deliverable cell lookup: weekIndex → items[] (flat, no channel dimension)
  // Applies any manual beat overrides from user repositioning.
  // Each item preserves its schedulerBeatIndex for stable keying.
  // Items within each beat are sorted by priority (must-have first) then suggestedOrder.
  const cellLookup = useMemo(() => {
    const map = new Map<number, (ScheduledDeliverable & { schedulerBeatIndex: number })[]>();
    const effectiveBeats = new Map<string, number>();

    for (const s of schedule.scheduled) {
      const key = getItemKey(s.deliverable);

      // Determine effective beat:
      // 1. Explicit user override (drag/Earlier/Later) takes priority
      // 2. If scheduler shifted this item (e.g. after a deletion changed maxOrder),
      //    keep it at its previous effective position to prevent visual jumping
      // 3. Otherwise use the scheduler's assigned beat
      let beat: number;
      const override = beatOverrides.get(key);
      if (override !== undefined) {
        beat = override;
      } else {
        const prevEffective = prevItemBeatsRef.current.get(key);
        if (prevEffective !== undefined && prevEffective !== s.beatIndex) {
          beat = prevEffective;
        } else {
          beat = s.beatIndex;
        }
      }

      effectiveBeats.set(key, beat);

      // Remap duplicate persona IDs to canonical IDs
      const remappedPersonas = s.targetPersonas.map((id) => idRemapping.get(id) ?? id);
      const uniquePersonas = remappedPersonas.filter((id, i, arr) => arr.indexOf(id) === i);
      const adjusted = { ...s, beatIndex: beat, schedulerBeatIndex: s.beatIndex, targetPersonas: uniquePersonas };
      if (!map.has(beat)) map.set(beat, []);
      map.get(beat)!.push(adjusted);
    }

    // Update ref for next render so we can detect future scheduler shifts
    prevItemBeatsRef.current = effectiveBeats;

    // Sort items within each beat by priority then suggestedOrder
    for (const items of map.values()) {
      items.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.deliverable.productionPriority] ?? 2;
        const pb = PRIORITY_ORDER[b.deliverable.productionPriority] ?? 2;
        if (pa !== pb) return pa - pb;
        return (a.deliverable.suggestedOrder ?? 999) - (b.deliverable.suggestedOrder ?? 999);
      });
    }
    return map;
  }, [schedule, beatOverrides, idRemapping]);


  // ─── Filtered lookups (applies persona + channel filters) ─────
  const filteredCellLookup = useMemo(() => {
    if (selectedPersonaIds.size === 0 && selectedChannels.size === 0) return cellLookup;
    const map = new Map<number, (ScheduledDeliverable & { schedulerBeatIndex: number })[]>();
    for (const [beat, items] of cellLookup) {
      const filtered = items.filter((s) => {
        if (selectedChannels.size > 0 && !selectedChannels.has(s.normalizedChannel)) return false;
        if (selectedPersonaIds.size > 0 && s.targetPersonas.length > 0 && !s.targetPersonas.some((p) => selectedPersonaIds.has(p))) return false;
        return true;
      });
      if (filtered.length > 0) map.set(beat, filtered);
    }
    return map;
  }, [cellLookup, selectedPersonaIds, selectedChannels]);

  // ─── Persona connector lanes (colored threads across timeline) ─
  const personaLanes = useMemo(() => {
    const lanes: {
      personaId: string;
      color: PersonaColorStyle;
      /** Set of beat indices where this persona has content */
      beats: Set<number>;
      firstBeat: number;
      lastBeat: number;
    }[] = [];

    for (const legend of personaLegendList) {
      const beats = new Set<number>();
      for (const [beat, items] of filteredCellLookup) {
        for (const item of items) {
          // Shared items (empty targetPersonas) count for all personas
          if (item.targetPersonas.length === 0 || item.targetPersonas.includes(legend.personaId)) {
            beats.add(beat);
            break;
          }
        }
      }
      if (beats.size === 0) continue;
      const beatArray = Array.from(beats);
      lanes.push({
        personaId: legend.personaId,
        color: personaColorMap.get(legend.personaId) ?? getPersonaColor(legend.colorIndex),
        beats,
        firstBeat: Math.min(...beatArray),
        lastBeat: Math.max(...beatArray),
      });
    }
    return lanes;
  }, [personaLegendList, filteredCellLookup, personaColorMap]);

  const { totalBeats, phaseBoundaries } = schedule;

  // Grid template — prep column + week cells
  const gridTemplateColumns = `${CELL_MIN_WIDTH}px repeat(${totalBeats}, minmax(${CELL_MIN_WIDTH}px, 1fr))`;
  const gridMinWidth = `${(totalBeats + 1) * CELL_MIN_WIDTH}px`;

  // Whether campaign start date is available for week date labels
  const hasStartDate = !!campaignStartDate;

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
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600">
          <Route className="w-3.5 h-3.5 inline mr-1" />
          {phaseBoundaries.length} phase{phaseBoundaries.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm text-gray-600">
          {schedule.scheduled.length} deliverable{schedule.scheduled.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm text-gray-600">
          {totalBeats} week{totalBeats !== 1 ? "s" : ""}
        </span>
        {schedule.collisions.length > 0 && (
          <span className="text-sm text-red-600 font-medium">
            {schedule.collisions.length} collision{schedule.collisions.length !== 1 ? "s" : ""}
          </span>
        )}
        {schedule.gaps.length > 0 && (
          <span className="text-sm text-amber-600 font-medium">
            {schedule.gaps.length} gap{schedule.gaps.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter bar (replaces static persona legend) */}
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

      {/* Timeline grid */}
      <div ref={containerRef} className="relative">
        <div
          data-timeline-scroll
          className="overflow-x-auto border border-gray-200 rounded-lg"
        >
          <div
            ref={gridRef}
            data-timeline-grid
            className="relative"
            style={zoom !== 100 ? { zoom: zoom / 100 } : undefined}
          >
            {/* Week header row */}
            <div
              className="grid"
              style={{ gridTemplateColumns, minWidth: gridMinWidth }}
            >
              {/* Prep column header */}
              <div className="border-b border-r border-gray-200 p-2 text-center bg-slate-50">
                <div className="text-[10px] font-semibold text-slate-600 mb-0.5">Preparation</div>
                <div className="text-[10px] text-slate-500 font-medium">Week 0</div>
              </div>
              {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                const phaseIdx = phaseBoundaries.findIndex(
                  (pb) => beatIdx >= pb.startBeat && beatIdx <= pb.endBeat,
                );
                const phase = phaseIdx >= 0 ? phaseBoundaries[phaseIdx] : undefined;
                const isPhaseStart = phase?.startBeat === beatIdx;
                const phaseColor = phaseIdx >= 0 ? getPhaseColor(phaseIdx) : undefined;

                return (
                  <div
                    key={beatIdx}
                    className={`border-b border-r border-gray-200 p-2 text-center ${
                      phaseColor?.header ?? ""
                    } ${isPhaseStart ? `border-l-2 ${phaseColor?.border ?? "border-l-gray-300"}` : ""}`}
                  >
                    {phase && (
                      <div className={`text-[10px] truncate mb-0.5 ${
                        isPhaseStart
                          ? `font-semibold ${phaseColor?.text ?? "text-gray-700"}`
                          : "font-medium text-gray-400"
                      }`}>
                        {phase.phase}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-500 font-medium">
                      Week {beatIdx + 1}
                    </div>
                    {hasStartDate && (
                      <div className="text-[9px] text-gray-400">
                        {formatWeekDate(getWeekDate(campaignStartDate!, beatIdx))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Persona connector lanes — colored threads linking deliverables */}
            {personaLanes.length > 0 && (
              <div
                className="grid"
                style={{ gridTemplateColumns, minWidth: gridMinWidth }}
              >
                {/* Prep column persona lane cell — shows lanes for items moved to Week 0 (beat -1) */}
              <div className="flex flex-col gap-px py-1 px-1 border-r border-gray-100 bg-slate-50/30">
                {personaLanes.map((lane) => {
                  const hasContent = lane.beats.has(-1);
                  const isSelectedPersona = selectedPersonaIds.size > 0 && selectedPersonaIds.has(lane.personaId);
                  const isDimmed = selectedPersonaIds.size > 0 && !isSelectedPersona;
                  return (
                    <div
                      key={lane.personaId}
                      className="h-1 rounded-full transition-opacity"
                      style={hasContent ? {
                        backgroundColor: lane.color.activeHex,
                        opacity: isDimmed ? 0.08 : 1,
                      } : undefined}
                    />
                  );
                })}
              </div>
              {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                  const phaseIdx = phaseBoundaries.findIndex(
                    (pb) => beatIdx >= pb.startBeat && beatIdx <= pb.endBeat,
                  );
                  const phase = phaseIdx >= 0 ? phaseBoundaries[phaseIdx] : undefined;
                  const isPhaseStart = phase?.startBeat === beatIdx;
                  const phaseColor = phaseIdx >= 0 ? getPhaseColor(phaseIdx) : undefined;

                  return (
                    <div
                      key={beatIdx}
                      className={`flex flex-col gap-px py-1 px-1 border-r border-gray-100 bg-white ${
                        isPhaseStart ? `border-l-2 ${phaseColor?.border ?? "border-l-gray-300"}` : ""
                      }`}
                    >
                      {personaLanes.map((lane) => {
                        const hasContent = lane.beats.has(beatIdx);
                        const isInRange = beatIdx >= lane.firstBeat && beatIdx <= lane.lastBeat;
                        const isSelectedPersona = selectedPersonaIds.size > 0 && selectedPersonaIds.has(lane.personaId);
                        const isDimmed = selectedPersonaIds.size > 0 && !isSelectedPersona;

                        if (!isInRange) {
                          return <div key={lane.personaId} className="h-1" />;
                        }

                        return (
                          <div
                            key={lane.personaId}
                            className="h-1 rounded-full transition-opacity"
                            style={{
                              backgroundColor: lane.color.activeHex,
                              opacity: isDimmed ? 0.08 : hasContent ? 1 : 0.15,
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Single content row — all items per week in one cell */}
            <div
              className="grid"
              style={{ gridTemplateColumns, minWidth: gridMinWidth }}
            >
              {/* Prep column content cell (Week 0) — accepts drag & drop (beat -1) */}
              <div
                onDragOver={(e) => handleDragOver(e, -1)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, -1)}
                className={`border-b border-r border-gray-100 p-2 align-top bg-slate-50/20 transition-colors ${
                  dragOverBeat === -1 ? "ring-2 ring-inset ring-primary-400 bg-primary-50/30" : ""
                }`}
                style={{ minHeight: 64 }}
              >
                <div className="space-y-1.5">
                  {/* Prep checklist items (checked items animate out then disappear) */}
                  {assetPlan.prepDeliverables
                    ?.map((prep, idx) => ({ prep, idx }))
                    .filter(({ idx }) => !checkedPrep.has(idx) && !deletedPrep.has(idx))
                    .map(({ prep, idx }) => {
                      const isDismissing = dismissingPrep.has(idx);
                      const isConfirming = confirmDeleteIdx === idx;
                      return (
                        <div
                          key={`prep-${idx}`}
                          className="w-full text-left bg-white border rounded-lg shadow-sm text-xs hover:shadow overflow-hidden"
                          style={{
                            borderColor: isDismissing ? "#0d9488" : "#e5e7eb",
                            opacity: isDismissing ? 0 : 1,
                            maxHeight: isDismissing ? 0 : 300,
                            padding: isDismissing ? 0 : undefined,
                            marginTop: isDismissing ? 0 : undefined,
                            transition: isDismissing
                              ? "opacity 250ms ease-out, max-height 250ms 200ms ease-out, padding 250ms 200ms ease-out, margin 250ms 200ms ease-out, border-color 150ms ease"
                              : "box-shadow 150ms ease, border-color 150ms ease",
                          }}
                        >
                          {/* Clickable checkbox area */}
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => togglePrepItem(idx)}
                          >
                            <div className="px-2.5 py-2">
                              <div className="flex items-start gap-2">
                                <div
                                  className="h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-px"
                                  style={{
                                    backgroundColor: isDismissing ? "#0d9488" : "#ffffff",
                                    borderColor: isDismissing ? "#0d9488" : "#d1d5db",
                                    transition: "background-color 150ms ease, border-color 150ms ease",
                                  }}
                                >
                                  {isDismissing && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-medium text-[13px] leading-snug text-gray-800 break-words">
                                    {prep.title}
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[11px] text-gray-500">{prep.owner}</span>
                                    <span className="text-gray-300">|</span>
                                    <span className={`text-[11px] capitalize ${
                                      prep.estimatedEffort === "high"
                                        ? "text-red-500"
                                        : prep.estimatedEffort === "medium"
                                          ? "text-amber-500"
                                          : "text-emerald-500"
                                    }`}>
                                      {prep.estimatedEffort}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Delete button + confirmation */}
                          {!isDismissing && (
                            <div className="px-2.5 pb-1.5">
                              {isConfirming ? (
                                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-red-100 bg-red-50/50 -mx-2.5 px-2.5 pb-0.5 rounded-b-lg">
                                  <span className="text-[11px] text-red-600 font-medium">Delete this item?</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      className="px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded transition-colors cursor-pointer"
                                      onClick={() => setConfirmDeleteIdx(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="px-2.5 py-1 text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors cursor-pointer"
                                      onClick={() => handleDeletePrep(idx)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-end pt-0.5">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteIdx(idx); }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Deliverable cards moved to Week 0 (beat -1) */}
                  {(filteredCellLookup.get(-1) ?? []).map((item, i) => (
                    <DeliverableCard
                      key={`d-prep-${item.deliverable.title}-${i}`}
                      deliverable={item.deliverable}
                      channel={getChannelLabel(item.normalizedChannel)}
                      personas={resolvePersonas(item.targetPersonas)}
                      onBringToLife={onBringToLife}
                      onDelete={onDeleteDeliverable}
                      onMove={(dir) => handleMoveBeat(item.deliverable, -1, dir)}
                      canMoveLeft={false}
                      canMoveRight={totalBeats > 0}
                      dragData={{
                        itemKey: getItemKey(item.deliverable),
                        sourceBeat: -1,
                      }}
                      status={resolveDeliverableStatus(deliverableStatuses, item.deliverable.title)}
                    />
                  ))}

                  {/* Empty state when no visible prep items and no deliverables in Week 0 */}
                  {(!assetPlan.prepDeliverables?.length || assetPlan.prepDeliverables.every((_, idx) => checkedPrep.has(idx) || deletedPrep.has(idx))) && !(filteredCellLookup.get(-1)?.length) && (
                    <div className="w-full flex items-center justify-center py-4">
                      <span className="text-[10px] text-slate-400 italic">No prep items</span>
                    </div>
                  )}
                </div>
              </div>
              {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                const items = filteredCellLookup.get(beatIdx) ?? [];
                const weekCollisions = schedule.collisions.filter((c) => c.beatIndex === beatIdx);
                const phaseIdx = phaseBoundaries.findIndex(
                  (pb) => beatIdx >= pb.startBeat && beatIdx <= pb.endBeat,
                );
                const phase = phaseIdx >= 0 ? phaseBoundaries[phaseIdx] : undefined;
                const isPhaseStart = phase?.startBeat === beatIdx;
                const phaseColor = phaseIdx >= 0 ? getPhaseColor(phaseIdx) : undefined;

                const isDragOver = dragOverBeat === beatIdx;

                return (
                  <div
                    key={beatIdx}
                    onDragOver={(e) => handleDragOver(e, beatIdx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, beatIdx)}
                    className={`border-b border-r border-gray-100 p-2 align-top transition-colors ${
                      isPhaseStart ? `border-l-2 ${phaseColor?.border ?? "border-l-gray-300"}` : ""
                    } ${weekCollisions.length > 0 ? "bg-red-50/40" : phaseColor?.cell ?? ""} ${
                      isDragOver ? "ring-2 ring-inset ring-primary-400 bg-primary-50/30" : ""
                    }`}
                    style={items.length === 0 ? { minHeight: 64 } : undefined}
                  >
                    {items.length > 0 ? (
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <DeliverableCard
                            key={`d-${item.deliverable.title}-${i}`}
                            deliverable={item.deliverable}
                            channel={getChannelLabel(item.normalizedChannel)}
                            personas={resolvePersonas(item.targetPersonas)}
                            onBringToLife={onBringToLife}
                            onDelete={onDeleteDeliverable}
                            onMove={(dir) => handleMoveBeat(item.deliverable, beatIdx, dir)}
                            canMoveLeft={beatIdx > -1}
                            canMoveRight={beatIdx < totalBeats - 1}
                            dragData={{
                              itemKey: getItemKey(item.deliverable),
                              sourceBeat: beatIdx,
                            }}
                            status={resolveDeliverableStatus(deliverableStatuses, item.deliverable.title)}
                          />
                        ))}

                        {weekCollisions.map((collision) => (
                          <CollisionBadge key={`col-${collision.channel}`} collision={collision} />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-gray-200" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        <TimelineToolbar
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
        />
      </div>

      {/* Continuity gap warnings */}
      <GapWarnings gaps={schedule.gaps} personaNames={personaNames} />
    </div>
  );
}
