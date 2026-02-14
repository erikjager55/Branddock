/**
 * Quality Badge Components
 * Reusable quality score display components with tooltips
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { 
  getQualityConfig, 
  QUALITY_SIZE_CONFIGS, 
  type QualitySize 
} from '../../constants/quality-system';
import { QualityTooltip, QualityTooltipCompact } from './QualityTooltip';

/**
 * Basic quality badge with icon and score
 */
interface QualityBadgeProps {
  score: number;
  completedCount?: number;
  totalCount?: number;
  size?: QualitySize;
  showIcon?: boolean;
  showScore?: boolean;
  showLabel?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  variant?: 'default' | 'outlined' | 'minimal';
  className?: string;
  onClick?: () => void;
}

export function QualityBadge({
  score,
  completedCount,
  totalCount,
  size = 'md',
  showIcon = true,
  showScore = true,
  showLabel = false,
  showTooltip = true,
  animated = false,
  variant = 'default',
  className,
  onClick
}: QualityBadgeProps) {
  const config = getQualityConfig(score);
  const sizeConfig = QUALITY_SIZE_CONFIGS[size];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
        variant === 'outlined' && 'border-2',
        variant === 'default' && config.containerClasses,
        variant === 'outlined' && config.badgeClasses,
        variant === 'minimal' && 'bg-transparent',
        animated && 'transition-all duration-300',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      {showIcon && <Icon className={cn(sizeConfig.icon, config.iconClasses)} />}
      {showScore && (
        <span className={cn(sizeConfig.text, 'font-bold', config.textColor)}>
          {score}%
        </span>
      )}
      {showLabel && (
        <span className={cn(sizeConfig.text, 'font-medium', config.textColor)}>
          {config.label}
        </span>
      )}
    </div>
  );

  if (showTooltip && completedCount !== undefined && totalCount !== undefined) {
    return (
      <QualityTooltipCompact
        score={score}
        completedCount={completedCount}
        totalCount={totalCount}
      >
        {badge}
      </QualityTooltipCompact>
    );
  }

  return badge;
}

/**
 * Detailed quality badge with label and description
 */
interface QualityBadgeDetailedProps {
  score: number;
  completedCount?: number;
  totalCount?: number;
  size?: QualitySize;
  showScore?: boolean;
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
}

export function QualityBadgeDetailed({
  score,
  completedCount,
  totalCount,
  size = 'md',
  showScore = true,
  showTooltip = true,
  className,
  onClick
}: QualityBadgeDetailedProps) {
  const config = getQualityConfig(score);
  const sizeConfig = QUALITY_SIZE_CONFIGS[size];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2',
        config.containerClasses,
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <Icon className={cn(sizeConfig.icon, config.iconClasses)} />
      <div className="flex flex-col">
        <span className={cn('text-xs font-medium', config.textColor)}>
          {config.label}
        </span>
        {showScore && (
          <span className={cn('text-lg font-bold', config.textColor)}>
            {score}%
          </span>
        )}
      </div>
    </div>
  );

  if (showTooltip && completedCount !== undefined && totalCount !== undefined) {
    return (
      <QualityTooltipCompact
        score={score}
        completedCount={completedCount}
        totalCount={totalCount}
      >
        {badge}
      </QualityTooltipCompact>
    );
  }

  return badge;
}

/**
 * Compact quality indicator (just icon + score)
 */
interface QualityIndicatorProps {
  score: number;
  completedCount?: number;
  totalCount?: number;
  size?: QualitySize;
  showTooltip?: boolean;
  className?: string;
}

export function QualityIndicator({
  score,
  completedCount,
  totalCount,
  size = 'sm',
  showTooltip = true,
  className
}: QualityIndicatorProps) {
  const config = getQualityConfig(score);
  const sizeConfig = QUALITY_SIZE_CONFIGS[size];
  const Icon = config.icon;

  const indicator = (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <Icon className={cn(sizeConfig.icon, config.iconClasses)} />
      <span className={cn(sizeConfig.text, 'font-bold', config.textColor)}>
        {score}%
      </span>
    </div>
  );

  if (showTooltip && completedCount !== undefined && totalCount !== undefined) {
    return (
      <QualityTooltipCompact
        score={score}
        completedCount={completedCount}
        totalCount={totalCount}
      >
        {indicator}
      </QualityTooltipCompact>
    );
  }

  return indicator;
}

/**
 * Large quality display for headers and prominent locations
 */
interface QualityDisplayProps {
  score: number;
  completedCount?: number;
  totalCount?: number;
  showDescription?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export function QualityDisplay({
  score,
  completedCount,
  totalCount,
  showDescription = true,
  showTooltip = true,
  animated = true,
  className,
  onClick
}: QualityDisplayProps) {
  const config = getQualityConfig(score);
  const Icon = config.icon;

  const display = (
    <div
      className={cn(
        'inline-flex items-center gap-4 px-6 py-4 rounded-xl border-2',
        config.containerClasses,
        animated && 'transition-all duration-300',
        onClick && 'cursor-pointer hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn(
        'h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0',
        config.iconContainerClasses
      )}>
        <Icon className={cn('h-6 w-6', config.iconClasses)} />
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={cn('text-3xl font-bold', config.textColor)}>
            {score}%
          </span>
          <span className={cn('text-sm font-medium', config.textColor)}>
            {config.label}
          </span>
        </div>
        {showDescription && (
          <p className={cn('text-sm', config.textColor, 'opacity-80')}>
            {config.description}
          </p>
        )}
      </div>

      {/* Completion badge */}
      {completedCount !== undefined && totalCount !== undefined && (
        <div className={cn(
          'px-3 py-1.5 rounded-md text-sm font-semibold',
          config.badgeClasses
        )}>
          {completedCount}/{totalCount}
        </div>
      )}
    </div>
  );

  if (showTooltip && completedCount !== undefined && totalCount !== undefined) {
    return (
      <QualityTooltip
        score={score}
        completedCount={completedCount}
        totalCount={totalCount}
      >
        {display}
      </QualityTooltip>
    );
  }

  return display;
}

/**
 * Quality progress bar with visual feedback
 */
interface QualityProgressProps {
  score: number;
  completedCount?: number;
  totalCount?: number;
  showLabel?: boolean;
  showTooltip?: boolean;
  showPercentage?: boolean;
  animated?: boolean;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QualityProgress({
  score,
  completedCount,
  totalCount,
  showLabel = true,
  showTooltip = true,
  showPercentage = true,
  animated = true,
  height = 'md',
  className
}: QualityProgressProps) {
  const config = getQualityConfig(score);
  const Icon = config.icon;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const progress = (
    <div className={cn('w-full space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', config.iconClasses)} />
            <span className={cn('font-medium', config.textColor)}>
              {config.label}
            </span>
          </div>
          {showPercentage && (
            <span className={cn('font-bold', config.textColor)}>
              {score}%
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', heightClasses[height])}>
        <div
          className={cn(
            'h-full rounded-full',
            animated && 'transition-all duration-500 ease-out'
          )}
          style={{
            width: `${score}%`,
            backgroundColor: config.color
          }}
        />
      </div>
    </div>
  );

  if (showTooltip && completedCount !== undefined && totalCount !== undefined) {
    return (
      <QualityTooltipCompact
        score={score}
        completedCount={completedCount}
        totalCount={totalCount}
      >
        {progress}
      </QualityTooltipCompact>
    );
  }

  return progress;
}
