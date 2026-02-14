/**
 * EmptyState - Master Component
 * Unified empty state for lists, tables, and sections
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/constants/design-system';

export interface EmptyStateProps {
  // Icon
  icon: LucideIcon;
  iconGradient?: string;
  
  // Content
  title: string;
  description?: string;
  
  // Action button (optional)
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'default' | 'outline' | 'ghost';
  
  // Size
  size?: 'sm' | 'md' | 'lg';
  
  // Custom className
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconGradient = 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700',
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'default',
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-12 w-12 mb-3',
      iconSize: 'h-6 w-6',
      title: 'text-base',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'h-16 w-16 mb-4',
      iconSize: 'h-8 w-8',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-20 w-20 mb-5',
      iconSize: 'h-10 w-10',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const sizeConfig = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          sizeConfig.icon,
          'rounded-2xl flex items-center justify-center',
          iconGradient
        )}
      >
        <Icon className={cn(sizeConfig.iconSize, 'text-muted-foreground')} />
      </div>

      {/* Title */}
      <h3 className={cn('font-semibold text-foreground mb-1', sizeConfig.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-muted-foreground max-w-md', sizeConfig.description)}>
          {description}
        </p>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <Button
          variant={actionVariant}
          onClick={onAction}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
