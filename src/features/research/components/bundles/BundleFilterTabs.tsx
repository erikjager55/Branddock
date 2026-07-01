"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/shared";

// ─── Types ───────────────────────────────────────────────────

interface BundleFilterTabsProps {
  filter: "all" | "recommended";
  search: string;
  onFilterChange: (filter: "all" | "recommended") => void;
  onSearchChange: (search: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function BundleFilterTabs({
  filter,
  search,
  onFilterChange,
  onSearchChange,
}: BundleFilterTabsProps) {
  const { t } = useTranslation("research");
  const tabs: { key: "all" | "recommended"; label: string }[] = [
    { key: "all", label: t("bundleFilter.all") },
    { key: "recommended", label: t("bundleFilter.recommended") },
  ];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? "bg-green-50 text-green-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={t("bundleFilter.searchPlaceholder")}
        className="w-64"
      />
    </div>
  );
}
