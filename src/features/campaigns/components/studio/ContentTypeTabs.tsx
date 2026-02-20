"use client";

import React from "react";
import { FileText, Image, Film, Layers, Lock } from "lucide-react";
import type { ContentTab } from "@/types/studio";

interface ContentTypeTabsProps {
  activeTab: ContentTab;
  isTabLocked: boolean;
  onTabChange: (tab: ContentTab) => void;
}

const TABS: { id: ContentTab; label: string; icon: typeof FileText }[] = [
  { id: "text", label: "Text", icon: FileText },
  { id: "images", label: "Images", icon: Image },
  { id: "video", label: "Video", icon: Film },
  { id: "carousel", label: "Carousel", icon: Layers },
];

export function ContentTypeTabs({ activeTab, isTabLocked, onTabChange }: ContentTypeTabsProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b flex-shrink-0">
      {TABS.map((tab) => {
        const TabIcon = tab.icon;
        const isActive = activeTab === tab.id;
        const isLocked = isTabLocked && !isActive;

        return (
          <button
            key={tab.id}
            onClick={() => !isLocked && onTabChange(tab.id)}
            disabled={isLocked}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? "bg-teal-50 text-teal-700"
                : isLocked
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <TabIcon className="h-4 w-4" />
            {tab.label}
            {isLocked && <Lock className="h-3 w-3 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}
