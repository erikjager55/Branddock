"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Route,
  Users,
  AlertCircle,
  MessageSquare,
  Radio,
  FileText,
  Minus,
  Plus,
  Maximize2,
} from "lucide-react";
import { Badge, Button } from "@/components/shared";
import { usePersonas } from "@/features/personas/hooks";
import type { PersonaWithMeta } from "@/features/personas/types/persona.types";
import type {
  ArchitectureLayer,
  AssetPlanLayer,
  AssetPlanDeliverable,
  ChannelPlanLayer,
  JourneyPhase,
  Touchpoint,
  PersonaPhaseData,
} from "@/lib/campaigns/strategy-blueprint.types";
import { getPersonaColor, type PersonaColorStyle } from "@/features/campaigns/lib/persona-colors";

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
  colorIndex: number;
  /** Real persona avatar URL from the Personas module */
  avatarUrl?: string | null;
  /** Tagline from the Personas module (e.g. "The Ambitious Startup Founder") */
  tagline?: string | null;
  /** Occupation from the Personas module */
  occupation?: string | null;
}

// ─── Constants ──────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, { dot: string; label: string }> = {
  "must-have": { dot: "bg-emerald-500", label: "Must-have" },
  "should-have": { dot: "bg-amber-500", label: "Should-have" },
  "nice-to-have": { dot: "bg-gray-300", label: "Nice-to-have" },
};

const EFFORT_LABEL: Record<string, string> = {
  low: "Low effort",
  medium: "Medium effort",
  high: "High effort",
};

/** Stable empty maps to avoid re-creating on every render in fallback paths */
const EMPTY_PHASE_CELLS = new Map<string, CellData>();
const EMPTY_PHASE_DATA = new Map<string, PersonaPhaseData>();

// ─── Helpers ────────────────────────────────────────────────────

