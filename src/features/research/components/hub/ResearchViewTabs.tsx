"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Globe, BarChart2, Calendar } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

type ViewTab = "overview" | "category" | "timeline";

interface ResearchViewTabsProps {
  activeTab: string;
  onTabChange: (tab: ViewTab) => void;
}

// ─── Tab config ──────────────────────────────────────────────

const TABS: { key: ViewTab; icon: React.ElementType }[] = [
  { key: "overview", icon: Globe },
  { key: "category", icon: BarChart2 },
  { key: "timeline", icon: Calendar },
];

// ─── Component ───────────────────────────────────────────────

export function ResearchViewTabs({ activeTab, onTabChange }: ResearchViewTabsProps) {
  const { t } = useTranslation("research");

  return (
    <div className="bg-gray-100 rounded-lg p-1 flex gap-1 w-fit">
      {TABS.map(({ key, icon: Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(`viewTabs.${key}`)}
          </button>
        );
      })}
    </div>
  );
}
