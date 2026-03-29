"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, LayoutGrid, Loader2, Trash2, Zap } from "lucide-react";
import type {
  AssetPlanLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
} from "@/lib/campaigns/strategy-blueprint.types";
import { usePersonas } from "@/features/personas/hooks";
import type { PersonaWithMeta } from "@/features/personas/types/persona.types";
import { useContentCanvasStore } from "@/features/campaigns/stores/useContentCanvasStore";
import type { DeliverableResponse } from "@/types/campaign";
import { computeDeploymentSchedule } from "@/features/campaigns/lib/deployment-scheduler";
import { getChannelLabel } from "@/features/campaigns/lib/channel-frequency";
import { getChannelColor } from "@/features/campaigns/lib/channel-colors";
import { getPersonaColor, type PersonaColorStyle } from "@/features/campaigns/lib/persona-colors";
import {
  EFFORT_LABEL,
  type PersonaLegendInfo,
  type CardPersonaInfo,
} from "./shared-timeline-cards";
import { TimelineFilterBar } from "./TimelineFilterBar";

// ─── Constants ──────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { "must-have": 0, "should-have": 1, "nice-to-have": 2 };

/** Priority pill hex colors (inline style, Tailwind 4 purge safe) */
const PRIORITY_HEX: Record<string, { dot: string; label: string; bg: string; text: string; border: string }> = {
  "must-have": { dot: "#10b981", label: "Must-have", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  "should-have": { dot: "#f59e0b", label: "Should-have", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  "nice-to-have": { dot: "#d1d5db", label: "Nice-to-have", bg: "#f9fafb", text: "#4b5563", border: "#e5e7eb" },
};

/** Effort pill hex colors (inline style, Tailwind 4 purge safe) */
const EFFORT_HEX: Record<string, { label: string; bg: string; text: string; border: string }> = {
  low: { label: "Low", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  medium: { label: "Medium", bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  high: { label: "High", bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

/** Phase dot hex colors */
const PHASE_DOT_HEX: Record<string, string> = {
  awareness: "#3b82f6",
  consideration: "#f59e0b",
  conversion: "#10b981",
  retention: "#8b5cf6",
  advocacy: "#f43f5e",
};

function getPhaseDotHex(phaseName: string): string {
  const lower = phaseName.toLowerCase();
  for (const [key, hex] of Object.entries(PHASE_DOT_HEX)) {
    if (lower.includes(key)) return hex;
  }
  return "#9ca3af";
}

/** Approval status hex colors (inline style, Tailwind 4 purge safe) */
const APPROVAL_HEX: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: "Draft", bg: "#f9fafb", text: "#4b5563", border: "#e5e7eb" },
  IN_REVIEW: { label: "In Review", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  CHANGES_REQUESTED: { label: "Changes", bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  APPROVED: { label: "Approved", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  PUBLISHED: { label: "Published", bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
};

/** Validate and narrow a deliverable status string */
function resolveDeliverableStatus(
  statuses: Map<string, string> | undefined,
  title: string,
): "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | undefined {
  const s = statuses?.get(title.trim().toLowerCase());
  return s === "NOT_STARTED" || s === "IN_PROGRESS" || s === "COMPLETED" ? s : undefined;
}

// ─── Types ──────────────────────────────────────────────────────

interface DeploymentGridViewProps {
  assetPlan: AssetPlanLayer;
  architecture: ArchitectureLayer;
  channelPlan: ChannelPlanLayer;
  onBringToLife?: (deliverableTitle: string, contentType: string) => void;
  onDeleteDeliverable?: (title: string) => void;
  campaignStartDate?: string | null;
  deliverableStatuses?: Map<string, string>;
  /** DB deliverables for approval status + bulk selection */
  deliverables?: DeliverableResponse[];
  /** Campaign ID for bulk action API calls */
  campaignId?: string;
}

// ─── Component ──────────────────────────────────────────────────

/** Flat Notion-style table view — one row per deliverable */
export function DeploymentGridView({
  assetPlan,
  architecture,
  channelPlan,
  onBringToLife,
  onDeleteDeliverable,
  deliverableStatuses,
  deliverables,
  campaignId,
}: DeploymentGridViewProps) {
  // ── Persona data ──
  const { data: personasData } = usePersonas();
  const personaNames = useMemo(() => {
    const map = new Map<string, PersonaWithMeta>();
    for (const p of personasData?.personas ?? []) {
      map.set(p.id, p);
      map.set(p.name.toLowerCase(), p);
    }
    return map;
  }, [personasData]);

  const personaColorMap = useMemo(() => {
    const map = new Map<string, PersonaColorStyle>();
    (personasData?.personas ?? []).forEach((p: PersonaWithMeta, i: number) => {
      map.set(p.id, getPersonaColor(i));
      map.set(p.name.toLowerCase(), getPersonaColor(i));
    });
    return map;
  }, [personasData]);

  // ── Bulk selection store ──
  const { selectedDeliverableIds, toggleSelection, selectAll, clearSelection } =
    useContentCanvasStore();

  // ── Title → DB deliverable lookup ──
  const deliverableLookup = useMemo(() => {
    const map = new Map<string, DeliverableResponse>();
    for (const d of deliverables ?? []) {
      map.set(d.title.trim().toLowerCase(), d);
    }
    return map;
  }, [deliverables]);

  // ── Schedule computation ──
  const schedule = useMemo(
    () => computeDeploymentSchedule(assetPlan, architecture, channelPlan),
    [assetPlan, architecture, channelPlan],
  );

  // ── Extract phases ──
  const phases = useMemo(() => {
    return schedule.phaseBoundaries.map((pb) => pb.phase);
  }, [schedule]);

  // ── Extract unique channels ──
  const channels = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of schedule.scheduled) {
      if (!seen.has(s.normalizedChannel)) {
        seen.set(s.normalizedChannel, getChannelLabel(s.normalizedChannel));
      }
    }
    return Array.from(seen.entries()).map(([normalized, label]) => ({ normalized, label }));
  }, [schedule]);

  // ── Persona legend ──
  const personaLegendList = useMemo<PersonaLegendInfo[]>(() => {
    const allPersonaIds = new Set<string>();
    for (const s of schedule.scheduled) {
      for (const pid of s.targetPersonas) allPersonaIds.add(pid);
    }
    const list: PersonaLegendInfo[] = [];
    let colorIdx = 0;
    for (const pid of allPersonaIds) {
      const persona = personaNames.get(pid) ?? personaNames.get(pid.toLowerCase());
      if (persona) {
        list.push({ personaId: persona.id, personaName: persona.name, colorIndex: colorIdx });
      } else {
        list.push({ personaId: pid, personaName: pid, colorIndex: colorIdx });
      }
      colorIdx++;
    }
    return list;
  }, [schedule, personaNames]);

  // ── Filter state ──
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  const togglePersona = (id: string) => {
    setSelectedPersonaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChannel = (normalized: string) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(normalized)) next.delete(normalized);
      else next.add(normalized);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedPersonaIds(new Set());
    setSelectedChannels(new Set());
  };

  // ── Check if item passes persona filter ──
  const passesPersonaFilter = (targetPersonas: string[]): boolean => {
    if (selectedPersonaIds.size === 0) return true;
    if (targetPersonas.length === 0) return true;
    return targetPersonas.some((pid) => selectedPersonaIds.has(pid));
  };

  // ── Check if item passes channel filter ──
  const passesChannelFilter = (normalizedChannel: string): boolean => {
    if (selectedChannels.size === 0) return true;
    return selectedChannels.has(normalizedChannel);
  };

  // ── Resolve persona info ──
  const resolvePersonas = (targetPersonas: string[]): CardPersonaInfo[] => {
    if (targetPersonas.length === 0) return [];
    return targetPersonas
      .map((pid) => {
        const persona = personaNames.get(pid) ?? personaNames.get(pid.toLowerCase());
        const color = personaColorMap.get(pid) ?? personaColorMap.get(pid.toLowerCase());
        if (!persona || !color) return null;
        return { personaId: persona.id, name: persona.name, colorStyle: color };
      })
      .filter((p): p is CardPersonaInfo => p !== null);
  };

  // ── Build flat sorted rows ──
  const rows = useMemo(() => {
    return schedule.scheduled
      .filter((s) => passesPersonaFilter(s.targetPersonas) && passesChannelFilter(s.normalizedChannel))
      .sort((a, b) => {
        if (a.phaseIndex !== b.phaseIndex) return a.phaseIndex - b.phaseIndex;
        const pa = PRIORITY_ORDER[a.priority] ?? 2;
        const pb = PRIORITY_ORDER[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return (a.deliverable.suggestedOrder ?? 999) - (b.deliverable.suggestedOrder ?? 999);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, selectedPersonaIds, selectedChannels]);

  // ── Empty state ──
  if (schedule.scheduled.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <LayoutGrid className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium">No deployment data available</p>
        <p className="text-xs mt-1">Generate or add deliverables to see the grid view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <TimelineFilterBar
        personaLegendList={personaLegendList}
        channels={channels}
        selectedPersonaIds={selectedPersonaIds}
        selectedChannels={selectedChannels}
        onTogglePersona={togglePersona}
        onToggleChannel={toggleChannel}
        onClearFilters={clearFilters}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {/* Checkbox — select all DB deliverables */}
              <th className="w-10 px-2 py-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-primary"
                  checked={
                    deliverableLookup.size > 0 &&
                    [...deliverableLookup.values()].every((d) => selectedDeliverableIds.has(d.id))
                  }
                  onChange={() => {
                    const allIds = [...deliverableLookup.values()].map((d) => d.id);
                    if (allIds.every((id) => selectedDeliverableIds.has(id))) {
                      clearSelection();
                    } else {
                      selectAll(allIds);
                    }
                  }}
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '24%' }}>Title</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '11%' }}>Channel</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>Phase</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>Priority</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '8%' }}>Effort</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>Approval</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '16%' }}>Personas</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                  No deliverables match current filters.
                </td>
              </tr>
            ) : (
              rows.map((s, idx) => {
                const priorityHex = PRIORITY_HEX[s.priority];
                const effortHex = EFFORT_HEX[s.deliverable.estimatedEffort];
                const personas = resolvePersonas(s.targetPersonas);
                const phaseName = phases[s.phaseIndex] || "";
                const channelLabel = getChannelLabel(s.normalizedChannel);
                const chColor = getChannelColor(s.normalizedChannel);
                const status = resolveDeliverableStatus(deliverableStatuses, s.deliverable.title);
                const isActivated = status === "IN_PROGRESS" || status === "COMPLETED";
                const phaseDotHex = getPhaseDotHex(phaseName);

                const dbDel = deliverableLookup.get(s.deliverable.title.trim().toLowerCase());
                const approvalStatus = dbDel?.approvalStatus || "DRAFT";
                const approvalStyle = APPROVAL_HEX[approvalStatus];

                return (
                  <tr
                    key={`${s.deliverable.title}-${s.normalizedChannel}-${idx}`}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="px-2 py-3">
                      {dbDel ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 accent-primary"
                          checked={selectedDeliverableIds.has(dbDel.id)}
                          onChange={() => toggleSelection(dbDel.id)}
                        />
                      ) : null}
                    </td>
                    {/* Status pill + Title */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Activate/status button — always visible, before the title */}
                        {onBringToLife && (
                          isActivated ? (
                            <button
                              type="button"
                              onClick={() => onBringToLife(s.deliverable.title, s.deliverable.contentType)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium flex-shrink-0 transition-colors"
                              style={
                                status === "COMPLETED"
                                  ? { backgroundColor: "#ecfdf5", color: "#047857" }
                                  : { backgroundColor: "#eff6ff", color: "#1d4ed8" }
                              }
                            >
                              {status === "COMPLETED" ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              )}
                              {status === "COMPLETED" ? "Done" : "Active"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onBringToLife(s.deliverable.title, s.deliverable.contentType)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium flex-shrink-0 transition-all hover:shadow-sm"
                              style={{ backgroundColor: "#0d9488", color: "#ffffff" }}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Activate
                            </button>
                          )
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.deliverable.title}</p>
                          <p className="text-xs text-gray-500 truncate">{s.deliverable.contentType}</p>
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: chColor.hex }}
                        />
                        {channelLabel}
                      </span>
                    </td>

                    {/* Phase with color dot */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: phaseDotHex }}
                        />
                        <span className="text-sm text-gray-700 truncate">{phaseName}</span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: priorityHex?.dot ?? "#d1d5db" }}
                        />
                        {priorityHex?.label ?? s.priority}
                      </span>
                    </td>

                    {/* Effort */}
                    <td className="px-4 py-3">
                      <span
                        className="text-xs"
                        style={{ color: effortHex?.text ?? "#4b5563" }}
                      >
                        {effortHex?.label ?? EFFORT_LABEL[s.deliverable.estimatedEffort] ?? s.deliverable.estimatedEffort}
                      </span>
                    </td>

                    {/* Approval status */}
                    <td className="px-4 py-3">
                      {approvalStyle && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: approvalStyle.bg,
                            color: approvalStyle.text,
                            borderColor: approvalStyle.border,
                          }}
                        >
                          {approvalStyle.label}
                        </span>
                      )}
                    </td>

                    {/* Personas */}
                    <td className="px-4 py-3">
                      {personas.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {personas.slice(0, 2).map((p) => (
                            <span
                              key={p.personaId}
                              className="inline-flex items-center gap-1.5 text-xs text-gray-600"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: p.colorStyle.activeHex }}
                              />
                              {p.name.split(' ')[0]}
                            </span>
                          ))}
                          {personas.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{personas.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">All</span>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-3">
                      {onDeleteDeliverable && (
                        <button
                          type="button"
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          title="Delete"
                          onClick={() => onDeleteDeliverable(s.deliverable.title)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      <p className="text-xs text-gray-400 text-right">
        {rows.length} of {schedule.scheduled.length} deliverables
      </p>
    </div>
  );
}
