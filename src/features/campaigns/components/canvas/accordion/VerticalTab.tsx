'use client';

import type { LucideIcon } from 'lucide-react';
import type { AccordionStepStatus } from '../../../types/accordion.types';
import { ACCORDION, cn } from '@/lib/constants/design-tokens';

interface VerticalTabProps {
  stepNumber: string | number;
  title: string;
  icon: LucideIcon;
  status: AccordionStepStatus;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function VerticalTab({
  stepNumber,
  title,
  icon: Icon,
  status,
  onClick,
  onKeyDown,
}: VerticalTabProps) {
  const isActive = status === 'active';

  return (
    <button
      type="button"
      id={`canvas-step-tab-${stepNumber}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={status === 'locked'}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        'flex flex-col items-center justify-center w-16 h-full relative cursor-pointer',
        ACCORDION.transition,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-500',
        status === 'locked' ? 'cursor-not-allowed' : '',
      )}
      aria-selected={isActive}
      aria-controls="canvas-step-panel"
      role="tab"
    >
      {/* Step number */}
      <div
        className={cn(
          'flex items-center justify-center h-9 w-9 rounded-full text-sm font-bold flex-shrink-0',
          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500',
        )}
      >
        {stepNumber}
      </div>

      {/* Icon */}
      <div className="mt-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-emerald-600' : 'text-gray-400')} />
      </div>

      {/* Title — vertical text */}
      <span
        className={cn('mt-3 text-xs font-semibold tracking-wide select-none', isActive ? 'text-emerald-700' : 'text-gray-400')}
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}
      >
        {title}
      </span>
    </button>
  );
}
