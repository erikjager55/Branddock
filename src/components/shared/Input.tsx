import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/components/ui/utils';

// ─── Types ─────────────────────────────────────────────────

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

// ─── Component ─────────────────────────────────────────────

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, className, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const hasError = !!error;

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {props.required && <span className="text-red-500 mr-0.5">*</span>}
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full border rounded-lg py-2 text-sm text-gray-900 placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
              Icon ? 'pl-9 pr-3' : 'px-3',
              hasError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-200 focus:ring-primary',
              disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
            )}
            {...props}
          />
        </div>

        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {!error && helperText && <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