/** Extract initials from a persona name (max 2 chars) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Sub-components ─────────────────────────────────────────────

/** Touchpoint card with full specs */
function TouchpointCard({
  tp,
  personaId,
  personaColor,
}: {
  tp: Touchpoint;
  personaId?: string;
  personaColor?: PersonaColorStyle;
}) {
  // Find the messaging angle for this specific persona
  const relevanceArray = Array.isArray(tp.personaRelevance) ? tp.personaRelevance : [];
  const personaRelevanceEntry = personaId
    ? relevanceArray.find((pr) => pr.personaId === personaId)
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm text-xs">
      {/* Header bar with channel + role */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
        <div className="flex items-center gap-1.5 min-w-0">
          <Radio className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-gray-900 truncate">{tp.channel}</span>
        </div>
        <Badge
          variant={tp.role === "primary" ? "success" : "default"}
        >
          {tp.role}
        </Badge>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {/* Content type */}
        {tp.contentType && (
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700">{tp.contentType}</span>
          </div>
        )}

        {/* Message */}
        {tp.message && (
          <div className="flex items-start gap-1.5">
            <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-600 leading-relaxed">{tp.message}</p>
          </div>
        )}

        {/* Messaging angle for this persona */}
        {personaRelevanceEntry?.messagingAngle && (
          <div
            className={`mt-1 rounded px-2 py-1.5 ${personaColor?.bg ?? "bg-gray-50"} ${personaColor?.border ?? "border-gray-200"} border`}
          >
            <span className={`font-medium ${personaColor?.text ?? "text-gray-700"}`}>
              Messaging angle:
            </span>{" "}
            <span className="text-gray-700">{personaRelevanceEntry.messagingAngle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Deliverable card with expand-on-click */
function DeliverableCard({
  deliverable,
  onBringToLife,
}: {
  deliverable: AssetPlanDeliverable;
  onBringToLife?: (title: string, contentType: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_STYLES[deliverable.productionPriority];

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white border border-gray-200 rounded-lg shadow-sm text-xs hover:shadow cursor-pointer transition-shadow"
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priority?.dot ?? "bg-gray-300"}`} />
          <span className="font-semibold text-gray-900 truncate">{deliverable.title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
        </div>
      </div>

      <div className="px-3 py-2">
        {/* Collapsed: summary tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-gray-500">{deliverable.contentType}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">{priority?.label ?? deliverable.productionPriority}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">{EFFORT_LABEL[deliverable.estimatedEffort] ?? deliverable.estimatedEffort}</span>
        </div>

        {/* Expanded: full brief */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
            {deliverable.brief.objective && (
              <div>
                <span className="font-medium text-gray-700">Objective: </span>
                <span className="text-gray-600">{deliverable.brief.objective}</span>
              </div>
            )}
            {deliverable.brief.keyMessage && (
              <div>
                <span className="font-medium text-gray-700">Key message: </span>
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
    </div>
  );
}

/** Single matrix cell (persona x phase intersection) */
function MatrixCell({
  touchpoints,
  deliverables,
  personaId,
  personaColor,
  phaseData,
  onBringToLife,
}: CellData & {
  personaId?: string;
  personaColor?: PersonaColorStyle;
  phaseData?: PersonaPhaseData;
  onBringToLife?: (title: string, contentType: string) => void;
}) {
  const total = touchpoints.length + deliverables.length;

  if (total === 0 && !phaseData) {
    return <div className="min-h-[80px] p-2 border-b border-r border-gray-100 bg-gray-50/50" />;
  }

  return (
    <div className="min-h-[80px] p-2.5 border-b border-r border-gray-100 space-y-2">
      {/* Persona phase context (mindset/key question) */}
      {phaseData && (phaseData.mindset || phaseData.keyQuestion) && (
        <div className={`rounded-md px-2.5 py-2 text-xs border ${personaColor?.bg ?? "bg-gray-50"} ${personaColor?.border ?? "border-gray-200"}`}>
          {phaseData.mindset && (
            <p className="text-gray-600 italic leading-relaxed">
              &ldquo;{phaseData.mindset}&rdquo;
            </p>
          )}
          {phaseData.keyQuestion && (
            <p className={`mt-1 font-medium ${personaColor?.text ?? "text-gray-700"}`}>
              {phaseData.keyQuestion}
            </p>
          )}
        </div>
      )}

      {/* Touchpoint cards */}
      {touchpoints.map((tp, i) => (
        <TouchpointCard
          key={`tp-${tp.channel}-${tp.contentType}-${i}`}
          tp={tp}
          personaId={personaId}
          personaColor={personaColor}
        />
      ))}

      {/* Deliverable cards */}
      {deliverables.map((d, i) => (
        <DeliverableCard
          key={`d-${d.title}-${i}`}
          deliverable={d}
          onBringToLife={onBringToLife}
        />
      ))}
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
    <div className="bg-gray-50 border-b border-gray-200 p-3 min-w-[280px]">
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
        <p className="text-xs text-gray-500 line-clamp-2">{phase.goal}</p>
      )}
      {phase.kpis && phase.kpis.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {phase.kpis.slice(0, 3).map((kpi, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-200/60 text-gray-600 rounded">
              {kpi}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Single persona in the legend bar */
function PersonaLegendItem({ persona, color }: { persona: PersonaInfo; color: PersonaColorStyle }) {
  const [imgError, setImgError] = useState(false);
  const hasAvatar = !!persona.avatarUrl && !imgError;
  const subtitle = persona.tagline || persona.occupation;

  return (
    <div className="flex items-center gap-1.5">
      {hasAvatar ? (
        <img
          src={persona.avatarUrl!}
          alt={persona.personaName}
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-6 h-6 rounded-full ${color.avatarBg} ${color.text} flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>
          {getInitials(persona.personaName)}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-700 leading-tight">{persona.personaName}</span>
        {subtitle && (
          <span className="text-[10px] text-gray-500 leading-tight">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

/** Collapsible persona row with avatar + color */
function PersonaRow({
  persona,
  phases,
  phaseCells,
  phaseDataMap,
  colorStyle,
  onBringToLife,
}: {
  persona: PersonaInfo;
  phases: JourneyPhase[];
  phaseCells: Map<string, CellData>;
  phaseDataMap: Map<string, PersonaPhaseData>;
  colorStyle: PersonaColorStyle;
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

  const initials = useMemo(() => getInitials(persona.personaName), [persona.personaName]);
  const [avatarError, setAvatarError] = useState(false);
  const hasRealAvatar = !!persona.avatarUrl && !avatarError;

  return (
    <>
      {/* Row header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="sticky left-0 z-20 bg-white border-r border-b border-gray-200 p-3 min-w-[240px] cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        style={{ gridColumn: 1 }}
      >
        <div className="flex items-center gap-2.5">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}

          {/* Avatar: real photo or colored initials fallback */}
          {hasRealAvatar ? (
            <img
              src={persona.avatarUrl!}
              alt={persona.personaName}
              className={`w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 ${colorStyle.border}`}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div
              className={`w-8 h-8 rounded-full ${colorStyle.avatarBg} ${colorStyle.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate block">
              {persona.personaName}
            </span>
            {persona.tagline ? (
              <span className="text-[10px] text-gray-500 truncate block">
                {persona.tagline} &middot; {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
            ) : persona.occupation ? (
              <span className="text-[10px] text-gray-500 truncate block">
                {persona.occupation} &middot; {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-[10px] text-gray-500">
                {totalItems} item{totalItems !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Phase cells */}
      {phases.map((phase) => {
        const phaseKey = phase.name.toLowerCase();
        const cell = phaseCells.get(phaseKey) ?? {
          touchpoints: [],
          deliverables: [],
        };
        const phaseData = phaseDataMap.get(phaseKey);

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
            personaId={persona.personaId}
            personaColor={colorStyle}
            phaseData={phaseData}
            onBringToLife={onBringToLife}
          />
        );
      })}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────

// ─── Zoom constants ─────────────────────────────────────────────

const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;
const ZOOM_DEFAULT = 100;

/** Floating toolbar with zoom controls and fit-to-screen */
function MatrixToolbar({
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

/** Persona x Journey Phase matrix with touchpoint cards */
export function JourneyMatrixSection({
  architecture,
  assetPlan,
  channelPlan,
  onBringToLife,
}: JourneyMatrixSectionProps) {
  const journeyPhases = architecture.journeyPhases ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);

  // Fetch real personas from the Personas module for avatar/name enrichment
  const { data: personasData } = usePersonas();
  const personaLookup = useMemo(() => {
    const map = new Map<string, PersonaWithMeta>();
    const list = personasData?.personas ?? [];
    for (const p of list) {
      map.set(p.id, p);
    }
    return map;
  }, [personasData]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN)), []);
  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) { setZoom(ZOOM_DEFAULT); return; }
    const scrollEl = container.querySelector("[data-matrix-scroll]") as HTMLElement | null;
    const gridEl = container.querySelector("[data-matrix-grid]") as HTMLElement | null;
    if (!scrollEl || !gridEl) { setZoom(ZOOM_DEFAULT); return; }
    const containerWidth = scrollEl.clientWidth;
    const gridWidth = gridEl.scrollWidth;
    if (gridWidth <= 0) { setZoom(ZOOM_DEFAULT); return; }
    // Calculate zoom to fit grid into visible width, clamped to min/max
    const idealZoom = Math.floor((containerWidth / gridWidth) * 100);
    setZoom(Math.max(ZOOM_MIN, Math.min(idealZoom, ZOOM_MAX)));
  }, []);

  const sortedPhases = useMemo(
    () =>
      [...journeyPhases]
        .map((p) => ({
          ...p,
          name: p.name || (p as unknown as Record<string, unknown>).phase as string || p.id || "",
          id: p.id || p.name || (p as unknown as Record<string, unknown>).phase as string || "",
        }))
        .filter((p) => p.name)
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    [journeyPhases],
  );

  // 1. Unique personas from all journey phases (with fallback to touchpoint personaRelevance)
  //    Enriched with real persona data (avatar, tagline, occupation) from the Personas module
  const personas = useMemo(() => {
    const map = new Map<string, PersonaInfo>();
    let colorIndex = 0;

    // Primary: extract from personaPhaseData
    for (const phase of journeyPhases) {
      for (const ppd of phase.personaPhaseData ?? []) {
        if (!map.has(ppd.personaId)) {
          const realPersona = personaLookup.get(ppd.personaId);
          map.set(ppd.personaId, {
            personaId: ppd.personaId,
            personaName: realPersona?.name ?? ppd.personaName,
            colorIndex: colorIndex++,
            avatarUrl: realPersona?.avatarUrl ?? null,
            tagline: realPersona?.tagline ?? null,
            occupation: realPersona?.occupation ?? null,
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
                const realPersona = personaLookup.get(pr.personaId);
                map.set(pr.personaId, {
                  personaId: pr.personaId,
                  personaName: realPersona?.name ?? pr.personaId,
                  colorIndex: colorIndex++,
                  avatarUrl: realPersona?.avatarUrl ?? null,
                  tagline: realPersona?.tagline ?? null,
                  occupation: realPersona?.occupation ?? null,
                });
              }
            }
          } else if (relevance && typeof relevance === "object") {
            for (const pid of Object.keys(relevance as Record<string, string>)) {
              if (!map.has(pid)) {
                const realPersona = personaLookup.get(pid);
                map.set(pid, {
                  personaId: pid,
                  personaName: realPersona?.name ?? pid,
                  colorIndex: colorIndex++,
                  avatarUrl: realPersona?.avatarUrl ?? null,
                  tagline: realPersona?.tagline ?? null,
                  occupation: realPersona?.occupation ?? null,
                });
              }
            }
          }
        }
      }
    }

    return Array.from(map.values());
  }, [journeyPhases, personaLookup]);

  // 2. PersonaPhaseData lookup: personaId -> phaseKey -> PersonaPhaseData
  const personaPhaseDataLookup = useMemo(() => {
    const lookup = new Map<string, Map<string, PersonaPhaseData>>();
    for (const phase of journeyPhases) {
      const phaseKey = (phase.name || "").toLowerCase();
      for (const ppd of phase.personaPhaseData ?? []) {
        if (!lookup.has(ppd.personaId)) {
          lookup.set(ppd.personaId, new Map());
        }
        lookup.get(ppd.personaId)!.set(phaseKey, ppd);
      }
    }
    return lookup;
  }, [journeyPhases]);

  // 3. Duration per phase from channelPlan
  const durationByPhaseId = useMemo(
    () => new Map((channelPlan.phaseDurations ?? []).map((pd) => [pd.phaseId, pd.suggestedWeeks])),
    [channelPlan],
  );

  // 4. Matrix data: per persona per phase -> touchpoints + deliverables
  const { personaMatrix, allPersonasRow, unassigned } = useMemo(() => {
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
        const rawRelevance = tp.personaRelevance;
        const relevanceArray: Array<{ personaId: string; relevance: string; messagingAngle?: string }> = Array.isArray(rawRelevance)
          ? rawRelevance
          : rawRelevance && typeof rawRelevance === "object"
            ? Object.entries(rawRelevance as Record<string, string>).map(([pid, rel]) => ({
                personaId: pid,
                relevance: rel,
                messagingAngle: "",
              }))
            : [];

        const relevantPersonas = relevanceArray.filter(
          (pr) => pr.relevance === "high" || pr.relevance === "medium",
        );

        if (relevantPersonas.length === 0) {
          allRow.get(phaseKey)?.touchpoints.push(tp);
        } else {
          for (const pr of relevantPersonas) {
            const personaRow = matrix.get(pr.personaId);
            if (personaRow) {
              personaRow.get(phaseKey)?.touchpoints.push(tp);
            } else {
              allRow.get(phaseKey)?.touchpoints.push(tp);
            }
          }
        }
      }
    }

    // Assign deliverables to persona rows
    for (const d of assetPlan.deliverables ?? []) {
      const phaseKey = (d.phase ?? "").toLowerCase();

      const phaseExists = phaseKey && sortedPhases.some(
        (p) => p.name.toLowerCase() === phaseKey,
      );

      if (!phaseExists) {
        unassignedDeliverables.push(d);
        continue;
      }

      if ((d.targetPersonas ?? []).length === 0) {
        allRow.get(phaseKey)?.deliverables.push(d);
      } else {
        let matched = false;
        for (const tp of d.targetPersonas ?? []) {
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
      const allCell = allPersonasRow.get(phaseKey);
      if (allCell) count += allCell.touchpoints.length + allCell.deliverables.length;
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
      </div>

      {/* Persona legend */}
      {personas.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Personas:</span>
          {personas.map((p) => {
            const color = getPersonaColor(p.colorIndex);
            return (
              <PersonaLegendItem key={p.personaId} persona={p} color={color} />
            );
          })}
        </div>
      )}

      {/* Matrix container */}
      <div ref={containerRef} className="relative">
        <div data-matrix-scroll className="overflow-x-auto border border-gray-200 rounded-lg" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          data-matrix-grid
          className="grid origin-top-left transition-transform duration-150"
          style={{
            gridTemplateColumns: `240px repeat(${sortedPhases.length}, minmax(280px, 1fr))`,
            minWidth: `${240 + sortedPhases.length * 280}px`,
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            transformOrigin: "top left",
          }}
        >
          {/* ─── Header row ─── */}

          {/* Corner cell */}
          <div className="sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 p-3 min-w-[240px]">
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
                className="sticky left-0 z-20 bg-gray-50/80 border-r border-b border-gray-200 p-3 min-w-[240px] flex items-center gap-2.5"
                style={{ gridColumn: 1 }}
              >
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
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
              phaseCells={personaMatrix.get(persona.personaId) ?? EMPTY_PHASE_CELLS}
              phaseDataMap={personaPhaseDataLookup.get(persona.personaId) ?? EMPTY_PHASE_DATA}
              colorStyle={getPersonaColor(persona.colorIndex)}
              onBringToLife={onBringToLife}
            />
          ))}
        </div>
      </div>
        <MatrixToolbar
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
        />
      </div>

      {/* Unassigned deliverables */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {unassigned.length} deliverable{unassigned.length !== 1 ? "s" : ""} without phase match
            </span>
          </div>
          <div className="space-y-2">
            {unassigned.map((d, i) => (
              <div
                key={`unassigned-${d.title}-${i}`}
                className="flex items-center gap-2 text-xs text-amber-700 bg-white/60 rounded px-3 py-2"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    PRIORITY_STYLES[d.productionPriority]?.dot ?? "bg-gray-300"
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
