"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Minus,
  Plus,
  Maximize2,
  Info,
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
import { computeDeploymentSchedule } from "@/features/campaigns/lib/deployment-scheduler";
import { getChannelLabel } from "@/features/campaigns/lib/channel-frequency";
import { getPersonaColor, SHARED_COLOR } from "@/features/campaigns/lib/persona-colors";

// ─── Zoom constants ─────────────────────────────────────────────

const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;
const ZOOM_DEFAULT = 100;

// ─── Types ──────────────────────────────────────────────────────

interface DeploymentTimelineSectionProps {
  assetPlan: AssetPlanLayer;
  architecture: ArchitectureLayer;
  channelPlan: ChannelPlanLayer;
}

// ─── Sub-components ─────────────────────────────────────────────

/** Floating zoom toolbar (same pattern as JourneyMatrixSection) */
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

/** Deliverable pill with persona-colored background and tooltip */
function DeliverablePill({
  item,
  personaColorIndex,
  personaNames,
}: {
  item: ScheduledDeliverable;
  personaColorIndex: Map<string, number>;
  personaNames: Map<string, string>;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const [tooltipSide, setTooltipSide] = useState<'top' | 'bottom'>('top');

  // Determine color: shared = gray, single persona = persona color, multi = first persona color
  const firstPersona = item.targetPersonas[0];
  const color = useMemo(() => {
    if (item.isShared) return SHARED_COLOR;
    const idx = firstPersona ? (personaColorIndex.get(firstPersona) ?? 0) : 0;
    return getPersonaColor(idx);
  }, [item.isShared, firstPersona, personaColorIndex]);

  const priorityDot =
    item.priority === "must-have"
      ? "bg-emerald-500"
      : item.priority === "should-have"
        ? "bg-amber-500"
        : "bg-gray-300";

  const handleMouseEnter = useCallback(() => {
    // Decide tooltip direction based on available space above
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setTooltipSide(rect.top < 120 ? 'bottom' : 'top');
    }
    setShowTooltip(true);
  }, []);

  const resolvedPersonas = useMemo(
    () => item.targetPersonas.map((p) => personaNames.get(p) ?? p),
    [item.targetPersonas, personaNames],
  );

  return (
    <div
      ref={pillRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border truncate max-w-[180px] cursor-default ${color.bg} ${color.text} ${color.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot}`} />
        <span className="truncate">{item.deliverable.title}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`absolute z-50 ${
            tooltipSide === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } left-0 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-none`}
        >
          <p className="font-semibold mb-1">{item.deliverable.title}</p>
          <p className="text-gray-300 mb-1">{item.deliverable.contentType} &middot; {item.channel}</p>
          {resolvedPersonas.length > 0 ? (
            <p className="text-gray-400">
              Personas: {resolvedPersonas.join(", ")}
            </p>
          ) : (
            <p className="text-gray-400">All personas (shared)</p>
          )}
          <p className="text-gray-400 mt-0.5">
            Priority: {item.priority} &middot; Effort: {item.deliverable.estimatedEffort}
          </p>
        </div>
      )}
    </div>
  );
}

/** Red collision badge */
function CollisionBadge({ collision }: { collision: DeploymentCollision }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${
          collision.severity === "overload" ? "bg-red-600" : "bg-red-400"
        }`}
      >
        {collision.items.length}
      </span>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-1.5 w-52 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-2.5 pointer-events-none">
          <p className="font-semibold text-red-300 mb-1">
            Channel {collision.severity === "overload" ? "overloaded" : "near capacity"}
          </p>
          <p className="text-gray-300">
            {collision.items.length} items on {getChannelLabel(collision.channel)} (max {collision.capacity}/beat)
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
            {" "}has no touchpoints for {gap.gapLength} consecutive beat{gap.gapLength !== 1 ? "s" : ""} (beat {gap.startBeat + 1}&ndash;{gap.endBeat + 1}).
            Mental availability may decrease.
          </span>
        </div>
      ))}
    </div>
  );
}

