"use client";

import { Image as ImageIcon, Palette, Type, Ruler, Blocks, Camera, Layers, Code2, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StyleguideTab } from "../types/brandstyle.types";

interface Tab {
  id: StyleguideTab;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  // Tab-id 'brand_assets' blijft voor DB/route-compat; label hernoemd naar
  // 'Logos' sinds fonts verhuisd zijn naar Typography (consolidatie 2026-05-27).
  { id: "brand_assets", icon: ImageIcon },
  { id: "colors", icon: Palette },
  { id: "typography", icon: Type },
  { id: "spacing", icon: Ruler },
  { id: "components", icon: Blocks },
  // tone_of_voice tab verwijderd — guidelines + do/don't examples leven nu in
  // Brand Voice (Voice DNA + Vocabulary tabs), zie ADR 2026-05-15.
  { id: "imagery", icon: Camera },
  { id: "visual_system", icon: Layers },
  { id: "design_system", icon: Code2 },
  { id: "history", icon: Clock },
];

interface StyleguideTabNavProps {
  activeTab: StyleguideTab;
  onTabChange: (tab: StyleguideTab) => void;
}

export function StyleguideTabNav({ activeTab, onTabChange }: StyleguideTabNavProps) {
  const { t } = useTranslation("brandstyle");
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
              {t(`tabNav.${tab.id}`)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
