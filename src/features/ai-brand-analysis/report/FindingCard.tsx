'use client';

import React from 'react';
import { Target, Users, Sparkles, Lightbulb, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AIFinding, FindingKey } from '@/types/ai-analysis';
import { Card } from '@/components/shared';

const FINDING_CONFIG: Record<FindingKey, { icon: LucideIcon; color: string; bgColor: string; borderColor: string }> = {
  brand_purpose: { icon: Target, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  target_audience: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  unique_value: { icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  customer_challenge: { icon: Lightbulb, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  market_position: { icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
};

interface FindingCardProps {
  finding: AIFinding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const config = FINDING_CONFIG[finding.key] ?? FINDING_CONFIG.brand_purpose;
  const Icon = config.icon;

  return (
    <Card className={`border ${config.borderColor}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">{finding.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
