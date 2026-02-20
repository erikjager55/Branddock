import React from 'react';
import { cn } from '@/components/ui/utils';

// ─── Types ─────────────────────────────────────────────────

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ElementType;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

// ─── Style maps ────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-700',
  info:    'bg-blue-50 text-blue-700',
  teal:    'bg-primary/10 text-primary',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  teal:    'bg-primary',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

const iconSizeMap: Record<BadgeSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
};

// ─── Component ─────────────────────────────────────────────

export function Badge({
  variant = 'default',
  size = 'md',
  icon: Icon,
  dot = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />
      )}
      {Icon && <Icon className={iconSizeMap[size]} />}
      {children}
    </span>
  );
}
