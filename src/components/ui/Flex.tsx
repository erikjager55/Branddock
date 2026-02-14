/**
 * Flex - Auto Layout Component
 * Shorthand flexbox utility with common patterns
 */

import React from 'react';
import { cn } from '@/constants/design-system';

export interface FlexProps {
  // Content
  children: React.ReactNode;
  
  // Direction
  direction?: 'row' | 'col';
  
  // Gap
  gap?: number | string;
  
  // Alignment
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  
  // Wrap
  wrap?: boolean | 'reverse';
  
  // Full width/height
  fullWidth?: boolean;
  fullHeight?: boolean;
  
  // Custom className
  className?: string;
  
  // HTML element
  as?: keyof JSX.IntrinsicElements;
}

export function Flex({
  children,
  direction = 'row',
  gap,
  align,
  justify,
  wrap,
  fullWidth,
  fullHeight,
  className,
  as: Element = 'div',
}: FlexProps) {
  // Alignment classes
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  // Gap class
  const gapClass = typeof gap === 'number' ? `gap-${gap}` : gap;

  return (
    <Element
      className={cn(
        'flex',
        direction === 'col' ? 'flex-col' : 'flex-row',
        gap && gapClass,
        align && alignClasses[align],
        justify && justifyClasses[justify],
        wrap === true && 'flex-wrap',
        wrap === 'reverse' && 'flex-wrap-reverse',
        fullWidth && 'w-full',
        fullHeight && 'h-full',
        className
      )}
    >
      {children}
    </Element>
  );
}
