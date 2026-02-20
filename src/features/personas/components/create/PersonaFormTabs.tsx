"use client";

type TabId = "overview" | "psychographics" | "background";

interface PersonaFormTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "psychographics", label: "Psychographics" },
  { id: "background", label: "Background" },
];

export function PersonaFormTabs({
  activeTab,
  onTabChange,
}: PersonaFormTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2.5 text-sm transition-colors ${
            activeTab === tab.id
              ? "border-b-2 border-emerald-500 text-gray-900 font-medium"
              : "text-muted-foreground hover:text-gray-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
