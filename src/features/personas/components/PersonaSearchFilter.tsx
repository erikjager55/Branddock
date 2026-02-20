"use client";

import { useState, useRef, useEffect } from "react";
import { Filter } from "lucide-react";
import { SearchInput } from "@/components/shared";
import { usePersonasOverviewStore } from "../stores/usePersonasOverviewStore";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "needs_work", label: "Needs Work" },
];

export function PersonaSearchFilter() {
  const { searchQuery, filter, setSearchQuery, setFilter } =
    usePersonasOverviewStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeLabel =
    FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "All";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search personas..."
        />
      </div>
      <div className="relative" ref={ref}>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={() => setOpen(!open)}
        >
          <Filter className="h-4 w-4 text-gray-400" />
          {activeLabel}
        </button>
        {open && (
          <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  filter === opt.value
                    ? "font-medium text-emerald-600"
                    : "text-gray-700"
                }`}
                onClick={() => {
                  setFilter(opt.value as "all" | "ready" | "needs_work");
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
