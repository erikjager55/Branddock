/**
 * Stack - Auto Layout Component
 * Flexbox-based layout utility for vertical/horizontal stacking with consistent spacing
 */

import React from 'react';
import { SPACING, cn } from '@/constants/design-system';

export interface StackProps {
  // Content
  children: React.ReactNode;
  
  // Direction
  direction?: 'vertical' | 'horizontal';
  
  // Gap (spacing between items)
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  // Alignment
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  
  // Wrapping
  wrap?: boolean;
  
  // Full width/height
  fullWidth?: boolean;
  fullHeight?: boolean;
  
  // Custom className
  className?: string;
  
  // HTML element
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav';
}

export function Stack({
  children,
  direction = 'vertical',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  fullWidth = false,
  fullHeight = false,
  className,
  as: Element = 'div',
}: StackProps) {
  // Gap mapping
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
  };

  // Alignment mapping
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  // Justify mapping
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <Element
      className={cn(
        'flex',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        fullWidth && 'w-full',
        fullHeight && 'h-full',
        className
      )}
    >
      {children}
    </Element>
  );
}
