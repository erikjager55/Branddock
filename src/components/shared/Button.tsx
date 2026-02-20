import React from 'react';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/components/ui/utils';

// ─── Types ─────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
}

// ─── Style maps ────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-primary hover:bg-primary/90 text-white',
  secondary: 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700',
  cta:       'bg-emerald-500 hover:bg-emerald-600 text-white',
  danger:    'bg-red-50 text-red-600 hover:bg-red-100',
  ghost:     'bg-transparent hover:bg-gray-100 text-gray-600',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-sm gap-2',
};

const iconSizeMap: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
};

// ─── Component ─────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      isLoading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;
    const iconCls = iconSizeMap[size];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className,
        )}
        {...props}
      >
        {isLoading && <Loader2 className={cn(iconCls, 'animate-spin')} />}
        {!isLoading && Icon && iconPosition === 'left' && <Icon className={iconCls} />}
        {children}
        {!isLoading && Icon && iconPosition === 'right' && <Icon className={iconCls} />}
      </button>
    );
  },
);

Button.displayName = 'Button';
