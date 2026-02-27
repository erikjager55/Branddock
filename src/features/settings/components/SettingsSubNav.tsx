'use client';

import { User, Users, CreditCard, Bell, Palette, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSettingsStore, type SettingsTab } from '@/stores/useSettingsStore';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export function SettingsSubNav() {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);

  return (
    <div data-testid="settings-subnav" className="w-[200px] flex-shrink-0 border-r border-gray-200 p-4 space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            data-testid={`settings-tab-${item.id}`}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}

      {/* Administrator Section */}
      <div className="pt-4 mt-4 border-t border-gray-200">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Administrator
        </p>
        <button
          data-testid="settings-tab-administrator"
          onClick={() => setActiveTab('administrator')}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'administrator'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          AI Configuration
        </button>
      </div>
    </div>
  );
}
