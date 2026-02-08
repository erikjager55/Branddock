"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  debounce?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
  debounce = 300,
  className,
}: SearchInputProps) {
  const [internal, setInternal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync external value changes
  useEffect(() => {
    setInternal(value);
  }, [value]);

  const debouncedOnChange = useCallback(
    (val: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(val), debounce);
    },
    [onChange, debounce]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternal(val);
    debouncedOnChange(val);
  };

  const handleClear = () => {
    setInternal("");
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
      <input
        ref={inputRef}
        type="text"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border-dark bg-surface-dark pl-10 pr-20 text-sm text-text-dark placeholder:text-text-dark/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {internal && (
          <button
            onClick={handleClear}
            className="p-0.5 text-text-dark/40 hover:text-text-dark transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border-dark bg-background-dark px-1.5 py-0.5 text-[10px] font-mono text-text-dark/40">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}
