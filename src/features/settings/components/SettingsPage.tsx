'use client';

import { useEffect } from 'react';
import { useSettingsStore, type SettingsTab } from '@/stores/useSettingsStore';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { SettingsSubNav } from './SettingsSubNav';
import { AccountTab } from './account/AccountTab';
import { TeamTab } from './team/TeamTab';
import { BillingTab } from './billing/BillingTab';
import { AdministratorTab } from './administrator/AdministratorTab';

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

export function SettingsPage({ initialTab }: SettingsPageProps) {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  function renderTabContent() {
    switch (activeTab) {
      case 'account':
        return <AccountTab />;
      case 'team':
        return <TeamTab />;
      case 'billing':
        return <BillingTab />;
      case 'notifications':
        return (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Notification settings coming soon
          </div>
        );
      case 'appearance':
        return (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Appearance settings coming soon
          </div>
        );
      case 'administrator':
        return <AdministratorTab />;
      default:
        return <AccountTab />;
    }
  }

  return (
    <PageShell noPadding>
      <PageHeader
        moduleKey="settings"
        title="Settings"
        subtitle="Manage your account, team, billing and preferences"
      />
      <div data-testid="settings-page" className="flex h-full">
        <SettingsSubNav />
        <div data-testid="settings-content" className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </PageShell>
  );
}
