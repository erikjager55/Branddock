"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Route,
  Users,
  AlertCircle,
} from "lucide-react";
import { Badge, Button } from "@/components/shared";
import type {
  ArchitectureLayer,
  AssetPlanLayer,
  AssetPlanDeliverable,
  ChannelPlanLayer,
  JourneyPhase,
  Touchpoint,
} from "@/lib/campaigns/strategy-blueprint.types";

// ─── Types ─────────────────────────────────────────────────────

interface JourneyMatrixSectionProps {
  architecture: ArchitectureLayer;
  assetPlan: AssetPlanLayer;
  channelPlan: ChannelPlanLayer;
  onBringToLife?: (deliverableTitle: string, contentType: string) => void;
}

interface CellData {
  touchpoints: Touchpoint[];
  deliverables: AssetPlanDeliverable[];
}

interface PersonaInfo {
  personaId: string;
  personaName: string;
}

// ─── Priority & Effort styling helpers ─────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  "must-have": "bg-emerald-500",
  "should-have": "bg-amber-500",
  "nice-to-have": "bg-gray-300",
};

const EFFORT_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
};

/** Stable empty map to avoid re-creating on every render in fallback path */
const EMPTY_PHASE_CELLS = new Map<string, CellData>();

// ─── Sub-components (not exported) ─────────────────────────────

/** Compact touchpoint card (blue tint) */
function TouchpointCard({ tp }: { tp: Touchpoint }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded px-2 py-1.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            tp.role === "primary" ? "bg-emerald-500" : "bg-gray-300"
          }`}
        />
        <span className="font-medium text-gray-900 truncate">{tp.channel}</span>
      </div>
      {tp.message && (
        <p className="text-gray-600 mt-0.5 line-clamp-1">{tp.message}</p>
      )}
    </div>
  );
}

/** Compact deliverable card with expand-on-click */
function DeliverableCard({
  deliverable,
  onBringToLife,
}: {
  deliverable: AssetPlanDeliverable;
  onBringToLife?: (title: string, contentType: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white border border-gray-200 rounded px-2 py-1.5 text-xs shadow-sm hover:shadow cursor-pointer transition-shadow"
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
    >
      {/* Collapsed view */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            PRIORITY_DOT[deliverable.productionPriority] ?? "bg-gray-300"
          }`}
        />
        <span className="font-medium text-gray-900 truncate flex-1">
          {deliverable.title}
        </span>
        <span className="text-gray-400 flex-shrink-0">
          {EFFORT_LABEL[deliverable.estimatedEffort] ?? deliverable.estimatedEffort}
        </span>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
            <span>{deliverable.productionPriority}</span>
            <span>{deliverable.estimatedEffort} effort</span>
            <span>{deliverable.contentType}</span>
          </div>
          {deliverable.brief.objective && (
            <div>
              <span className="font-medium text-gray-700">Objective: </span>
              <span className="text-gray-600">{deliverable.brief.objective}</span>
            </div>
          )}
          {deliverable.brief.keyMessage && (
            <div>
              <span className="font-medium text-gray-700">Key Message: </span>
              <span className="text-gray-600">{deliverable.brief.keyMessage}</span>
            </div>
          )}
          {deliverable.brief.callToAction && (
            <div>
              <span className="font-medium text-gray-700">CTA: </span>
              <span className="text-gray-600">{deliverable.brief.callToAction}</span>
            </div>
          )}
          {deliverable.brief.toneDirection && (
            <div>
              <span className="font-medium text-gray-700">Tone: </span>
              <span className="text-gray-600">{deliverable.brief.toneDirection}</span>
            </div>
          )}
          {onBringToLife && (
            <div className="pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBringToLife(deliverable.title, deliverable.contentType);
                }}
              >
                <Zap className="h-3 w-3 mr-1" />
                Bring to Life
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Single matrix cell (persona x phase intersection) */
function MatrixCell({
  touchpoints,
  deliverables,
  onBringToLife,
}: CellData & { onBringToLife?: (title: string, contentType: string) => void }) {
  const total = touchpoints.length + deliverables.length;
  const MAX_VISIBLE = 5;
  const overflow = Math.max(0, total - MAX_VISIBLE);

  if (total === 0) {
    return <div className="min-h-[60px] p-2 border-b border-r border-gray-100 bg-gray-50/50" />;
  }

  // Pre-slice arrays to avoid mutable counter in render
  const visibleTouchpoints = touchpoints.slice(0, MAX_VISIBLE);
  const remainingSlots = Math.max(0, MAX_VISIBLE - visibleTouchpoints.length);
  const visibleDeliverables = deliverables.slice(0, remainingSlots);

  return (
    <div className="min-h-[60px] p-2 border-b border-r border-gray-100 space-y-1.5">
      {visibleTouchpoints.map((tp) => (
        <TouchpointCard key={`tp-${tp.channel}-${tp.message?.slice(0, 20) ?? ""}`} tp={tp} />
      ))}
      {visibleDeliverables.map((d) => (
        <DeliverableCard
          key={`d-${d.title}`}
          deliverable={d}
          onBringToLife={onBringToLife}
        />
      ))}
      {overflow > 0 && (
        <p className="text-[10px] text-gray-400 text-center">+{overflow} more</p>
      )}
    </div>
  );
}

