// =============================================================
// BrandAssetCard — per-asset card (PersonaCard-aligned design)
//
// Displays: gradient icon, name, description subtitle, two pills
// (complete + validated), expandable validation methods, last updated.
//
// Works with BrandAssetWithMeta (API/DB format).
// =============================================================

'use client';

import React, { useState } from 'react';
import {
  ChevronDown, CheckCircle, Plus,
  Sparkles, Users as UsersIcon, FileQuestion, ClipboardList,
} from 'lucide-react';
import { CardLockIndicator } from '@/components/lock';
import * as LucideIcons from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/ui/utils';
import type { BrandAssetWithMeta, AssetCategory } from '@/types/brand-asset';
import { ICON_CONTAINERS } from '@/lib/constants/design-tokens';
import { getAssetCompletenessFields } from '@/features/brand-asset-detail/components/sidebar/AssetCompletenessCard';

// ─── Category gradient map ──────────────────────────────────

const CATEGORY_GRADIENTS: Record<AssetCategory, string> = {
  PURPOSE: 'from-green-500 to-emerald-600',
  FOUNDATION: 'from-[#1FD1B2] to-emerald-500',
  STRATEGY: 'from-blue-500 to-indigo-600',
  COMMUNICATION: 'from-purple-500 to-pink-600',
  PERSONALITY: 'from-orange-500 to-amber-600',
  CORE: 'from-[#1FD1B2] to-emerald-500',
  NARRATIVE: 'from-red-500 to-pink-600',
  CULTURE: 'from-yellow-500 to-orange-500',
};

const CATEGORY_ICONS: Record<AssetCategory, string> = {
  PURPOSE: 'Globe',
  FOUNDATION: 'Building2',
  STRATEGY: 'Target',
  COMMUNICATION: 'MessageSquare',
  PERSONALITY: 'Heart',
  CORE: 'Shield',
  NARRATIVE: 'BookOpen',
  CULTURE: 'Users',
};

// ─── Validation method config ───────────────────────────────

const VALIDATION_METHODS = [
  {
    key: 'ai' as const,
    label: 'AI Exploration',
    icon: Sparkles,
    description: 'AI-assisted analysis and ideation for brand strategy',
    priceLabel: 'FREE',
  },
  {
    key: 'workshop' as const,
    label: 'Workshop',
    icon: UsersIcon,
    description: 'Collaborative workshop sessions with stakeholders',
  },
  {
    key: 'interview' as const,
    label: 'Interviews',
    icon: FileQuestion,
    description: 'One-on-one deep-dive interviews with key stakeholders and customers',
  },
  {
    key: 'questionnaire' as const,
    label: 'Survey',
    icon: ClipboardList,
    description: 'Comprehensive surveys distributed to broader audience for quantitative insights',
    priceLabel: 'From $500',
  },
];

// ─── Helpers ────────────────────────────────────────────────

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.FileText;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ─── Props ──────────────────────────────────────────────────

export interface BrandAssetCardProps {
  asset: BrandAssetWithMeta;
  onClick?: (asset: BrandAssetWithMeta) => void;
  isLocked?: boolean;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────

export function BrandAssetCard({
  asset,
  onClick,
  isLocked = false,
  className,
}: BrandAssetCardProps) {
  const [methodsExpanded, setMethodsExpanded] = useState(false);

  const gradient = CATEGORY_GRADIENTS[asset.category] ?? 'from-gray-500 to-gray-600';
  const iconName = CATEGORY_ICONS[asset.category] ?? 'FileText';
  const CategoryIcon = getIcon(iconName);

  const completedMethods = VALIDATION_METHODS.filter(
    (m) => asset.validationMethods[m.key],
  ).length;

  // Completeness: framework-aware field check
  const fields = getAssetCompletenessFields({
    description: asset.description,
    frameworkType: asset.frameworkType,
    frameworkData: asset.frameworkData,
  });
  const filledCount = fields.filter(f => f.filled).length;
  const completenessPercent = Math.round((filledCount / fields.length) * 100);

  return (
    <Card
      hoverable={!!onClick}
      padding="none"
      onClick={onClick ? () => onClick(asset) : undefined}
      className={cn('relative flex flex-col', className)}
      data-testid="brand-asset-card"
    >
      <CardLockIndicator isLocked={isLocked} className="absolute top-3 right-3" />

      {/* Header — gradient icon + title + subtitle + two pills */}
      <div className="p-6 pb-0">
        <div className="flex items-start gap-4">
          {/* Gradient icon container */}
          <div
            className={cn(
              ICON_CONTAINERS.medium,
              `bg-gradient-to-br ${gradient}`,
            )}
          >
            <CategoryIcon className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-1">
              {asset.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
              {asset.description || 'No description yet'}
            </p>
          </div>

          {/* Two pills: complete + validated */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              completenessPercent >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              completenessPercent >= 50 ? 'border-amber-200 bg-amber-50 text-amber-600' :
              'border-red-200 bg-red-50 text-red-500'
            }`}>
              {completenessPercent}% complete
            </span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              asset.coveragePercentage >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              asset.coveragePercentage >= 50 ? 'border-amber-200 bg-amber-50 text-amber-600' :
              'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              {Math.round(asset.coveragePercentage)}% validated
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Validation Methods */}
      <div className="border-t border-border mt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMethodsExpanded(!methodsExpanded);
          }}
          className="w-full flex items-center justify-between px-6 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Validation Methods ({completedMethods}/4)</span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              methodsExpanded && 'rotate-180',
            )}
          />
        </button>

        {methodsExpanded && (
          <div className="px-6 pb-4 space-y-2">
            {VALIDATION_METHODS.map((method) => {
              const done = asset.validationMethods[method.key];
              const MethodIcon = method.icon;

              return (
                <div
                  key={method.key}
                  className={`rounded-lg p-3 ${
                    done
                      ? 'border border-emerald-200 bg-emerald-50/30'
                      : 'border border-dashed border-gray-300'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        done ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        <MethodIcon className={`h-4 w-4 ${
                          done ? 'text-emerald-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900">
                          {method.label}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                          {method.description}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {done ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            <CheckCircle className="h-3 w-3" />
                            VALIDATED
                          </span>
                          <span className="text-[10px] font-medium text-emerald-600 hover:underline cursor-pointer">
                            View Results
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            <Plus className="h-3 w-3" />
                            AVAILABLE
                          </span>
                          {method.priceLabel && (
                            <span className="text-[10px] text-gray-400">
                              {method.priceLabel}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer — last updated */}
      {asset.updatedAt && (
        <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground">
          Last updated: {formatDate(asset.updatedAt)}
        </div>
      )}
    </Card>
  );
}
