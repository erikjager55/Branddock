"use client";

import { X } from "lucide-react";
import { getPersonaColor } from "@/features/campaigns/lib/persona-colors";
import { getChannelColor } from "@/features/campaigns/lib/channel-colors";
import type { PersonaLegendInfo } from "./shared-timeline-cards";

interface TimelineFilterBarProps {
  personaLegendList: PersonaLegendInfo[];
  channels: { normalized: string; label: string }[];
  selectedPersonaIds: Set<string>;
  selectedChannels: Set<string>;
  onTogglePersona: (id: string) => void;
  onToggleChannel: (normalized: string) => void;
  onClearFilters: () => void;
}

/** Filter bar for persona + channel filtering */
export function TimelineFilterBar({
  personaLegendList,
  channels,
  selectedPersonaIds,
  selectedChannels,
  onTogglePersona,
  onToggleChannel,
  onClearFilters,
}: TimelineFilterBarProps) {
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
          const chColor = getChannelColor(ch.normalized);
          return (
            <button
              key={ch.normalized}
              type="button"
              onClick={() => onToggleChannel(ch.normalized)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border"
              style={isActive
                ? { backgroundColor: chColor.hex, color: '#fff', borderColor: chColor.hex }
                : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }
              }
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={isActive ? { backgroundColor: '#fff' } : { backgroundColor: chColor.hex }}
              />
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
