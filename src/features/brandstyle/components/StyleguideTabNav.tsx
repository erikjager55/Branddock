"use client";

import { Image, Palette, Type, MessageCircle, Camera } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StyleguideTab } from "../types/brandstyle.types";

interface Tab {
  id: StyleguideTab;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: "logo", label: "Logo", icon: Image },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "tone_of_voice", label: "Tone of Voice", icon: MessageCircle },
  { id: "imagery", label: "Imagery", icon: Camera },
];

interface StyleguideTabNavProps {
  activeTab: StyleguideTab;
  onTabChange: (tab: StyleguideTab) => void;
}

export function StyleguideTabNav({ activeTab, onTabChange }: StyleguideTabNavProps) {
  return (
    <div data-testid="styleguide-tabs" className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
