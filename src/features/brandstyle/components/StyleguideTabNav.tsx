"use client";

import { Image as ImageIcon, Palette, Type, Ruler, Blocks, Camera, Layers, Code2, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StyleguideTab } from "../types/brandstyle.types";

interface Tab {
  id: StyleguideTab;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  // Tab-id 'brand_assets' blijft voor DB/route-compat; label hernoemd naar
  // 'Logos' sinds fonts verhuisd zijn naar Typography (consolidatie 2026-05-27).
  { id: "brand_assets", label: "Logos", icon: ImageIcon },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "spacing", label: "Spacing", icon: Ruler },
  { id: "components", label: "Components", icon: Blocks },
  // tone_of_voice tab verwijderd — guidelines + do/don't examples leven nu in
  // Brand Voice (Voice DNA + Vocabulary tabs), zie ADR 2026-05-15.
  { id: "imagery", label: "Imagery", icon: Camera },
  { id: "visual_system", label: "Visual System", icon: Layers },
  { id: "design_system", label: "Design System", icon: Code2 },
  { id: "history", label: "History", icon: Clock },
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
                  ? "border-primary-500 text-primary"
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
