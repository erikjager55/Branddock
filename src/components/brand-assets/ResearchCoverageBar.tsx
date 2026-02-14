import React from 'react';
import { BrandAsset } from '../../types/brand-asset';
import { getCompletedMethodsCount } from '../../utils/asset-status';
import { Progress } from '../ui/progress';

interface ResearchCoverageBarProps {
  asset: BrandAsset;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function ResearchCoverageBar({ 
  asset, 
  showLabel = true,
  size = 'medium' 
}: ResearchCoverageBarProps) {
  const totalMethods = 4;
  const completedCount = getCompletedMethodsCount(asset);
  const percentage = asset.researchCoverage || 0;
  
  const getHeight = () => {
    switch (size) {
      case 'small':
        return 'h-1.5';
      case 'large':
        return 'h-3';
      case 'medium':
      default:
        return 'h-2';
    }
  };
  
  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-sm';
      case 'medium':
      default:
        return 'text-xs';
    }
  };
  
  return (
    <div className="space-y-1">
      {showLabel && (
        <div className={`flex items-center justify-between ${getTextSize()} text-muted-foreground`}>
          <span>
            Research Coverage: {completedCount}/{totalMethods} methods
          </span>
          <span className="font-medium">{percentage}%</span>
        </div>
      )}
      <Progress 
        value={percentage} 
        className={getHeight()}
      />
    </div>
  );
}

interface ResearchCoverageIndicatorProps {
  completedCount: number;
  totalCount?: number;
  variant?: 'badge' | 'text' | 'compact';
}

export function ResearchCoverageIndicator({ 
  completedCount, 
  totalCount = 4,
  variant = 'badge' 
}: ResearchCoverageIndicatorProps) {
  const percentage = Math.round((completedCount / totalCount) * 100);
  
  const getColor = () => {
    if (percentage === 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 75) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage > 0) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  };
  
  const getBgColor = () => {
    if (percentage === 100) return 'bg-green-100 dark:bg-green-900/20';
    if (percentage >= 75) return 'bg-blue-100 dark:bg-blue-900/20';
    if (percentage >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (percentage > 0) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-gray-100 dark:bg-gray-900/20';
  };
  
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getBgColor()} ${getColor()}`}>
        {completedCount}/{totalCount} methods
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <span className={`text-xs font-medium ${getColor()}`}>
        {completedCount}/{totalCount}
      </span>
    );
  }
  
  return (
    <span className={`text-sm ${getColor()}`}>
      {completedCount} of {totalCount} methods completed ({percentage}%)
    </span>
  );
}
