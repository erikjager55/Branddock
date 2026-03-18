"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Minus,
  Plus,
  Maximize2,
  Info,
  Route,
  X,
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
  type PersonaLegendInfo,
  type CardPersonaInfo,
} from "./shared-timeline-cards";
import { FlowConnectionsOverlay } from "./FlowConnectionsOverlay";

// ─── Zoom constants ─────────────────────────────────────────────

const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;
const ZOOM_DEFAULT = 100;

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
  /** Optional campaign start date — enables week date labels in headers */
  campaignStartDate?: string | null;
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

/** Filter bar for persona + channel filtering */
function TimelineFilterBar({
  personaLegendList,
  channels,
  selectedPersonaIds,
  selectedChannels,
  onTogglePersona,
  onToggleChannel,
  onClearFilters,
}: {
  personaLegendList: PersonaLegendInfo[];
  channels: { normalized: string; label: string }[];
  selectedPersonaIds: Set<string>;
  selectedChannels: Set<string>;
  onTogglePersona: (id: string) => void;
  onToggleChannel: (normalized: string) => void;
  onClearFilters: () => void;
}) {
  const hasActiveFilter = selectedPersonaIds.size > 0 || selectedChannels.size > 0;

  return (
    <div className="space-y-2">
      {/* Persona filter pills */}
      {personaLegendList.length > 0 && (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Personas:</span>
        {personaLegendList.map((p) => {
          const color = getPersonaColor(p.colorIndex);
          const isActive = selectedPersonaIds.has(p.personaId);
          return (
            <button
              key={p.personaId}
              type="button"
              onClick={() => onTogglePersona(p.personaId)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border"
              style={isActive
                ? { backgroundColor: color.activeHex, color: '#fff', borderColor: color.activeHex }
                : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }
              }
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={isActive ? { backgroundColor: '#fff' } : { backgroundColor: color.activeHex }}
              />
              {p.personaName}
            </button>
          );
        })}
      </div>
      )}

      {/* Channel filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Channels:</span>
        {channels.map((ch) => {
          const isActive = selectedChannels.has(ch.normalized);
          return (
            <button
              key={ch.normalized}
              type="button"
              onClick={() => onToggleChannel(ch.normalized)}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors border"
              style={isActive
                ? { backgroundColor: '#1f2937', color: '#fff', borderColor: '#1f2937' }
                : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }
              }
            >
              {ch.label}
            </button>
          );
        })}

        {/* Clear filters button */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>
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

/** Create a unique key for a scheduled deliverable (used for beat overrides).
 *  Includes the original beatIndex to disambiguate deliverables with identical title+channel. */
function getItemKey(d: { title: string; channel: string }, originalBeatIndex: number): string {
  return `${d.title}::${d.channel}::${originalBeatIndex}`;
}

// ─── Main Component ─────────────────────────────────────────────

export function DeploymentTimelineSection({
  assetPlan,
  architecture,
  channelPlan,
  onBringToLife,
  campaignStartDate,
}: DeploymentTimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  // Flow connections state
  const [showFlows, setShowFlows] = useState(true);
  const [hoveredFlowTitles, setHoveredFlowTitles] = useState<Set<string> | null>(null);

  // Manual beat position overrides: itemKey → new absolute beatIndex
  const [beatOverrides, setBeatOverrides] = useState<Map<string, number>>(new Map());

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

  // Compute schedule
  const schedule = useMemo(
    () => computeDeploymentSchedule(assetPlan, architecture, channelPlan),
    [assetPlan, architecture, channelPlan],
  );

  // Build persona color + name maps, enriching with real persona names from DB
  const { personaNames, personaLegendList, personaColorMap } = useMemo(() => {
    const colorMap = new Map<string, number>();
    const nameMap = new Map<string, string>();
    const legendList: PersonaLegendInfo[] = [];
    let idx = 0;

    // Extract persona names from architecture (personaPhaseData), enriched with real names
    for (const phase of architecture.journeyPhases ?? []) {
      for (const ppd of phase.personaPhaseData ?? []) {
        if (!colorMap.has(ppd.personaId)) {
          const realPersona = personaLookup.get(ppd.personaId);
          const name = realPersona?.name ?? ppd.personaName;
          colorMap.set(ppd.personaId, idx);
          nameMap.set(ppd.personaId, name);
          legendList.push({
            personaId: ppd.personaId,
            personaName: name,
            colorIndex: idx,
          });
          idx++;
        }
      }
    }

    // Also pick up any personas only referenced in deliverables
    for (const s of schedule.scheduled) {
      for (const p of s.targetPersonas) {
        if (!colorMap.has(p)) {
          const realPersona = personaLookup.get(p);
          const name = realPersona?.name ?? p;
          colorMap.set(p, idx);
          nameMap.set(p, name);
          legendList.push({
            personaId: p,
            personaName: name,
            colorIndex: idx,
          });
          idx++;
        }
      }
    }

    // Derive personaId → PersonaColorStyle map
    const pColorMap = new Map<string, PersonaColorStyle>();
    for (const [personaId, colorIdx] of colorMap) {
      pColorMap.set(personaId, getPersonaColor(colorIdx));
    }

    return { personaNames: nameMap, personaLegendList: legendList, personaColorMap: pColorMap };
  }, [architecture, schedule, personaLookup]);

  // ─── Persona resolution helpers ───────────────────────────────
  const resolvePersonas = useCallback((ids: string[]): CardPersonaInfo[] => {
    return ids
      .filter((id) => personaNames.has(id))
      .map((id) => ({
        personaId: id,
        name: personaNames.get(id)!,
        colorStyle: personaColorMap.get(id) ?? getPersonaColor(0),
      }));
  }, [personaNames, personaColorMap]);

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
   *  TODO: Recompute collisions/gaps after repositioning — currently they reflect the original schedule. */
  const handleMoveBeat = useCallback((deliverable: { title: string; channel: string }, schedulerBeatIndex: number, currentBeat: number, direction: -1 | 1) => {
    const newBeat = currentBeat + direction;
    if (newBeat < 0 || newBeat >= schedule.totalBeats) return;
    const key = getItemKey(deliverable, schedulerBeatIndex);
    setBeatOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, newBeat);
      return next;
    });
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
  const cellLookup = useMemo(() => {
    const map = new Map<number, (ScheduledDeliverable & { schedulerBeatIndex: number })[]>();
    for (const s of schedule.scheduled) {
      const key = getItemKey(s.deliverable, s.beatIndex);
      const beat = beatOverrides.get(key) ?? s.beatIndex;
      const adjusted = { ...s, beatIndex: beat, schedulerBeatIndex: s.beatIndex };
      if (!map.has(beat)) map.set(beat, []);
      map.get(beat)!.push(adjusted);
    }
    return map;
  }, [schedule, beatOverrides]);


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

  // ─── Flow connections (re-resolved with beatOverrides) ──────
  const effectiveResolvedConnections = useMemo(() => {
    if (!schedule.resolvedConnections || schedule.resolvedConnections.length === 0) return [];
    if (beatOverrides.size === 0) return schedule.resolvedConnections;

    // Build title → beat lookup from cellLookup (first match wins, consistent with scheduler)
    const titleToBeat = new Map<string, number>();
    for (const [beat, items] of cellLookup) {
      for (const item of items) {
        if (!titleToBeat.has(item.deliverable.title)) {
          titleToBeat.set(item.deliverable.title, beat);
        }
      }
    }

    return schedule.resolvedConnections.map((conn) => ({
      ...conn,
      fromBeatIndex: titleToBeat.get(conn.fromTitle) ?? conn.fromBeatIndex,
      toBeatIndex: titleToBeat.get(conn.toTitle) ?? conn.toBeatIndex,
    }));
  }, [schedule.resolvedConnections, beatOverrides, cellLookup]);

  // Set of titles currently hidden by filters (only hidden if ALL instances fail)
  const hiddenTitles = useMemo(() => {
    if (selectedPersonaIds.size === 0 && selectedChannels.size === 0) return new Set<string>();
    const visible = new Set<string>();
    const all = new Set<string>();
    for (const s of schedule.scheduled) {
      all.add(s.deliverable.title);
      const passChannel = selectedChannels.size === 0 || selectedChannels.has(s.normalizedChannel);
      const passPersona = selectedPersonaIds.size === 0 || s.targetPersonas.length === 0 || s.targetPersonas.some((p) => selectedPersonaIds.has(p));
      if (passChannel && passPersona) visible.add(s.deliverable.title);
    }
    const hidden = new Set<string>();
    for (const title of all) {
      if (!visible.has(title)) hidden.add(title);
    }
    return hidden;
  }, [schedule.scheduled, selectedPersonaIds, selectedChannels]);

  // Set of all titles that participate in at least one flow connection
  const flowTitleSet = useMemo(() => {
    const titles = new Set<string>();
    for (const conn of effectiveResolvedConnections) {
      titles.add(conn.fromTitle);
      titles.add(conn.toTitle);
    }
    return titles;
  }, [effectiveResolvedConnections]);

  const hasFlowConnections = effectiveResolvedConnections.length > 0;

  const { totalBeats, phaseBoundaries } = schedule;

  // Grid template — no label column, just week cells
  const gridTemplateColumns = `repeat(${totalBeats}, minmax(${CELL_MIN_WIDTH}px, 1fr))`;
  const gridMinWidth = `${totalBeats * CELL_MIN_WIDTH}px`;

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
        {hasFlowConnections && (
          <button
            type="button"
            onClick={() => setShowFlows((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              showFlows
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            Flows
          </button>
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

                        if (!isInRange) {
                          return <div key={lane.personaId} className="h-[3px]" />;
                        }

                        return (
                          <div
                            key={lane.personaId}
                            className="h-[3px] rounded-full transition-opacity"
                            style={{
                              backgroundColor: lane.color.activeHex,
                              opacity: hasContent ? 1 : 0.15,
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
              {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                const items = filteredCellLookup.get(beatIdx) ?? [];
                const weekCollisions = schedule.collisions.filter((c) => c.beatIndex === beatIdx);
                const phaseIdx = phaseBoundaries.findIndex(
                  (pb) => beatIdx >= pb.startBeat && beatIdx <= pb.endBeat,
                );
                const phase = phaseIdx >= 0 ? phaseBoundaries[phaseIdx] : undefined;
                const isPhaseStart = phase?.startBeat === beatIdx;
                const phaseColor = phaseIdx >= 0 ? getPhaseColor(phaseIdx) : undefined;

                return (
                  <div
                    key={beatIdx}
                    className={`border-b border-r border-gray-100 p-2 align-top ${
                      isPhaseStart ? `border-l-2 ${phaseColor?.border ?? "border-l-gray-300"}` : ""
                    } ${weekCollisions.length > 0 ? "bg-red-50/40" : phaseColor?.cell ?? ""}`}
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
                            onMove={(dir) => handleMoveBeat(item.deliverable, item.schedulerBeatIndex, beatIdx, dir)}
                            canMoveLeft={beatIdx > 0}
                            canMoveRight={beatIdx < totalBeats - 1}
                            highlighted={hoveredFlowTitles?.has(item.deliverable.title) ?? false}
                            hasFlowConnection={flowTitleSet.has(item.deliverable.title)}
                            beatIndex={beatIdx}
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

            {/* Flow connections SVG overlay */}
            <FlowConnectionsOverlay
              connections={effectiveResolvedConnections}
              gridRef={gridRef}
              zoom={zoom}
              visible={showFlows}
              hiddenTitles={hiddenTitles}
              onHoverTitles={setHoveredFlowTitles}
            />
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
