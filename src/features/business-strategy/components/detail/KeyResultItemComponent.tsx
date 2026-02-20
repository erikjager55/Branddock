'use client';

import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import type { KeyResultItem, KeyResultStatus } from '../../types/business-strategy.types';

const STATUS_CYCLE: KeyResultStatus[] = ['ON_TRACK', 'COMPLETE', 'BEHIND'];

interface KeyResultItemComponentProps {
  keyResult: KeyResultItem;
  onStatusToggle: (newStatus: KeyResultStatus) => void;
}

export function KeyResultItemComponent({
  keyResult,
  onStatusToggle,
}: KeyResultItemComponentProps) {
  const handleToggle = () => {
    const currentIdx = STATUS_CYCLE.indexOf(keyResult.status);
    const nextIdx = (currentIdx + 1) % STATUS_CYCLE.length;
    onStatusToggle(STATUS_CYCLE[nextIdx]);
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 group cursor-pointer"
      onClick={handleToggle}
    >
      {/* Status icon */}
      {keyResult.status === 'COMPLETE' && (
        <CheckCircle className="w-4.5 h-4.5 text-green-500 flex-shrink-0" />
      )}
      {keyResult.status === 'ON_TRACK' && (
        <Circle className="w-4.5 h-4.5 text-gray-400 flex-shrink-0" />
      )}
      {keyResult.status === 'BEHIND' && (
        <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
      )}

      {/* Description */}
      <span
        className={`flex-1 text-sm ${
          keyResult.status === 'COMPLETE'
            ? 'text-gray-500 line-through'
            : 'text-gray-900'
        }`}
      >
        {keyResult.description}
      </span>

      {/* Progress value */}
      {keyResult.progressValue && (
        <span className="text-sm text-gray-500 flex-shrink-0">
          {keyResult.progressValue}
        </span>
      )}
    </div>
  );
}
