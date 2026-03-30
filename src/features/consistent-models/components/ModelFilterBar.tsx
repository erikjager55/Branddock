"use client";

import { SearchInput, Select } from "@/components/shared";
import { MODEL_TYPE_OPTIONS, STATUS_FILTER_OPTIONS } from "../constants/model-constants";

interface ModelFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

/** Search + type + status filter bar */
export function ModelFilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}: ModelFilterBarProps) {
  const typeOptions = [{ value: "", label: "All Types" }, ...MODEL_TYPE_OPTIONS];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search models..."
        />
      </div>
      <div className="flex gap-3">
        <Select
          value={typeFilter || null}
          onChange={(v) => onTypeFilterChange(v ?? "")}
          options={typeOptions}
        />
        <Select
          value={statusFilter || null}
          onChange={(v) => onStatusFilterChange(v ?? "")}
          options={STATUS_FILTER_OPTIONS}
        />
      </div>
    </div>
  );
}
