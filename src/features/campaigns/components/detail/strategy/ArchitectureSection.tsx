"use client";

import React, { useState } from "react";
import { Badge } from "@/components/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ArchitectureLayer } from "@/lib/campaigns/strategy-blueprint.types";

interface ArchitectureSectionProps {
  architecture: ArchitectureLayer;
}

/** Layer 2: Campaign Architecture — journey phases, touchpoints, persona data */
export function ArchitectureSection({ architecture }: ArchitectureSectionProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(
    architecture.journeyPhases[0]?.id ?? null,
  );

  return (
    <div className="space-y-6">
      {/* Campaign Type */}
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-semibold text-gray-900">Campaign Type</h4>
        <Badge variant="teal">{architecture.campaignType}</Badge>
      </div>

      {/* Journey Phase Pills */}
      <div className="flex gap-2 flex-wrap">
        {architecture.journeyPhases
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((phase, i) => (
            <button
              key={phase.id}
              type="button"
              onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                expandedPhase === phase.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] flex items-center justify-center font-semibold">
                {i + 1}
              </span>
              {phase.name}
            </button>
          ))}
      </div>

      {/* Expanded Phase Detail */}
      {architecture.journeyPhases.map((phase) => {
        if (expandedPhase !== phase.id) return null;

        return (
          <div key={phase.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
            {/* Phase header */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{phase.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
            </div>

            {/* Goal & KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs font-medium text-emerald-700 mb-1">Goal</p>
                <p className="text-sm text-gray-800">{phase.goal}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">KPIs</p>
                <div className="flex flex-wrap gap-1">
                  {phase.kpis.map((kpi, i) => (
                    <Badge key={i} variant="default">{kpi}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Touchpoints */}
            {phase.touchpoints.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Touchpoints ({phase.touchpoints.length})
                </p>
                <div className="space-y-2">
                  {phase.touchpoints.map((tp, i) => (
                    <div key={i} className="p-3 bg-white border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{tp.channel}</span>
                        <Badge variant={tp.role === "primary" ? "success" : "default"}>
                          {tp.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{tp.contentType}</span>
                      </div>
                      <p className="text-xs text-gray-600">{tp.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Persona Phase Data */}
            {phase.personaPhaseData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Persona Insights
                </p>
                <div className="space-y-2">
                  {phase.personaPhaseData.map((ppd) => (
                    <PersonaPhaseAccordion key={ppd.personaId} data={ppd} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Collapsible persona phase detail */
function PersonaPhaseAccordion({
  data,
}: {
  data: ArchitectureLayer["journeyPhases"][0]["personaPhaseData"][0];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        )}
        <span className="text-xs font-medium text-gray-900">{data.personaName}</span>
        <span className="text-xs text-muted-foreground ml-auto">{data.mindset}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 text-xs">
          <div>
            <span className="font-medium text-muted-foreground">Key Question: </span>
            <span className="text-gray-700">{data.keyQuestion}</span>
          </div>
          {data.needs.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Needs: </span>
              <span className="text-gray-700">{data.needs.join(", ")}</span>
            </div>
          )}
          {data.painPoints.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Pain Points: </span>
              <span className="text-gray-700">{data.painPoints.join(", ")}</span>
            </div>
          )}
          {data.triggers.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Triggers: </span>
              <span className="text-gray-700">{data.triggers.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
