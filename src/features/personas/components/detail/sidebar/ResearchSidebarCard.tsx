'use client';

import { FlaskConical, CheckCircle, Clock, Circle } from 'lucide-react';
import type { PersonaWithMeta } from '../../../types/persona.types';
import { PERSONA_RESEARCH_METHODS } from '../../../constants/persona-research-methods';

interface ResearchSidebarCardProps {
  persona: PersonaWithMeta;
  onStartMethod: (method: string) => void;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  COMPLETED: { icon: CheckCircle, color: 'text-emerald-500', label: 'Done' },
  VALIDATED: { icon: CheckCircle, color: 'text-emerald-500', label: 'Validated' },
  IN_PROGRESS: { icon: Clock, color: 'text-amber-500', label: 'In progress' },
  AVAILABLE: { icon: Circle, color: 'text-gray-300', label: 'Available' },
};

export function ResearchSidebarCard({ persona, onStartMethod }: ResearchSidebarCardProps) {
  const methods = persona.researchMethods ?? [];
  const completedMethods = methods.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'VALIDATED',
  ).length;
  const totalMethods = methods.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Research & Validation</h3>
          <p className="text-xs text-gray-500">{completedMethods}/{totalMethods} methods</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${totalMethods > 0 ? (completedMethods / totalMethods) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-2.5">
        {PERSONA_RESEARCH_METHODS.map((config) => {
          const methodData = methods.find(
            (m) => m.method === config.method,
          );
          const status = methodData?.status ?? 'AVAILABLE';
          const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.AVAILABLE;
          const StatusIcon = statusConfig.icon;
          const isClickable = status === 'AVAILABLE' || status === 'IN_PROGRESS';

          return (
            <button
              key={config.method}
              onClick={() => isClickable && onStartMethod(config.method)}
              disabled={!isClickable}
              className={`w-full flex items-center gap-2.5 py-1.5 text-left ${
                isClickable
                  ? 'hover:bg-gray-50 rounded-md -mx-1.5 px-1.5 transition-colors cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <StatusIcon className={`h-3.5 w-3.5 flex-shrink-0 ${statusConfig.color}`} />
              <span className="text-xs text-gray-700 flex-1">{config.label}</span>
              {config.isFree && status === 'AVAILABLE' && (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">FREE</span>
              )}
              {status === 'IN_PROGRESS' && methodData?.progress !== undefined && (
                <span className="text-[10px] font-medium text-amber-600">{methodData.progress}%</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
