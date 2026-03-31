"use client";

import { SearchInput, Select } from "@/components/shared";
import { TYPE_CONFIG, STATUS_FILTER_OPTIONS } from "../constants/model-constants";
import type { ConsistentModelType } from "../types/consistent-model.types";

const TYPE_PILL_OPTIONS: { value: ConsistentModelType; label: string; colorHex: string; bgHex: string }[] = (
  Object.entries(TYPE_CONFIG) as [ConsistentModelType, (typeof TYPE_CONFIG)[ConsistentModelType]][]
).map(([value, config]) => ({
  value,
  label: config.label,
  colorHex: config.colorHex,
  bgHex: config.bgHex,
}));

interface ModelFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

/** Search + type pills + status filter bar */
export function ModelFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}: ModelFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search models..."
          />
        </div>
        <Select
          value={statusFilter || null}
          onChange={(v) => onStatusFilterChange(v ?? "")}
          options={STATUS_FILTER_OPTIONS}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTypeFilterChange("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            typeFilter === ""
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {TYPE_PILL_OPTIONS.map((opt) => {
          const isActive = typeFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeFilterChange(isActive ? "" : opt.value)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                isActive
                  ? { backgroundColor: opt.colorHex, color: "#fff" }
                  : { backgroundColor: opt.bgHex, color: opt.colorHex }
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
