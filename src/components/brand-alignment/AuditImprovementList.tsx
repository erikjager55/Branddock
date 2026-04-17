import React from 'react';
import { ArrowUpRight, Zap, Minus } from 'lucide-react';
import type { ImprovementPoint } from '@/types/brand-alignment';

interface Props {
  improvements: ImprovementPoint[];
  onNavigateToAsset?: (assetId: string) => void;
}

const IMPACT_CONFIG = {
  HIGH: { label: 'High Impact', color: '#dc2626', bgColor: '#fef2f2', icon: Zap },
  MEDIUM: { label: 'Medium Impact', color: '#d97706', bgColor: '#fffbeb', icon: ArrowUpRight },
  LOW: { label: 'Low Impact', color: '#6b7280', bgColor: '#f9fafb', icon: Minus },
} as const;

const EFFORT_CONFIG = {
  LOW: { label: 'Quick win', color: '#059669' },
  MEDIUM: { label: 'Moderate effort', color: '#d97706' },
  HIGH: { label: 'Significant effort', color: '#dc2626' },
} as const;

export function AuditImprovementList({ improvements, onNavigateToAsset }: Props) {
  if (improvements.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Top Improvements
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Prioritized actions to strengthen your brand.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {improvements.map((imp, i) => {
          const impact = IMPACT_CONFIG[imp.impact];
          const effort = EFFORT_CONFIG[imp.effort];
          const ImpactIcon = impact.icon;

          return (
            <div key={i} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Number */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                  style={{ backgroundColor: impact.bgColor, color: impact.color }}
                >
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-medium text-gray-900">
                      {imp.title}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {imp.description}
                  </p>

                  <div className="flex items-center gap-3">
                    {/* Impact badge */}
                    <div className="flex items-center gap-1">
                      <ImpactIcon
                        className="w-3 h-3"
                        style={{ color: impact.color }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: impact.color }}
                      >
                        {impact.label}
                      </span>
                    </div>

                    {/* Effort badge */}
                    <span
                      className="text-xs"
                      style={{ color: effort.color }}
                    >
                      {effort.label}
                    </span>

                    {/* Asset link */}
                    {imp.assetId && imp.assetName && (
                      <button
                        onClick={() => onNavigateToAsset?.(imp.assetId!)}
                        className="text-xs font-medium hover:underline"
                        style={{ color: '#0d9488' }}
                      >
                        → {imp.assetName}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
