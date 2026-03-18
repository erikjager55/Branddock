"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
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
  Touchpoint,
} from "@/lib/campaigns/strategy-blueprint.types";
import { usePersonas } from "@/features/personas/hooks";
import type { PersonaWithMeta } from "@/features/personas/types/persona.types";
import { computeDeploymentSchedule } from "@/features/campaigns/lib/deployment-scheduler";
import { getChannelLabel, normalizeChannel } from "@/features/campaigns/lib/channel-frequency";
import { getPersonaColor, type PersonaColorStyle } from "@/features/campaigns/lib/persona-colors";
import {
  TouchpointCard,
  DeliverableCard,
  type PersonaLegendInfo,
  type CardPersonaInfo,
} from "./shared-timeline-cards";

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
            {" "}has no touchpoints for {gap.gapLength} consecutive week{gap.gapLength !== 1 ? "s" : ""} (week {gap.startBeat + 1}&ndash;{gap.endBeat + 1}).
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
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                isActive
                  ? `${color.bg} ${color.text} ${color.border}`
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
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
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                isActive
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
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

// ─── Main Component ─────────────────────────────────────────────

export function DeploymentTimelineSection({
  assetPlan,
  architecture,
  channelPlan,
  onBringToLife,
  campaignStartDate,
}: DeploymentTimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

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
            avatarUrl: realPersona?.avatarUrl ?? null,
            tagline: realPersona?.tagline ?? null,
            occupation: realPersona?.occupation ?? null,
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
            avatarUrl: realPersona?.avatarUrl ?? null,
            tagline: realPersona?.tagline ?? null,
            occupation: realPersona?.occupation ?? null,
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

  const resolveTouchpointPersonas = useCallback((tp: Touchpoint): CardPersonaInfo[] => {
    const relevanceArray = Array.isArray(tp.personaRelevance) ? tp.personaRelevance : [];
    return relevanceArray
      .filter((pr) => personaNames.has(pr.personaId))
      .map((pr) => ({
        personaId: pr.personaId,
        name: personaNames.get(pr.personaId)!,
        colorStyle: personaColorMap.get(pr.personaId) ?? getPersonaColor(0),
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

  // Collect unique channels from both deliverables AND touchpoints (sorted by first appearance)
  const channels = useMemo(() => {
    const seen = new Map<string, string>(); // normalizedChannel → original channel label

    // From scheduled deliverables
    for (const s of schedule.scheduled) {
      if (!seen.has(s.normalizedChannel)) {
        seen.set(s.normalizedChannel, s.channel);
      }
    }

    // From touchpoints in architecture
    for (const phase of architecture.journeyPhases ?? []) {
      for (const tp of phase.touchpoints ?? []) {
        const norm = normalizeChannel(tp.channel);
        if (!seen.has(norm)) {
          seen.set(norm, tp.channel);
        }
      }
    }

    return Array.from(seen.entries()).map(([norm, orig]) => {
      const resolved = getChannelLabel(norm);
      return { normalized: norm, label: resolved !== "Other" ? resolved : orig };
    });
  }, [schedule, architecture]);

  // Build deliverable cell lookup: weekIndex → items[] (flat, no channel dimension)
  const cellLookup = useMemo(() => {
    const map = new Map<number, ScheduledDeliverable[]>();
    for (const s of schedule.scheduled) {
      if (!map.has(s.beatIndex)) map.set(s.beatIndex, []);
      map.get(s.beatIndex)!.push(s);
    }
    return map;
  }, [schedule]);

  // Build touchpoint cell lookup: weekIndex → Touchpoint[]
  // Touchpoints are spread evenly across their phase weeks (same interpolation as deliverables)
  const touchpointCellLookup = useMemo(() => {
    const map = new Map<number, Touchpoint[]>();
    const { phaseBoundaries } = schedule;

    for (const phase of architecture.journeyPhases ?? []) {
      // Find the phase boundary for this phase
      const phaseName = (phase.name || "").toLowerCase();
      const pb = phaseBoundaries.find(
        (b) => b.phase.toLowerCase() === phaseName,
      );
      if (!pb) continue;

      const phaseDuration = pb.endBeat - pb.startBeat + 1;
      const tps = phase.touchpoints ?? [];

      // Spread touchpoints evenly across the phase
      for (let i = 0; i < tps.length; i++) {
        const beatOffset = tps.length <= 1
          ? 0
          : Math.round((i / (tps.length - 1)) * (phaseDuration - 1));
        const beatIndex = pb.startBeat + Math.min(beatOffset, phaseDuration - 1);
        if (!map.has(beatIndex)) map.set(beatIndex, []);
        map.get(beatIndex)!.push(tps[i]);
      }
    }

    return map;
  }, [architecture, schedule]);

  // ─── Filtered lookups (applies persona + channel filters) ─────
  const filteredCellLookup = useMemo(() => {
    if (selectedPersonaIds.size === 0 && selectedChannels.size === 0) return cellLookup;
    const map = new Map<number, ScheduledDeliverable[]>();
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

  const filteredTouchpointLookup = useMemo(() => {
    if (selectedPersonaIds.size === 0 && selectedChannels.size === 0) return touchpointCellLookup;
    const map = new Map<number, Touchpoint[]>();
    for (const [beat, tps] of touchpointCellLookup) {
      const filtered = tps.filter((tp) => {
        if (selectedChannels.size > 0 && !selectedChannels.has(normalizeChannel(tp.channel))) return false;
        if (selectedPersonaIds.size > 0) {
          const rel = Array.isArray(tp.personaRelevance) ? tp.personaRelevance : [];
          if (rel.length > 0 && !rel.some((pr) => selectedPersonaIds.has(pr.personaId))) return false;
        }
        return true;
      });
      if (filtered.length > 0) map.set(beat, filtered);
    }
    return map;
  }, [touchpointCellLookup, selectedPersonaIds, selectedChannels]);

  const { totalBeats, phaseBoundaries } = schedule;

  // Count total touchpoints for summary
  const totalTouchpoints = useMemo(() => {
    let count = 0;
    for (const phase of architecture.journeyPhases ?? []) {
      count += (phase.touchpoints ?? []).length;
    }
    return count;
  }, [architecture]);

  // Grid template — no label column, just week cells
  const gridTemplateColumns = `repeat(${totalBeats}, minmax(${CELL_MIN_WIDTH}px, 1fr))`;
  const gridMinWidth = `${totalBeats * CELL_MIN_WIDTH}px`;

  // Whether campaign start date is available for week date labels
  const hasStartDate = !!campaignStartDate;

  if (schedule.scheduled.length === 0 && totalTouchpoints === 0) {
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
        {totalTouchpoints > 0 && (
          <span className="text-sm text-gray-600">
            {totalTouchpoints} touchpoint{totalTouchpoints !== 1 ? "s" : ""}
          </span>
        )}
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
            data-timeline-grid
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

            {/* Single content row — all items per week in one cell */}
            <div
              className="grid"
              style={{ gridTemplateColumns, minWidth: gridMinWidth }}
            >
              {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                const items = filteredCellLookup.get(beatIdx) ?? [];
                const touchpoints = filteredTouchpointLookup.get(beatIdx) ?? [];
                // Collect any collisions for this week (across all channels)
                const weekCollisions = schedule.collisions.filter((c) => c.beatIndex === beatIdx);
                const phaseIdx = phaseBoundaries.findIndex(
                  (pb) => beatIdx >= pb.startBeat && beatIdx <= pb.endBeat,
                );
                const phase = phaseIdx >= 0 ? phaseBoundaries[phaseIdx] : undefined;
                const isPhaseStart = phase?.startBeat === beatIdx;
                const phaseColor = phaseIdx >= 0 ? getPhaseColor(phaseIdx) : undefined;
                const hasContent = items.length > 0 || touchpoints.length > 0;

                return (
                  <div
                    key={beatIdx}
                    className={`border-b border-r border-gray-100 p-2 align-top ${
                      isPhaseStart ? `border-l-2 ${phaseColor?.border ?? "border-l-gray-300"}` : ""
                    } ${weekCollisions.length > 0 ? "bg-red-50/40" : phaseColor?.cell ?? ""}`}
                    style={!hasContent ? { minHeight: 64 } : undefined}
                  >
                    {hasContent ? (
                      <div className="space-y-2">
                        {touchpoints.map((tp, i) => (
                          <TouchpointCard
                            key={`tp-${tp.channel}-${tp.contentType}-${i}`}
                            tp={tp}
                            personas={resolveTouchpointPersonas(tp)}
                          />
                        ))}

                        {items.map((item, i) => (
                          <DeliverableCard
                            key={`d-${item.deliverable.title}-${i}`}
                            deliverable={item.deliverable}
                            channel={getChannelLabel(item.normalizedChannel)}
                            personas={resolvePersonas(item.targetPersonas)}
                            onBringToLife={onBringToLife}
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
