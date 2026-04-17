import React from 'react';
import {
  CheckCircle2,
  Eye,
  Layers,
  Fingerprint,
  Rocket,
} from 'lucide-react';
import type { AuditDimension, AuditDimensionKey } from '@/types/brand-alignment';

const DIMENSION_CONFIG: Record<
  AuditDimensionKey,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  completeness: { icon: CheckCircle2, color: '#0d9488', bgColor: '#f0fdfa' },
  clarity: { icon: Eye, color: '#7c3aed', bgColor: '#f5f3ff' },
  consistency: { icon: Layers, color: '#2563eb', bgColor: '#eff6ff' },
  differentiation: { icon: Fingerprint, color: '#db2777', bgColor: '#fdf2f8' },
  activation_readiness: { icon: Rocket, color: '#d97706', bgColor: '#fffbeb' },
};

interface Props {
  dimension: AuditDimension;
}

export function AuditDimensionCard({ dimension }: Props) {
  const config = DIMENSION_CONFIG[dimension.key];
  const Icon = config.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.bgColor }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-900">
              {dimension.label}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: config.color }}
              >
                {dimension.grade}
              </span>
              <span className="text-sm text-gray-500">
                {dimension.score}%
              </span>
            </div>
          </div>

          {/* Score bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full mb-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${dimension.score}%`,
                backgroundColor: config.color,
              }}
            />
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            {dimension.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
