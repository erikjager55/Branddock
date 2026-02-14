import React from 'react';
import { AssetStatus } from '../../types/brand-asset';
import { getStatusInfo } from '../../utils/asset-status';
import { Badge } from '../ui/badge';
import { CheckCircle, Clock, Circle, AlertTriangle } from 'lucide-react';

interface AssetStatusBadgeProps {
  status: AssetStatus;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showReviewBadge?: boolean;
}

export function AssetStatusBadge({ 
  status, 
  size = 'medium',
  showIcon = true,
  showReviewBadge = true
}: AssetStatusBadgeProps) {
  const statusInfo = getStatusInfo(status);
  
  const getIcon = () => {
    switch (statusInfo.icon) {
      case 'CheckCircle':
        return CheckCircle;
      case 'Clock':
        return Clock;
      case 'AlertTriangle':
        return AlertTriangle;
      case 'Circle':
      default:
        return Circle;
    }
  };
  
  const Icon = getIcon();
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-2 py-0.5 text-xs';
      case 'large':
        return 'px-4 py-2 text-base';
      case 'medium':
      default:
        return 'px-3 py-1 text-sm';
    }
  };
  
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'h-3 w-3';
      case 'large':
        return 'h-5 w-5';
      case 'medium':
      default:
        return 'h-4 w-4';
    }
  };
  
  return (
    <div className="inline-flex items-center space-x-2">
      <Badge 
        variant="secondary"
        className={`
          ${getSizeClasses()}
          ${statusInfo.bgClass}
          ${statusInfo.textClass}
          border ${statusInfo.borderClass}
          font-medium
        `}
      >
        {showIcon && <Icon className={`${getIconSize()} mr-1.5`} />}
        {statusInfo.label}
      </Badge>
      
      {showReviewBadge && status === 'ready-to-validate' && (
        <Badge 
          variant="destructive"
          className="px-2 py-0.5 text-xs animate-pulse"
        >
          Review
        </Badge>
      )}
    </div>
  );
}

interface AssetStatusIndicatorProps {
  status: AssetStatus;
  variant?: 'dot' | 'icon' | 'full';
  size?: 'small' | 'medium' | 'large';
}

export function AssetStatusIndicator({ 
  status, 
  variant = 'dot',
  size = 'medium' 
}: AssetStatusIndicatorProps) {
  const statusInfo = getStatusInfo(status);
  
  const getIcon = () => {
    switch (statusInfo.icon) {
      case 'CheckCircle':
        return CheckCircle;
      case 'Clock':
        return Clock;
      case 'AlertTriangle':
        return AlertTriangle;
      case 'Circle':
      default:
        return Circle;
    }
  };
  
  const Icon = getIcon();
  
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'h-3 w-3';
      case 'large':
        return 'h-6 w-6';
      case 'medium':
      default:
        return 'h-4 w-4';
    }
  };
  
  const getDotSize = () => {
    switch (size) {
      case 'small':
        return 'h-2 w-2';
      case 'large':
        return 'h-4 w-4';
      case 'medium':
      default:
        return 'h-3 w-3';
    }
  };
  
  if (variant === 'dot') {
    return (
      <div 
        className={`rounded-full ${getDotSize()} ${statusInfo.bgClass}`}
        title={statusInfo.label}
      />
    );
  }
  
  if (variant === 'icon') {
    return (
      <Icon 
        className={`${getIconSize()} ${statusInfo.textClass}`}
        title={statusInfo.label}
      />
    );
  }
  
  return (
    <div className={`inline-flex items-center space-x-2 ${statusInfo.textClass}`}>
      <Icon className={getIconSize()} />
      <span className="text-sm font-medium">{statusInfo.label}</span>
    </div>
  );
}
