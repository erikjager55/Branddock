// =============================================================
// CategoryBadge — shared Badge wrapper for AssetCategory enum
//
// Maps DB category (PURPOSE, COMMUNICATION, etc.) to a
// color-coded Badge with display label.
// =============================================================

import React from 'react';
import { Badge, type BadgeVariant } from '@/components/shared/Badge';
import type { AssetCategory } from '@/types/brand-asset';

// ─── Category → variant / label mapping ──────────────────

interface CategoryConfig {
  variant: BadgeVariant;
  label: string;
}

const CATEGORY_CONFIG: Record<AssetCategory, CategoryConfig> = {
  PURPOSE:        { variant: 'teal',    label: 'Purpose' },
  CORE:           { variant: 'info',    label: 'Core' },
  PERSONALITY:    { variant: 'warning', label: 'Personality' },
  COMMUNICATION:  { variant: 'success', label: 'Communication' },
  STRATEGY:       { variant: 'danger',  label: 'Strategy' },
  NARRATIVE:      { variant: 'info',    label: 'Narrative' },
  FOUNDATION:     { variant: 'default', label: 'Foundation' },
  CULTURE:        { variant: 'warning', label: 'Culture' },
};

// ─── Props ───────────────────────────────────────────────

export interface CategoryBadgeProps {
  category: AssetCategory;
  size?: 'sm' | 'md';
  className?: string;
}

// ─── Component ───────────────────────────────────────────

export function CategoryBadge({ category, size = 'sm', className }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? { variant: 'default' as BadgeVariant, label: category };

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}

// ─── Utility export ──────────────────────────────────────

export function getCategoryLabel(category: AssetCategory): string {
  return CATEGORY_CONFIG[category]?.label ?? category;
}
