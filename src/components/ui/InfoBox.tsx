import React from 'react';
import { cn } from '@/lib/utils';
import { getStatusColors } from '@/constants/design-system';
import { 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  LucideIcon 
} from 'lucide-react';

/**
 * ============================================================================
 * INFO BOX - SINGLE SOURCE OF TRUTH
 * ============================================================================
 * 
 * This component provides consistent colored message boxes across the
 * entire application. All status/info messages must use this component.
 * 
 * NO LOCAL OVERRIDES ALLOWED - All styling comes from design-system.ts
 * 
 * Used by:
 * - CanvasWorkshopManager_INTEGRATED (multiple instances)
 * - ResearchDashboard (recommendations, warnings)
 * - TransformativeGoalsDashboard (next steps)
 * - SocialRelevancyDashboard (next steps)
 * - AIExportOptions (success messages)
 * - +10 other components
 * ============================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

export type InfoBoxVariant = 'info' | 'success' | 'warning' | 'error';

export interface InfoBoxProps {
  /**
   * Visual variant based on message type
   * - info: Blue (information, tips)
   * - success: Green (completed, confirmed)
   * - warning: Yellow/Orange (attention needed)
   * - error: Red (errors, critical issues)
   */
  variant: InfoBoxVariant;
  
  /**
   * Optional icon override (defaults based on variant)
   */
  icon?: LucideIcon;
  
  /**
   * Optional title/heading
   */
  title?: string;
  
  /**
   * Message content
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// DEFAULT ICONS
// ============================================================================

const DEFAULT_ICONS: Record<InfoBoxVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InfoBox({
  variant,
  icon,
  title,
  children,
  className,
  size = 'md',
}: InfoBoxProps) {
  const colors = getStatusColors(variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : variant === 'success' ? 'success' : 'info');
  const Icon = icon || DEFAULT_ICONS[variant];
  
  // Size variants
  const sizeClasses = {
    sm: {
      container: 'p-2',
      icon: 'h-4 w-4',
      title: 'text-xs',
      content: 'text-xs',
    },
    md: {
      container: 'p-3',
      icon: 'h-5 w-5',
      title: 'text-sm',
      content: 'text-sm',
    },
    lg: {
      container: 'p-4',
      icon: 'h-6 w-6',
      title: 'text-base',
      content: 'text-base',
    },
  };
  
  const sizeClass = sizeClasses[size];
  
  return (
    <div
      className={cn(
        'rounded-lg border',
        colors.bg,
        colors.border,
        sizeClass.container,
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon 
          className={cn(
            'flex-shrink-0 mt-0.5',
            colors.icon,
            sizeClass.icon
          )} 
        />
        <div className="flex-1 min-w-0">
          {title && (
            <p className={cn(
              'font-medium mb-1',
              colors.text,
              sizeClass.title
            )}>
              {title}
            </p>
          )}
          <div className={cn(
            colors.text,
            sizeClass.content
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * SPECIALIZED INFO BOX VARIANTS (Convenience Components)
 * ============================================================================
 */

/**
 * Info Box - Blue variant for information/tips
 */
export function InfoMessage({ children, title, icon, className, size }: Omit<InfoBoxProps, 'variant'>) {
  return (
    <InfoBox variant="info" title={title} icon={icon} className={className} size={size}>
      {children}
    </InfoBox>
  );
}

/**
 * Success Box - Green variant for completed/confirmed states
 */
export function SuccessMessage({ children, title, icon, className, size }: Omit<InfoBoxProps, 'variant'>) {
  return (
    <InfoBox variant="success" title={title} icon={icon} className={className} size={size}>
      {children}
    </InfoBox>
  );
}

/**
 * Warning Box - Yellow/Orange variant for attention needed
 */
export function WarningMessage({ children, title, icon, className, size }: Omit<InfoBoxProps, 'variant'>) {
  return (
    <InfoBox variant="warning" title={title} icon={icon} className={className} size={size}>
      {children}
    </InfoBox>
  );
}

/**
 * Error Box - Red variant for errors/critical issues
 */
export function ErrorMessage({ children, title, icon, className, size }: Omit<InfoBoxProps, 'variant'>) {
  return (
    <InfoBox variant="error" title={title} icon={icon} className={className} size={size}>
      {children}
    </InfoBox>
  );
}
