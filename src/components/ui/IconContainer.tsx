/**
 * IconContainer - Master Component
 * Unified icon container with gradient backgrounds
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { COLORS, EFFECTS, cn } from '@/constants/design-system';

export interface IconContainerProps {
  // Icon
  icon: LucideIcon;
  iconClassName?: string;
  
  // Size
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  // Gradient (from design system)
  gradient?: keyof typeof COLORS.gradients;
  
  // Shape
  rounded?: 'lg' | 'xl' | '2xl' | 'full';
  
  // Shadow
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Additional styling
  className?: string;
}

export function IconContainer({
  icon: Icon,
  iconClassName,
  size = 'md',
  gradient = 'combined',
  rounded = 'xl',
  shadow = 'none',
  className,
}: IconContainerProps) {
  // Size mapping (container)
  const sizeClasses = {
    xs: 'h-8 w-8',
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
    xl: 'h-16 w-16',
    '2xl': 'h-20 w-20',
  };

  // Icon size mapping
  const iconSizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
    xl: 'h-8 w-8',
    '2xl': 'h-10 w-10',
  };

  // Rounded mapping
  const roundedClasses = {
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  // Shadow mapping
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        roundedClasses[rounded],
        shadowClasses[shadow],
        'flex items-center justify-center flex-shrink-0',
        COLORS.gradients[gradient],
        className
      )}
    >
      <Icon className={cn(iconSizeClasses[size], 'text-white', iconClassName)} />
    </div>
  );
}
