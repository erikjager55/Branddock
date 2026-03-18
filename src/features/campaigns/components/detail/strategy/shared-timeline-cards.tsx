"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Radio,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Badge, Button } from "@/components/shared";
import type {
  AssetPlanDeliverable,
  Touchpoint,
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

/** Touchpoint card with full specs */
export function TouchpointCard({
  tp,
  personas,
}: {
  tp: Touchpoint;
  personas?: CardPersonaInfo[];
}) {
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
        {/* Persona dots + names */}
        {personas && personas.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {personas.map((p) => (
              <span key={p.personaId} className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.colorStyle.dot}`} />
                <span className={`${p.colorStyle.text} font-medium`}>{p.name.split(" ")[0]}</span>
              </span>
            ))}
          </div>
        )}

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
      </div>
    </div>
  );
}

/** Deliverable card with expand-on-click */
export function DeliverableCard({
  deliverable,
  channel,
  personas,
  onBringToLife,
}: {
  deliverable: AssetPlanDeliverable;
  /** Channel label to display on the card */
  channel?: string;
  personas?: CardPersonaInfo[];
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
          <div className="mb-1.5">
            <span className="text-[10px] text-gray-400 italic">All personas</span>
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
    </div>
  );
}

/** Persona info for legend display */
export interface PersonaLegendInfo {
  personaId: string;
  personaName: string;
  colorIndex: number;
  avatarUrl?: string | null;
  tagline?: string | null;
  occupation?: string | null;
}
