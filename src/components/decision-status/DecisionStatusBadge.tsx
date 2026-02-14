import React from 'react';
import { Badge } from '../ui/badge';
import { DecisionStatus, DECISION_STATUS_CONFIG } from '../../types/decision-status';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface DecisionStatusBadgeProps {
  status: DecisionStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * DecisionStatusBadge
 * 
 * Compact badge showing decision quality status.
 * Used on cards and lists for quick visual scanning.
 * 
 * Design rationale:
 * - Color-coded for instant recognition (green/amber/red)
 * - Optional icons for accessibility and clarity
 * - Sizes for different contexts (cards vs headers)
 */
export function DecisionStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true,
  className = ''
}: DecisionStatusBadgeProps) {
  const config = DECISION_STATUS_CONFIG[status];
  
  const Icon = status === 'safe-to-decide' 
    ? CheckCircle 
    : status === 'decision-at-risk' 
    ? AlertTriangle 
    : XCircle;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };
  
  return (
    <Badge 
      className={`
        ${config.bgColor} 
        ${config.color} 
        ${config.borderColor}
        border
        ${sizeClasses[size]}
        font-medium
        ${className}
      `}
    >
      {showIcon && <Icon className={`${iconSizes[size]} mr-1.5`} />}
      {config.label}
    </Badge>
  );
}