/** Color legend for personas */
function TimelineLegend({
  personaColorIndex,
  personaNames,
  hasCollisions,
  hasGaps,
}: {
  personaColorIndex: Map<string, number>;
  personaNames: Map<string, string>;
  hasCollisions: boolean;
  hasGaps: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
      {/* Persona colors */}
      {Array.from(personaColorIndex.entries()).map(([id, idx]) => {
        const color = getPersonaColor(idx);
        return (
          <div key={id} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
            <span>{personaNames.get(id) ?? id}</span>
          </div>
        );
      })}
      {/* Shared */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${SHARED_COLOR.dot}`} />
        <span>Shared</span>
      </div>

      {/* Indicator legend */}
      {hasCollisions && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-400 text-[9px] font-bold text-white">!</span>
            <span>Channel collision</span>
          </div>
        </>
      )}
      {hasGaps && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Continuity gap</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function DeploymentTimelineSection({
  assetPlan,
  architecture,
  channelPlan,
}: DeploymentTimelineSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) { setZoom(ZOOM_DEFAULT); return; }
    const scrollEl = container.querySelector("[data-timeline-scroll]") as HTMLElement | null;
    const gridEl = container.querySelector("[data-timeline-grid]") as HTMLElement | null;
    if (!scrollEl || !gridEl) { setZoom(ZOOM_DEFAULT); return; }
    const containerWidth = scrollEl.clientWidth;
    const gridWidth = gridEl.scrollWidth;
    if (gridWidth <= 0) { setZoom(ZOOM_DEFAULT); return; }
    const idealZoom = Math.floor((containerWidth / gridWidth) * 100);
    setZoom(Math.max(ZOOM_MIN, Math.min(idealZoom, ZOOM_MAX)));
  }, []);

  // Fetch real persona data for name resolution (same pattern as JourneyMatrixSection)
  const { data: personasData } = usePersonas();
  const personaLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of personasData?.personas ?? []) {
      map.set(p.id, p.name);
    }
    return map;
  }, [personasData]);

  // Compute schedule
  const schedule = useMemo(
    () => computeDeploymentSchedule(assetPlan, architecture, channelPlan),
    [assetPlan, architecture, channelPlan],
  );

  // Build persona color + name maps, enriching with real persona names from DB
  const { personaColorIndex, personaNames } = useMemo(() => {
    const colorMap = new Map<string, number>();
    const nameMap = new Map<string, string>();
    let idx = 0;

    // Extract persona names from architecture (personaPhaseData), enriched with real names
    for (const phase of architecture.journeyPhases ?? []) {
      for (const ppd of phase.personaPhaseData ?? []) {
        if (!colorMap.has(ppd.personaId)) {
          colorMap.set(ppd.personaId, idx++);
          nameMap.set(ppd.personaId, personaLookup.get(ppd.personaId) ?? ppd.personaName);
        }
      }
    }

    // Also pick up any personas only referenced in deliverables
    for (const s of schedule.scheduled) {
      for (const p of s.targetPersonas) {
        if (!colorMap.has(p)) {
          colorMap.set(p, idx++);
          nameMap.set(p, personaLookup.get(p) ?? p);
        }
      }
    }

    return { personaColorIndex: colorMap, personaNames: nameMap };
  }, [architecture, schedule, personaLookup]);

  // Collect unique channels (sorted by first appearance)
  const channels = useMemo(() => {
    const seen = new Map<string, string>(); // normalizedChannel → original channel
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

  // Build collision lookup: beatIndex:normalizedChannel → collision
  const collisionLookup = useMemo(() => {
    const map = new Map<string, DeploymentCollision>();
    for (const c of schedule.collisions) {
      map.set(`${c.beatIndex}:${c.channel}`, c);
    }
    return map;
  }, [schedule]);

  // Build cell lookup: beatIndex:normalizedChannel → items[]
  const cellLookup = useMemo(() => {
    const map = new Map<string, ScheduledDeliverable[]>();
    for (const s of schedule.scheduled) {
      const key = `${s.beatIndex}:${s.normalizedChannel}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [schedule]);

  const { totalBeats, phaseBoundaries } = schedule;

  if (schedule.scheduled.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
        <Info className="w-4 h-4 text-gray-400" />
        No deliverables to schedule. Generate an asset plan first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <TimelineLegend
        personaColorIndex={personaColorIndex}
        personaNames={personaNames}
        hasCollisions={schedule.collisions.length > 0}
        hasGaps={schedule.gaps.length > 0}
      />

      {/* Timeline grid */}
      <div ref={containerRef} className="relative">
        <div
          data-timeline-scroll
          className="overflow-x-auto border border-gray-200 rounded-lg"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div
            data-timeline-grid
            className="origin-top-left transition-transform duration-150"
            style={{
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: "top left",
            }}
          >
            {/* Phase header row */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `140px repeat(${totalBeats}, minmax(120px, 1fr))`,
                minWidth: `${140 + totalBeats * 120}px`,
              }}
            >
              {/* Corner */}
              <div className="bg-gray-50 border-b border-r border-gray-200 p-2 flex items-center">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Channel / Beat
                </span>
              </div>

              {/* Beat headers with phase grouping */}
              {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                const phaseIdx = phaseBoundaries.findIndex(
                  (pb) => beatIdx >= pb.startBeat && beatIdx <= pb.endBeat,
                );
                const phase = phaseIdx >= 0 ? phaseBoundaries[phaseIdx] : undefined;
                const isPhaseStart = phase?.startBeat === beatIdx;

                return (
                  <div
                    key={beatIdx}
                    className={`border-b border-r border-gray-200 p-2 text-center ${
                      isPhaseStart ? "border-l-2 border-l-gray-300" : ""
                    }`}
                    style={{ backgroundColor: phaseIdx >= 0 ? `rgba(0,0,0,${0.02 + (phaseIdx % 2) * 0.02})` : undefined }}
                  >
                    {isPhaseStart && (
                      <div className="text-[10px] font-semibold text-gray-700 truncate mb-0.5">
                        {phase.phase}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400">
                      Beat {beatIdx + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Channel rows */}
            {channels.map((ch) => (
              <div
                key={ch.normalized}
                className="grid"
                style={{
                  gridTemplateColumns: `140px repeat(${totalBeats}, minmax(120px, 1fr))`,
                  minWidth: `${140 + totalBeats * 120}px`,
                }}
              >
                {/* Channel label */}
                <div className="bg-gray-50/50 border-b border-r border-gray-200 p-2 flex items-center">
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {ch.label}
                  </span>
                </div>

                {/* Beat cells */}
                {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                  const cellKey = `${beatIdx}:${ch.normalized}`;
                  const items = cellLookup.get(cellKey) ?? [];
                  const collision = collisionLookup.get(cellKey);
                  const phase = phaseBoundaries.find(
                    (pb) => beatIdx >= pb.startBeat && beatIdx <= pb.endBeat,
                  );
                  const isPhaseStart = phase?.startBeat === beatIdx;

                  return (
                    <div
                      key={beatIdx}
                      className={`border-b border-r border-gray-100 p-1.5 min-h-[40px] ${
                        isPhaseStart ? "border-l-2 border-l-gray-300" : ""
                      } ${collision ? "bg-red-50/40" : ""}`}
                    >
                      <div className="flex flex-wrap gap-1 items-start">
                        {items.map((item, i) => (
                          <DeliverablePill
                            key={`${item.deliverable.title}-${i}`}
                            item={item}
                            personaColorIndex={personaColorIndex}
                            personaNames={personaNames}
                          />
                        ))}
                        {collision && (
                          <CollisionBadge collision={collision} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
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

      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
        <span>{schedule.scheduled.length} deliverables across {totalBeats} beats</span>
        {schedule.collisions.length > 0 && (
          <span className="text-red-600 font-medium">
            {schedule.collisions.length} channel collision{schedule.collisions.length !== 1 ? "s" : ""}
          </span>
        )}
        {schedule.gaps.length > 0 && (
          <span className="text-amber-600 font-medium">
            {schedule.gaps.length} continuity gap{schedule.gaps.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
