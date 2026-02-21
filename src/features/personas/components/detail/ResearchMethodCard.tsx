'use client';

import { Bot, MessageCircle, ClipboardList, Smartphone, CheckCircle2, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ProgressBar } from '@/components/shared';
import type { ResearchMethodSummary } from '../../types/persona.types';

const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  MessageCircle,
  ClipboardList,
  Smartphone,
};

interface ResearchMethodConfig {
  method: string;
  icon: string;
  label: string;
  description: string;
  type: string;
  time: string;
  isFree?: boolean;
  isPaid?: boolean;
  priceLabel?: string;
}

interface ResearchMethodCardProps {
  config: ResearchMethodConfig;
  method: ResearchMethodSummary;
  onStart: () => void;
}

export function ResearchMethodCard({ config, method, onStart }: ResearchMethodCardProps) {
  const Icon = ICON_MAP[config.icon] ?? Bot;
  const isValidated = method.status === 'VALIDATED' || method.status === 'COMPLETED';
  const isAvailable = method.status === 'AVAILABLE';
  const isInProgress = method.status === 'IN_PROGRESS';

  return (
    <div
      className={`rounded-xl p-4 ${
        isValidated
          ? 'border border-solid border-emerald-200 bg-emerald-50/30'
          : isAvailable
            ? 'border border-dashed border-gray-300'
            : 'border border-gray-200'
      }`}
    >
      {/* Row 1: Badge left, actions right */}
      <div className="flex items-center justify-between mb-3">
        <div>
          {isValidated && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              VALIDATED
            </span>
          )}
          {isAvailable && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-500 border border-gray-300">
              AVAILABLE
            </span>
          )}
          {isInProgress && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200">
              IN PROGRESS
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isValidated && (
            <button className="text-sm text-emerald-600 font-medium hover:underline">
              View Results
            </button>
          )}
          {config.isFree && isAvailable && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              FREE
            </span>
          )}
          {config.isPaid && config.priceLabel && isAvailable && (
            <span className="text-sm text-emerald-600 font-medium">{config.priceLabel}</span>
          )}
          {isAvailable && (
            <button
              onClick={onStart}
              className="w-8 h-8 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Icon + name + description */}
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
          isValidated ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-50 text-emerald-600'
        }`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{config.label}</h3>
          <p className={`text-sm mt-0.5 ${isValidated ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {config.description}
          </p>

          {isInProgress && (
            <div className="space-y-1 mt-2">
              <ProgressBar value={method.progress} color="emerald" size="sm" />
              <p className="text-xs text-muted-foreground">{method.progress}% complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
