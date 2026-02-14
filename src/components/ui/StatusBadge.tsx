import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusColors } from '@/constants/design-system';

/**
 * ============================================================================
 * STATUS BADGE - SINGLE SOURCE OF TRUTH
 * ============================================================================
 * 
 * This component provides consistent status/info badge styling across the
 * entire application. All colored status containers must use this component.
 * 
 * NO LOCAL OVERRIDES ALLOWED - All styling comes from design-system.ts
 * 
 * Used by:
 * - ResearchDashboard
 * - AIExportOptions
 * - AIVersionHistory
 * - BrandArchetypeCanvas
 * - BrandValuesCanvas
 * - CanvasWorkshopInProgress
 * - CanvasWorkshopManager_INTEGRATED
 * - TransformativeGoalsDashboard
 * - SocialRelevancyDashboard
 * - +15 other components
 * ============================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

export type StatusBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  /**
   * Visual variant based on status type
   * - success: Green (completed, validated, active)
   * - warning: Yellow (pending, attention needed)
   * - error: Red (blocked, failed, critical)
   * - info: Blue (information, in progress)
   * - neutral: Gray (default, inactive)
   */
  variant: StatusBadgeVariant;
  
  /**
   * Content to display inside the badge
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes to merge
   */
  className?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StatusBadge({ 
  variant, 
  children, 
  className,
  size = 'md'
}: StatusBadgeProps) {
  const colors = getStatusColors(variant);
  
  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs rounded-md',
    md: 'px-3 py-2 text-sm rounded-lg',
    lg: 'px-4 py-3 text-base rounded-xl',
  };
  
  return (
    <div 
      className={cn(
        'border',
        colors.bg,
        colors.border,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * ============================================================================
 * SPECIALIZED BADGE VARIANTS (Convenience Components)
 * ============================================================================
 */

/**
 * Success Badge - Green variant for completed/validated states
 */
export function SuccessBadge({ children, className, size }: Omit<StatusBadgeProps, 'variant'>) {
  return (
    <StatusBadge variant="success" className={className} size={size}>
      {children}
    </StatusBadge>
  );
}

/**
 * Warning Badge - Yellow variant for pending/attention states
 */
export function WarningBadge({ children, className, size }: Omit<StatusBadgeProps, 'variant'>) {
  return (
    <StatusBadge variant="warning" className={className} size={size}>
      {children}
    </StatusBadge>
  );
}

/**
 * Error Badge - Red variant for blocked/failed states
 */
export function ErrorBadge({ children, className, size }: Omit<StatusBadgeProps, 'variant'>) {
  return (
    <StatusBadge variant="error" className={className} size={size}>
      {children}
    </StatusBadge>
  );
}

/**
 * Info Badge - Blue variant for information/in-progress states
 */
export function InfoBadge({ children, className, size }: Omit<StatusBadgeProps, 'variant'>) {
  return (
    <StatusBadge variant="info" className={className} size={size}>
      {children}
    </StatusBadge>
  );
}

/**
 * Neutral Badge - Gray variant for default/inactive states
 */
export function NeutralBadge({ children, className, size }: Omit<StatusBadgeProps, 'variant'>) {
  return (
    <StatusBadge variant="neutral" className={className} size={size}>
      {children}
    </StatusBadge>
  );
}
