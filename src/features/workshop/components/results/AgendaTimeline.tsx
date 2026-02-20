'use client';

import { useState } from 'react';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import type { WorkshopAgendaItem } from '../../types/workshop.types';

interface AgendaTimelineProps {
  agendaItems: WorkshopAgendaItem[];
}

export function AgendaTimeline({ agendaItems }: AgendaTimelineProps) {
  const safeAgendaItems = Array.isArray(agendaItems) ? agendaItems : [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (safeAgendaItems.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900">Agenda</h3>
      </div>
      <div className="space-y-2">
        {safeAgendaItems.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <button
              key={item.id}
              onClick={() =>
                setExpandedId(isExpanded ? null : item.id)
              }
              className="w-full text-left p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                {item.details ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                <span className="text-xs font-mono text-gray-400 w-16 flex-shrink-0">
                  {item.time}
                </span>
                <span className="text-sm text-gray-900 font-medium flex-1">
                  {item.activity}
                </span>
                <span className="text-xs text-gray-500">{item.duration}</span>
              </div>

              {isExpanded && item.details && (
                <p
                  className={cn(
                    'text-xs text-gray-600 mt-2 ml-[calc(1rem+4rem+0.75rem)] leading-relaxed',
                  )}
                >
                  {item.details}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
