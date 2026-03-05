'use client';

import { Server, Rss, Bell, Zap } from 'lucide-react';
import { useTrendRadarStore } from '../stores/useTrendRadarStore';

const TABS = [
  { key: 'sources' as const, label: 'Sources', icon: Server },
  { key: 'feed' as const, label: 'Feed', icon: Rss },
  { key: 'alerts' as const, label: 'Alerts', icon: Bell },
  { key: 'activate' as const, label: 'Activate', icon: Zap },
] as const;

export function TrendRadarTabs() {
  const { activeTab, setActiveTab } = useTrendRadarStore();

  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
