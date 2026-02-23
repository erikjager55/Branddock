'use client';

import { FlaskConical, Bot, MessageCircle, ClipboardList, Smartphone, CheckCircle, Clock, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PersonaWithMeta } from '../../../types/persona.types';
import { PERSONA_RESEARCH_METHODS } from '../../../constants/persona-research-methods';

interface ResearchSidebarCardProps {
  persona: PersonaWithMeta;
  onStartMethod: (method: string) => void;
  isLocked?: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  MessageCircle,
  ClipboardList,
  Smartphone,
};

export function ResearchSidebarCard({ persona, onStartMethod, isLocked = false }: ResearchSidebarCardProps) {
  const methods = persona.researchMethods ?? [];
  const completedMethods = methods.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'VALIDATED',
  ).length;
  const totalMethods = methods.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Validation Methods ({completedMethods}/{totalMethods})
          </h3>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${totalMethods > 0 ? (completedMethods / totalMethods) * 100 : 0}%` }}
        />
      </div>

      {/* Method cards */}
      <div className="space-y-2">
        {PERSONA_RESEARCH_METHODS.map((config) => {
          const methodData = methods.find((m) => m.method === config.method);
          const status = methodData?.status ?? 'AVAILABLE';
          const isCompleted = status === 'COMPLETED' || status === 'VALIDATED';
          const isInProgress = status === 'IN_PROGRESS';
          const isAvailable = !isCompleted && !isInProgress;

          // Hide non-started methods when locked
          if (isLocked && isAvailable) return null;
          const Icon = ICON_MAP[config.icon] ?? Bot;

          return (
            <div
              key={config.method}
              className={`p-3 rounded-xl border border-dashed transition-colors ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Icon className={`h-4 w-4 ${isInProgress ? 'text-blue-600' : 'text-gray-500'}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{config.label}</h4>
                    {isAvailable && (
                      <button
                        onClick={() => onStartMethod(config.method)}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex-shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                        AVAILABLE
                      </button>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Done
                      </span>
                    )}
                    {isInProgress && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{config.description}</p>
                  {!isCompleted && config.isFree && (
                    <span className="text-[11px] font-medium text-emerald-600 mt-1 block">FREE</span>
                  )}
                  {!isCompleted && config.priceLabel && (
                    <span className="text-[11px] font-medium text-gray-500 mt-1 block">{config.priceLabel}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
