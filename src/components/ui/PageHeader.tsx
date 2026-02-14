/**
 * PageHeader - Master Component
 * Unified sticky page header used across all pages
 */

import React from 'react';
import { Button } from './button';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { HEADER_PATTERNS, COLORS, cn } from '@/constants/design-system';

export interface PageHeaderProps {
  // Icon & Title
  icon?: LucideIcon;
  iconGradient?: keyof typeof COLORS.gradients;
  title: string;
  subtitle?: string;
  
  // Back button
  onBack?: () => void;
  backLabel?: string;
  
  // Right side actions
  actions?: React.ReactNode;
  
  // Container size
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  // Compact mode (less padding)
  compact?: boolean;
  
  // Additional content below header
  children?: React.ReactNode;
  
  // Custom className
  className?: string;
}

export function PageHeader({
  icon: Icon,
  iconGradient = 'combined',
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  actions,
  maxWidth = 'xl',
  compact = false,
  children,
  className,
}: PageHeaderProps) {
  // Container width mapping
  const containerClass = compact
    ? {
        sm: 'max-w-3xl mx-auto px-8 py-4',
        md: 'max-w-5xl mx-auto px-8 py-4',
        lg: 'max-w-6xl mx-auto px-8 py-4',
        xl: 'max-w-7xl mx-auto px-8 py-4',
        '2xl': 'max-w-[1800px] mx-auto px-8 py-4',
      }[maxWidth]
    : {
        sm: 'max-w-3xl mx-auto px-8 py-6',
        md: 'max-w-5xl mx-auto px-8 py-6',
        lg: 'max-w-6xl mx-auto px-8 py-6',
        xl: 'max-w-7xl mx-auto px-8 py-6',
        '2xl': 'max-w-[1800px] mx-auto px-8 py-6',
      }[maxWidth];

  return (
    <div
      className={cn(
        'sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10',
        className
      )}
    >
      <div className={containerClass}>
        {/* Back button (optional) */}
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        )}

        {/* Main header content */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-4">
            {Icon && (
              <div
                className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  COLORS.gradients[iconGradient]
                )}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
            )}

            <div className="flex flex-col">
              <h1 className="text-3xl font-semibold">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>

        {/* Optional children below main header */}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
