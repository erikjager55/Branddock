'use client';

import { Bot, MessageCircle, ClipboardList, Smartphone, CheckCircle2, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, ProgressBar } from '@/components/shared';
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

  return (
    <div
      className={`rounded-xl p-4 flex items-start gap-3 ${
        isValidated
          ? 'border border-emerald-200 bg-emerald-50/30'
          : isAvailable
            ? 'border border-dashed border-gray-300'
            : 'border border-gray-200'
      }`}
    >
      <div className={`p-2 rounded-lg ${isValidated ? 'bg-emerald-100' : 'bg-gray-50'}`}>
        <Icon className={`w-5 h-5 ${isValidated ? 'text-emerald-600' : 'text-gray-500'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900">{config.label}</h3>
          {isValidated && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
              VALIDATED
            </span>
          )}
          {isAvailable && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-gray-500 border border-gray-300">
              + AVAILABLE
            </span>
          )}
          {config.isFree && (
            <Badge variant="success" size="sm">Free</Badge>
          )}
          {config.isPaid && config.priceLabel && (
            <span className="text-xs text-gray-400">{config.priceLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{config.type}</span>
          <span>&middot;</span>
          <span>{config.time}</span>
        </div>

        {method.status === 'IN_PROGRESS' && (
          <div className="space-y-1 mt-2">
            <ProgressBar value={method.progress} color="emerald" size="sm" />
            <p className="text-xs text-gray-500">{method.progress}% complete</p>
          </div>
        )}
      </div>

      {/* Right side action/status */}
      <div className="flex-shrink-0 flex items-center">
        {isValidated && (
          <button className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
            View Results
          </button>
        )}
        {isAvailable && (
          <button
            onClick={onStart}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {method.status === 'IN_PROGRESS' && (
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
        )}
      </div>
    </div>
  );
}
