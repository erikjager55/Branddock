"use client";

import { Mic2, BookOpenText, Hash, Quote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { VoiceguideTab } from "../stores/useVoiceguideStore";

interface Tab {
  id: VoiceguideTab;
  labelKey: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: "voice-dna", labelKey: "tabs.voiceDna", icon: Mic2 },
  { id: "vocabulary", labelKey: "tabs.vocabulary", icon: Hash },
  { id: "channel-tones", labelKey: "tabs.channelTones", icon: BookOpenText },
  { id: "references", labelKey: "tabs.references", icon: Quote },
];

interface VoiceguideTabNavProps {
  activeTab: VoiceguideTab;
  onTabChange: (tab: VoiceguideTab) => void;
}

export function VoiceguideTabNav({ activeTab, onTabChange }: VoiceguideTabNavProps) {
  const { t } = useTranslation("brandvoice");
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary-500 text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
