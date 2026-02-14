/**
 * Container - Auto Layout Component
 * Responsive container with consistent padding and max-width
 */

import React from 'react';
import { LAYOUT_PATTERNS, cn } from '@/constants/design-system';

export interface ContainerProps {
  // Content
  children: React.ReactNode;
  
  // Max width
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  
  // Padding
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  paddingX?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  // Center content
  center?: boolean;
  
  // Custom className
  className?: string;
  
  // HTML element
  as?: 'div' | 'section' | 'article' | 'main';
}

export function Container({
  children,
  maxWidth = 'xl',
  padding = 'md',
  paddingX,
  paddingY,
  center = true,
  className,
  as: Element = 'div',
}: ContainerProps) {
  // Max width mapping
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-[1800px]',
    full: 'max-w-full',
  };

  // Padding mapping
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-12',
    xl: 'p-16',
  };

  const paddingXClasses = {
    none: 'px-0',
    sm: 'px-4',
    md: 'px-8',
    lg: 'px-12',
    xl: 'px-16',
  };

  const paddingYClasses = {
    none: 'py-0',
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
    xl: 'py-16',
  };

  return (
    <Element
      className={cn(
        maxWidthClasses[maxWidth],
        center && 'mx-auto',
        paddingX ? paddingXClasses[paddingX] : paddingY ? '' : paddingClasses[padding],
        paddingY && paddingYClasses[paddingY],
        className
      )}
    >
      {children}
    </Element>
  );
}
