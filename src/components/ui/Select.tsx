"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  label?: string;
  searchable?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  error,
  disabled = false,
  label,
  searchable = false,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setHighlightedIndex(0);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (open && filtered[highlightedIndex]) {
          onChange?.(filtered[highlightedIndex].value);
          close();
        } else {
          setOpen(true);
        }
        break;
      case "Escape":
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
    }
  };

  const inputId = label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-dark"
        >
          {label}
        </label>
      )}
      <div className="relative" onKeyDown={handleKeyDown}>
        <button
          id={inputId}
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          className={cn(
            "h-10 w-full flex items-center justify-between rounded-md border bg-surface-dark px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark",
            error ? "border-red-500" : "border-border-dark",
            disabled && "cursor-not-allowed opacity-50",
            !selected && "text-text-dark/40"
          )}
          disabled={disabled}
        >
          <span className={cn(selected && "text-text-dark")}>
            {selected?.label || placeholder}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-dark/50 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border-dark bg-surface-dark shadow-lg">
            {searchable && (
              <div className="p-2 border-b border-border-dark">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dark/40" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    className="w-full h-8 pl-8 pr-3 rounded border border-border-dark bg-background-dark text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Search..."
                  />
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-dark/50">
                  No results
                </div>
              ) : (
                filtered.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange?.(option.value);
                      close();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors",
                      index === highlightedIndex && "bg-background-dark",
                      option.value === value
                        ? "text-primary"
                        : "text-text-dark hover:bg-background-dark"
                    )}
                  >
                    {option.label}
                    {option.value === value && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
