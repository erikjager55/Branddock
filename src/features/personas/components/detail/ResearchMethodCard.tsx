'use client';

import { Bot, MessageCircle, ClipboardList, Smartphone, CheckCircle, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Badge, ProgressBar } from '@/components/shared';
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

  return (
    <div className="border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gray-50">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900">{config.label}</h3>
          {config.isFree && (
            <Badge variant="success" size="sm">Free</Badge>
          )}
          {config.isPaid && config.priceLabel && (
            <Badge variant="info" size="sm">{config.priceLabel}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span>{config.type}</span>
          <span>·</span>
          <span>{config.time}</span>
        </div>

        {method.status === 'AVAILABLE' && (
          <Button variant="secondary" size="sm" onClick={onStart}>
            Start
          </Button>
        )}

        {method.status === 'IN_PROGRESS' && (
          <div className="space-y-1">
            <ProgressBar value={method.progress} color="emerald" size="sm" />
            <p className="text-xs text-gray-500">{method.progress}% complete</p>
          </div>
        )}

        {method.status === 'COMPLETED' && (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Completed</span>
            {method.completedAt && (
              <span className="text-xs text-gray-400 ml-1">
                {new Date(method.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {method.status === 'VALIDATED' && (
          <div className="flex items-center gap-1.5 text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium">Validated</span>
          </div>
        )}
      </div>
    </div>
  );
}
