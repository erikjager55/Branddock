'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge, ProgressBar } from '@/components/shared';
import { OBJECTIVE_STATUS_COLORS, METRIC_FORMATTERS } from '../../constants/strategy-types';
import { KeyResultItemComponent } from './KeyResultItemComponent';
import type { ObjectiveWithKeyResults, KeyResultStatus } from '../../types/business-strategy.types';

interface ObjectiveCardProps {
  objective: ObjectiveWithKeyResults;
  strategyId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onKeyResultStatusToggle?: (keyResultId: string, newStatus: KeyResultStatus) => void;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: 'bg-red-50', text: 'text-red-700' },
  MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700' },
  LOW: { bg: 'bg-gray-50', text: 'text-gray-600' },
};

export function ObjectiveCard({
  objective,
  onEdit,
  onDelete,
  onKeyResultStatusToggle,
}: ObjectiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const statusColor = OBJECTIVE_STATUS_COLORS[objective.status];
  const priorityColor = PRIORITY_COLORS[objective.priority] ?? PRIORITY_COLORS.MEDIUM;
  const formatter = METRIC_FORMATTERS[objective.metricType];

  const range = objective.targetValue - objective.startValue;
  const progressPct = range > 0
    ? Math.min(100, Math.max(0, ((objective.currentValue - objective.startValue) / range) * 100))
    : 0;

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
            {objective.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
            {objective.priority}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-36">
              <button
                onClick={() => { setShowMenu(false); onEdit?.(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => { setShowMenu(false); onDelete?.(); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title + description */}
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{objective.title}</h3>
      {objective.description && (
        <p className="text-sm text-gray-600 mb-3">{objective.description}</p>
      )}

      {/* Metric progress */}
      <div className="mb-3">
        <div className="mb-1">
          <ProgressBar value={progressPct} color="emerald" size="sm" />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Start: {formatter(objective.startValue)}</span>
          <span className="font-medium text-gray-900">Current: {formatter(objective.currentValue)}</span>
          <span>Target: {formatter(objective.targetValue)}</span>
        </div>
      </div>

      {/* Focus area tag */}
      {objective.focusArea && (
        <div className="mb-3">
          <Badge variant="info" size="sm">{objective.focusArea.name}</Badge>
        </div>
      )}

      {/* Key Results */}
      {objective.keyResults.length > 0 && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 mb-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Key Results ({objective.keyResults.length})
          </button>

          {isExpanded && (
            <div className="ml-1 border-l-2 border-gray-100 pl-2">
              {objective.keyResults.map((kr) => (
                <KeyResultItemComponent
                  key={kr.id}
                  keyResult={kr}
                  onStatusToggle={(newStatus) => onKeyResultStatusToggle?.(kr.id, newStatus)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