/** Phase column header */
function PhaseColumnHeader({
  phase,
  duration,
  itemCount,
}: {
  phase: JourneyPhase;
  duration?: number;
  itemCount: number;
}) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 p-3 min-w-[200px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-900 truncate">
          {phase.name}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {duration != null && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <Clock className="w-3 h-3" />
              {duration}w
            </span>
          )}
          <span className="bg-gray-200 text-gray-600 text-[10px] rounded-full px-1.5 py-0.5">
            {itemCount}
          </span>
        </div>
      </div>
      {phase.goal && (
        <p className="text-xs text-gray-500 line-clamp-1">{phase.goal}</p>
      )}
    </div>
  );
}

/** Collapsible persona row */
function PersonaRow({
  persona,
  phases,
  phaseCells,
  onBringToLife,
}: {
  persona: PersonaInfo;
  phases: JourneyPhase[];
  phaseCells: Map<string, CellData>;
  onBringToLife?: (title: string, contentType: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const totalItems = useMemo(() => {
    let count = 0;
    for (const cell of phaseCells.values()) {
      count += cell.touchpoints.length + cell.deliverables.length;
    }
    return count;
  }, [phaseCells]);

  return (
    <>
      {/* Row header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="sticky left-0 z-20 bg-white border-r border-b border-gray-200 p-3 min-w-[200px] cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
        style={{ gridColumn: 1 }}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900 truncate flex-1">
          {persona.personaName}
        </span>
        <span className="bg-gray-200 text-gray-600 text-[10px] rounded-full px-1.5 py-0.5 flex-shrink-0">
          {totalItems}
        </span>
      </div>

      {/* Phase cells */}
      {phases.map((phase) => {
        const cell = phaseCells.get(phase.name.toLowerCase()) ?? {
          touchpoints: [],
          deliverables: [],
        };

        if (!expanded) {
          return (
            <div
              key={phase.id}
              className="border-b border-r border-gray-100 bg-gray-50/30 min-h-[44px]"
            />
          );
        }

        return (
          <MatrixCell
            key={phase.id}
            touchpoints={cell.touchpoints}
            deliverables={cell.deliverables}
            onBringToLife={onBringToLife}
          />
        );
      })}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────

/** TheyDo-inspired Persona x Journey Stage matrix */
export function JourneyMatrixSection({
  architecture,
  assetPlan,
  channelPlan,
  onBringToLife,
}: JourneyMatrixSectionProps) {
  const journeyPhases = architecture.journeyPhases ?? [];

  const sortedPhases = useMemo(
    () =>
      [...journeyPhases]
        .map((p) => ({
          ...p,
          name: p.name || (p as unknown as Record<string, unknown>).phase as string || p.id || '',
          id: p.id || p.name || (p as unknown as Record<string, unknown>).phase as string || '',
        }))
        .filter((p) => p.name)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [journeyPhases],
  );

  // 1. Unique personas from all journey phases (with fallback to touchpoint personaRelevance)
  const personas = useMemo(() => {
    const map = new Map<string, PersonaInfo>();
    // Primary: extract from personaPhaseData
    for (const phase of journeyPhases) {
      for (const ppd of phase.personaPhaseData ?? []) {
        if (!map.has(ppd.personaId)) {
          map.set(ppd.personaId, {
            personaId: ppd.personaId,
            personaName: ppd.personaName,
          });
        }
      }
    }
    // Fallback: if no personas from personaPhaseData, extract from touchpoint personaRelevance
    if (map.size === 0) {
      for (const phase of journeyPhases) {
        for (const tp of phase.touchpoints ?? []) {
          const relevance = tp.personaRelevance;
          if (Array.isArray(relevance)) {
            for (const pr of relevance) {
              if (pr.personaId && !map.has(pr.personaId)) {
                map.set(pr.personaId, { personaId: pr.personaId, personaName: pr.personaId });
              }
            }
          } else if (relevance && typeof relevance === 'object') {
            for (const pid of Object.keys(relevance as Record<string, string>)) {
              if (!map.has(pid)) {
                map.set(pid, { personaId: pid, personaName: pid });
              }
            }
          }
        }
      }
    }
    return Array.from(map.values());
  }, [journeyPhases]);

  // 2. Duration per phase from channelPlan
  const durationByPhaseId = useMemo(
    () => new Map((channelPlan.phaseDurations ?? []).map((pd) => [pd.phaseId, pd.suggestedWeeks])),
    [channelPlan],
  );

  // 3. Matrix data: per persona per phase -> touchpoints + deliverables
  // Also tracks "all personas" row and "unassigned" deliverables
  const { personaMatrix, allPersonasRow, unassigned } = useMemo(() => {
    // Build persona -> phase -> CellData
    const matrix = new Map<string, Map<string, CellData>>();
    const allRow = new Map<string, CellData>();
    const unassignedDeliverables: AssetPlanDeliverable[] = [];

    // Initialize persona rows
    for (const p of personas) {
      const phaseMap = new Map<string, CellData>();
      for (const phase of sortedPhases) {
        phaseMap.set(phase.name.toLowerCase(), { touchpoints: [], deliverables: [] });
      }
      matrix.set(p.personaId, phaseMap);
    }

    // Initialize allRow
    for (const phase of sortedPhases) {
      allRow.set(phase.name.toLowerCase(), { touchpoints: [], deliverables: [] });
    }

    // Assign touchpoints to persona rows
    for (const phase of sortedPhases) {
      const phaseKey = phase.name.toLowerCase();
      for (const tp of phase.touchpoints ?? []) {
        // Normalize personaRelevance: handle both array and flat object formats
        const rawRelevance = tp.personaRelevance;
        const relevanceArray: Array<{ personaId: string; relevance: string; messagingAngle?: string }> = Array.isArray(rawRelevance)
          ? rawRelevance
          : rawRelevance && typeof rawRelevance === 'object'
            ? Object.entries(rawRelevance as Record<string, string>).map(([pid, rel]) => ({
                personaId: pid,
                relevance: rel,
                messagingAngle: '',
              }))
            : [];

        const relevantPersonas = relevanceArray.filter(
          (pr) => pr.relevance === "high" || pr.relevance === "medium",
        );

        if (relevantPersonas.length === 0) {
          // Touchpoint relevant for all — put in allRow
          allRow.get(phaseKey)?.touchpoints.push(tp);
        } else {
          for (const pr of relevantPersonas) {
            const personaRow = matrix.get(pr.personaId);
            if (personaRow) {
              personaRow.get(phaseKey)?.touchpoints.push(tp);
            } else {
              // Persona ID not in our map — fallback to allRow
              allRow.get(phaseKey)?.touchpoints.push(tp);
            }
          }
        }
      }
    }

    // Assign deliverables to persona rows
    for (const d of assetPlan.deliverables ?? []) {
      const phaseKey = (d.phase ?? "").toLowerCase();

      // Check if this phase exists
      const phaseExists = phaseKey && sortedPhases.some(
        (p) => p.name.toLowerCase() === phaseKey,
      );

      if (!phaseExists) {
        unassignedDeliverables.push(d);
        continue;
      }

      if ((d.targetPersonas ?? []).length === 0) {
        // No specific persona — allRow
        allRow.get(phaseKey)?.deliverables.push(d);
      } else {
        let matched = false;
        for (const tp of d.targetPersonas ?? []) {
          // Match by ID or name (case-insensitive)
          const persona = personas.find(
            (p) =>
              p.personaId === tp ||
              p.personaName.toLowerCase() === tp.toLowerCase(),
          );
          if (persona) {
            matrix.get(persona.personaId)?.get(phaseKey)?.deliverables.push(d);
            matched = true;
          }
        }
        if (!matched) {
          // No matching persona found — allRow
          allRow.get(phaseKey)?.deliverables.push(d);
        }
      }
    }

    return {
      personaMatrix: matrix,
      allPersonasRow: allRow,
      unassigned: unassignedDeliverables,
    };
  }, [personas, sortedPhases, assetPlan]);

  // Check if allRow has content
  const allRowHasContent = useMemo(() => {
    for (const cell of allPersonasRow.values()) {
      if (cell.touchpoints.length > 0 || cell.deliverables.length > 0) return true;
    }
    return false;
  }, [allPersonasRow]);

  // Per-phase total item counts (for column headers)
  const phaseItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const phase of sortedPhases) {
      const phaseKey = phase.name.toLowerCase();
      let count = 0;
      // All personas row
      const allCell = allPersonasRow.get(phaseKey);
      if (allCell) count += allCell.touchpoints.length + allCell.deliverables.length;
      // Per persona
      for (const phaseMap of personaMatrix.values()) {
        const cell = phaseMap.get(phaseKey);
        if (cell) count += cell.touchpoints.length + cell.deliverables.length;
      }
      counts.set(phase.id, count);
    }
    return counts;
  }, [sortedPhases, allPersonasRow, personaMatrix]);

  const totalTouchpoints = journeyPhases.reduce(
    (sum, p) => sum + (p.touchpoints?.length ?? 0),
    0,
  );

  const colCount = sortedPhases.length + 1; // +1 for row header column

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="teal">{architecture.campaignType}</Badge>
        <span className="text-sm text-gray-600">
          <Route className="w-3.5 h-3.5 inline mr-1" />
          {sortedPhases.length} phase{sortedPhases.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm text-gray-600">
          {totalTouchpoints} touchpoint{totalTouchpoints !== 1 ? "s" : ""}
        </span>
        <span className="text-sm text-gray-600">
          {assetPlan.totalDeliverables ?? 0} deliverable{(assetPlan.totalDeliverables ?? 0) !== 1 ? "s" : ""}
        </span>
        <span className="text-sm text-gray-600">
          <Users className="w-3.5 h-3.5 inline mr-1" />
          {personas.length} persona{personas.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Matrix container */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `200px repeat(${sortedPhases.length}, minmax(200px, 1fr))`,
            minWidth: `${200 + sortedPhases.length * 200}px`,
          }}
        >
          {/* ─── Header row ─── */}

          {/* Corner cell */}
          <div className="sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 p-3 min-w-[200px]">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Persona / Phase
            </span>
          </div>

          {/* Phase column headers */}
          {sortedPhases.map((phase) => (
            <PhaseColumnHeader
              key={phase.id}
              phase={phase}
              duration={durationByPhaseId.get(phase.id)}
              itemCount={phaseItemCounts.get(phase.id) ?? 0}
            />
          ))}

          {/* ─── "All Personas" row (optional) ─── */}
          {allRowHasContent && (
            <>
              <div
                className="sticky left-0 z-20 bg-gray-50/80 border-r border-b border-gray-200 p-3 min-w-[200px] flex items-center gap-2"
                style={{ gridColumn: 1 }}
              >
                <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-600">All Personas</span>
              </div>
              {sortedPhases.map((phase) => {
                const cell = allPersonasRow.get(phase.name.toLowerCase()) ?? {
                  touchpoints: [],
                  deliverables: [],
                };
                return (
                  <MatrixCell
                    key={`all-${phase.id}`}
                    touchpoints={cell.touchpoints}
                    deliverables={cell.deliverables}
                    onBringToLife={onBringToLife}
                  />
                );
              })}
            </>
          )}

          {/* ─── Persona rows ─── */}
          {personas.map((persona) => (
            <PersonaRow
              key={persona.personaId}
              persona={persona}
              phases={sortedPhases}
              phaseCells={
                personaMatrix.get(persona.personaId) ?? EMPTY_PHASE_CELLS
              }
              onBringToLife={onBringToLife}
            />
          ))}
        </div>
      </div>

      {/* Unassigned deliverables (only when items have no phase match) */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {unassigned.length} deliverable{unassigned.length !== 1 ? "s" : ""} without phase match
            </span>
          </div>
          <div className="space-y-2">
            {unassigned.map((d) => (
              <div
                key={`unassigned-${d.title}`}
                className="flex items-center gap-2 text-xs text-amber-700 bg-white/60 rounded px-3 py-2"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    PRIORITY_DOT[d.productionPriority] ?? "bg-gray-300"
                  }`}
                />
                <span className="font-medium">{d.title}</span>
                <span className="text-amber-500">
                  phase: &quot;{d.phase}&quot;
                </span>
                {onBringToLife && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onBringToLife(d.title, d.contentType)}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Bring to Life
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
