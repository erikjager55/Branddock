// =============================================================
// ValidationBreakdown — shows research method validation status
//
// Displays 4 research methods (AI, Workshop, Interview, Questionnaire)
// with their completion status as a compact checklist.
// =============================================================

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/components/ui/utils';

// ─── Types ───────────────────────────────────────────────

export interface ValidationMethods {
  ai: boolean;
  workshop: boolean;
  interview: boolean;
  questionnaire: boolean;
}

export interface ValidationBreakdownProps {
  methods: ValidationMethods;
  /** Compact = inline chips; full = vertical list with labels */
  variant?: 'compact' | 'full';
  className?: string;
}

// ─── Method config ───────────────────────────────────────

interface MethodConfig {
  key: keyof ValidationMethods;
  label: string;
  shortLabel: string;
}

const METHODS: MethodConfig[] = [
  { key: 'ai',            label: 'AI Exploration',  shortLabel: 'AI' },
  { key: 'workshop',      label: 'Workshop',        shortLabel: 'Workshop' },
  { key: 'interview',     label: 'Interviews',      shortLabel: 'Interview' },
  { key: 'questionnaire', label: 'Questionnaire',   shortLabel: 'Survey' },
];

// ─── Component ───────────────────────────────────────────

export function ValidationBreakdown({
  methods,
  variant = 'compact',
  className,
}: ValidationBreakdownProps) {
  const completedCount = METHODS.filter((m) => methods[m.key]).length;

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {METHODS.map((method) => {
          const done = methods[method.key];
          return (
            <div
              key={method.key}
              className={cn(
                'flex items-center gap-1 text-xs',
                done ? 'text-emerald-600' : 'text-gray-400',
              )}
              title={`${method.label}: ${done ? 'Completed' : 'Not started'}`}
            >
              {done ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
              <span>{method.shortLabel}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Full variant — vertical list
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Research Methods
        </span>
        <span className="text-xs text-gray-500">
          {completedCount}/{METHODS.length}
        </span>
      </div>

      {METHODS.map((method) => {
        const done = methods[method.key];
        return (
          <div
            key={method.key}
            className={cn(
              'flex items-center gap-2.5 py-1.5 px-2 rounded-md text-sm',
              done ? 'bg-emerald-50' : 'bg-gray-50',
            )}
          >
            {done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
            <span className={done ? 'text-emerald-700' : 'text-gray-500'}>
              {method.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
