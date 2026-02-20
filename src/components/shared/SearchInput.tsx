import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/components/ui/utils';

// ─── Types ─────────────────────────────────────────────────

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Test ID for e2e tests */
  'data-testid'?: string;
}

// ─── Component ─────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  'data-testid': testId,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes into local state
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    (next: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(next), 300);
    },
    [onChange],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocal(next);
    debouncedOnChange(next);
  };

  const handleClear = () => {
    setLocal('');
    onChange('');
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

      <input
        type="text"
        data-testid={testId}
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />

      {local && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
