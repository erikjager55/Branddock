/**
 * Grid - Auto Layout Component
 * CSS Grid-based layout utility for responsive grid layouts
 */

import React from 'react';
import { SPACING, cn } from '@/constants/design-system';

export interface GridProps {
  // Content
  children: React.ReactNode;
  
  // Columns (responsive)
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  } | number;
  
  // Gap
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gapX?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gapY?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Auto-fit columns (responsive grid that fits as many columns as possible)
  autoFit?: 'sm' | 'md' | 'lg' | 'xl';
  
  // Custom className
  className?: string;
  
  // HTML element
  as?: 'div' | 'section' | 'article' | 'ul' | 'ol';
}

export function Grid({
  children,
  cols = 1,
  gap = 'md',
  gapX,
  gapY,
  autoFit,
  className,
  as: Element = 'div',
}: GridProps) {
  // Gap mapping
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const gapXClasses = {
    none: 'gap-x-0',
    xs: 'gap-x-1',
    sm: 'gap-x-2',
    md: 'gap-x-4',
    lg: 'gap-x-6',
    xl: 'gap-x-8',
  };

  const gapYClasses = {
    none: 'gap-y-0',
    xs: 'gap-y-1',
    sm: 'gap-y-2',
    md: 'gap-y-4',
    lg: 'gap-y-6',
    xl: 'gap-y-8',
  };

  // Auto-fit grid classes
  const autoFitClasses = {
    sm: 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
    md: 'grid-cols-[repeat(auto-fit,minmax(280px,1fr))]',
    lg: 'grid-cols-[repeat(auto-fit,minmax(360px,1fr))]',
    xl: 'grid-cols-[repeat(auto-fit,minmax(480px,1fr))]',
  };

  // Column classes (responsive)
  let colClasses = '';
  if (autoFit) {
    colClasses = autoFitClasses[autoFit];
  } else if (typeof cols === 'number') {
    const colsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    };
    colClasses = colsMap[cols as keyof typeof colsMap] || 'grid-cols-1';
  } else {
    // Custom responsive columns
    const breakpoints = [];
    if (cols.default) breakpoints.push(`grid-cols-${cols.default}`);
    if (cols.sm) breakpoints.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) breakpoints.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) breakpoints.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) breakpoints.push(`xl:grid-cols-${cols.xl}`);
    colClasses = breakpoints.join(' ');
  }

  return (
    <Element
      className={cn(
        'grid',
        colClasses,
        gapX ? gapXClasses[gapX] : gapY ? '' : gapClasses[gap],
        gapY && gapYClasses[gapY],
        className
      )}
    >
      {children}
    </Element>
  );
}
