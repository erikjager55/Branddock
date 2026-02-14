import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Clock,
  Plus,
  Crown,
  LucideIcon,
  Check,
  Lock,
} from 'lucide-react';

/**
 * ============================================================================
 * VALIDATION METHOD BUTTON - SINGLE SOURCE OF TRUTH
 * ============================================================================
 * 
 * This is the ONLY component that should render validation method buttons
 * across the entire application. All other components must use this.
 * 
 * NO LOCAL OVERRIDES ALLOWED - All styling comes from this component.
 * 
 * VARIANTS:
 * - default: Full card with all details (p-3, larger text)
 * - compact: Horizontal list item (p-2, smaller text, same styling)
 * 
 * Used by:
 * - EntityCard (Your Brand section)
 * - EnhancedPersonaCard (Personas section)
 * - ResearchStatusOverview
 * - DeliverableCard
 * - SocialRelevancyDashboard
 * - TransformativeGoalsDashboard
 * ============================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

export type ValidationMethodStatus = 'available' | 'running' | 'completed' | 'locked';

export interface ValidationMethodButtonProps {
  // Core data
  label: string;
  description?: string;
  type?: string; // Used to determine button label (e.g., 'ai-exploration')
  
  // Status
  status: ValidationMethodStatus;
  progress?: number; // 0-100 for running state
  
  // Visual
  icon?: LucideIcon;
  
  // Actions
  onPrimaryClick?: () => void;
  primaryLabel?: string; // Override default label
  
  // Display options
  showIcon?: boolean;
  animationDelay?: number;
  variant?: 'default' | 'compact'; // Compact uses same styling, smaller spacing
  
  // Additional metadata
  duration?: string;
  category?: string;
  
  // Unlock info (for locked state)
  unlockTier?: 'basic' | 'premium' | 'enterprise';
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

interface StatusBadgeProps {
  status: ValidationMethodStatus;
  isCompact: boolean;
}

function ValidationStatusBadge({ status, isCompact }: StatusBadgeProps) {
  const badgeSize = isCompact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  const iconSize = isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3';
  
  const configs = {
    completed: {
      label: 'VALIDATED',
      icon: Check,
      className: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    },
    running: {
      label: 'IN PROGRESS',
      icon: Clock,
      className: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    },
    available: {
      label: 'AVAILABLE',
      icon: Plus,
      className: 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    },
    locked: {
      label: 'LOCKED',
      icon: Lock,
      className: 'bg-gray-100 text-gray-500 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
    },
  };
  
  // Safety check: fallback to 'available' if status is not found
  const config = configs[status] || configs.available;
  const IconComponent = config.icon;
  
  return (
    <div className={`inline-flex items-center gap-1 ${badgeSize} rounded-full font-semibold uppercase tracking-wide ${config.className}`}>
      <IconComponent className={iconSize} />
      {config.label}
    </div>
  );
}

// ============================================================================
// UNLOCK BADGE HELPER
// ============================================================================

const getUnlockBadge = (tier?: 'basic' | 'premium' | 'enterprise') => {
  switch (tier) {
    case 'basic':
      return { label: 'BASIC', className: 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400' };
    case 'premium':
      return { label: 'PREMIUM', className: 'border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400' };
    case 'enterprise':
      return { label: 'ENTERPRISE', className: 'border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400' };
    default:
      return { label: 'UPGRADE', className: 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400' };
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValidationMethodButton({
  label,
  description,
  type,
  status,
  progress,
  icon: Icon,
  onPrimaryClick,
  primaryLabel,
  showIcon = true,
  animationDelay = 0,
  duration,
  category,
  unlockTier,
  variant = 'default',
}: ValidationMethodButtonProps) {
  
  // Determine button label based on status and type
  const getButtonLabel = (): string => {
    if (primaryLabel) return primaryLabel;
    
    switch (status) {
      case 'completed':
        return type === 'ai-exploration' ? 'View Analysis' : 'View Results';
      case 'running':
        return 'View Progress';
      case 'locked':
        return 'Unlock';
      case 'available':
      default:
        return 'Start';
    }
  };
  
  const buttonLabel = getButtonLabel();
  
  // Variant-specific sizing
  const isCompact = variant === 'compact';
  const padding = isCompact ? 'p-2' : 'p-3';
  const iconSize = isCompact ? 'h-5 w-5' : 'h-8 w-8';
  const iconInnerSize = isCompact ? 'h-2.5 w-2.5' : 'h-4 w-4';
  const titleSize = isCompact ? 'text-[11px]' : 'text-sm';
  const metaSize = isCompact ? 'text-[9px]' : 'text-xs';
  const badgeSize = isCompact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';
  const buttonSize = isCompact ? 'h-5 px-2 text-[9px]' : 'h-8 px-3 text-xs';
  const gap = isCompact ? 'gap-2' : 'gap-3';
  const spacing = isCompact ? 'space-y-0.5' : 'space-y-1.5';
  
  // ============================================================================
  // STATE: COMPLETED
  // ============================================================================
  
  if (status === 'completed') {
    return (
      <motion.div
        className={`${padding} rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 transition-all ${spacing}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animationDelay }}
      >
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <ValidationStatusBadge status={status} isCompact={isCompact} />
          {onPrimaryClick && (
            <button
              className={`${buttonSize} text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-md transition-colors font-medium flex-shrink-0`}
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryClick();
              }}
            >
              {buttonLabel}
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className={`flex items-center ${gap}`}>
          {/* Icon */}
          {showIcon && (
            <div className={`${iconSize} rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0`}>
              {Icon ? (
                <Icon className={`${iconInnerSize} text-green-600 dark:text-green-400`} />
              ) : (
                <Check className={`${iconInnerSize} text-green-600 dark:text-green-400`} />
              )}
            </div>
          )}
          
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className={`${titleSize} font-semibold text-green-900 dark:text-green-100 truncate`}>
              {label}
            </div>
            {!isCompact && description && (
              <div className={`${metaSize} text-green-600 dark:text-green-400 mt-0.5`}>
                {description}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
  
  // ============================================================================
  // STATE: RUNNING
  // ============================================================================
  
  if (status === 'running') {
    return (
      <motion.div
        className={`${padding} rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-all ${spacing}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animationDelay }}
      >
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <ValidationStatusBadge status={status} isCompact={isCompact} />
          {onPrimaryClick && (
            <button
              className={`${buttonSize} text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors font-medium flex-shrink-0`}
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryClick();
              }}
            >
              {buttonLabel}
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className={`flex items-center ${gap}`}>
          {/* Icon */}
          {showIcon && (
            <div className={`${iconSize} rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0`}>
              {Icon ? (
                <Icon className={`${iconInnerSize} text-blue-600 dark:text-blue-400`} />
              ) : (
                <Clock className={`${iconInnerSize} text-blue-600 dark:text-blue-400 animate-spin`} />
              )}
            </div>
          )}
          
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className={`${titleSize} font-semibold text-blue-900 dark:text-blue-100 truncate`}>
              {label}
              {progress !== undefined && <span className="ml-1 font-normal text-blue-600">({progress}%)</span>}
            </div>
            {!isCompact && (
              <div className={`${metaSize} text-blue-600 dark:text-blue-400 mt-0.5`}>
                {description || 'Research in progress • Collecting data...'}
              </div>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        {progress !== undefined && !isCompact && (
          <div className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-full h-1.5 mt-1">
            <div 
              className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </motion.div>
    );
  }
  
  // ============================================================================
  // STATE: LOCKED
  // ============================================================================
  
  if (status === 'locked') {
    return (
      <motion.div
        className={`${padding} rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 opacity-60 transition-all ${spacing}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.6, y: 0 }}
        transition={{ delay: animationDelay }}
      >
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <ValidationStatusBadge status={status} isCompact={isCompact} />
          {onPrimaryClick && (
            <button
              className={`${buttonSize} bg-primary text-white hover:bg-primary/90 rounded-md transition-colors font-semibold flex-shrink-0 inline-flex items-center gap-1.5 shadow-sm`}
              onClick={(e) => {
                e.stopPropagation();
                onPrimaryClick();
              }}
            >
              <Crown className={isCompact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
              {buttonLabel}
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className={`flex items-center ${gap}`}>
          {/* Icon */}
          {showIcon && (
            <div className={`${iconSize} rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0`}>
              {Icon ? (
                <Icon className={`${iconInnerSize} text-gray-400`} />
              ) : (
                <Lock className={`${iconInnerSize} text-gray-400`} />
              )}
            </div>
          )}
          
          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className={`${titleSize} font-semibold text-gray-700 dark:text-gray-300 truncate`}>
              {label}
            </div>
            {!isCompact && description && (
              <div className={`${metaSize} text-gray-500 dark:text-gray-500 mt-0.5`}>
                {description}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
  
  // ============================================================================
  // STATE: AVAILABLE (DEFAULT)
  // ============================================================================
  
  return (
    <motion.div
      className={`${padding} rounded-lg bg-transparent border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group ${spacing}`}
      onClick={(e) => {
        if (onPrimaryClick) {
          e.stopPropagation();
          onPrimaryClick();
        }
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <ValidationStatusBadge status={status} isCompact={isCompact} />
        {onPrimaryClick && (
          <div className="flex-shrink-0">
            <Plus className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} text-muted-foreground group-hover:text-primary transition-colors`} />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className={`flex items-center ${gap}`}>
        {/* Icon */}
        {showIcon && (
          <div className={`${iconSize} rounded-full bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors`}>
            {Icon ? (
              <Icon className={`${iconInnerSize} text-muted-foreground group-hover:text-primary transition-colors`} />
            ) : (
              <Sparkles className={`${iconInnerSize} text-muted-foreground group-hover:text-primary transition-colors`} />
            )}
          </div>
        )}
        
        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className={`${titleSize} font-semibold text-foreground group-hover:text-primary transition-colors truncate`}>
            {label}
          </div>
          {!isCompact && (
            <div className={`flex items-center gap-2 ${metaSize} text-muted-foreground mt-0.5 flex-wrap`}>
              {duration && <span>{duration}</span>}
              {duration && category && <span className="text-muted-foreground/50">•</span>}
              {category && <span>{category}</span>}
              {!duration && !category && !description && <span>Available • Upgrade quality</span>}
              {!duration && !category && description && <span>{description}</span>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact variant helper
 * Same styling as default, but with reduced spacing and text sizes
 */
export function ValidationMethodButtonCompact(props: Omit<ValidationMethodButtonProps, 'variant'>) {
  return <ValidationMethodButton {...props} variant="compact" />;
}