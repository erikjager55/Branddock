"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/shared";
import type {
  AssetPlanDeliverable,
} from "@/lib/campaigns/strategy-blueprint.types";
import type { PersonaColorStyle } from "@/features/campaigns/lib/persona-colors";

// ─── Types ──────────────────────────────────────────────────────

/** Resolved persona info for display on timeline cards */
export interface CardPersonaInfo {
  personaId: string;
  name: string;
  colorStyle: PersonaColorStyle;
}

// ─── Constants ──────────────────────────────────────────────────

export const PRIORITY_STYLES: Record<string, { dot: string; label: string }> = {
  "must-have": { dot: "bg-emerald-500", label: "Must-have" },
  "should-have": { dot: "bg-amber-500", label: "Should-have" },
  "nice-to-have": { dot: "bg-gray-300", label: "Nice-to-have" },
};

export const EFFORT_LABEL: Record<string, string> = {
  low: "Low effort",
  medium: "Medium effort",
  high: "High effort",
};

// ─── Sub-components ─────────────────────────────────────────────

/** Deliverable card with expand-on-click */
export function DeliverableCard({
  deliverable,
  channel,
  personas,
  onBringToLife,
  onMove,
  canMoveLeft = false,
  canMoveRight = false,
}: {
  deliverable: AssetPlanDeliverable;
  /** Channel label to display on the card */
  channel?: string;
  personas?: CardPersonaInfo[];
  onBringToLife?: (title: string, contentType: string) => void;
  /** Called when the user wants to move this deliverable to a different week */
  onMove?: (direction: -1 | 1) => void;
  /** Whether the deliverable can be moved earlier (not at first beat) */
  canMoveLeft?: boolean;
  /** Whether the deliverable can be moved later (not at last beat) */
  canMoveRight?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
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
          {channel && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
              {channel}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
        </div>
      </div>

      <div className="px-3 py-2">
        {/* Persona pills */}
        {personas && personas.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {personas.map((p) => (
              <span
                key={p.personaId}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${p.colorStyle.bg} ${p.colorStyle.border} border`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.colorStyle.dot}`} />
                <span className={`${p.colorStyle.text} text-[10px] font-medium`}>{p.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 border border-gray-200">
              <Users className="w-2.5 h-2.5 text-gray-500" />
              <span className="text-[10px] font-medium text-gray-600">All personas</span>
            </span>
          </div>
        )}

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

      {/* Move controls */}
      {onMove && (
        <div className="flex items-center justify-between px-3 py-1 border-t border-gray-100">
          <button
            type="button"
            disabled={!canMoveLeft}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={(e) => { e.stopPropagation(); onMove(-1); }}
          >
            <ChevronLeft className="w-3 h-3" />
            Earlier
          </button>
          <button
            type="button"
            disabled={!canMoveRight}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={(e) => { e.stopPropagation(); onMove(1); }}
          >
            Later
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Persona info for legend display */
export interface PersonaLegendInfo {
  personaId: string;
  personaName: string;
  colorIndex: number;
}
