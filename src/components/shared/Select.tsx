import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/utils';

// ─── Types ─────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  required?: boolean;
  /** Test ID for e2e tests */
  'data-testid'?: string;
}

// ─── Component ─────────────────────────────────────────────

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  disabled = false,
  allowClear = false,
  className,
  required = false,
  'data-testid': testId,
}: SelectProps) {
  const hasError = !!error;
  const inputId = label ? label.toLowerCase().replace(/\s+/g, '-') : undefined;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {required && <span className="text-red-500 mr-0.5">*</span>}
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={inputId}
          data-testid={testId}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          className={cn(
            'w-full border rounded-lg px-3 py-2 text-sm text-gray-900 appearance-none',
            'focus:outline-none focus:ring-2 focus:border-transparent transition-shadow',
            'bg-white bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%239CA3AF%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat',
            allowClear && value ? 'pr-8' : 'pr-8',
            hasError
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-200 focus:ring-primary',
            disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
            !value && 'text-gray-400',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
