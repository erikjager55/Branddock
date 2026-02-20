// =============================================================
// AssetStatusBadge — shared Badge wrapper for AssetStatus enum
//
// Maps DB status (DRAFT, IN_PROGRESS, NEEDS_ATTENTION, READY)
// to shared Badge variants + icons.
//
// Replaces the old CalculatedAssetStatus-based component.
// =============================================================

import React from 'react';
import { Badge, type BadgeVariant } from '@/components/shared/Badge';
import { CheckCircle2, Clock, AlertTriangle, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AssetStatus } from '@/types/brand-asset';

// ─── Status → variant / label / icon mapping ─────────────

interface StatusConfig {
  variant: BadgeVariant;
  label: string;
  icon: LucideIcon;
}

const STATUS_CONFIG: Record<AssetStatus, StatusConfig> = {
  READY:           { variant: 'success', label: 'Validated',       icon: CheckCircle2 },
  IN_PROGRESS:     { variant: 'info',    label: 'In Progress',     icon: Clock },
  NEEDS_ATTENTION: { variant: 'warning', label: 'Needs Attention', icon: AlertTriangle },
  DRAFT:           { variant: 'default', label: 'Draft',           icon: Circle },
};

// ─── Props ───────────────────────────────────────────────

export interface AssetStatusBadgeProps {
  status: AssetStatus;
  /** Show a dot instead of an icon */
  dot?: boolean;
  /** Show the icon */
  showIcon?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────

export function AssetStatusBadge({
  status,
  dot = false,
  showIcon = true,
  className,
}: AssetStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;

  return (
    <Badge
      variant={config.variant}
      icon={showIcon && !dot ? config.icon : undefined}
      dot={dot}
      className={className}
    >
      {config.label}
    </Badge>
  );
}

// ─── Utility export (for use in other components) ────────

export function getStatusVariant(status: AssetStatus): BadgeVariant {
  return STATUS_CONFIG[status]?.variant ?? 'default';
}

export function getStatusLabel(status: AssetStatus): string {
  return STATUS_CONFIG[status]?.label ?? status;
}
