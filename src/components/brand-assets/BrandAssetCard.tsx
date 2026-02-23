// =============================================================
// BrandAssetCard — per-asset card (Figma 2-col design)
//
// Displays: gradient icon, name, description, coverage badge,
// metadata row, expandable validation methods, last updated.
//
// Works with BrandAssetWithMeta (API/DB format).
// =============================================================

'use client';

import React, { useState } from 'react';
import {
  Layers, ChevronDown, CheckCircle, AlertCircle, AlertTriangle,
  Sparkles, Users as UsersIcon, FileQuestion, ClipboardList,
} from 'lucide-react';
import { CardLockIndicator } from '@/components/lock';
import * as LucideIcons from 'lucide-react';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { CategoryBadge } from './CategoryBadge';
import { cn } from '@/components/ui/utils';
import type { BrandAssetWithMeta, AssetCategory } from '@/types/brand-asset';
import { ICON_CONTAINERS } from '@/lib/constants/design-tokens';

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

// ─── Coverage badge helpers ─────────────────────────────────

function coverageVariant(pct: number): { color: string; icon: React.ElementType } {
  if (pct >= 80) return { color: 'text-green-600 bg-green-50', icon: CheckCircle };
  if (pct >= 50) return { color: 'text-primary bg-primary/10', icon: CheckCircle };
  if (pct > 0) return { color: 'text-orange-600 bg-orange-50', icon: AlertCircle };
  return { color: 'text-red-600 bg-red-50', icon: AlertTriangle };
}

// ─── Validation method config ───────────────────────────────

const VALIDATION_METHODS = [
  { key: 'ai' as const, label: 'AI Exploration', icon: Sparkles },
  { key: 'workshop' as const, label: 'Workshop', icon: UsersIcon },
  { key: 'interview' as const, label: 'Interviews', icon: FileQuestion },
  { key: 'questionnaire' as const, label: 'Survey', icon: ClipboardList },
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
  const coverage = coverageVariant(asset.coveragePercentage);
  const CoverageIcon = coverage.icon;

  const completedMethods = VALIDATION_METHODS.filter(
    (m) => asset.validationMethods[m.key],
  ).length;

  return (
    <Card
      hoverable={!!onClick}
      padding="none"
      onClick={onClick ? () => onClick(asset) : undefined}
      className={cn('relative flex flex-col', className)}
      data-testid="brand-asset-card"
    >
      <CardLockIndicator isLocked={isLocked} className="absolute top-3 right-3" />

      {/* Header — gradient icon + title + coverage badge */}
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
            <CategoryBadge category={asset.category} />
          </div>

          {/* Coverage % badge */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0',
              coverage.color,
            )}
          >
            <CoverageIcon className="h-3.5 w-3.5" />
            {Math.round(asset.coveragePercentage)}%
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-6 pt-3 pb-4">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {asset.description || 'No description yet.'}
        </p>
      </div>

      {/* Metadata row */}
      <div className="px-6 pb-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Validated {completedMethods}/4</span>
        {asset.artifactCount > 0 && (
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {asset.artifactCount} artifact{asset.artifactCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Expandable Validation Methods */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMethodsExpanded(!methodsExpanded);
          }}
          className="w-full flex items-center justify-between px-6 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span>Validation Methods {completedMethods}/4</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              methodsExpanded && 'rotate-180',
            )}
          />
        </button>

        {methodsExpanded && (
          <div className="px-6 pb-4 grid grid-cols-2 gap-2">
            {VALIDATION_METHODS.map((method) => {
              const done = asset.validationMethods[method.key];
              const MethodIcon = method.icon;
              return (
                <div
                  key={method.key}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                    done
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <MethodIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  {method.label}
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
